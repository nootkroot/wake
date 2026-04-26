from enum import Enum


class GranularityLevel(str, Enum):
    NEIGHBORHOOD = "NEIGHBORHOOD"
    CITY = "CITY"
    COUNTY = "COUNTY"
    STATE = "STATE"
