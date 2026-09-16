import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "Pharmacy Cold Chain IPD System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Cold Chain Thresholds (Refrigerated storage standard 2-8 °C)
    COLD_CHAIN_MIN_TEMP_C: float = 2.0
    COLD_CHAIN_MAX_TEMP_C: float = 8.0
    
    # External APIs
    RXNAV_BASE_URL: str = os.getenv("RXNAV_BASE_URL", "https://rxnav.nlm.nih.gov/REST")
    HAPI_FHIR_BASE_URL: str = os.getenv("HAPI_FHIR_BASE_URL", "http://hapi.fhir.org/baseR4")
    
    # Hospital / Pharmacy Context
    PHARMACY_NAME: str = "Central Inpatient Pharmacy Vault"
    FACILITY_NAME: str = "St. Jude Metropolitan Hospital"

settings = Settings()
