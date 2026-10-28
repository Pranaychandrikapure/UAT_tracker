import pytest

from app.services.cr_workflow import InvalidCRTransition, validate_transition


def test_valid_transition_requires_permission() -> None:
    rule = validate_transition("DRAFT", "SUBMITTED", {"cr.submit"})
    assert rule.target == "SUBMITTED"


def test_invalid_lifecycle_jump_is_rejected() -> None:
    with pytest.raises(InvalidCRTransition, match="not allowed"):
        validate_transition("DEVELOPMENT", "CLOSED", {"cr.close"})


def test_hold_requires_reason() -> None:
    with pytest.raises(InvalidCRTransition, match="reason"):
        validate_transition("UAT", "ON_HOLD", {"uat.hold"})


def test_hold_accepts_documented_reason() -> None:
    validate_transition("UAT", "ON_HOLD", {"uat.hold"}, "Environment unavailable")
