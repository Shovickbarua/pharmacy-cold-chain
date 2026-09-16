"""
HL7 FHIR R4 Specification Service for:
1. MedicationRequest (Doctor's prescription query & verification)
2. MedicationDispense (Packed drug, courier tracking, ETA, cold-chain temperature telemetry)
3. AuditEvent (Tamper-evident audit trail integration)
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
import httpx
from config import settings


class FHIRService:
    def __init__(self):
        # In-memory FHIR repository storing active resources
        self.medication_requests: Dict[str, Dict[str, Any]] = {}
        self.medication_dispenses: Dict[str, Dict[str, Any]] = {}
        self.audit_events: Dict[str, Dict[str, Any]] = {}

    def init_with_scenarios(self, scenarios: List[Dict[str, Any]]):
        """Pre-seeds FHIR MedicationRequest resources for all inpatient scenarios."""
        for s in scenarios:
            med_req = self.build_medication_request(s)
            self.medication_requests[med_req["id"]] = med_req

    def build_medication_request(self, scenario: Dict[str, Any]) -> Dict[str, Any]:
        """Constructs a strictly compliant HL7 FHIR R4 MedicationRequest."""
        med_req_id = f"medreq-{scenario['indent_id'].lower()}"
        pat = scenario["patient"]
        doc = scenario["prescriber"]
        drug = scenario["drug"]

        return {
            "resourceType": "MedicationRequest",
            "id": med_req_id,
            "identifier": [
                {
                    "system": "http://hospital.stjude.org/orders",
                    "value": scenario["order_number"]
                },
                {
                    "system": "http://hospital.stjude.org/indents",
                    "value": scenario["indent_id"]
                }
            ],
            "status": "active",
            "intent": "order",
            "priority": "stat" if "Stat" in scenario["urgency"] else "routine",
            "medicationCodeableConcept": {
                "coding": [
                    {
                        "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                        "code": drug["rxcui"],
                        "display": drug["name"]
                    }
                ],
                "text": drug["name"]
            },
            "subject": {
                "reference": f"Patient/{pat['id']}",
                "display": pat["name"]
            },
            "encounter": {
                "reference": f"Encounter/enc-{pat['id']}",
                "display": f"{pat['floor']}, {pat['room']}"
            },
            "authoredOn": "2026-09-16T19:45:00Z",
            "requester": {
                "reference": f"Practitioner/{doc['id']}",
                "display": f"{doc['name']} (NPI: {doc['npi']})"
            },
            "reasonCode": [
                {
                    "text": pat["diagnosis"]
                }
            ],
            "dosageInstruction": [
                {
                    "text": drug["dosage"],
                    "timing": {
                        "code": {
                            "text": "As directed by inpatient oncology/medical protocol"
                        }
                    },
                    "route": {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "34206005" if "Subcut" in drug["route"] else "47625008",
                                "display": drug["route"]
                            }
                        ],
                        "text": drug["route"]
                    },
                    "doseAndRate": [
                        {
                            "type": {
                                "coding": [
                                    {
                                        "system": "http://terminology.hl7.org/CodeSystem/dose-rate-type",
                                        "code": "ordered",
                                        "display": "Ordered"
                                    }
                                ]
                            },
                            "doseQuantity": {
                                "value": float(drug["dosage"].split()[0]) if drug["dosage"].split()[0].replace(".", "", 1).isdigit() else 1.0,
                                "unit": drug["dosage"].split()[1] if len(drug["dosage"].split()) > 1 else "unit"
                            }
                        }
                    ]
                }
            ],
            "dispenseRequest": {
                "validityPeriod": {
                    "start": "2026-09-16T19:45:00Z",
                    "end": "2026-09-17T19:45:00Z"
                },
                "numberOfRepeatsAllowed": 0,
                "quantity": {
                    "value": 1,
                    "unit": drug["form"]
                },
                "expectedSupplyDuration": {
                    "value": 24,
                    "unit": "hours",
                    "system": "http://unitsofmeasure.org",
                    "code": "h"
                }
            }
        }

    def get_medication_request(self, med_req_id: str) -> Optional[Dict[str, Any]]:
        return self.medication_requests.get(med_req_id)

    def list_medication_requests(self) -> List[Dict[str, Any]]:
        return list(self.medication_requests.values())

    def create_medication_dispense(
        self,
        scenario: Dict[str, Any],
        courier_name: str,
        courier_badge: str,
        cooler_id: str,
        sensor_id: str,
        current_temp_c: float,
        eta_minutes: int,
        pharmacist_name: str = "Dr. Linda Sterling, PharmD (Vault Supervisor)"
    ) -> Dict[str, Any]:
        """
        Constructs and stores an HL7 FHIR R4 MedicationDispense resource
        with courier assignment, cold-chain packing telemetry, and ETA.
        """
        dispense_id = f"disp-{scenario['indent_id'].lower()}"
        med_req_id = f"medreq-{scenario['indent_id'].lower()}"
        pat = scenario["patient"]
        drug = scenario["drug"]
        
        now = datetime.now(timezone.utc)
        handed_over_time = now.isoformat()
        eta_time = (now + timedelta(minutes=eta_minutes)).isoformat()

        dispense_resource = {
            "resourceType": "MedicationDispense",
            "id": dispense_id,
            "identifier": [
                {
                    "system": "http://hospital.stjude.org/dispense-id",
                    "value": f"DISP-{scenario['order_number']}"
                },
                {
                    "system": "http://hospital.stjude.org/cold-chain-tracking",
                    "value": f"TRACK-{cooler_id}-{sensor_id}"
                }
            ],
            "status": "in-progress",
            "category": {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/medicationdispense-category",
                        "code": "inpatient",
                        "display": "Inpatient Floor Delivery"
                    }
                ]
            },
            "medicationCodeableConcept": {
                "coding": [
                    {
                        "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                        "code": drug["rxcui"],
                        "display": drug["name"]
                    }
                ],
                "text": drug["name"]
            },
            "subject": {
                "reference": f"Patient/{pat['id']}",
                "display": pat["name"]
            },
            "authorizingPrescription": [
                {
                    "reference": f"MedicationRequest/{med_req_id}",
                    "display": f"Doctor Order #{scenario['order_number']}"
                }
            ],
            "performer": [
                {
                    "function": {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/medicationdispense-performer-function",
                                "code": "packager",
                                "display": "Cold Chain Packaging Pharmacist"
                            }
                        ]
                    },
                    "actor": {
                        "reference": "Practitioner/pharm-linda-sterling",
                        "display": pharmacist_name
                    }
                },
                {
                    "function": {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/medicationdispense-performer-function",
                                "code": "courier",
                                "display": "Floor Transport Logistics Courier"
                            }
                        ]
                    },
                    "actor": {
                        "reference": f"Practitioner/{courier_badge.lower()}",
                        "display": f"{courier_name} (Badge #{courier_badge})"
                    }
                }
            ],
            "location": {
                "reference": "Location/central-pharmacy-cold-vault",
                "display": settings.PHARMACY_NAME
            },
            "destination": {
                "reference": f"Location/{pat['unit'].replace(' ', '-').lower()}",
                "display": f"{pat['floor']} - {pat['unit']}"
            },
            "whenPrepared": now.isoformat(),
            "whenHandedOver": handed_over_time,
            # Cold-Chain Transport Extension according to FHIR extension patterns
            "extension": [
                {
                    "url": "http://hospital.org/fhir/StructureDefinition/cold-chain-transport",
                    "extension": [
                        {
                            "url": "containerId",
                            "valueString": cooler_id
                        },
                        {
                            "url": "sensorId",
                            "valueString": sensor_id
                        },
                        {
                            "url": "currentTemperatureCelsius",
                            "valueDecimal": current_temp_c
                        },
                        {
                            "url": "targetTemperatureRange",
                            "valueString": "2.0°C to 8.0°C"
                        },
                        {
                            "url": "temperatureStatus",
                            "valueString": "IN_RANGE" if 2.0 <= current_temp_c <= 8.0 else "ALERT_EXCURSION"
                        },
                        {
                            "url": "courierName",
                            "valueString": courier_name
                        },
                        {
                            "url": "courierBadge",
                            "valueString": courier_badge
                        },
                        {
                            "url": "estimatedArrival",
                            "valueDateTime": eta_time
                        },
                        {
                            "url": "etaMinutes",
                            "valueInteger": eta_minutes
                        }
                    ]
                }
            ]
        }

        self.medication_dispenses[dispense_id] = dispense_resource
        return dispense_resource

    def get_medication_dispense(self, dispense_id: str) -> Optional[Dict[str, Any]]:
        return self.medication_dispenses.get(dispense_id)

    def list_medication_dispenses(self) -> List[Dict[str, Any]]:
        return list(self.medication_dispenses.values())

    async def sync_with_hapi_fhir(self, resource: Dict[str, Any]) -> Dict[str, Any]:
        """
        Optional sync to public HAPI FHIR test server (http://hapi.fhir.org/baseR4).
        Gracefully handles public test server outages.
        """
        res_type = resource.get("resourceType")
        res_id = resource.get("id")
        url = f"{settings.HAPI_FHIR_BASE_URL}/{res_type}/{res_id}"
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.put(url, json=resource)
                return {
                    "success": resp.status_code in [200, 201],
                    "status_code": resp.status_code,
                    "hapi_url": url,
                    "response": resp.json() if "application/json" in resp.headers.get("content-type", "") else resp.text[:200]
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "hapi_url": url,
                "note": "Public HAPI FHIR test server was unreachable; resource stored in local FHIR vault."
            }

fhir_service = FHIRService()
