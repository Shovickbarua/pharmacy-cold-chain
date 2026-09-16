"""
Comprehensive automated test suite for the FastAPI backend logic.
"""
import asyncio
from data.scenarios import SCENARIOS, get_scenario_by_id
from services.hl7_parser_service import HL7ParserService
from services.rxnorm_service import RxNormValidationService
from services.fhir_service import fhir_service
from services.hipaa_service import HIPAADeidentificationService
from services.audit_service import audit_service


async def run_tests():
    print("=== TEST 1: Load Scenarios ===")
    assert len(SCENARIOS) >= 4
    s = get_scenario_by_id("scenario-insulin")
    print(f"Scenario: {s['title']}, Indent: {s['indent_id']}")

    print("\n=== TEST 2: HL7 v2 OMP^O09 Parsing ===")
    parsed = HL7ParserService.parse_omp_o09(s["raw_hl7_omp_o09"])
    assert parsed["is_valid"] is True
    assert parsed["patient"]["family_name"] == "VANCE"
    assert parsed["order"]["rxcui"] == "311036"
    assert "2-8" in str(parsed["order"]["storage_requirements"])
    print(f"HL7 Parsed Successfully! Patient: {parsed['patient']['full_name']}, Placer Order: {parsed['order']['placer_order_number']}")

    print("\n=== TEST 3: NIH RxNav Drug Validation ===")
    val = await RxNormValidationService.validate_drug(
        drug_name=s["drug"]["name"],
        expected_rxcui=s["drug"]["rxcui"],
        prescribed_dose=s["drug"]["dosage"],
        requested_dose=s["drug"]["dosage"]
    )
    assert val["is_valid"] is True
    assert val["matched_rxcui"] == "311036"
    assert val["cold_chain_required"] is True
    print(f"RxNav Validated! CUI: {val['matched_rxcui']}, Name: {val['official_rxnorm_name']}, Cold-Chain: {val['cold_chain_required']}")

    print("\n=== TEST 4: FHIR MedicationRequest ===")
    fhir_service.init_with_scenarios(SCENARIOS)
    med_req = fhir_service.get_medication_request(f"medreq-{s['indent_id'].lower()}")
    assert med_req is not None
    assert med_req["resourceType"] == "MedicationRequest"
    assert med_req["status"] == "active"
    print(f"FHIR MedicationRequest ID: {med_req['id']}, Subject: {med_req['subject']['display']}")

    print("\n=== TEST 5: FHIR MedicationDispense ===")
    dispense = fhir_service.create_medication_dispense(
        scenario=s,
        courier_name="Marcus Vance",
        courier_badge="LOG-104",
        cooler_id="COOLER-CC-ALPHA-04",
        sensor_id="SENS-TEMP-8891",
        current_temp_c=4.1,
        eta_minutes=10
    )
    assert dispense["resourceType"] == "MedicationDispense"
    assert dispense["status"] == "in-progress"
    assert len(dispense["extension"]) > 0
    print(f"FHIR MedicationDispense created: {dispense['id']}, Status: {dispense['status']}")

    print("\n=== TEST 6: HIPAA De-Identification Engine ===")
    hipaa_result = HIPAADeidentificationService.sanitize_nurse_alert(s, dispense)
    payload = hipaa_result["notification_payload"]
    assert payload["security_audit"]["phi_elements_leaked"] == 0
    assert payload["security_audit"]["phi_elements_stripped"] >= 4
    # Ensure patient name & MRN are NOT present in lockscreen display
    assert s["patient"]["name"] not in payload["lockscreen_display"]["body"]
    assert s["patient"]["mrn"] not in payload["lockscreen_display"]["body"]
    # Ensure courier & ETA ARE present
    assert "Marcus Vance" in payload["lockscreen_display"]["body"]
    assert "10 mins" in payload["lockscreen_display"]["body"]
    print("HIPAA Sanitizer verified! Leaked PHI count: 0. Courier and ETA safely transmitted.")

    print("\n=== TEST 7: HL7 FHIR AuditEvent & SHA-256 Hash Chain ===")
    audit_service.record_event(
        event_type="test-event",
        action="C",
        description="Automated Cold-Chain Integration Test",
        actor_name="Test Suite Runner",
        actor_role="qa-agent",
        entity_reference=f"MedicationDispense/{dispense['id']}",
        details={"test_status": "passed"}
    )
    integrity = audit_service.verify_chain_integrity()
    assert integrity["is_valid"] is True
    print(f"Audit Chain Integrity: {integrity['status']} (Total events: {integrity['total_events']})")

    # Simulate tamper and check detection
    print("\n=== TEST 8: Audit Tamper Detection Simulation ===")
    audit_service.simulate_tampering(0)
    tamper_check = audit_service.verify_chain_integrity()
    assert tamper_check["is_valid"] is False
    print(f"Tamper Successfully Detected: {tamper_check['status']} at block #{tamper_check.get('tampered_index')}")

    print("\nALL BACKEND LOGIC TESTS PASSED SUCCESSFULLY! 🎉")


if __name__ == "__main__":
    asyncio.run(run_tests())
