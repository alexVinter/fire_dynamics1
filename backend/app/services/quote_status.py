from enum import StrEnum


class QuoteStatus(StrEnum):
    DRAFT = "draft"
    CALCULATED = "calculated"
    APPROVED = "approved"
    WAREHOUSE_CHECK = "warehouse_check"
    REWORK = "rework"
    CONFIRMED = "confirmed"


TRANSITIONS: dict[tuple[QuoteStatus, QuoteStatus], set[str]] = {
    (QuoteStatus.CALCULATED, QuoteStatus.APPROVED): {"manager", "admin"},
    (QuoteStatus.APPROVED, QuoteStatus.WAREHOUSE_CHECK): {"manager", "admin"},
    (QuoteStatus.WAREHOUSE_CHECK, QuoteStatus.CONFIRMED): {"warehouse", "admin"},
    (QuoteStatus.WAREHOUSE_CHECK, QuoteStatus.REWORK): {"warehouse", "admin"},
}

EDITABLE = {QuoteStatus.DRAFT, QuoteStatus.REWORK}
CALCULABLE = {QuoteStatus.DRAFT, QuoteStatus.REWORK}


def can_transition(role: str, from_status: str, to_status: str) -> bool:
    try:
        key = (QuoteStatus(from_status), QuoteStatus(to_status))
    except ValueError:
        return False
    allowed = TRANSITIONS.get(key)
    if allowed is None:
        return False
    return role in allowed
