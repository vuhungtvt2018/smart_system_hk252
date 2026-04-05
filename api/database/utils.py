# Utilities for database
def format_risk_tier(probability: float) -> str:
    if probability >= 0.7:
        return "HIGH"
    elif probability >= 0.4:
        return "MEDIUM"
    return "LOW"
