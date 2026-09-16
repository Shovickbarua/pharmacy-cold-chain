"""
Cold Chain Inpatient Scenarios with full clinical EHR metadata,
HL7 v2 OMP^O09 strings, and FHIR resource representations.
"""

from typing import Dict, Any, List

SCENARIOS: List[Dict[str, Any]] = [
    {
        "id": "scenario-insulin",
        "title": "Humulin R (Insulin Regular Human) - Floor 4 IPD",
        "indent_id": "IND-2026-8801",
        "order_number": "ORD-HL7-9921",
        "urgency": "Stat / High Priority",
        "patient": {
            "id": "pat-773419",
            "mrn": "MRN-773419",
            "name": "Eleanor Vance",
            "family_name": "Vance",
            "given_name": "Eleanor",
            "dob": "1968-04-12",
            "gender": "female",
            "room": "Room 412",
            "bed": "Bed B",
            "floor": "Floor 4 - Oncology & Internal Medicine",
            "unit": "Floor 4 IPD Nursing Station",
            "diagnosis": "Type 2 Diabetes Mellitus with Hyperglycemia"
        },
        "prescriber": {
            "id": "pract-18928374",
            "name": "Dr. Robert Martinez, MD",
            "npi": "18928374",
            "specialty": "Internal Medicine / Endocrinology"
        },
        "requester_nurse": {
            "name": "Sarah Jenkins, RN",
            "badge": "RN-502",
            "device_id": "PAGER-IPD-4-02"
        },
        "drug": {
            "name": "Humulin R 100 UNT/ML Injectable Solution",
            "brand_name": "Humulin R",
            "generic_name": "Insulin Regular Human",
            "rxcui": "311036",
            "dosage": "10 Units Subcutaneous",
            "route": "Subcutaneous",
            "form": "Injectable Solution (Vial)",
            "temp_range_c": "2.0 - 8.0 °C",
            "storage_instructions": "Refrigerate at 2° to 8°C (36° to 46°F). Do not freeze. Protect from direct heat and light.",
            "is_cold_chain": True
        },
        "cold_chain_dispatch": {
            "cooler_id": "COOLER-CC-ALPHA-04",
            "sensor_id": "SENS-TEMP-8891",
            "current_temp_c": 4.1,
            "target_min_c": 2.0,
            "target_max_c": 8.0,
            "condition": "Optimal / Refrigerated",
            "courier_name": "Marcus Vance",
            "courier_badge": "LOG-104",
            "courier_contact": "+1 (555) 019-4821",
            "estimated_minutes": 10
        },
        "raw_hl7_omp_o09": (
            "MSH|^~\\&|EMR_FLOOR4|ST_JUDE_METRO|PHARMACY_CENTRAL|VAULT_COLD_CHAIN|20260916200000||OMP^O09|MSG9921001|P|2.5\r"
            "PID|1||MRN-773419^^^ST_JUDE_METRO||VANCE^ELEANOR||19680412|F\r"
            "PV1|1|I|IPD-FLOOR-4^ROOM-412^BED-B||||18928374^MARTINEZ^ROBERT\r"
            "ORC|NW|ORD-HL7-9921|||SC||^^^20260916200500\r"
            "RXO|311036^Humulin R 100 UNT/ML Injectable Solution^RXNORM|10|UNT||INJ^Injection\r"
            "RXR|SC^Subcutaneous\r"
            "OBX|1|ST|TEMP_CONTROL^Storage Requirement||REFRIGERATED 2-8C COLD CHAIN REQUIRED||||||F"
        )
    },
    {
        "id": "scenario-filgrastim",
        "title": "Filgrastim (Neupogen) - Floor 5 BMT Unit",
        "indent_id": "IND-2026-8802",
        "order_number": "ORD-HL7-9922",
        "urgency": "Urgent Post-Chemotherapy",
        "patient": {
            "id": "pat-902144",
            "mrn": "MRN-902144",
            "name": "David Chen",
            "family_name": "Chen",
            "given_name": "David",
            "dob": "1984-11-03",
            "gender": "male",
            "room": "Room 508",
            "bed": "Bed A",
            "floor": "Floor 5 - Bone Marrow Transplant Unit",
            "unit": "Floor 5 BMT Station",
            "diagnosis": "Neutropenia Secondary to High-Dose Chemotherapy"
        },
        "prescriber": {
            "id": "pract-14492019",
            "name": "Dr. Anita Rao, MD",
            "npi": "14492019",
            "specialty": "Hematology & Oncology"
        },
        "requester_nurse": {
            "name": "Kevin Patel, RN",
            "badge": "RN-771",
            "device_id": "PAGER-IPD-5-01"
        },
        "drug": {
            "name": "Filgrastim 300 MCG in 0.5 ML Prefilled Syringe",
            "brand_name": "Neupogen",
            "generic_name": "Filgrastim (G-CSF)",
            "rxcui": "310344",
            "dosage": "300 mcg Subcutaneous daily",
            "route": "Subcutaneous",
            "form": "Prefilled Syringe",
            "temp_range_c": "2.0 - 8.0 °C",
            "storage_instructions": "Store at 2° to 8°C. Do not freeze. Do not shake. Protect from light.",
            "is_cold_chain": True
        },
        "cold_chain_dispatch": {
            "cooler_id": "COOLER-CC-BETA-02",
            "sensor_id": "SENS-TEMP-9120",
            "current_temp_c": 3.7,
            "target_min_c": 2.0,
            "target_max_c": 8.0,
            "condition": "Optimal / Refrigerated",
            "courier_name": "Emily Torres",
            "courier_badge": "LOG-215",
            "courier_contact": "+1 (555) 019-7740",
            "estimated_minutes": 12
        },
        "raw_hl7_omp_o09": (
            "MSH|^~\\&|EMR_FLOOR5|ST_JUDE_METRO|PHARMACY_CENTRAL|VAULT_COLD_CHAIN|20260916200200||OMP^O09|MSG9922001|P|2.5\r"
            "PID|1||MRN-902144^^^ST_JUDE_METRO||CHEN^DAVID||19841103|M\r"
            "PV1|1|I|IPD-FLOOR-5^ROOM-508^BED-A||||14492019^RAO^ANITA\r"
            "ORC|NW|ORD-HL7-9922|||SC||^^^20260916200700\r"
            "RXO|310344^Filgrastim 300 MCG in 0.5 ML Prefilled Syringe^RXNORM|300|MCG||SYR^Prefilled Syringe\r"
            "RXR|SC^Subcutaneous\r"
            "OBX|1|ST|TEMP_CONTROL^Storage Requirement||REFRIGERATED 2-8C DO NOT SHAKE||||||F"
        )
    },
    {
        "id": "scenario-adalimumab",
        "title": "Adalimumab (Humira) 40 mg/0.8mL - Floor 3 Med/Surg",
        "indent_id": "IND-2026-8803",
        "order_number": "ORD-HL7-9923",
        "urgency": "Routine / Scheduled",
        "patient": {
            "id": "pat-651230",
            "mrn": "MRN-651230",
            "name": "Maria Rodriguez",
            "family_name": "Rodriguez",
            "given_name": "Maria",
            "dob": "1992-06-25",
            "gender": "female",
            "room": "Room 320",
            "bed": "Bed A",
            "floor": "Floor 3 - Medical/Surgical Gastroenterology",
            "unit": "Floor 3 Med/Surg Station",
            "diagnosis": "Severe Crohn's Disease Exacerbation"
        },
        "prescriber": {
            "id": "pract-29831044",
            "name": "Dr. William Hayes, MD",
            "npi": "29831044",
            "specialty": "Gastroenterology"
        },
        "requester_nurse": {
            "name": "Chloe Dupont, RN",
            "badge": "RN-318",
            "device_id": "PAGER-IPD-3-04"
        },
        "drug": {
            "name": "Adalimumab 40 MG/0.8ML Auto-Injector",
            "brand_name": "Humira",
            "generic_name": "Adalimumab",
            "rxcui": "352385",
            "dosage": "40 mg SC maintenance dose",
            "route": "Subcutaneous",
            "form": "Auto-Injector Pen",
            "temp_range_c": "2.0 - 8.0 °C",
            "storage_instructions": "Store refrigerated at 2°C to 8°C. Do not freeze. Protect from light.",
            "is_cold_chain": True
        },
        "cold_chain_dispatch": {
            "cooler_id": "COOLER-CC-GAMMA-01",
            "sensor_id": "SENS-TEMP-7703",
            "current_temp_c": 4.8,
            "target_min_c": 2.0,
            "target_max_c": 8.0,
            "condition": "Optimal / Refrigerated",
            "courier_name": "Jamal Edwards",
            "courier_badge": "LOG-311",
            "courier_contact": "+1 (555) 019-3329",
            "estimated_minutes": 15
        },
        "raw_hl7_omp_o09": (
            "MSH|^~\\&|EMR_FLOOR3|ST_JUDE_METRO|PHARMACY_CENTRAL|VAULT_COLD_CHAIN|20260916200300||OMP^O09|MSG9923001|P|2.5\r"
            "PID|1||MRN-651230^^^ST_JUDE_METRO||RODRIGUEZ^MARIA||19920625|F\r"
            "PV1|1|I|IPD-FLOOR-3^ROOM-320^BED-A||||29831044^HAYES^WILLIAM\r"
            "ORC|NW|ORD-HL7-9923|||SC||^^^20260916200800\r"
            "RXO|352385^Adalimumab 40 MG/0.8ML Auto-Injector^RXNORM|40|MG||INJ^Auto-Injector\r"
            "RXR|SC^Subcutaneous\r"
            "OBX|1|ST|TEMP_CONTROL^Storage Requirement||REFRIGERATED BIOLOGIC 2-8C||||||F"
        )
    },
    {
        "id": "scenario-oxytocin",
        "title": "Oxytocin 10 USP units/mL - Floor 2 Labor & Delivery",
        "indent_id": "IND-2026-8804",
        "order_number": "ORD-HL7-9924",
        "urgency": "Urgent / Labor Induction",
        "patient": {
            "id": "pat-831902",
            "mrn": "MRN-831902",
            "name": "Hannah Scott",
            "family_name": "Scott",
            "given_name": "Hannah",
            "dob": "1997-02-14",
            "gender": "female",
            "room": "Room 204",
            "bed": "Bed 1",
            "floor": "Floor 2 - Labor & Delivery Unit",
            "unit": "Floor 2 L&D Nursing Station",
            "diagnosis": "Full-Term Pregnancy, Labor Induction"
        },
        "prescriber": {
            "id": "pract-38190022",
            "name": "Dr. Sarah Lin, MD",
            "npi": "38190022",
            "specialty": "Obstetrics & Gynecology"
        },
        "requester_nurse": {
            "name": "Melissa Ortiz, RN",
            "badge": "RN-209",
            "device_id": "PAGER-IPD-2-08"
        },
        "drug": {
            "name": "Oxytocin 10 UNT/ML Injectable Solution",
            "brand_name": "Pitocin",
            "generic_name": "Oxytocin",
            "rxcui": "312151",
            "dosage": "10 Units IV infusion",
            "route": "Intravenous",
            "form": "Injectable Solution (Ampule)",
            "temp_range_c": "2.0 - 8.0 °C",
            "storage_instructions": "Store at 2° to 8°C. Do not freeze.",
            "is_cold_chain": True
        },
        "cold_chain_dispatch": {
            "cooler_id": "COOLER-CC-DELTA-06",
            "sensor_id": "SENS-TEMP-6618",
            "current_temp_c": 3.9,
            "target_min_c": 2.0,
            "target_max_c": 8.0,
            "condition": "Optimal / Refrigerated",
            "courier_name": "Lisa Reynolds",
            "courier_badge": "LOG-118",
            "courier_contact": "+1 (555) 019-8812",
            "estimated_minutes": 8
        },
        "raw_hl7_omp_o09": (
            "MSH|^~\\&|EMR_FLOOR2|ST_JUDE_METRO|PHARMACY_CENTRAL|VAULT_COLD_CHAIN|20260916200400||OMP^O09|MSG9924001|P|2.5\r"
            "PID|1||MRN-831902^^^ST_JUDE_METRO||SCOTT^HANNAH||19970214|F\r"
            "PV1|1|I|IPD-FLOOR-2^ROOM-204^BED-1||||38190022^LIN^SARAH\r"
            "ORC|NW|ORD-HL7-9924|||SC||^^^20260916200900\r"
            "RXO|312151^Oxytocin 10 UNT/ML Injectable Solution^RXNORM|10|UNT||INJ^Injectable\r"
            "RXR|IV^Intravenous\r"
            "OBX|1|ST|TEMP_CONTROL^Storage Requirement||REFRIGERATED 2-8C TRANSPORT REQUIRED||||||F"
        )
    }
]

def get_scenario_by_id(scenario_id: str) -> Dict[str, Any]:
    for s in SCENARIOS:
        if s["id"] == scenario_id:
            return s
    return SCENARIOS[0]
