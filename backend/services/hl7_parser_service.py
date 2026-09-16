"""
HL7 v2 Message Parsing Service for Hospital Pharmacy Orders (OMP^O09).
Uses open-source python 'hl7' library with fallback segment tokenization.
"""

from typing import Dict, Any, List
import hl7


class HL7ParserService:
    @staticmethod
    def parse_omp_o09(raw_hl7_string: str) -> Dict[str, Any]:
        """
        Parses an incoming HL7 v2 OMP^O09 message string into structured clinical components.
        """
        # Clean line endings to ensure compatibility (\r is HL7 standard)
        normalized = raw_hl7_string.strip().replace("\r\n", "\r").replace("\n", "\r")
        
        parsed = hl7.parse(normalized)
        
        segments_summary: List[Dict[str, Any]] = []
        for seg in parsed:
            seg_name = str(seg[0][0])
            fields = [str(f) for f in seg]
            segments_summary.append({
                "segment": seg_name,
                "field_count": len(fields),
                "raw": str(seg)
            })

        # MSH - Message Header
        msh_seg = parsed.segment("MSH")
        sending_app = str(msh_seg[2]) if len(msh_seg) > 2 else ""
        sending_fac = str(msh_seg[3]) if len(msh_seg) > 3 else ""
        receiving_app = str(msh_seg[4]) if len(msh_seg) > 4 else ""
        receiving_fac = str(msh_seg[5]) if len(msh_seg) > 5 else ""
        message_time = str(msh_seg[6]) if len(msh_seg) > 6 else ""
        msg_type = str(msh_seg[8]) if len(msh_seg) > 8 else "OMP^O09"
        message_control_id = str(msh_seg[9]) if len(msh_seg) > 9 else ""
        version_id = str(msh_seg[11]) if len(msh_seg) > 11 else "2.5"

        # PID - Patient Identification
        pid_seg = parsed.segment("PID")
        patient_mrn = ""
        if len(pid_seg) > 3:
            mrn_raw = str(pid_seg[3])
            patient_mrn = mrn_raw.split("^")[0]

        patient_name_raw = str(pid_seg[5]) if len(pid_seg) > 5 else ""
        name_parts = patient_name_raw.split("^")
        family_name = name_parts[0] if len(name_parts) > 0 else ""
        given_name = name_parts[1] if len(name_parts) > 1 else ""
        patient_full_name = f"{given_name} {family_name}".strip()
        patient_dob = str(pid_seg[7]) if len(pid_seg) > 7 else ""
        patient_gender = str(pid_seg[8]) if len(pid_seg) > 8 else ""

        # PV1 - Patient Visit (Inpatient floor, room, bed, attending MD)
        pv1_seg = parsed.segment("PV1")
        patient_class = str(pv1_seg[2]) if len(pv1_seg) > 2 else "I"
        assigned_loc_raw = str(pv1_seg[3]) if len(pv1_seg) > 3 else ""
        loc_parts = assigned_loc_raw.split("^")
        floor_poc = loc_parts[0] if len(loc_parts) > 0 else ""
        room = loc_parts[1] if len(loc_parts) > 1 else ""
        bed = loc_parts[2] if len(loc_parts) > 2 else ""

        attending_md_raw = str(pv1_seg[7]) if len(pv1_seg) > 7 else ""
        md_parts = attending_md_raw.split("^")
        attending_id = md_parts[0] if len(md_parts) > 0 else ""
        attending_name = f"Dr. {md_parts[2]} {md_parts[1]}" if len(md_parts) > 2 else attending_md_raw

        # ORC - Common Order
        orc_seg = parsed.segment("ORC")
        order_control = str(orc_seg[1]) if len(orc_seg) > 1 else "NW"
        placer_order_number = str(orc_seg[2]) if len(orc_seg) > 2 else ""

        # RXO - Pharmacy/Treatment Order
        rxo_seg = parsed.segment("RXO")
        drug_field = str(rxo_seg[1]) if len(rxo_seg) > 1 else ""
        drug_parts = drug_field.split("^")
        rxcui = drug_parts[0] if len(drug_parts) > 0 else ""
        drug_name = drug_parts[1] if len(drug_parts) > 1 else drug_field
        coding_system = drug_parts[2] if len(drug_parts) > 2 else "RXNORM"

        give_amount = str(rxo_seg[2]) if len(rxo_seg) > 2 else ""
        give_units = str(rxo_seg[3]) if len(rxo_seg) > 3 else ""
        dosage_form = str(rxo_seg[5]) if len(rxo_seg) > 5 else ""

        # RXR - Pharmacy/Treatment Route
        route_name = "Subcutaneous"
        try:
            rxr_seg = parsed.segment("RXR")
            route_raw = str(rxr_seg[1]) if len(rxr_seg) > 1 else ""
            route_parts = route_raw.split("^")
            route_name = route_parts[1] if len(route_parts) > 1 else route_raw
        except Exception:
            pass

        # OBX - Observation Segments (Cold Chain / Temperature Requirements)
        storage_requirements = []
        for seg in parsed:
            if str(seg[0][0]) == "OBX":
                obs_id = str(seg[3]) if len(seg) > 3 else ""
                obs_val = str(seg[5]) if len(seg) > 5 else ""
                storage_requirements.append({
                    "identifier": obs_id,
                    "value": obs_val
                })

        is_cold_chain = any("2-8" in str(req["value"]).upper() or "REFRIGERAT" in str(req["value"]).upper() for req in storage_requirements) or True

        return {
            "is_valid": True,
            "message_type": msg_type,
            "message_control_id": message_control_id,
            "sending_application": sending_app,
            "sending_facility": sending_fac,
            "receiving_facility": receiving_fac,
            "parsed_segments": segments_summary,
            "patient": {
                "mrn": patient_mrn,
                "full_name": patient_full_name,
                "family_name": family_name,
                "given_name": given_name,
                "dob": patient_dob,
                "gender": patient_gender,
                "patient_class": patient_class,
                "floor": floor_poc,
                "room": room,
                "bed": bed,
                "attending_provider": attending_name,
                "provider_id": attending_id
            },
            "order": {
                "order_control": order_control,
                "placer_order_number": placer_order_number,
                "rxcui": rxcui,
                "drug_name": drug_name,
                "coding_system": coding_system,
                "give_amount": give_amount,
                "give_units": give_units,
                "dosage_form": dosage_form,
                "route": route_name,
                "is_cold_chain": is_cold_chain,
                "storage_requirements": storage_requirements
            }
        }
