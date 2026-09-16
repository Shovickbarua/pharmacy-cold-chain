"""
HL7 FHIR AuditEvent Specification & Cryptographic Tamper-Proof Audit Trail.
Implements SHA-256 cryptographic hash-chaining across all cold chain events,
ensuring immutable, tamper-evident audit logging for HIPAA compliance.
"""

import hashlib
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone


class AuditEventService:
    def __init__(self):
        # Genesis block hash
        self.GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"
        self.ledger: List[Dict[str, Any]] = []

    def _compute_hash(self, prev_hash: str, payload: Dict[str, Any]) -> str:
        """Computes a deterministic SHA-256 hash over the previous hash and the canonical payload JSON."""
        serialized = json.dumps(payload, sort_keys=True)
        combined = f"{prev_hash}|{serialized}"
        return hashlib.sha256(combined.encode("utf-8")).hexdigest()

    def record_event(
        self,
        event_type: str,
        action: str,
        description: str,
        actor_name: str,
        actor_role: str,
        entity_reference: str,
        details: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Creates an HL7 FHIR AuditEvent resource and seals it into the SHA-256 chain.
        """
        recorded_time = datetime.now(timezone.utc).isoformat()
        index = len(self.ledger)
        prev_hash = self.ledger[-1]["sha256_hash"] if self.ledger else self.GENESIS_HASH
        event_id = f"audit-event-{index + 1:04d}"

        fhir_audit_event = {
            "resourceType": "AuditEvent",
            "id": event_id,
            "type": {
                "system": "http://terminology.hl7.org/CodeSystem/audit-event-type",
                "code": "rest",
                "display": "RESTful Operation"
            },
            "subtype": [
                {
                    "system": "http://hl7.org/fhir/restful-interaction",
                    "code": event_type,
                    "display": description
                }
            ],
            "action": action,  # 'C' (Create), 'R' (Read), 'U' (Update), 'E' (Execute)
            "period": {
                "start": recorded_time
            },
            "recorded": recorded_time,
            "outcome": "0",  # Success
            "outcomeDesc": "Operation verified and cryptographically signed",
            "agent": [
                {
                    "type": {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/extra-security-role-type",
                                "code": actor_role,
                                "display": actor_role.title()
                            }
                        ]
                    },
                    "who": {
                        "display": actor_name
                    },
                    "requestor": True
                }
            ],
            "source": {
                "site": "St. Jude Metropolitan Hospital Central Pharmacy Vault",
                "observer": {
                    "display": "Automated Cold-Chain Telemetry & Dispatch System"
                },
                "type": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/security-source-type",
                        "code": "4",
                        "display": "Application Server"
                    }
                ]
            },
            "entity": [
                {
                    "what": {
                        "reference": entity_reference
                    },
                    "type": {
                        "system": "http://terminology.hl7.org/CodeSystem/audit-entity-type",
                        "code": "2",
                        "display": "System Object"
                    },
                    "lifecycle": {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/dicom-audit-lifecycle",
                                "code": "1",
                                "display": "Origination / Creation"
                            }
                        ]
                    },
                    "detail": [
                        {
                            "type": k,
                            "valueString": str(v)
                        }
                        for k, v in details.items()
                    ]
                }
            ]
        }

        # Calculate cryptographic seal
        current_hash = self._compute_hash(prev_hash, fhir_audit_event)

        ledger_entry = {
            "index": index,
            "event_id": event_id,
            "timestamp": recorded_time,
            "previous_hash": prev_hash,
            "sha256_hash": current_hash,
            "action": action,
            "description": description,
            "actor": f"{actor_name} ({actor_role})",
            "entity": entity_reference,
            "fhir_resource": fhir_audit_event,
            "tampered": False
        }

        self.ledger.append(ledger_entry)
        return ledger_entry

    def get_ledger(self) -> List[Dict[str, Any]]:
        return self.ledger

    def verify_chain_integrity(self) -> Dict[str, Any]:
        """
        Validates the complete cryptographic chain.
        Returns whether the audit trail is valid, or pinpoint the exact altered block if tampered.
        """
        if not self.ledger:
            return {
                "is_valid": True,
                "total_events": 0,
                "status": "CHAIN_EMPTY",
                "message": "No events recorded yet."
            }

        prev_hash = self.GENESIS_HASH
        for idx, entry in enumerate(self.ledger):
            # Check previous hash pointer
            if entry["previous_hash"] != prev_hash:
                return {
                    "is_valid": False,
                    "total_events": len(self.ledger),
                    "tampered_index": idx,
                    "status": "COMPROMISED_PREVIOUS_HASH_MISMATCH",
                    "message": f"Cryptographic break detected at block #{idx}. Expected previous hash {prev_hash[:16]}..., found {entry['previous_hash'][:16]}..."
                }

            # Recalculate hash of FHIR resource payload
            expected_hash = self._compute_hash(prev_hash, entry["fhir_resource"])
            if entry["sha256_hash"] != expected_hash:
                return {
                    "is_valid": False,
                    "total_events": len(self.ledger),
                    "tampered_index": idx,
                    "status": "COMPROMISED_PAYLOAD_TAMPERING",
                    "message": f"Data integrity violation detected at block #{idx}. Stored hash does not match computed SHA-256 signature!"
                }

            prev_hash = entry["sha256_hash"]

        return {
            "is_valid": True,
            "total_events": len(self.ledger),
            "status": "VERIFIED_TAMPER_PROOF",
            "message": f"All {len(self.ledger)} audit records cryptographically verified with unbroken SHA-256 hash chaining."
        }

    def simulate_tampering(self, index: int = 0) -> Dict[str, Any]:
        """
        Simulates an unauthorized database modification to demonstrate
        how the cryptographic chain catches tampering immediately.
        """
        if 0 <= index < len(self.ledger):
            entry = self.ledger[index]
            entry["tampered"] = True
            # Alter the FHIR payload silently
            entry["fhir_resource"]["outcomeDesc"] = "[TAMPERED BY MALICIOUS ACTOR] Log altered to conceal delay"
            return {
                "success": True,
                "tampered_index": index,
                "message": f"Block #{index} payload artificially altered. Run verification to test detection."
            }
        return {"success": False, "message": "Index out of range."}

audit_service = AuditEventService()
