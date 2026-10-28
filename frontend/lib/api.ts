export type Role =
  | "System Administrator"
  | "Senior Project Manager"
  | "Project Manager"
  | "Project Lead"
  | "Developer"
  | "BA Lead"
  | "Business Analyst"
  | "UAT Lead"
  | "UAT Manager"
  | "UAT Member"
  | "Senior Management"
  | "Developer Lead"
  | "UAT Tester";

export type ChangeRequest = {
  id: string;
  reference_number: string;
  project_id: string;
  project_name?: string;
  source: "INTERNAL" | "ZOHO";
  external_record_id?: string;
  external_owner_name?: string;
  ba_user_id: string;
  ba_user_name?: string;
  primary_pm_id?: string;
  primary_pm_name?: string;
  pl_user_id?: string;
  pl_user_name?: string;
  spm_user_id?: string;
  spm_user_name?: string;
  assigned_ba_id?: string;
  assigned_ba_name?: string;
  revert_reason?: string;
  reverted_by_role?: string;
  reverted_by_user_id?: string;
  review_notes?: string;
  management_review_status?: string;
  pl_review_status?: "PENDING" | "ACCEPTED" | "NEGOTIATING" | "ESCALATED";
  escalation_reason?: string;
  screen_name?: string;
  screen_type?: "MODIFIED" | "NEW";
  is_uat_unlocked?: boolean;
  title: string;
  description: string;
  business_justification: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT" | "CRITICAL";
  status: string;
  requested_deadline?: string;
  pm_proposed_deadline?: string;
  approved_deadline?: string;
  dev_target_date?: string;
  sit_target_date?: string;
  uat_target_date?: string;
  prod_target_date?: string;
  dev_completed_at?: string;
  sit_completed_at?: string;
  srn_sent_at?: string;
  uat_deployed_at?: string;
  uat_signed_off_at?: string;
  business_accepted_at?: string;
  prod_deployed_at?: string;
  closed_at?: string;
  current_scope_version: number;
  hold_reason?: string;
  hold_until_date?: string;
  hold_status?: string;
  created_at: string;
  updated_at: string;
};

export type DashboardSummary = {
  total: number;
  in_development: number;
  ready_for_uat: number;
  uat_approved: number;
};

export type WorkItem = {
  id: string;
  key: string;
  item_type: "CR" | "CRS";
  title: string;
  description?: string;
  project?: string;
  developer?: string;
  assigned_at?: string;
  due_date?: string;
  status: string;
  priority: string;
  updated_at: string;
};

export type ChangeRequestDetail = ChangeRequest & {
  stakeholders: Array<{
    id: string;
    user_id: string;
    user_name: string;
    user_role?: string;
    responsibility: string;
    is_primary: boolean;
    effective_from?: string;
    assignment_reason: string;
  }>;
  impact_assessment?: {
    id: string;
    dev_complexity: string;
    functional_changes: string;
    db_changes: string;
    api_changes: string;
    frontend_changes: string;
    third_party_integrations: string;
    dependency_risks: string;
    developers_required: number;
    est_dev_hours: number;
    est_sit_hours: number;
    est_uat_hours: number;
    est_bugfix_buffer_hours: number;
    proposed_delivery_date?: string;
    release_prep_notes: string;
    technical_explanation: string;
    assessor_name?: string;
    assessed_at?: string;
  };
  deadline_negotiations: Array<{
    id: string;
    requested_by_name?: string;
    proposed_deadline: string;
    current_approved_deadline?: string;
    revision_reason: string;
    status: string;
    response_notes?: string;
    responded_by_name?: string;
    created_at?: string;
  }>;
  scope_changes: Array<{
    id: string;
    version: number;
    title: string;
    description: string;
    source: string;
    status: string;
    additional_effort_hours: number;
  }>;
  tasks: Array<{
    id: string;
    task_number: string;
    title: string;
    status: string;
    priority: string;
    assigned_developer: string;
    estimated_hours: number;
    actual_hours: number;
    blockers?: string;
  }>;
  defects: Array<{
    id: string;
    bug_number: string;
    title: string;
    severity: string;
    priority: string;
    status: string;
    assigned_developer: string;
  }>;
  status_history: Array<{
    previous_status?: string;
    new_status: string;
    actor_name: string;
    reason: string;
    changed_at?: string;
  }>;
  email_thread?: {
    id: string;
    mailbox: string;
    subject: string;
    root_message_id: string;
    latest_message_id: string;
  };
  attachments?: CRAttachmentItem[];
  discussions?: CRDiscussionItem[];
  activities?: CRActivityEvent[];
};

export type CRAttachmentItem = {
  id: string;
  cr_id: string;
  uploader_id?: string;
  uploader_name: string;
  uploader_role?: string;
  file_type: "UPLOAD" | "EXTERNAL_LINK";
  original_name: string;
  file_url: string;
  file_size_bytes?: number;
  file_format?: string;
  note?: string;
  created_at: string;
};

export type CRDiscussionMessageItem = {
  id: string;
  discussion_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  action: string;
  message: string;
  created_at: string;
};

export type CRDiscussionItem = {
  id: string;
  cr_id: string;
  task_id?: string;
  developer_id: string;
  developer_name: string;
  developer_role?: string;
  title: string;
  concern_text: string;
  priority: "NORMAL" | "HIGH" | "CRITICAL" | "URGENT";
  current_level: "PM" | "SPM" | "PL" | "BA";
  status: "OPEN" | "RESOLVED" | "CLOSED";
  assigned_role: string;
  assigned_user_id?: string;
  resolution_notes?: string;
  resolved_by_id?: string;
  resolved_by_name?: string;
  resolved_by_role?: string;
  resolved_at?: string;
  created_at: string;
  messages: CRDiscussionMessageItem[];
};

export type DevTask = {
  id: string;
  task_number: string;
  cr_id: string;
  cr_number: string;
  cr_title: string;
  module_id: string;
  module_name: string;
  screen_name?: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  assigned_developer_id?: string;
  assigned_developer_name: string;
  estimated_hours: number;
  actual_hours: number;
  start_date?: string;
  due_date?: string;
  is_overdue?: boolean;
  overdue_reason?: string;
  blockers?: string;
  technical_evidence?: string;
  notes?: string;
};

export type Defect = {
  id: string;
  bug_number: string;
  cr_id: string;
  cr_number: string;
  project_name: string;
  module_name: string;
  title: string;
  description: string;
  reproduction_steps?: string;
  severity: "BLOCKER" | "CRITICAL" | "MAJOR" | "MINOR";
  priority: "URGENT" | "HIGH" | "NORMAL" | "LOW";
  status: string;
  assigned_developer_name: string;
  assigned_developer_id?: string;
  reporter_name?: string;
  environment: string;
  evidence_url?: string;
  developer_feedback?: string;
  developer_feedback_attachment?: string;
  resolution_notes?: string;
  sit_passed_at?: string;
  srn_sent_at?: string;
  uat_deployed_at?: string;
  verified_at?: string;
  closed_at?: string;
  created_at: string;
  resolution_attempts?: Array<{
    attempt_number: number;
    developer_name?: string;
    resolution_notes: string;
    code_reference: string;
    sit_result: string;
    sit_notes: string;
    created_at: string;
  }>;
  status_history?: Array<{
    previous_status?: string;
    new_status: string;
    actor_name: string;
    reason: string;
    created_at: string;
  }>;
};

export type ReadyItem = {
  id: string;
  item_type: "CR_CHANGE" | "BUG_FIX";
  item_key: string;
  cr_id: string;
  cr_number: string;
  title: string;
  project_name: string;
  project_id: string;
  module_name: string;
  developer_name: string;
  developer_id?: string;
  dev_status: string;
  sit_status: string;
  fix_date: string;
  status: string;
  severity: string;
  priority: string;
  is_eligible: boolean;
  has_email_thread: boolean;
  thread_subject?: string;
  thread_id?: string;
};

export type SrnDocument = {
  id: string;
  srn_number: string;
  title: string;
  release_version: string;
  target_environment: string;
  status: string;
  project_name: string;
  author_name: string;
  reviewer_pm_name?: string;
  reviewed_at?: string;
  approver_spm_name?: string;
  approved_at?: string;
  ba_gatekeeper_name?: string;
  ba_approved_at?: string;
  ba_hold_reason?: string;
  ba_hold_until?: string;
  approval_stage?: "DRAFT" | "PM_REVIEW" | "SPM_APPROVAL" | "BA_GATEKEEP" | "APPROVED" | "DISPATCHED";
  supporting_service?: string;
  intended_prod_version?: string;
  email_subject?: string;
  recipients_to?: string;
  provider_message_id?: string;
  sent_at?: string;
  created_at: string;
};

export type ProductionArtifacts = {
  cr_id: string;
  cr_number: string;
  project_name: string;
  version: string;
  production_srn: string;
  deployment_checklist: string;
  rfc_document: string;
  generated_at: string;
  generated_by_name: string;
};

export type CRActivityEvent = {
  id: string;
  cr_id?: string;
  cr_number?: string;
  srn_id?: string;
  srn_number?: string;
  event_type: string;
  phase: string;
  actor_name: string;
  actor_role: string;
  title: string;
  details: string;
  timestamp: string;
};

export type Release = {
  id: string;
  release_number: string;
  version: string;
  title: string;
  environment: string;
  project_name: string;
  owner_name: string;
  planned_date?: string;
  status: string;
  release_notes: string;
  deployment?: {
    id: string;
    status: string;
    build_identifier: string;
    confirmation_evidence: string;
    completion_time?: string;
  };
};

export type ManagementKPI = {
  total_crs: number;
  new_crs: number;
  under_review_crs: number;
  in_dev_crs: number;
  in_sit_crs: number;
  ready_uat_crs: number;
  in_uat_crs: number;
  completed_crs: number;
  overdue_crs: number;
  bugs_open: number;
  bugs_fixed: number;
  bugs_awaiting_deployment: number;
  bugs_awaiting_retest: number;
  bugs_reopened: number;
  bugs_closed: number;
  pending_deadline_approvals: number;
  pending_scope_proposals: number;
  srn_sent_count: number;
  deployments_confirmed: number;
};

export type UserItem = {
  id: string;
  employee_code: string;
  email: string;
  display_name: string;
  role_title?: string;
  avatar_url?: string;
  assigned_projects?: Array<{ id: string; code: string; name: string }>;
};

export type AuthUser = {
  id: string;
  employee_code: string;
  username?: string;
  email: string;
  display_name: string;
  role_title: Role;
  avatar_url?: string;
  assigned_projects?: Array<{ id: string; code: string; name: string }>;
  login_method?: "GOOGLE_SSO" | "DEMO" | "EMAIL" | "PASSWORD";
};

export type ScreenItem = {
  id: string;
  module_id: string;
  code: string;
  name: string;
  description?: string;
  screen_type?: string;
  is_active?: boolean;
};

export type ProjectModule = {
  id: string;
  project_id?: string;
  code: string;
  name: string;
  description?: string;
  screens?: ScreenItem[];
};

export type ProjectItem = {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: string;
  modules: ProjectModule[];
};

export type KRARecord = {
  id: string;
  employee_name: string;
  employee_code: string;
  role_title?: string;
  reporting_period: string;
  cr_number?: string;
  cr_title?: string;
  role_played: string;
  tasks_completed: number;
  defects_fixed: number;
  sit_executions_count: number;
  uat_tests_count: number;
  delivery_variance_days: number;
  delays_business_reason: string;
  complexity_weight: number;
  comments: string;
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${BASE_URL}${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function mutateJson<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${BASE_URL}${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: `Request failed with status ${res.status}` }));
      const msg = typeof err.detail === "string" ? err.detail : Array.isArray(err.detail) ? err.detail.map((d: any) => d.msg).join(", ") : `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return (await res.json()) as T;
  } catch (err: any) {
    if (err instanceof Error && !err.message.includes("fetch") && !err.message.includes("NetworkError")) {
      throw err;
    }
    return null;
  }
}

export const api = {
  getKPI: () => fetchJson<ManagementKPI>("/api/v1/reports/management-kpi"),
  getChangeRequests: (params?: string) => fetchJson<{ items: ChangeRequest[]; total: number }>(`/api/v1/change-requests${params ? `?${params}` : ""}`),
  getChangeRequestDetail: (id: string) => fetchJson<ChangeRequestDetail>(`/api/v1/change-requests/${id}`),
  createChangeRequest: (data: any) => fetchJson<ChangeRequest>("/api/v1/change-requests", { method: "POST", body: JSON.stringify(data) }),
  updateChangeRequest: (id: string, data: any) =>
    fetchJson<ChangeRequest>(`/api/v1/change-requests/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  transitionChangeRequest: (id: string, target_status: string, reason: string) =>
    fetchJson<ChangeRequest>(`/api/v1/change-requests/${id}/transitions`, { method: "POST", body: JSON.stringify({ target_status, reason }) }),
  holdChangeRequest: (id: string, data: { action_type?: "REQUEST_HOLD" | "DIRECT_HOLD"; action?: "REQUEST_HOLD" | "DIRECT_HOLD"; hold_reason: string; hold_until_date?: string }) =>
    fetchJson<{ status: string; hold_status: string }>(`/api/v1/change-requests/${id}/hold`, {
      method: "POST",
      body: JSON.stringify({
        action_type: data.action_type || data.action || "REQUEST_HOLD",
        hold_reason: data.hold_reason,
        hold_until_date: data.hold_until_date,
      }),
    }),
  approveHoldChangeRequest: (id: string, data: { action?: "APPROVE" | "REJECT" | "RELEASE"; approve?: boolean; rejection_reason?: string; remarks?: string }) =>
    fetchJson<{ status: string; hold_status: string }>(`/api/v1/change-requests/${id}/approve-hold`, {
      method: "POST",
      body: JSON.stringify({
        action: data.action || (data.approve ? "APPROVE" : "REJECT"),
        remarks: data.remarks || data.rejection_reason || "",
      }),
    }),
  assignStakeholder: (id: string, data: any) =>
    fetchJson<{ status: string }>(`/api/v1/change-requests/${id}/assign-stakeholder`, { method: "POST", body: JSON.stringify(data) }),
  saveImpactAssessment: (id: string, data: any) =>
    fetchJson<{ status: string }>(`/api/v1/change-requests/${id}/impact-assessment`, { method: "POST", body: JSON.stringify(data) }),
  negotiateDeadline: (id: string, proposed_deadline: string, revision_reason: string) =>
    fetchJson<{ status: string }>(`/api/v1/change-requests/${id}/negotiate-deadline`, { method: "POST", body: JSON.stringify({ proposed_deadline, revision_reason }) }),
  respondDeadline: (id: string, action: string, response_notes: string) =>
    fetchJson<{ status: string }>(`/api/v1/change-requests/${id}/respond-deadline`, { method: "POST", body: JSON.stringify({ action, response_notes }) }),
  proposeScopeChange: (id: string, data: any) =>
    fetchJson<{ status: string }>(`/api/v1/change-requests/${id}/scope-changes`, { method: "POST", body: JSON.stringify(data) }),

  getDevTasks: (params?: string) => fetchJson<DevTask[]>(`/api/v1/dev-tasks${params ? `?${params}` : ""}`),
  updateDevTask: (id: string, data: any) => fetchJson<{ status: string }>(`/api/v1/dev-tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  raiseDevDifficulty: (id: string, data: { difficulty_note: string; target_role?: string }) =>
    fetchJson<{ status: string }>(`/api/v1/dev-tasks/${id}/raise-difficulty`, { method: "POST", body: JSON.stringify(data) }),

  getDefects: (params?: string) => fetchJson<Defect[]>(`/api/v1/defects${params ? `?${params}` : ""}`),
  getDefectDetail: (id: string) => fetchJson<Defect>(`/api/v1/defects/${id}`),
  createDefect: (data: any) => fetchJson<{ id: string; bug_number: string }>("/api/v1/defects", { method: "POST", body: JSON.stringify(data) }),
  resolveDefect: (id: string, resolution_notes: string, code_reference: string, attachment_url: string = "") =>
    fetchJson<{ status: string }>(`/api/v1/defects/${id}/resolve`, { method: "POST", body: JSON.stringify({ resolution_notes, code_reference, attachment_url }) }),
  recordDefectFeedback: (id: string, data: { feedback_notes: string; attachment_url?: string }) =>
    fetchJson<{ status: string }>(`/api/v1/defects/${id}/feedback`, { method: "POST", body: JSON.stringify(data) }),
  sitVerifyDefect: (id: string, sit_result: "PASS" | "FAIL", sit_notes: string) =>
    fetchJson<{ status: string }>(`/api/v1/defects/${id}/sit-verify`, { method: "POST", body: JSON.stringify({ sit_result, sit_notes }) }),
  retestDefect: (id: string, retest_result: "PASS" | "FAIL", retest_notes: string, evidence_url: string = "") =>
    fetchJson<{ status: string }>(`/api/v1/defects/${id}/retest`, { method: "POST", body: JSON.stringify({ retest_result, retest_notes, evidence_url }) }),

  getReadyForUatItems: (projectId?: string) => fetchJson<ReadyItem[]>(`/api/v1/srn/ready-items${projectId ? `?project_id=${projectId}` : ""}`),
  generateSrnDraft: (data: any) => fetchJson<any>("/api/v1/srn/draft", { method: "POST", body: JSON.stringify(data) }),
  sendSrn: (data: any) => fetchJson<any>("/api/v1/srn/send", { method: "POST", body: JSON.stringify(data) }),
  getSrnDocuments: () => fetchJson<SrnDocument[]>("/api/v1/srn/documents"),
  getSrnDetail: (id: string) => fetchJson<any>(`/api/v1/srn/documents/${id}`),

  getReleases: () => fetchJson<Release[]>("/api/v1/releases"),
  confirmDeployment: (id: string, evidence: string, build_identifier: string) =>
    fetchJson<{
      status: string;
      deployment_id?: string;
      release_version?: string;
      defects_deployed_count?: number;
      defects_updated?: string[];
    }>(`/api/v1/releases/deployments/${id}/confirm`, { method: "POST", body: JSON.stringify({ evidence, build_identifier }) }),

  getUatCycles: () => fetchJson<any[]>("/api/v1/uat/cycles"),
  getUatExecutions: () => fetchJson<any[]>("/api/v1/uat/executions"),
  runUatExecution: (id: string, status: string, notes: string, actual_result: string) =>
    fetchJson<{ status: string }>(`/api/v1/uat/executions/${id}/run`, { method: "POST", body: JSON.stringify({ status, notes, actual_result }) }),

  // Authentication & SSO
  googleSsoLogin: (data: { email: string; display_name?: string; avatar_url?: string; google_id?: string; id_token?: string }) =>
    fetchJson<{ user: AuthUser; token: string }>("/api/v1/auth/google/callback", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  adminLogin: (username: string, password: string) =>
    fetchJson<{ user: AuthUser; token: string }>("/api/v1/auth/admin/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  emailLogin: (email: string) =>
    fetchJson<{ user: AuthUser; token: string }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  getCurrentUser: (actorId?: string) =>
    fetchJson<AuthUser>("/api/v1/auth/me", {
      headers: actorId ? { "x-actor-id": actorId } : {},
    }),
  logoutAuth: () =>
    fetchJson<{ status: string }>("/api/v1/auth/logout", {
      method: "POST",
    }),

  getUsers: () => fetchJson<UserItem[]>("/api/v1/users"),
  createUser: (
    data: {
      employee_code: string;
      email: string;
      display_name: string;
      role_title: string;
      project_ids?: string[];
    },
    actorId?: string
  ) =>
    fetchJson<UserItem>("/api/v1/users", {
      method: "POST",
      headers: actorId ? { "x-actor-id": actorId } : {},
      body: JSON.stringify(data),
    }),
  updateUserRole: (id: string, role_title: string) =>
    fetchJson<{ status: string; role_title: string }>(`/api/v1/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role_title }) }),
  getProjects: () => fetchJson<ProjectItem[]>("/api/v1/projects"),
  getProjectDetail: (id: string) => fetchJson<ProjectItem>(`/api/v1/projects/${id}`),
  createProject: (data: { code: string; name: string; description?: string; status?: string }, actorId?: string) =>
    mutateJson<ProjectItem>("/api/v1/projects", {
      method: "POST",
      headers: actorId ? { "x-actor-id": actorId } : {},
      body: JSON.stringify(data),
    }),
  updateProject: (id: string, data: { code?: string; name?: string; description?: string; status?: string }, actorId?: string) =>
    mutateJson<ProjectItem>(`/api/v1/projects/${id}`, {
      method: "PATCH",
      headers: actorId ? { "x-actor-id": actorId } : {},
      body: JSON.stringify(data),
    }),
  deleteProject: (id: string, actorId?: string) =>
    mutateJson<{ status: string; message: string }>(`/api/v1/projects/${id}`, {
      method: "DELETE",
      headers: actorId ? { "x-actor-id": actorId } : {},
    }),

  // Modules CRUD
  addProjectModule: (projectId: string, code: string, name: string, description?: string, actorId?: string) =>
    mutateJson<{ status: string; id?: string; code?: string; name?: string }>(`/api/v1/projects/${projectId}/modules`, {
      method: "POST",
      headers: actorId ? { "x-actor-id": actorId } : {},
      body: JSON.stringify({ code, name, description }),
    }),
  updateModule: (moduleId: string, data: { code?: string; name?: string; description?: string }, actorId?: string) =>
    mutateJson<{ status: string }>(`/api/v1/projects/modules/${moduleId}`, {
      method: "PATCH",
      headers: actorId ? { "x-actor-id": actorId } : {},
      body: JSON.stringify(data),
    }),
  deleteModule: (moduleId: string, actorId?: string) =>
    mutateJson<{ status: string; message: string }>(`/api/v1/projects/modules/${moduleId}`, {
      method: "DELETE",
      headers: actorId ? { "x-actor-id": actorId } : {},
    }),

  // Screens & Functionalities CRUD
  getModuleScreens: (moduleId: string) =>
    fetchJson<ScreenItem[]>(`/api/v1/projects/modules/${moduleId}/screens`),
  createScreen: (moduleId: string, data: { code?: string; name: string; description?: string; screen_type?: string }, actorId?: string) =>
    mutateJson<ScreenItem>(`/api/v1/projects/modules/${moduleId}/screens`, {
      method: "POST",
      headers: actorId ? { "x-actor-id": actorId } : {},
      body: JSON.stringify(data),
    }),
  updateScreen: (screenId: string, data: { code?: string; name?: string; description?: string; screen_type?: string; is_active?: boolean }, actorId?: string) =>
    mutateJson<ScreenItem>(`/api/v1/projects/screens/${screenId}`, {
      method: "PATCH",
      headers: actorId ? { "x-actor-id": actorId } : {},
      body: JSON.stringify(data),
    }),
  deleteScreen: (screenId: string, actorId?: string) =>
    mutateJson<{ status: string; message: string }>(`/api/v1/projects/screens/${screenId}`, {
      method: "DELETE",
      headers: actorId ? { "x-actor-id": actorId } : {},
    }),

  addProjectMember: (projectId: string, user_id: string, role_title?: string) =>
    fetchJson<{ status: string }>(`/api/v1/projects/${projectId}/members`, { method: "POST", body: JSON.stringify({ user_id, role_title }) }),
  removeProjectMember: (projectId: string, userId: string) =>
    fetchJson<{ status: string }>(`/api/v1/projects/${projectId}/members/${userId}`, { method: "DELETE" }),
  getKraRecords: () => fetchJson<KRARecord[]>("/api/v1/reports/kra"),
  triggerZohoSync: () => fetchJson<{ status: string }>("/api/v1/zoho/sync", { method: "POST" }),

  // SOP Phase 1-5 Workflows
  acceptCrByPl: (id: string, notes?: string) =>
    fetchJson<{ status: string }>(`/api/v1/change-requests/${id}/pl-accept`, { method: "POST", body: JSON.stringify({ notes }) }),
  escalateCrByPl: (id: string, escalation_reason: string) =>
    fetchJson<{ status: string }>(`/api/v1/change-requests/${id}/pl-escalate`, { method: "POST", body: JSON.stringify({ escalation_reason }) }),
  completeDevTaskWithOverdue: (taskId: string, overdue_reason?: string) =>
    fetchJson<{ status: string }>(`/api/v1/dev-tasks/${taskId}/complete`, { method: "POST", body: JSON.stringify({ overdue_reason }) }),
  reviewSrnByPm: (srnId: string, notes?: string) =>
    fetchJson<{ status: string; approval_stage: string }>(`/api/v1/srn/${srnId}/pm-review`, { method: "POST", body: JSON.stringify({ notes }) }),
  approveSrnBySpm: (srnId: string, notes?: string) =>
    fetchJson<{ status: string; approval_stage: string }>(`/api/v1/srn/${srnId}/spm-approve`, { method: "POST", body: JSON.stringify({ notes }) }),
  gatekeepSrnByBa: (srnId: string, action: "APPROVE" | "HOLD", hold_reason?: string, hold_until_date?: string) =>
    fetchJson<{ status: string; approval_stage: string }>(`/api/v1/srn/${srnId}/ba-gatekeep`, {
      method: "POST",
      body: JSON.stringify({ action, hold_reason, hold_until_date }),
    }),
  generateProductionArtifacts: (crId: string) =>
    fetchJson<ProductionArtifacts>(`/api/v1/change-requests/${crId}/production-artifacts`, { method: "POST" }),
  getCRActivities: (params?: string) =>
    fetchJson<CRActivityEvent[]>(`/api/v1/change-requests/activities${params ? `?${params}` : ""}`),

  // CR Governance & Assignment Lifecycle Workflows
  fetchZohoCRs: (actorId?: string) =>
    fetchJson<{ status: string; synced_count: number; results: any[] }>("/api/v1/zoho/fetch", {
      method: "POST",
      headers: actorId ? { "x-actor-id": actorId } : {},
    }),

  verifyCRByBA: (
    cr_id: string,
    payload: {
      action: "FORWARD" | "REVERT";
      revert_note?: string;
      requested_deadline?: string;
      project_id?: string;
      impacted_module_ids?: string[];
      screen_name?: string;
      screen_type?: string;
      priority?: string;
      remarks?: string;
      assigned_pl_ids?: string[];
    },
    actorId?: string
  ) =>
    fetchJson<{ status: string; action: string; cr_status: string; message: string }>(
      `/api/v1/change-requests/${cr_id}/ba-verify`,
      {
        method: "POST",
        headers: actorId ? { "x-actor-id": actorId } : {},
        body: JSON.stringify(payload),
      }
    ),

  uploadCRAttachment: async (
    cr_id: string,
    file: File,
    note?: string,
    actorId?: string
  ): Promise<CRAttachmentItem> => {
    const formData = new FormData();
    formData.append("file", file);
    if (note) formData.append("note", note);
    const headers: Record<string, string> = {};
    if (actorId) headers["x-actor-id"] = actorId;
    const res = await fetch(`${BASE_URL}/api/v1/change-requests/${cr_id}/attachments/upload`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Failed to upload attachment");
    }
    return res.json();
  },

  linkCRAttachment: (
    cr_id: string,
    payload: { original_name: string; file_url: string; note?: string; file_format?: string },
    actorId?: string
  ) =>
    fetchJson<CRAttachmentItem>(`/api/v1/change-requests/${cr_id}/attachments/link`, {
      method: "POST",
      headers: actorId ? { "x-actor-id": actorId } : {},
      body: JSON.stringify(payload),
    }),

  getCRAttachments: (cr_id: string) =>
    fetchJson<CRAttachmentItem[]>(`/api/v1/change-requests/${cr_id}/attachments`),

  deleteCRAttachment: (cr_id: string, attachment_id: string, actorId?: string) =>
    fetchJson<{ status: string; message: string }>(
      `/api/v1/change-requests/${cr_id}/attachments/${attachment_id}`,
      {
        method: "DELETE",
        headers: actorId ? { "x-actor-id": actorId } : {},
      }
    ),

  reviewCRByPL: (
    cr_id: string,
    payload: {
      action: "REVERT_TO_BA" | "PASS_TO_MANAGEMENT" | "APPROVE";
      remarks: string;
      target_pm_id?: string;
      target_spm_id?: string;
    },
    actorId?: string
  ) =>
    fetchJson<{ status: string; action: string; cr_status: string }>(
      `/api/v1/change-requests/${cr_id}/pl-review`,
      {
        method: "POST",
        headers: actorId ? { "x-actor-id": actorId } : {},
        body: JSON.stringify(payload),
      }
    ),

  reviewCRByManagement: (
    cr_id: string,
    payload: {
      action: "APPROVE" | "REQUEST_CHANGES";
      remarks: string;
    },
    actorId?: string
  ) =>
    fetchJson<{ status: string; action: string; cr_status: string }>(
      `/api/v1/change-requests/${cr_id}/management-review`,
      {
        method: "POST",
        headers: actorId ? { "x-actor-id": actorId } : {},
        body: JSON.stringify(payload),
      }
    ),

  handleManagementChangesByPL: (
    cr_id: string,
    payload: {
      action: "RESOLVED" | "REVERT_TO_BA";
      remarks: string;
    },
    actorId?: string
  ) =>
    fetchJson<{ status: string; action: string; cr_status: string }>(
      `/api/v1/change-requests/${cr_id}/pl-handle-management-changes`,
      {
        method: "POST",
        headers: actorId ? { "x-actor-id": actorId } : {},
        body: JSON.stringify(payload),
      }
    ),

  assignCRDevelopers: (
    cr_id: string,
    payload: {
      mode: "WHOLE_CR" | "MODULAR_SCREENS";
      developer_ids?: string[];
      modular_assignments?: Array<{
        module_id: string;
        screen_name: string;
        developer_id: string;
        title?: string;
        estimated_hours?: number;
      }>;
    },
    actorId?: string
  ) =>
    fetchJson<{ status: string; mode: string; created_tasks: string[]; cr_status: string }>(
      `/api/v1/change-requests/${cr_id}/assign-developers`,
      {
        method: "POST",
        headers: actorId ? { "x-actor-id": actorId } : {},
        body: JSON.stringify(payload),
      }
    ),

  createCRDiscussion: (
    cr_id: string,
    payload: {
      title: string;
      concern_text: string;
      priority: "NORMAL" | "HIGH" | "CRITICAL" | "URGENT";
      task_id?: string;
    },
    actorId?: string
  ) =>
    fetchJson<CRDiscussionItem>(`/api/v1/change-requests/${cr_id}/discussions`, {
      method: "POST",
      headers: actorId ? { "x-actor-id": actorId } : {},
      body: JSON.stringify(payload),
    }),

  escalateCRDiscussion: (
    discussion_id: string,
    escalation_remark: string,
    actorId?: string
  ) =>
    fetchJson<CRDiscussionItem>(
      `/api/v1/change-requests/discussions/${discussion_id}/escalate`,
      {
        method: "POST",
        headers: actorId ? { "x-actor-id": actorId } : {},
        body: JSON.stringify({ escalation_remark }),
      }
    ),

  resolveCRDiscussion: (
    discussion_id: string,
    resolution_notes: string,
    actorId?: string
  ) =>
    fetchJson<CRDiscussionItem>(
      `/api/v1/change-requests/discussions/${discussion_id}/resolve`,
      {
        method: "POST",
        headers: actorId ? { "x-actor-id": actorId } : {},
        body: JSON.stringify({ resolution_notes }),
      }
    ),

  addCRDiscussionComment: (
    discussion_id: string,
    message: string,
    actorId?: string
  ) =>
    fetchJson<CRDiscussionMessageItem>(
      `/api/v1/change-requests/discussions/${discussion_id}/comment`,
      {
        method: "POST",
        headers: actorId ? { "x-actor-id": actorId } : {},
        body: JSON.stringify({ message }),
      }
    ),

  getCRDiscussions: (cr_id: string) =>
    fetchJson<CRDiscussionItem[]>(`/api/v1/change-requests/${cr_id}/discussions`),

  getCRAuditActivities: (cr_id: string) =>
    fetchJson<CRActivityEvent[]>(`/api/v1/change-requests/${cr_id}/activities`),
};
