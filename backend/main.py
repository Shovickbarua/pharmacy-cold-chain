"""
FastAPI Inpatient Pharmacy Cold Chain Backend Application.
Coordinates:
- HL7 FHIR MedicationRequest (Prescription query)
- NIH NLM RxNav / RxNorm Formulation Validation
- Legacy HL7 v2 OMP^O09 Parsing
- HL7 FHIR MedicationDispense (Pack, Courier, ETA, Temp telemetry)
- HIPAA Safe Harbor Alert De-Identification Engine
- HL7 FHIR AuditEvent Tamper-Proof Cryptographic Ledger
"""

from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import os

from config import settings
from data.scenarios import SCENARIOS, get_scenario_by_id
from services.hl7_parser_service import HL7ParserService
from services.rxnorm_service import RxNormValidationService
from services.fhir_service import fhir_service
from services.hipaa_service import HIPAADeidentificationService
from services.audit_service import audit_service

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Hospital Pharmacy Cold-Chain to Inpatient Floor (IPD) Clinical Workflow System"
)

# Enable CORS for React frontend (Vite default port 5173 and others)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pre-populate FHIR service with scenarios
fhir_service.init_with_scenarios(SCENARIOS)

# Initialize genesis audit log
audit_service.record_event(
    event_type="init",
    action="E",
    description="Cold-Chain Pharmacy Vault System Initialized",
    actor_name="System Supervisor",
    actor_role="system",
    entity_reference="Location/central-pharmacy-cold-vault",
    details={"environment": "Production", "security_standard": "HIPAA 45 CFR 164.502"}
)


# ==================== DATA SCHEMAS ====================

class ParseHL7Request(BaseModel):
    raw_message: str

class ValidateDrugRequest(BaseModel):
    drug_name: str
    expected_rxcui: Optional[str] = None
    prescribed_dose: Optional[str] = None
    requested_dose: Optional[str] = None

class PackAndDispatchRequest(BaseModel):
    scenario_id: str
    cooler_id: str = "COOLER-CC-ALPHA-04"
    sensor_id: str = "SENS-TEMP-8891"
    current_temp_c: float = 4.1
    courier_name: str = "Marcus Vance"
    courier_badge: str = "LOG-104"
    courier_contact: str = "+1 (555) 019-4821"
    estimated_minutes: int = 10
    pharmacist_name: str = "Dr. Linda Sterling, PharmD"

class SanitizeAlertRequest(BaseModel):
    scenario_id: str
    dispense_id: Optional[str] = None

class TamperRequest(BaseModel):
    block_index: int = 0


# ==================== API ROUTES ====================

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "cold_chain_thresholds": {
            "min_c": settings.COLD_CHAIN_MIN_TEMP_C,
            "max_c": settings.COLD_CHAIN_MAX_TEMP_C
        },
        "nih_rxnav_api": settings.RXNAV_BASE_URL,
        "hapi_fhir_api": settings.HAPI_FHIR_BASE_URL
    }


@app.get("/api/scenarios")
def list_scenarios():
    """Returns available cold chain clinical scenarios."""
    return SCENARIOS


@app.get("/api/scenarios/{scenario_id}")
def get_scenario(scenario_id: str):
    return get_scenario_by_id(scenario_id)


# Step 1: Parse Legacy HL7 v2 OMP^O09 Message
@app.post("/api/hl7/parse")
def parse_hl7_message(req: ParseHL7Request):
    """
    Parses a legacy HL7 v2 Pharmacy/Treatment Order (OMP^O09)
    using the Python HL7 parser library.
    """
    try:
        parsed_result = HL7ParserService.parse_omp_o09(req.raw_message)
        
        # Log audit entry for legacy HL7 message receipt
        audit_service.record_event(
            event_type="read",
            action="R",
            description=f"Received & Parsed Legacy HL7 v2 OMP^O09 Order ({parsed_result['order']['placer_order_number']})",
            actor_name="HL7 Interface Engine",
            actor_role="interface",
            entity_reference=f"Message/{parsed_result['message_control_id']}",
            details={
                "message_type": parsed_result["message_type"],
                "sending_facility": parsed_result["sending_facility"],
                "drug": parsed_result["order"]["drug_name"]
            }
        )
        return parsed_result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse HL7 v2 string: {str(e)}")


# Step 2: Query EHR HL7 FHIR MedicationRequest
@app.get("/api/fhir/medication-request/{med_req_id}")
def get_medication_request(med_req_id: str):
    """
    Queries EHR for the doctor's official prescription using
    the HL7 FHIR MedicationRequest Specification.
    """
    res = fhir_service.get_medication_request(med_req_id)
    if not res:
        # Search by indent or generate
        for s in SCENARIOS:
            if s["indent_id"].lower() in med_req_id.lower() or s["id"] == med_req_id:
                res = fhir_service.build_medication_request(s)
                break
    if not res:
        raise HTTPException(status_code=404, detail="MedicationRequest not found")
    
    # Audit trail for accessing doctor's prescription
    audit_service.record_event(
        event_type="read",
        action="R",
        description=f"Queried FHIR MedicationRequest ({res['id']})",
        actor_name="Clinical Pharmacist",
        actor_role="pharmacist",
        entity_reference=f"MedicationRequest/{res['id']}",
        details={"status": res["status"], "subject": res["subject"]["display"]}
    )
    return res


# Step 3: Validate Drug with NIH NLM RxNav / RxNorm API
@app.post("/api/rxnorm/validate")
async def validate_drug(req: ValidateDrugRequest):
    """
    Queries the official NIH NLM RxNav API to validate the drug formulation,
    verify RxCUI, check brand-generic equivalence, and flag cold-chain requirements.
    """
    res = await RxNormValidationService.validate_drug(
        drug_name=req.drug_name,
        expected_rxcui=req.expected_rxcui,
        prescribed_dose=req.prescribed_dose,
        requested_dose=req.requested_dose
    )
    
    audit_service.record_event(
        event_type="execute",
        action="E",
        description=f"Validated formulation with NIH NLM RxNav ({res['official_rxnorm_name']})",
        actor_name="NLM RxNav Integration Service",
        actor_role="external-api",
        entity_reference=f"RxNorm/{res['matched_rxcui']}",
        details={"status": res["status"], "cold_chain": str(res["cold_chain_required"])}
    )
    return res


# Step 4: Pack Medicine and Update Chart via HL7 FHIR MedicationDispense
@app.post("/api/dispense/pack-and-dispatch")
def pack_and_dispatch(req: PackAndDispatchRequest):
    """
    Packages medication into a cold-chain box, assigns courier and calibrated sensor,
    and updates the chart via HL7 FHIR MedicationDispense.
    """
    scenario = get_scenario_by_id(req.scenario_id)
    
    # Generate FHIR MedicationDispense
    dispense_resource = fhir_service.create_medication_dispense(
        scenario=scenario,
        courier_name=req.courier_name,
        courier_badge=req.courier_badge,
        cooler_id=req.cooler_id,
        sensor_id=req.sensor_id,
        current_temp_c=req.current_temp_c,
        eta_minutes=req.estimated_minutes,
        pharmacist_name=req.pharmacist_name
    )

    # Log tamper-proof AuditEvent
    audit_service.record_event(
        event_type="create",
        action="C",
        description=f"MedicationDispense created & dispatched for courier delivery ({dispense_resource['id']})",
        actor_name=req.pharmacist_name,
        actor_role="pharmacist",
        entity_reference=f"MedicationDispense/{dispense_resource['id']}",
        details={
            "cooler_id": req.cooler_id,
            "sensor_id": req.sensor_id,
            "temperature": f"{req.current_temp_c} C",
            "courier": req.courier_name,
            "eta_minutes": req.estimated_minutes
        }
    )

    return {
        "success": True,
        "dispense_id": dispense_resource["id"],
        "medication_dispense": dispense_resource,
        "cold_chain_status": {
            "cooler_id": req.cooler_id,
            "sensor_id": req.sensor_id,
            "current_temp_c": req.current_temp_c,
            "is_in_range": settings.COLD_CHAIN_MIN_TEMP_C <= req.current_temp_c <= settings.COLD_CHAIN_MAX_TEMP_C,
            "courier": f"{req.courier_name} ({req.courier_badge})",
            "eta": f"{req.estimated_minutes} minutes"
        }
    }


# Step 5: HIPAA Safe Harbor Alert De-Identification Engine
@app.post("/api/notify/sanitize")
def sanitize_nurse_alert(req: SanitizeAlertRequest):
    """
    Strips identifying PHI from outbound alert sent to nurse's pager/app,
    provides side-by-side PHI comparison, and logs an AuditEvent.
    """
    scenario = get_scenario_by_id(req.scenario_id)
    dispense_id = req.dispense_id or f"disp-{scenario['indent_id'].lower()}"
    dispense_record = fhir_service.get_medication_dispense(dispense_id) or {}

    sanitized_data = HIPAADeidentificationService.sanitize_nurse_alert(
        scenario=scenario,
        dispense_record=dispense_record
    )

    # Log tamper-proof AuditEvent for outbound communication
    audit_service.record_event(
        event_type="transmit",
        action="E",
        description=f"HIPAA-Sanitized Push Notification Transmitted to Nurse ({scenario['requester_nurse']['name']})",
        actor_name="HIPAA Gateway Engine",
        actor_role="notification-gateway",
        entity_reference=f"Notification/{sanitized_data['notification_payload']['transmission_id']}",
        details={
            "phi_stripped": sanitized_data["notification_payload"]["security_audit"]["phi_elements_stripped"],
            "recipient_device": scenario["requester_nurse"]["device_id"],
            "compliance": "HIPAA 45 CFR 164.514 Safe Harbor"
        }
    )

    return sanitized_data


# Step 6: Tamper-Proof AuditEvent Ledger
@app.get("/api/audit/ledger")
def get_audit_ledger():
    """Retrieves all cryptographically sealed FHIR AuditEvent entries."""
    return audit_service.get_ledger()


@app.get("/api/audit/verify")
def verify_audit_chain():
    """Verifies the SHA-256 cryptographic chain across all audit events."""
    return audit_service.verify_chain_integrity()


@app.post("/api/audit/tamper")
def simulate_tamper(req: TamperRequest):
    """Simulates an unauthorized alteration of an audit record to demonstrate tamper detection."""
    return audit_service.simulate_tampering(req.block_index)


# Step 7: HAPI FHIR Sync
@app.post("/api/fhir/sync-hapi")
async def sync_hapi_fhir(resource: Dict[str, Any] = Body(...)):
    """Syncs a FHIR resource to the public or private HAPI FHIR test server."""
    return await fhir_service.sync_with_hapi_fhir(resource)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
