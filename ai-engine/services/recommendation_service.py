def risk_level(score: float) -> str:
    if score >= 75:
        return "HIGH"
    if score >= 45:
        return "MEDIUM"
    return "LOW"


def predicted_incident(features: dict) -> str:
    if features.get("is_electrical"):
        return "Electrical Arc Flash"
    if features.get("is_hot_work"):
        return "Fire or Burn Injury"
    if features.get("is_confined_space"):
        return "Confined Space Exposure"
    if features.get("is_height_work"):
        return "Fall from Height"
    return "General Safety Incident"


def recommended_actions(features: dict, level: str) -> list[str]:
    actions = []
    if level == "HIGH":
        actions.extend(["Supervisor approval required", "Increase safety monitoring"])
    if features.get("requires_gas_testing"):
        actions.append("Gas testing mandatory")
    if features.get("requires_isolation"):
        actions.append("LOTO and isolation verification required")
    if features.get("is_electrical"):
        actions.append("Additional electrical PPE required")
    return actions or ["Proceed with standard PTW controls"]
