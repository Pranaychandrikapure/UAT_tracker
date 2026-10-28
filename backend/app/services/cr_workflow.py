from dataclasses import dataclass


class InvalidCRTransition(ValueError):
    pass


class InvalidTaskTransition(ValueError):
    pass


class InvalidDefectTransition(ValueError):
    pass


@dataclass(frozen=True)
class TransitionRule:
    target: str
    permission: str
    reason_required: bool = False


# CR State Machine
TRANSITIONS: dict[str, tuple[TransitionRule, ...]] = {
    "DRAFT": (TransitionRule("SUBMITTED", "cr.submit"), TransitionRule("CANCELLED", "cr.cancel", True)),
    "IMPORTED_REVIEW": (TransitionRule("SUBMITTED", "cr.submit"), TransitionRule("REJECTED", "cr.reject", True)),
    "SUBMITTED": (
        TransitionRule("PENDING_PM_ASSIGNMENT", "cr.submit"),
        TransitionRule("PM_ASSIGNMENT", "cr.assign_pm"),
        TransitionRule("CLARIFICATION_REQUIRED", "cr.request_clarification", True),
        TransitionRule("REJECTED", "cr.reject", True),
    ),
    "PENDING_PM_ASSIGNMENT": (
        TransitionRule("PM_ASSIGNMENT", "cr.assign_pm"),
        TransitionRule("REQUIREMENT_REVIEW", "cr.assign_pm"),
        TransitionRule("CLARIFICATION_REQUIRED", "cr.request_clarification", True),
    ),
    "PM_ASSIGNMENT": (TransitionRule("REQUIREMENT_REVIEW", "cr.assign_pm"),),
    "REQUIREMENT_REVIEW": (
        TransitionRule("IMPACT_ASSESSMENT", "cr.review_requirements"),
        TransitionRule("CLARIFICATION_REQUIRED", "cr.request_clarification", True),
    ),
    "CLARIFICATION_REQUIRED": (TransitionRule("REQUIREMENT_REVIEW", "cr.clarify"),),
    "IMPACT_ASSESSMENT": (TransitionRule("DEADLINE_REVIEW", "cr.assess_impact"),),
    "DEADLINE_REVIEW": (
        TransitionRule("SCOPE_APPROVED", "cr.approve_baseline"),
        TransitionRule("BUSINESS_DECISION_PENDING", "cr.propose_deadline", True),
    ),
    "BUSINESS_DECISION_PENDING": (
        TransitionRule("SCOPE_APPROVED", "cr.approve_baseline"),
        TransitionRule("IMPACT_ASSESSMENT", "cr.revise_scope", True),
        TransitionRule("ON_HOLD", "cr.hold", True),
    ),
    "SCOPE_APPROVED": (TransitionRule("DEVELOPMENT", "cr.start_development"),),
    "DEVELOPMENT": (
        TransitionRule("CODE_REVIEW", "cr.submit_code_review"),
        TransitionRule("SIT", "sit.execute"),
        TransitionRule("ON_HOLD", "cr.hold", True),
        TransitionRule("CHANGE_REVIEW", "cr.request_scope_change", True),
    ),
    "CHANGE_REVIEW": (TransitionRule("DEVELOPMENT", "cr.approve_scope_change"), TransitionRule("ON_HOLD", "cr.hold", True)),
    "CODE_REVIEW": (TransitionRule("SIT", "cr.approve_code_review"), TransitionRule("DEVELOPMENT", "cr.return_development", True)),
    "SIT": (TransitionRule("UAT_READY", "sit.signoff"), TransitionRule("DEVELOPMENT", "sit.fail", True), TransitionRule("ON_HOLD", "cr.hold", True)),
    "UAT_READY": (TransitionRule("UAT", "uat.accept_handoff"), TransitionRule("ON_HOLD", "uat.hold", True)),
    "UAT": (
        TransitionRule("UAT_SIGNED_OFF", "uat.signoff"),
        TransitionRule("DEVELOPMENT", "uat.return_for_fix", True),
        TransitionRule("ON_HOLD", "uat.hold", True),
    ),
    "UAT_SIGNED_OFF": (TransitionRule("BUSINESS_ACCEPTANCE", "cr.business_accept"),),
    "BUSINESS_ACCEPTANCE": (TransitionRule("PRODUCTION_RELEASE", "release.authorize"),),
    "PRODUCTION_RELEASE": (TransitionRule("PRODUCTION_VERIFIED", "release.verify"), TransitionRule("ON_HOLD", "cr.hold", True)),
    "PRODUCTION_VERIFIED": (TransitionRule("CLOSED", "cr.close"),),
    "ON_HOLD": (
        TransitionRule("REQUIREMENT_REVIEW", "cr.resume", True),
        TransitionRule("DEVELOPMENT", "cr.resume", True),
        TransitionRule("UAT", "cr.resume", True),
        TransitionRule("UAT", "uat.accept_handoff", True),
        TransitionRule("UAT", "uat.execute", True),
    ),
    "CLOSED": (TransitionRule("REOPENED", "cr.reopen", True),),
    "REOPENED": (TransitionRule("REQUIREMENT_REVIEW", "cr.review_requirements"),),
}


# Developer Task State Machine
TASK_TRANSITIONS: dict[str, set[str]] = {
    "TODO": {"IN_PROGRESS", "BLOCKED"},
    "IN_PROGRESS": {"BLOCKED", "CODE_REVIEW", "READY_FOR_SIT", "DEVELOPMENT_COMPLETE"},
    "BLOCKED": {"IN_PROGRESS"},
    "CODE_REVIEW": {"READY_FOR_SIT", "IN_PROGRESS", "DEVELOPMENT_COMPLETE"},
    "READY_FOR_SIT": {"SIT_IN_PROGRESS", "IN_PROGRESS", "DEVELOPMENT_COMPLETE"},
    "SIT_IN_PROGRESS": {"SIT_PASSED", "SIT_FAILED", "DEVELOPMENT_COMPLETE"},
    "SIT_FAILED": {"IN_PROGRESS"},
    "SIT_PASSED": {"DEVELOPMENT_COMPLETE"},
    "DEVELOPMENT_COMPLETE": {"IN_PROGRESS"},  # Reopening task if rework required
}


# Defect / Bug State Machine
DEFECT_TRANSITIONS: dict[str, set[str]] = {
    "OPEN": {"ASSIGNED"},
    "ASSIGNED": {"IN_PROGRESS"},
    "IN_PROGRESS": {"FIXED"},
    "FIXED": {"SIT_IN_PROGRESS"},
    "SIT_IN_PROGRESS": {"SIT_PASSED", "IN_PROGRESS"},
    "SIT_PASSED": {"READY_FOR_UAT_DEPLOYMENT"},
    "READY_FOR_UAT_DEPLOYMENT": {"SRN_SENT"},
    "SRN_SENT": {"UAT_DEPLOYED"},  # Triggered ONLY after deployment confirmation
    "UAT_DEPLOYED": {"READY_FOR_RETEST"},
    "READY_FOR_RETEST": {"VERIFIED", "REOPENED"},
    "VERIFIED": {"CLOSED"},
    "REOPENED": {"ASSIGNED", "IN_PROGRESS"},
    "CLOSED": {"REOPENED"},
}


def validate_transition(current: str, target: str, permissions: set[str], reason: str = "") -> TransitionRule:
    rule = next((candidate for candidate in TRANSITIONS.get(current, ()) if candidate.target == target), None)
    if rule is None:
        raise InvalidCRTransition(f"Transition {current} -> {target} is not allowed")
    if rule.permission not in permissions:
        raise InvalidCRTransition(f"Permission {rule.permission} is required")
    if rule.reason_required and not reason.strip():
        raise InvalidCRTransition("A reason is required for this transition")
    return rule


def validate_task_transition(current: str, target: str) -> None:
    allowed = TASK_TRANSITIONS.get(current, set())
    if target not in allowed:
        raise InvalidTaskTransition(f"Task transition from {current} to {target} is not permitted")


def validate_defect_transition(current: str, target: str) -> None:
    allowed = DEFECT_TRANSITIONS.get(current, set())
    if target not in allowed:
        raise InvalidDefectTransition(f"Defect transition from {current} to {target} is not permitted")
