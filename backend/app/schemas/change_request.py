import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class ChangeRequestCreate(BaseModel):
    project_id: uuid.UUID
    title: str = Field(min_length=5, max_length=240)
    description: str = Field(min_length=10, max_length=20_000)
    business_justification: str = Field(default="", max_length=10_000)
    priority: str = Field(default="NORMAL", pattern=r"^(LOW|NORMAL|HIGH|URGENT|CRITICAL)$")
    requested_deadline: date | None = None
    primary_pm_id: uuid.UUID | None = None
    lead_dev_id: uuid.UUID | None = None
    impacted_module_ids: list[uuid.UUID] = Field(default_factory=list)
    screen_name: str | None = None
    screen_type: str | None = "EXISTING"
    pl_user_id: uuid.UUID | None = None


class ChangeRequestUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    business_justification: str | None = None
    priority: str | None = None
    requested_deadline: date | None = None
    dev_target_date: date | None = None
    sit_target_date: date | None = None
    uat_target_date: date | None = None
    prod_target_date: date | None = None
    primary_pm_id: uuid.UUID | None = None
    status: str | None = None
    screen_name: str | None = None
    screen_type: str | None = None
    is_uat_unlocked: bool | None = None
    pl_review_status: str | None = None
    pl_user_id: uuid.UUID | None = None
    spm_user_id: uuid.UUID | None = None
    escalation_reason: str | None = None


class ChangeRequestHoldInput(BaseModel):
    hold_reason: str = Field(min_length=3, max_length=2000)
    hold_until_date: date | None = None
    action_type: str = Field(default="REQUEST_HOLD", pattern=r"^(REQUEST_HOLD|DIRECT_HOLD)$")


class ChangeRequestApproveHoldInput(BaseModel):
    action: str = Field(pattern=r"^(APPROVE|REJECT)$")
    remarks: str = Field(default="", max_length=2000)


class ChangeRequestTransition(BaseModel):
    target_status: str = Field(min_length=2, max_length=64)
    reason: str = Field(default="", max_length=4_000)


class ChangeRequestAssignStakeholder(BaseModel):
    user_id: uuid.UUID
    responsibility: str = Field(pattern=r"^(PRIMARY_PM|SUPPORTING_PM|DEV_LEAD|DEVELOPER|UAT_LEAD|UAT_TESTER|BUSINESS_ANALYST)$")
    is_primary: bool = False
    assignment_reason: str = Field(default="", max_length=1_000)


class StakeholderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
    user_name: str | None = None
    user_role: str | None = None
    responsibility: str
    is_primary: bool
    effective_from: datetime
    assignment_reason: str


class ImpactAssessmentCreate(BaseModel):
    dev_complexity: str = Field(default="MEDIUM", pattern=r"^(LOW|MEDIUM|HIGH|COMPLEX)$")
    functional_changes: str = Field(default="", max_length=10_000)
    db_changes: str = Field(default="", max_length=10_000)
    api_changes: str = Field(default="", max_length=10_000)
    frontend_changes: str = Field(default="", max_length=10_000)
    third_party_integrations: str = Field(default="", max_length=10_000)
    dependency_risks: str = Field(default="", max_length=10_000)
    developers_required: int = Field(default=1, ge=1, le=50)
    est_dev_hours: float = Field(default=0.0, ge=0)
    est_sit_hours: float = Field(default=0.0, ge=0)
    est_uat_hours: float = Field(default=0.0, ge=0)
    est_bugfix_buffer_hours: float = Field(default=0.0, ge=0)
    proposed_delivery_date: date | None = None
    release_prep_notes: str = Field(default="", max_length=5_000)
    technical_explanation: str = Field(default="", max_length=10_000)


class ImpactAssessmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    cr_id: uuid.UUID
    assessed_by_user_id: uuid.UUID
    assessor_name: str | None = None
    dev_complexity: str
    functional_changes: str
    db_changes: str
    api_changes: str
    frontend_changes: str
    third_party_integrations: str
    dependency_risks: str
    developers_required: int
    est_dev_hours: float
    est_sit_hours: float
    est_uat_hours: float
    est_bugfix_buffer_hours: float
    proposed_delivery_date: date | None
    release_prep_notes: str
    technical_explanation: str
    assessed_at: datetime


class DeadlineNegotiateRequest(BaseModel):
    proposed_deadline: date
    revision_reason: str = Field(min_length=5, max_length=2_000)


class DeadlineNegotiateApprove(BaseModel):
    action: str = Field(pattern=r"^(ACCEPTED|REJECTED|SCOPE_REDUCED|ESCALATED)$")
    response_notes: str = Field(default="", max_length=2_000)


class ScopeChangeCreate(BaseModel):
    title: str = Field(min_length=5, max_length=240)
    description: str = Field(min_length=10, max_length=10_000)
    additional_effort_hours: float = Field(default=0.0, ge=0)


class ChangeRequestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    reference_number: str
    project_id: uuid.UUID
    project_name: str | None = None
    source: str
    external_record_id: str | None = None
    external_owner_name: str | None = None
    ba_user_id: uuid.UUID
    ba_user_name: str | None = None
    primary_pm_id: uuid.UUID | None = None
    primary_pm_name: str | None = None
    title: str
    description: str
    business_justification: str
    priority: str
    status: str
    requested_deadline: date | None = None
    pm_proposed_deadline: date | None = None
    approved_deadline: date | None = None
    dev_target_date: date | None = None
    sit_target_date: date | None = None
    uat_target_date: date | None = None
    prod_target_date: date | None = None
    dev_completed_at: datetime | None = None
    sit_completed_at: datetime | None = None
    srn_sent_at: datetime | None = None
    uat_deployed_at: datetime | None = None
    uat_signed_off_at: datetime | None = None
    business_accepted_at: datetime | None = None
    prod_deployed_at: datetime | None = None
    closed_at: datetime | None = None
    current_scope_version: int
    hold_reason: str | None = None
    hold_until_date: date | None = None
    hold_status: str | None = None
    screen_name: str | None = None
    screen_type: str | None = "EXISTING"
    is_uat_unlocked: bool = False
    pl_review_status: str | None = "PENDING"
    pl_user_id: uuid.UUID | None = None
    pl_user_name: str | None = None
    spm_user_id: uuid.UUID | None = None
    spm_user_name: str | None = None
    escalation_reason: str | None = None
    assigned_ba_id: uuid.UUID | None = None
    assigned_ba_name: str | None = None
    revert_reason: str | None = None
    reverted_by_role: str | None = None
    reverted_by_user_id: uuid.UUID | None = None
    review_notes: str | None = None
    management_review_status: str | None = "PENDING"
    created_at: datetime
    updated_at: datetime


class ChangeRequestDetailRead(ChangeRequestRead):
    stakeholders: list[dict] = Field(default_factory=list)
    impact_assessment: dict | None = None
    deadline_negotiations: list[dict] = Field(default_factory=list)
    scope_changes: list[dict] = Field(default_factory=list)
    tasks: list[dict] = Field(default_factory=list)
    defects: list[dict] = Field(default_factory=list)
    status_history: list[dict] = Field(default_factory=list)
    email_thread: dict | None = None
    attachments: list[dict] = Field(default_factory=list)
    discussions: list[dict] = Field(default_factory=list)
    activities: list[dict] = Field(default_factory=list)


class ChangeRequestList(BaseModel):
    items: list[ChangeRequestRead]
    total: int
    limit: int
    offset: int


class PLReviewRequest(BaseModel):
    status: str = Field(pattern=r"^(ACCEPTED|ESCALATED)$")
    reason: str | None = None


class DevTaskCompleteRequest(BaseModel):
    is_overdue: bool = False
    overdue_reason: str | None = None


class CRActivityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    cr_id: uuid.UUID
    cr_ref: str
    event_type: str
    actor_name: str
    actor_role: str
    details: str
    created_at: datetime


class SRNReviewRequest(BaseModel):
    status: str = Field(pattern=r"^(REVIEWED|REJECTED)$")
    remarks: str | None = None


class SRNApproveRequest(BaseModel):
    status: str = Field(pattern=r"^(APPROVED|REJECTED)$")
    remarks: str | None = None


class BAGatekeepRequest(BaseModel):
    action: str = Field(pattern=r"^(PASS|HOLD)$")
    remarks: str | None = None
    hold_until_date: date | None = None


class ProductionArtifactsRead(BaseModel):
    cr_id: str
    cr_ref: str
    production_srn: str
    deployment_checklist: str
    rfc_document: str
    generated_at: str


class BAVerifyPayload(BaseModel):
    action: str = Field(pattern=r"^(FORWARD|REVERT)$")
    revert_note: str | None = None
    requested_deadline: date | None = None
    project_id: uuid.UUID | None = None
    impacted_module_ids: list[uuid.UUID] = Field(default_factory=list)
    screen_name: str | None = None
    screen_type: str | None = "EXISTING"
    priority: str | None = None
    remarks: str | None = None
    assigned_pl_ids: list[uuid.UUID] = Field(default_factory=list)


class PLReviewActionPayload(BaseModel):
    action: str = Field(pattern=r"^(REVERT_TO_BA|PASS_TO_MANAGEMENT|APPROVE)$")
    remarks: str = Field(min_length=1, max_length=4000)
    target_pm_id: uuid.UUID | None = None
    target_spm_id: uuid.UUID | None = None


class ManagementReviewActionPayload(BaseModel):
    action: str = Field(pattern=r"^(APPROVE|REQUEST_CHANGES)$")
    remarks: str = Field(min_length=1, max_length=4000)


class PLHandleManagementChangesPayload(BaseModel):
    action: str = Field(pattern=r"^(RESOLVED|REVERT_TO_BA)$")
    remarks: str = Field(min_length=1, max_length=4000)


class DevAssignmentItem(BaseModel):
    module_id: uuid.UUID
    screen_name: str
    developer_id: uuid.UUID
    title: str | None = None
    estimated_hours: float | None = 0.0


class AssignDevelopersPayload(BaseModel):
    mode: str = Field(pattern=r"^(WHOLE_CR|MODULAR_SCREENS)$")
    developer_ids: list[uuid.UUID] = Field(default_factory=list)
    modular_assignments: list[DevAssignmentItem] = Field(default_factory=list)


class CRAttachmentLinkPayload(BaseModel):
    original_name: str = Field(min_length=2, max_length=255)
    file_url: str = Field(min_length=4, max_length=4000)
    file_format: str | None = "EXTERNAL_LINK"
    note: str = Field(default="", max_length=1000)


class CRAttachmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    cr_id: uuid.UUID
    uploader_id: uuid.UUID | None = None
    uploader_name: str
    file_type: str
    original_name: str
    file_url: str
    file_size_bytes: int | None = None
    file_format: str | None = None
    note: str
    created_at: datetime


class CRDiscussionCreate(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    concern_text: str = Field(min_length=5, max_length=10000)
    priority: str = Field(default="NORMAL", pattern=r"^(NORMAL|HIGH|CRITICAL|URGENT)$")
    task_id: uuid.UUID | None = None


class CRDiscussionEscalate(BaseModel):
    escalation_remark: str = Field(min_length=3, max_length=4000)


class CRDiscussionResolve(BaseModel):
    resolution_notes: str = Field(min_length=3, max_length=4000)


class CRDiscussionComment(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


class CRDiscussionMessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    discussion_id: uuid.UUID
    sender_id: uuid.UUID
    sender_name: str
    sender_role: str
    action: str
    message: str
    created_at: datetime


class CRDiscussionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    cr_id: uuid.UUID
    task_id: uuid.UUID | None = None
    developer_id: uuid.UUID
    developer_name: str
    title: str
    concern_text: str
    priority: str
    current_level: str
    status: str
    assigned_role: str
    assigned_user_id: uuid.UUID | None = None
    resolution_notes: str | None = None
    resolved_by_id: uuid.UUID | None = None
    resolved_at: datetime | None = None
    created_at: datetime
    messages: list[CRDiscussionMessageRead] = Field(default_factory=list)
