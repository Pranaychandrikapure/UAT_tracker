"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Award,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bug,
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Filter,
  GitPullRequest,
  History,
  Kanban,
  Layers,
  LayoutDashboard,
  Mail,
  Plus,
  RefreshCw,
  Rocket,
  LogOut,
  Search,
  Send,
  Settings,
  ShieldAlert,
  Star,
  TestTube,
  Unlock,
  Users,
  FileCheck,
  X,
  XCircle,
  PauseCircle,
  MessageSquare,
  Paperclip,
  Edit3,
  ArrowUpRight,
  Trash2,
  FolderPlus,
  Folder,
  Monitor,
  Upload,
  Link as LinkIcon,
  MessageCircle,
  AlertCircle,
  Eye,
  ArrowUp,
  CheckCircle,
} from "lucide-react";
import {
  api,
  ChangeRequest,
  ChangeRequestDetail,
  CRActivityEvent,
  CRAttachmentItem,
  CRDiscussionItem,
  CRDiscussionMessageItem,
  Defect,
  DevTask,
  KRARecord,
  ManagementKPI,
  ProductionArtifacts,
  ProjectItem,
  ProjectModule,
  ReadyItem,
  Release,
  Role,
  ScreenItem,
  AuthUser,
  SrnDocument,
  UserItem,
} from "@/lib/api";
import { LoginView } from "@/components/login-view";
import {
  DEFAULT_CHANGE_REQUESTS,
  DEFAULT_DEFECTS,
  DEFAULT_DEV_TASKS,
  DEFAULT_PROJECTS,
  DEFAULT_READY_ITEMS,
  DEFAULT_RELEASES,
  DEFAULT_SRN_DOCUMENTS,
  DEFAULT_USERS,
} from "@/lib/default-dummy-data";


type View =
  | "Dashboard"
  | "Change Requests"
  | "CR Activity"
  | "Projects"
  | "Teams and Users"
  | "My Tasks"
  | "Development Board"
  | "SIT Testing"
  | "Ready for UAT / Send SRN"
  | "SRN History"
  | "UAT Testing"
  | "Bug Tracker"
  | "Releases and Deployments"
  | "Pending Approvals"
  | "Reports and Analytics"
  | "KRA and Performance"
  | "Admin Settings";

export const viewSlugs: Record<View, string> = {
  "Dashboard": "dashboard",
  "Change Requests": "change-requests",
  "CR Activity": "cr-activity",
  "Projects": "projects",
  "Teams and Users": "teams",
  "My Tasks": "my-tasks",
  "Development Board": "development-board",
  "SIT Testing": "sit-testing",
  "Ready for UAT / Send SRN": "ready-for-uat",
  "SRN History": "srn-history",
  "UAT Testing": "uat-testing",
  "Bug Tracker": "bug-tracker",
  "Releases and Deployments": "releases",
  "Pending Approvals": "pending-approvals",
  "Reports and Analytics": "reports",
  "KRA and Performance": "kra-performance",
  "Admin Settings": "admin-settings",
};

export const slugToView: Record<string, View> = Object.entries(viewSlugs).reduce((acc, [view, slug]) => {
  acc[slug] = view as View;
  return acc;
}, {} as Record<string, View>);

export function getDefaultViewForRole(role: Role): View {
  switch (role) {
    case "Developer":
      return "My Tasks";
    case "UAT Member":
    case "UAT Tester":
      return "Bug Tracker";
    case "UAT Lead":
    case "UAT Manager":
      return "UAT Testing";
    case "Business Analyst":
    case "BA Lead":
      return "Change Requests";
    case "Project Lead":
      return "Change Requests";
    case "Senior Project Manager":
      return "Ready for UAT / Send SRN";
    default:
      return "Dashboard";
  }
}

const navigationItems: Array<{ view: View; label: string; icon: any; roles?: Role[] }> = [
  { view: "Dashboard", label: "Dashboard", icon: LayoutDashboard },
  { view: "Change Requests", label: "Change Requests", icon: GitPullRequest, roles: ["System Administrator", "Senior Project Manager", "Project Manager", "Project Lead", "Developer Lead", "BA Lead", "Business Analyst", "Senior Management", "Developer"] },
  { view: "CR Activity", label: "CR Activity Tracker", icon: Activity, roles: ["System Administrator", "Senior Project Manager", "Project Manager", "Project Lead", "BA Lead", "Business Analyst", "Developer", "Developer Lead", "UAT Lead", "UAT Manager", "UAT Member", "UAT Tester", "Senior Management"] },
  { view: "Projects", label: "Projects & Modules", icon: Layers, roles: ["System Administrator", "Senior Project Manager", "Project Manager", "Project Lead", "Developer Lead", "BA Lead", "Business Analyst", "Senior Management"] },
  { view: "Teams and Users", label: "Teams & Employees", icon: Users, roles: ["System Administrator", "Project Manager", "Senior Management"] },
  { view: "My Tasks", label: "My Tasks (Developer)", icon: CheckSquare, roles: ["Developer", "Developer Lead", "System Administrator", "Project Manager"] },
  { view: "Development Board", label: "Development Board", icon: Kanban, roles: ["Developer", "Developer Lead", "Project Manager", "System Administrator"] },
  { view: "SIT Testing", label: "SIT Testing", icon: TestTube, roles: ["Developer", "Developer Lead", "System Administrator", "UAT Lead"] },
  { view: "Ready for UAT / Send SRN", label: "Ready for UAT / Send SRN", icon: Send, roles: ["Developer", "Developer Lead", "Project Manager", "System Administrator"] },
  { view: "SRN History", label: "SRN History", icon: History, roles: ["Developer", "Developer Lead", "Project Manager", "UAT Lead", "Business Analyst", "System Administrator", "Senior Management"] },
  { view: "UAT Testing", label: "UAT Testing", icon: CheckCircle2, roles: ["UAT Lead", "UAT Tester", "Business Analyst", "Project Manager", "System Administrator"] },
  { view: "Bug Tracker", label: "Bug Tracker", icon: Bug, roles: ["Developer", "Developer Lead", "UAT Lead", "UAT Tester", "Project Manager", "System Administrator"] },
  { view: "Releases and Deployments", label: "Releases & Deployments", icon: Rocket, roles: ["Project Manager", "Developer Lead", "System Administrator", "Senior Management"] },
  { view: "Pending Approvals", label: "Pending Approvals", icon: Clock, roles: ["Business Analyst", "Project Manager", "System Administrator", "Senior Management"] },
  { view: "Reports and Analytics", label: "Reports & Analytics", icon: BarChart3, roles: ["Project Manager", "Developer Lead", "Business Analyst", "Senior Management", "System Administrator"] },
  { view: "KRA and Performance", label: "KRA & Performance", icon: Award, roles: ["Developer", "Developer Lead", "Project Manager", "Senior Management", "System Administrator"] },
  { view: "Admin Settings", label: "Admin Settings", icon: Settings, roles: ["System Administrator"] },
];

const allRoles: Role[] = [
  "System Administrator",
  "Senior Project Manager",
  "Project Manager",
  "Project Lead",
  "Developer",
  "BA Lead",
  "Business Analyst",
  "UAT Lead",
  "UAT Manager",
  "UAT Member",
  "Developer Lead",
  "UAT Tester",
  "Senior Management",
];

const roleActors: Record<Role, { name: string; email: string; title: string }> = {
  "System Administrator": { name: "System Administrator", email: "admin@neml.in", title: "System Administrator" },
  "Senior Project Manager": { name: "Rajat Bodankar", email: "rajat.spm@company.com", title: "Senior Project Manager" },
  "Project Manager": { name: "Harshal Giri", email: "harshal.pm@company.com", title: "Project Manager" },
  "Project Lead": { name: "Harshal Giri", email: "harshal.pm@company.com", title: "Technical Project Lead" },
  "Developer": { name: "Pranay C.", email: "pranay.dev@company.com", title: "Senior Full-Stack Developer" },
  "BA Lead": { name: "Fiona Admin", email: "fiona.admin@company.com", title: "System Administrator & BA Lead" },
  "Business Analyst": { name: "Fiona Admin", email: "fiona.admin@company.com", title: "Business Analyst" },
  "UAT Lead": { name: "Diana Rao", email: "diana.lead@company.com", title: "UAT Lead" },
  "UAT Manager": { name: "Diana Rao", email: "diana.lead@company.com", title: "UAT QA Manager" },
  "UAT Member": { name: "Amit Shah", email: "amit.qa@company.com", title: "QA Tester" },
  "Developer Lead": { name: "Dev Patel", email: "dev.patel@company.com", title: "Backend Developer Lead" },
  "UAT Tester": { name: "Nisha Rao", email: "nisha.uat@company.com", title: "Senior UAT Tester" },
  "Senior Management": { name: "Mark Approver", email: "mark.mgmt@company.com", title: "Senior Delivery Director" },
};

export function getCreatableRoles(role: Role): Role[] {
  switch (role) {
    case "System Administrator":
    case "Senior Management":
      // Admin can create UAT lead, Project Manager, and BA lead also can create others members
      return [
        "Senior Project Manager",
        "Project Manager",
        "BA Lead",
        "Business Analyst",
        "Project Lead",
        "Developer Lead",
        "Developer",
        "UAT Manager",
        "UAT Lead",
        "UAT Member",
        "UAT Tester",
      ];
    case "Senior Project Manager":
    case "Project Manager":
      // Project Manager can create only Senior Project Manager, Project Manager, Developer (and Leads).
      // CANNOT create UAT lead or BA lead.
      return [
        "Senior Project Manager",
        "Project Manager",
        "Project Lead",
        "Developer Lead",
        "Developer",
      ];
    case "Project Lead":
    case "Developer Lead":
      return ["Developer"];
    case "BA Lead":
      // BA lead can create other BAs
      return ["Business Analyst"];
    case "UAT Manager":
    case "UAT Lead":
      // UAT lead can create other UAT testers and members
      return ["UAT Tester", "UAT Member"];
    default:
      return [];
  }
}


export function generateDocxSrnHtml(options: {
  companyName?: string;
  productName?: string;
  moduleName?: string;
  serviceVersion?: string;
  intendedProdVersion?: string;
  srnNumber?: string;
  authorName?: string;
  pmReviewerName?: string;
  pmReviewed?: boolean;
  spmApproverName?: string;
  spmApproved?: boolean;
  releaseDate?: string;
  teamName?: string;
  supportingServices?: Array<{ name: string; date: string; impact: string }>;
  crItems?: Array<{ sr: number; id: string; description: string; module_screen: string; impact: string }>;
  bugItems?: Array<{ sr: number; id: string; description: string; module_screen: string; impact: string }>;
  summaryText?: string;
}): string {
  const company = options.companyName || "NCDEX e Markets Limited (NeML)";
  const product = options.productName || "NAFED V3 Web & Service Application";
  const moduleName = options.moduleName || "NAFED V3 Web & Service Application";
  const version = options.serviceVersion || "V2.0.42U10";
  const prodVersion = options.intendedProdVersion || "V2.0.42";
  const srnNo = options.srnNumber || "20260724";
  const author = options.authorName || "Komal Velukar";
  const pmReviewer = options.pmReviewerName || "Harshal Giri";
  const spmApprover = options.spmApproverName || "Rajat Bodankar";
  const releaseDate = options.releaseDate || "24-07-2026";
  const team = options.teamName || "UPP Team";
  const summary = options.summaryText ||
    "NCDEX e Markets Limited (NeML) is a leading electronic Exchange in India. Deriving strength from the expertise of National Commodity and Derivatives Exchange Ltd (NCDEX). The main aim of the UPP was to implement the State's new agricultural marketing policy & to bring in efficiency and transparency in the agricultural marketing system for efficient price discovery to benefit farmers and other market participants.";

  const services = options.supportingServices && options.supportingServices.length > 0 ? options.supportingServices : [
    { name: "neml-upp-lot-v2-service", date: releaseDate, impact: "Yes" }
  ];

  const crs = options.crItems && options.crItems.length > 0 ? options.crItems : [
    { sr: 1, id: "CR-1048", description: "Lot entry by farmer and nominee threshold upto 80 qtl (UP), center scheduling (GJ)", module_screen: "Registration - Farmer Lot Entry", impact: "Yes" },
    { sr: 2, id: "CR-1049", description: "Self declaration doc for Bihar assaying certificate upload", module_screen: "Assaying - Certificate Upload", impact: "Yes" }
  ];

  const bugs = options.bugItems && options.bugItems.length > 0 ? options.bugItems : [
    { sr: 1, id: "BUG-201", description: "Gate Entry flow purchase bill document cancellation fix", module_screen: "Gate Entry - Center Scheduling", impact: "Yes" }
  ];

  const suppRows = services.map((s) => `
    <tr>
      <td style="border: 1px solid #94a3b8; padding: 6px 10px; font-size: 13px;">${s.name}</td>
      <td style="border: 1px solid #94a3b8; padding: 6px 10px; font-size: 13px; text-align: center;">${s.date}</td>
      <td style="border: 1px solid #94a3b8; padding: 6px 10px; font-size: 13px; text-align: center; font-weight: bold; color: ${s.impact === 'Yes' ? '#16a34a' : '#64748b'};">${s.impact}</td>
    </tr>
  `).join("");

  const crRows = crs.map((cr) => `
    <tr>
      <td style="border: 1px solid #94a3b8; padding: 6px 8px; font-size: 13px; text-align: center;">${cr.sr}.</td>
      <td style="border: 1px solid #94a3b8; padding: 6px 8px; font-size: 13px; font-weight: bold; color: #1e3a8a;">${cr.id}</td>
      <td style="border: 1px solid #94a3b8; padding: 6px 8px; font-size: 13px;">${cr.description}</td>
      <td style="border: 1px solid #94a3b8; padding: 6px 8px; font-size: 13px; color: #475569;">${cr.module_screen}</td>
      <td style="border: 1px solid #94a3b8; padding: 6px 8px; font-size: 13px; text-align: center; font-weight: bold;">${cr.impact}</td>
    </tr>
  `).join("");

  const bugRows = bugs.map((bug) => `
    <tr>
      <td style="border: 1px solid #94a3b8; padding: 6px 8px; font-size: 13px; text-align: center;">${bug.sr}.</td>
      <td style="border: 1px solid #94a3b8; padding: 6px 8px; font-size: 13px; font-weight: bold; color: #b91c1c;">${bug.id}</td>
      <td style="border: 1px solid #94a3b8; padding: 6px 8px; font-size: 13px;">${bug.description}</td>
      <td style="border: 1px solid #94a3b8; padding: 6px 8px; font-size: 13px; color: #475569;">${bug.module_screen}</td>
      <td style="border: 1px solid #94a3b8; padding: 6px 8px; font-size: 13px; text-align: center; font-weight: bold;">${bug.impact}</td>
    </tr>
  `).join("");

  const pmSignText = options.pmReviewed
    ? `<b style="color: #15803d;">[REVIEWED]</b> ${pmReviewer}`
    : `<span style="color: #94a3b8; font-style: italic;">Pending Review</span>`;

  const spmSignText = options.spmApproved
    ? `<b style="color: #15803d;">[APPROVED]</b> ${spmApprover}`
    : `<span style="color: #94a3b8; font-style: italic;">Pending Executive Sign-off</span>`;

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #1e293b; max-width: 880px; margin: 0 auto; background: #ffffff; padding: 24px; border: 1px solid #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <!-- TITLE BLOCK (NeML Standardized Header) -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 2px solid #0f172a; text-align: center;">
        <tr style="background: #1e293b; color: #ffffff;">
          <td style="padding: 10px; font-size: 16px; font-weight: bold; letter-spacing: 0.5px;">${company}</td>
        </tr>
        <tr style="background: #334155; color: #f8fafc;">
          <td style="padding: 8px; font-size: 15px; font-weight: bold;">Software Release Note</td>
        </tr>
        <tr style="background: #f1f5f9; color: #0f172a;">
          <td style="padding: 8px; font-size: 14px; font-weight: 600;">Release for ${product} and Service ${version}</td>
        </tr>
        <tr style="background: #ffffff; color: #475569;">
          <td style="padding: 6px; font-size: 12px; font-style: italic;">${team} &bull; ${releaseDate}</td>
        </tr>
      </table>

      <!-- SUPPORTING SERVICE TABLE -->
      <div style="margin-bottom: 16px;">
        <h4 style="margin: 0 0 6px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a;">Supporting Service</h4>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #94a3b8;">
          <thead>
            <tr style="background: #f8fafc; font-size: 12px; text-align: left; color: #334155;">
              <th style="border: 1px solid #94a3b8; padding: 6px 10px;">Supporting Service</th>
              <th style="border: 1px solid #94a3b8; padding: 6px 10px; text-align: center; width: 140px;">Released Date</th>
              <th style="border: 1px solid #94a3b8; padding: 6px 10px; text-align: center; width: 100px;">Impact</th>
            </tr>
          </thead>
          <tbody>
            ${suppRows}
          </tbody>
        </table>
      </div>

      <!-- SOFTWARE RELEASE NOTES METADATA BLOCK -->
      <div style="margin-bottom: 18px;">
        <div style="background: #0f172a; color: #ffffff; padding: 6px 10px; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
          SOFTWARE RELEASE NOTES
        </div>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #94a3b8; font-size: 13px;">
          <tr>
            <td style="border: 1px solid #94a3b8; padding: 6px 10px; width: 50%;"><b>Product Name:</b> ${product}</td>
            <td style="border: 1px solid #94a3b8; padding: 6px 10px; width: 50%;"><b>Module Name:</b> ${moduleName}</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="border: 1px solid #94a3b8; padding: 6px 10px;"><b>SRN No:</b> ${srnNo}</td>
            <td style="border: 1px solid #94a3b8; padding: 6px 10px;"><b>Author Name:</b> ${author}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #94a3b8; padding: 6px 10px;"><b>Intended Prod Version:</b> ${prodVersion}</td>
            <td style="border: 1px solid #94a3b8; padding: 6px 10px;"><b>Version:</b> ${version}</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="border: 1px solid #94a3b8; padding: 6px 10px;" colspan="2">
              <b>SRN Type:</b> &nbsp;&nbsp; 
              <span style="color: #64748b;">&#9633; Final</span> &nbsp;&nbsp;&nbsp;
              <span style="color: #64748b;">&#9633; Training</span> &nbsp;&nbsp;&nbsp;
              <span style="color: #64748b;">&#9633; Demo</span> &nbsp;&nbsp;&nbsp;
              <span style="color: #1e3a8a; font-weight: bold;">&#9745; UAT</span>
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid #94a3b8; padding: 6px 10px;" colspan="2"><b>Release Date:</b> ${releaseDate}</td>
          </tr>
        </table>
      </div>

      <!-- SUMMARY -->
      <div style="margin-bottom: 18px;">
        <h4 style="margin: 0 0 4px; font-size: 14px; color: #0f172a;">Summary:</h4>
        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #334155;">${summary}</p>
      </div>

      <!-- 1. CONTENTS OF THIS RELEASE -->
      <div style="margin-bottom: 18px;">
        <h4 style="margin: 0 0 8px; font-size: 14px; color: #0f172a;">1. Contents of this Release</h4>
        
        <!-- 1.1 New Features / Enhancements -->
        <h5 style="margin: 8px 0 6px; font-size: 13px; color: #1e3a8a;">1.1 New Features / Enhancements</h5>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #94a3b8; margin-bottom: 14px;">
          <thead>
            <tr style="background: #f1f5f9; font-size: 12px; text-align: left; color: #334155;">
              <th style="border: 1px solid #94a3b8; padding: 6px 8px; width: 45px; text-align: center;">Sr.No.</th>
              <th style="border: 1px solid #94a3b8; padding: 6px 8px; width: 100px;">CR id</th>
              <th style="border: 1px solid #94a3b8; padding: 6px 8px;">Description</th>
              <th style="border: 1px solid #94a3b8; padding: 6px 8px; width: 220px;">Impacted modules with screen</th>
              <th style="border: 1px solid #94a3b8; padding: 6px 8px; width: 65px; text-align: center;">Impact</th>
            </tr>
          </thead>
          <tbody>
            ${crRows}
          </tbody>
        </table>

        <!-- 1.2 Bug Fixes -->
        <h5 style="margin: 8px 0 6px; font-size: 13px; color: #b91c1c;">1.2 Bug Fixes</h5>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #94a3b8;">
          <thead>
            <tr style="background: #f1f5f9; font-size: 12px; text-align: left; color: #334155;">
              <th style="border: 1px solid #94a3b8; padding: 6px 8px; width: 45px; text-align: center;">Sr.No.</th>
              <th style="border: 1px solid #94a3b8; padding: 6px 8px; width: 100px;">Bug id</th>
              <th style="border: 1px solid #94a3b8; padding: 6px 8px;">Description</th>
              <th style="border: 1px solid #94a3b8; padding: 6px 8px; width: 220px;">Impacted modules with screen</th>
              <th style="border: 1px solid #94a3b8; padding: 6px 8px; width: 65px; text-align: center;">Impact</th>
            </tr>
          </thead>
          <tbody>
            ${bugRows}
          </tbody>
        </table>
      </div>

      <!-- SIGN-OFF / APPROVALS TABLE (NO ACTIVITY TABLE) -->
      <div style="margin-top: 20px;">
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #94a3b8; font-size: 13px;">
          <thead>
            <tr style="background: #f8fafc; font-size: 12px; text-align: left; color: #334155;">
              <th style="border: 1px solid #94a3b8; padding: 6px 10px; width: 140px;"></th>
              <th style="border: 1px solid #94a3b8; padding: 6px 10px;">Name, Signature, and Designation</th>
              <th style="border: 1px solid #94a3b8; padding: 6px 10px; width: 120px; text-align: center;">Date</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #94a3b8; padding: 8px 10px; font-weight: bold; background: #f8fafc;">Prepared By:</td>
              <td style="border: 1px solid #94a3b8; padding: 8px 10px;"><b>${author}</b>, Software Engineer</td>
              <td style="border: 1px solid #94a3b8; padding: 8px 10px; text-align: center;">${releaseDate}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #94a3b8; padding: 8px 10px; font-weight: bold; background: #f8fafc;">Reviewed By:</td>
              <td style="border: 1px solid #94a3b8; padding: 8px 10px;">${pmSignText}</td>
              <td style="border: 1px solid #94a3b8; padding: 8px 10px; text-align: center;">${options.pmReviewed ? releaseDate : ""}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #94a3b8; padding: 8px 10px; font-weight: bold; background: #f8fafc;">Approved By:</td>
              <td style="border: 1px solid #94a3b8; padding: 8px 10px;">${spmSignText}</td>
              <td style="border: 1px solid #94a3b8; padding: 8px 10px; text-align: center;">${options.spmApproved ? releaseDate : ""}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

const initialSampleActivities: CRActivityEvent[] = [
  {
    id: "act-1",
    cr_id: "cr-1048",
    cr_number: "CR-1048",
    event_type: "CR_INITIATION",
    phase: "Phase 1: Initiation",
    actor_name: "Alice BA",
    actor_role: "Business Analyst",
    title: "CR-1048 Initiated from Zoho CRM (ZH-CR-9921)",
    details: "Change Request ingested for NAFED Web & Service Application V3. Impacted Module: Registration. Screens Modified: Farmer Lot Entry, Assaying Certificate Upload.",
    timestamp: "2026-07-20 10:15",
  },
  {
    id: "act-2",
    cr_id: "cr-1048",
    cr_number: "CR-1048",
    event_type: "PL_REVIEW",
    phase: "Phase 1: Allocation",
    actor_name: "Harshal Giri",
    actor_role: "Project Lead",
    title: "Project Lead Technical Scope & Timeline Review",
    details: "Technical Lead evaluated functional complexity and database alterations. Negotiated lot threshold boundary with BA and accepted baseline.",
    timestamp: "2026-07-20 14:30",
  },
  {
    id: "act-3",
    cr_id: "cr-1048",
    cr_number: "CR-1048",
    event_type: "TASK_ALLOCATED",
    phase: "Phase 1: Allocation",
    actor_name: "Bob PM",
    actor_role: "Project Manager",
    title: "Module Task Allocated to Developer",
    details: "Assigned Task TSK-1048-A to Developer Komal Velukar. Task deadline aligned strictly to CR master deadline (2026-07-22).",
    timestamp: "2026-07-20 16:45",
  },
  {
    id: "act-4",
    cr_id: "cr-1048",
    cr_number: "CR-1048",
    event_type: "OVERDUE_REMARK",
    phase: "Phase 2: Execution",
    actor_name: "Komal Velukar",
    actor_role: "Developer",
    title: "Task Marked Development Completed with Overdue Protocol",
    details: "Completed code implementation past assigned deadline. Mandatory delay reason recorded: 'Assaying third-party API payload change required schema revision.'",
    timestamp: "2026-07-23 11:20",
  },
  {
    id: "act-5",
    cr_id: "cr-1048",
    cr_number: "CR-1048",
    srn_id: "srn-doc-20260724",
    srn_number: "SRN-20260724",
    event_type: "UAT_MAPPING",
    phase: "Phase 3: UAT Prep",
    actor_name: "Komal Velukar",
    actor_role: "Developer",
    title: "CR Status Advanced to UAT & Release Impact Mapped",
    details: "Bundled CR-1048 and CR-1049 into Release V2.0.42U10. Screen modifications explicitly mapped: Farmer Lot Entry, Gate Entry center scheduling.",
    timestamp: "2026-07-23 15:40",
  },
  {
    id: "act-6",
    cr_id: "cr-1048",
    cr_number: "CR-1048",
    srn_id: "srn-doc-20260724",
    srn_number: "SRN-20260724",
    event_type: "SRN_PM_REVIEW",
    phase: "Phase 4: Management Sign-off",
    actor_name: "Bob PM",
    actor_role: "Project Manager",
    title: "Software Release Note Reviewed by PM",
    details: "PM reviewed release document and confirmed supporting service neml-upp-lot-v2-service impact. Formally signed off as Reviewer.",
    timestamp: "2026-07-24 09:30",
  },
  {
    id: "act-7",
    cr_id: "cr-1048",
    cr_number: "CR-1048",
    srn_id: "srn-doc-20260724",
    srn_number: "SRN-20260724",
    event_type: "SRN_SPM_APPROVAL",
    phase: "Phase 4: Management Sign-off",
    actor_name: "Rajat Bodankar",
    actor_role: "Senior Project Manager",
    title: "Executive Sign-off Provided by SPM",
    details: "SPM verified risk factors and delivery targets. Provided final executive sign-off as Approver. Routed release note to BA gatekeeper.",
    timestamp: "2026-07-24 11:15",
  },
  {
    id: "act-8",
    cr_id: "cr-1048",
    cr_number: "CR-1048",
    srn_id: "srn-doc-20260724",
    srn_number: "SRN-20260724",
    event_type: "BA_GATEKEEP_APPROVE",
    phase: "Phase 4: BA Gatekeeping",
    actor_name: "Alice BA",
    actor_role: "Business Analyst",
    title: "BA Gatekeeping Approved for Deployment",
    details: "Business Analyst reviewed release note and confirmed functional scope alignment. Approved immediate deployment to UAT environment.",
    timestamp: "2026-07-24 13:00",
  },
  {
    id: "act-9",
    cr_id: "cr-1048",
    cr_number: "CR-1048",
    srn_id: "srn-doc-20260724",
    srn_number: "SRN-20260724",
    event_type: "SRN_EMAIL_DISPATCHED",
    phase: "Phase 4: SRN Dispatch",
    actor_name: "Email Engine / System Admin",
    actor_role: "System Administrator",
    title: "SRN Dispatched via Consolidated Email Thread",
    details: "Approved SRN dispatched to uat-team@company.com with Message-ID <srn-neml-20260724@neml.in>. Thread reference: In-Reply-To <thread-nafed-lot-entry@neml.in>.",
    timestamp: "2026-07-24 14:15",
  },
  {
    id: "act-10",
    cr_id: "cr-1048",
    cr_number: "CR-1048",
    event_type: "UAT_UNLOCKED",
    phase: "Phase 4: UAT Unlock",
    actor_name: "Security Policy Enforcement",
    actor_role: "System Governance",
    title: "Security Rule: CR Unlocked for UAT Bug Assign Screen",
    details: "SRN approval and email dispatch confirmed. System unlocked CR-1048 for UAT team access and bug tracking.",
    timestamp: "2026-07-24 14:16",
  },
  {
    id: "act-11",
    cr_id: "cr-1048",
    cr_number: "CR-1048",
    event_type: "BUG_LOGGED",
    phase: "Phase 5: Testing & Bugs",
    actor_name: "Diana Rao",
    actor_role: "UAT Lead",
    title: "Defect BUG-201 Logged Against Mapped Screen",
    details: "Testing on 'Farmer Lot Entry' screen revealed validation defect when lot threshold exceeds 80 qtl. Assigned to Developer Komal Velukar.",
    timestamp: "2026-07-24 16:30",
  },
  {
    id: "act-12",
    cr_id: "cr-1048",
    cr_number: "CR-1048",
    srn_id: "srn-doc-20260724-fix1",
    srn_number: "SRN-20260724-FIX",
    event_type: "BUG_FIX_SRN",
    phase: "Phase 5: Testing & Bugs",
    actor_name: "Komal Velukar",
    actor_role: "Developer",
    title: "Bug Fix SRN Dispatched as Reply to Master SRN Thread",
    details: "Defect BUG-201 resolved and SIT verified. Bug Fix SRN automatically dispatched as reply to <srn-neml-20260724@neml.in> consolidating discussion.",
    timestamp: "2026-07-25 10:45",
  },
  {
    id: "act-13",
    cr_id: "cr-1048",
    cr_number: "CR-1048",
    event_type: "PROD_ARTIFACTS_GENERATED",
    phase: "Phase 5: Production Readiness",
    actor_name: "Diana Rao",
    actor_role: "UAT Lead",
    title: "UAT Sign-off & Production Package Artifacts Generated",
    details: "All UAT cycles completed with zero blockers. Marked 'Ready for Production'. Generated Production SRN, Deployment Checklist, and RFC.",
    timestamp: "2026-07-25 15:00",
  },
];

export function DashboardApp() {
  // Authentication & SSO Session
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("uat_auth_user");
        if (saved) {
          const u = JSON.parse(saved);
          setCurrentUser(u);
          if (u.role_title) {
            setCurrentRole(u.role_title);
          }
        }
      } catch {}
    }
  }, []);

  const handleLogout = async () => {
    try {
      await api.logoutAuth();
    } catch {}
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("uat_auth_user");
      } catch {}
    }
    setCurrentUser(null);
    showToast("Signed out successfully.");
  };

  const [activeView, setActiveView] = useState<View>("Dashboard");
  const [currentRole, setCurrentRole] = useState<Role>("System Administrator");
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [connected, setConnected] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Self Activity Scopes for Developer
  const [defectScopeFilter, setDefectScopeFilter] = useState<"MY_BUGS" | "ALL_BUGS">("MY_BUGS");
  const [crScopeFilter, setCrScopeFilter] = useState<"MY_CRS" | "ALL_CRS">("MY_CRS");

  // Core Data States
  const [kpi, setKpi] = useState<ManagementKPI>({
    total_crs: 5,
    new_crs: 1,
    under_review_crs: 1,
    in_dev_crs: 1,
    in_sit_crs: 0,
    ready_uat_crs: 1,
    in_uat_crs: 1,
    completed_crs: 1,
    overdue_crs: 0,
    bugs_open: 1,
    bugs_fixed: 1,
    bugs_awaiting_deployment: 1,
    bugs_awaiting_retest: 1,
    bugs_reopened: 0,
    bugs_closed: 1,
    pending_deadline_approvals: 1,
    pending_scope_proposals: 0,
    srn_sent_count: 1,
    deployments_confirmed: 1,
  });

  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>(DEFAULT_CHANGE_REQUESTS);
  const [selectedCrDetail, setSelectedCrDetail] = useState<ChangeRequestDetail | null>(null);
  const [crDetailLoading, setCrDetailLoading] = useState(false);
  const [crActiveTab, setCrActiveTab] = useState("overview");

  const [devTasks, setDevTasks] = useState<DevTask[]>(DEFAULT_DEV_TASKS);
  const [defects, setDefects] = useState<Defect[]>(DEFAULT_DEFECTS);
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  const [releases, setReleases] = useState<Release[]>(DEFAULT_RELEASES);
  const [readyItems, setReadyItems] = useState<ReadyItem[]>(DEFAULT_READY_ITEMS);
  const [selectedReadyItemIds, setSelectedReadyItemIds] = useState<string[]>([]);
  const [srnDocuments, setSrnDocuments] = useState<SrnDocument[]>(DEFAULT_SRN_DOCUMENTS);
  const [selectedSrnDoc, setSelectedSrnDoc] = useState<any | null>(null);
  const [users, setUsers] = useState<UserItem[]>(DEFAULT_USERS);
  const [projects, setProjects] = useState<ProjectItem[]>(DEFAULT_PROJECTS);
  const [kraRecords, setKraRecords] = useState<KRARecord[]>([]);

  // Modals
  const [createCrOpen, setCreateCrOpen] = useState(false);
  const [crForm, setCrForm] = useState({
    title: "",
    description: "",
    business_justification: "",
    project_id: "",
    priority: "NORMAL",
    requested_deadline: "",
    primary_pm_id: "",
    lead_dev_id: "",
    module_id: "",
    screen_name: "",
    screen_type: "MODIFIED" as "MODIFIED" | "NEW",
  });

  const [editCrModalOpen, setEditCrModalOpen] = useState(false);
  const [editCrForm, setEditCrForm] = useState({
    id: "",
    title: "",
    description: "",
    business_justification: "",
    priority: "NORMAL",
    requested_deadline: "",
    approved_deadline: "",
  });

  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [holdTargetCr, setHoldTargetCr] = useState<ChangeRequest | ChangeRequestDetail | null>(null);
  const [holdForm, setHoldForm] = useState({ hold_until_date: "", hold_reason: "" });

  // Zoho Fetch & CR Governance Lifecycle States
  const [isFetchingZoho, setIsFetchingZoho] = useState(false);

  // BA Verification & Revert States
  const [baVerifyModalOpen, setBaVerifyModalOpen] = useState(false);
  const [baVerifyTargetCr, setBaVerifyTargetCr] = useState<ChangeRequest | ChangeRequestDetail | null>(null);
  const [baVerifyAction, setBaVerifyAction] = useState<"FORWARD" | "REVERT">("FORWARD");
  const [baVerifyRevertReason, setBaVerifyRevertReason] = useState("");
  const [baVerifyProjectId, setBaVerifyProjectId] = useState("");
  const [baVerifyDeadline, setBaVerifyDeadline] = useState("");
  const [baVerifyPriority, setBaVerifyPriority] = useState("NORMAL");
  const [baVerifyModuleId, setBaVerifyModuleId] = useState("");
  const [baVerifyScreenName, setBaVerifyScreenName] = useState("");
  const [baVerifyScreenType, setBaVerifyScreenType] = useState<"EXISTING" | "NEW" | "MODIFIED">("EXISTING");
  const [baVerifyRemarks, setBaVerifyRemarks] = useState("");
  const [baVerifySelectedPlIds, setBaVerifySelectedPlIds] = useState<string[]>([]);
  const [baVerifyUploadFile, setBaVerifyUploadFile] = useState<File | null>(null);
  const [baVerifyUploadNote, setBaVerifyUploadNote] = useState("");
  const [baVerifyLinkUrl, setBaVerifyLinkUrl] = useState("");
  const [baVerifyLinkName, setBaVerifyLinkName] = useState("");
  const [isSubmittingBaVerify, setIsSubmittingBaVerify] = useState(false);

  // Project Lead Review States
  const [plGovReviewModalOpen, setPlGovReviewModalOpen] = useState(false);
  const [plGovTargetCr, setPlGovTargetCr] = useState<ChangeRequest | ChangeRequestDetail | null>(null);
  const [plGovAction, setPlGovAction] = useState<"REVERT_TO_BA" | "PASS_TO_MANAGEMENT" | "APPROVE">("PASS_TO_MANAGEMENT");
  const [plGovRemarks, setPlGovRemarks] = useState("");
  const [plGovTargetPmId, setPlGovTargetPmId] = useState("");
  const [isSubmittingPlGovReview, setIsSubmittingPlGovReview] = useState(false);

  // Management Review (SPM / PM) States
  const [mgmtReviewModalOpen, setMgmtReviewModalOpen] = useState(false);
  const [mgmtReviewTargetCr, setMgmtReviewTargetCr] = useState<ChangeRequest | ChangeRequestDetail | null>(null);
  const [mgmtAction, setMgmtAction] = useState<"APPROVE" | "REQUEST_CHANGES">("APPROVE");
  const [mgmtRemarks, setMgmtRemarks] = useState("");
  const [isSubmittingMgmtReview, setIsSubmittingMgmtReview] = useState(false);

  // PL Handle Management Changes States
  const [plChangesModalOpen, setPlChangesModalOpen] = useState(false);
  const [plChangesTargetCr, setPlChangesTargetCr] = useState<ChangeRequest | ChangeRequestDetail | null>(null);
  const [plChangesAction, setPlChangesAction] = useState<"RESOLVED" | "REVERT_TO_BA">("RESOLVED");
  const [plChangesRemarks, setPlChangesRemarks] = useState("");
  const [isSubmittingPlChanges, setIsSubmittingPlChanges] = useState(false);

  // Developer Assignment States (Whole CR vs Modular Screens)
  const [devAssignModalOpen, setDevAssignModalOpen] = useState(false);
  const [devAssignTargetCr, setDevAssignTargetCr] = useState<ChangeRequest | ChangeRequestDetail | null>(null);
  const [devAssignMode, setDevAssignMode] = useState<"WHOLE_CR" | "MODULAR_SCREENS">("WHOLE_CR");
  const [devAssignSelectedDevs, setDevAssignSelectedDevs] = useState<string[]>([]);
  const [devAssignEstimatedHours, setDevAssignEstimatedHours] = useState(16);
  const [devAssignModularTasks, setDevAssignModularTasks] = useState<Array<{ module_id: string; screen_name: string; developer_id: string; title: string; estimated_hours: number }>>([]);
  const [isSubmittingDevAssign, setIsSubmittingDevAssign] = useState(false);

  // Discussions & Developer Concern States
  const [discussionModalOpen, setDiscussionModalOpen] = useState(false);
  const [discussionTargetCr, setDiscussionTargetCr] = useState<ChangeRequest | ChangeRequestDetail | null>(null);
  const [activeDiscussions, setActiveDiscussions] = useState<CRDiscussionItem[]>([]);
  const [selectedDiscussion, setSelectedDiscussion] = useState<CRDiscussionItem | null>(null);
  const [newConcernTitle, setNewConcernTitle] = useState("");
  const [newConcernText, setNewConcernText] = useState("");
  const [newConcernPriority, setNewConcernPriority] = useState<"NORMAL" | "HIGH" | "CRITICAL" | "URGENT">("NORMAL");
  const [discussionEscalateModalOpen, setDiscussionEscalateModalOpen] = useState(false);
  const [discussionEscalateRemark, setDiscussionEscalateRemark] = useState("");
  const [discussionResolveModalOpen, setDiscussionResolveModalOpen] = useState(false);
  const [discussionResolveNotes, setDiscussionResolveNotes] = useState("");
  const [newDiscussionComment, setNewDiscussionComment] = useState("");
  const [isSubmittingDiscussion, setIsSubmittingDiscussion] = useState(false);

  // Attachments in CR Detail
  const [newAttachmentFile, setNewAttachmentFile] = useState<File | null>(null);
  const [newAttachmentNote, setNewAttachmentNote] = useState("");
  const [newAttachmentLinkUrl, setNewAttachmentLinkUrl] = useState("");
  const [newAttachmentLinkName, setNewAttachmentLinkName] = useState("");
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  const [raiseDifficultyModalOpen, setRaiseDifficultyModalOpen] = useState(false);
  const [difficultyTaskId, setDifficultyTaskId] = useState<string | null>(null);
  const [difficultyTaskNumber, setDifficultyTaskNumber] = useState("");
  const [difficultyNote, setDifficultyNote] = useState("");

  const [defectFeedbackModalOpen, setDefectFeedbackModalOpen] = useState(false);
  const [feedbackDefectId, setFeedbackDefectId] = useState<string | null>(null);
  const [feedbackDefectNumber, setFeedbackDefectNumber] = useState("");
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [feedbackAttachmentUrl, setFeedbackAttachmentUrl] = useState("");

  const [createDefectModalOpen, setCreateDefectModalOpen] = useState(false);
  const [newDefectForm, setNewDefectForm] = useState<{
    cr_id: string;
    module_id: string;
    title: string;
    description: string;
    reproduction_steps: string;
    severity: "BLOCKER" | "CRITICAL" | "MAJOR" | "MINOR";
    priority: "URGENT" | "HIGH" | "NORMAL" | "LOW";
    assigned_developer_id: string;
    evidence_url: string;
  }>({
    cr_id: "",
    module_id: "",
    title: "",
    description: "",
    reproduction_steps: "",
    severity: "MAJOR",
    priority: "HIGH",
    assigned_developer_id: "",
    evidence_url: "",
  });

  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [memberProjectId, setMemberProjectId] = useState<string | null>(null);
  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState("Developer");

  const [addModuleModalOpen, setAddModuleModalOpen] = useState(false);
  const [moduleProjectId, setModuleProjectId] = useState<string | null>(null);
  const [moduleCode, setModuleCode] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [moduleDesc, setModuleDesc] = useState("");

  // Permissions for Project Management: Admin, SPM, PM, PL
  const canManageProjects = [
    "System Administrator",
    "Senior Project Manager",
    "Project Manager",
    "Project Lead",
  ].includes(currentRole);

  // Project Management UI & Filter State
  const [projectSearch, setProjectSearch] = useState("");
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  // Project CRUD Modals
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [projectForm, setProjectForm] = useState({ code: "", name: "", description: "", status: "ACTIVE" });
  const [deleteProjectConfirm, setDeleteProjectConfirm] = useState<ProjectItem | null>(null);

  // Module CRUD Modals
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<ProjectModule | null>(null);
  const [moduleTargetProjectId, setModuleTargetProjectId] = useState<string | null>(null);
  const [moduleForm, setModuleForm] = useState({ code: "", name: "", description: "" });
  const [deleteModuleConfirm, setDeleteModuleConfirm] = useState<{ projectId: string; module: ProjectModule } | null>(null);

  // Screen / Functionality CRUD Modals
  const [screenModalOpen, setScreenModalOpen] = useState(false);
  const [editingScreen, setEditingScreen] = useState<ScreenItem | null>(null);
  const [screenTargetModuleId, setScreenTargetModuleId] = useState<string | null>(null);
  const [screenTargetModuleName, setScreenTargetModuleName] = useState<string>("");
  const [screenForm, setScreenForm] = useState({ code: "", name: "", description: "", screen_type: "EXISTING" });
  const [deleteScreenConfirm, setDeleteScreenConfirm] = useState<{ moduleId: string; screen: ScreenItem } | null>(null);

  // Create User Modal & Form State with Hierarchy Validation
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState<{
    display_name: string;
    email: string;
    employee_code: string;
    role_title: Role;
    project_ids: string[];
  }>({
    display_name: "",
    email: "",
    employee_code: "EMP-012",
    role_title: "Developer",
    project_ids: DEFAULT_PROJECTS.map((p) => p.id),
  });
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.display_name.trim() || !newUserForm.email.trim()) {
      showToast("Please enter employee name and email address.");
      return;
    }
    const allowed = getCreatableRoles(currentRole);
    if (!allowed.includes(newUserForm.role_title)) {
      showToast(`Hierarchy Denied: As ${currentRole}, you cannot create a ${newUserForm.role_title} user.`);
      return;
    }
    if (newUserForm.project_ids.length === 0 && projects.length > 0) {
      showToast("Please assign at least one project for this user (single user can work on multiple projects).");
      return;
    }
    try {
      setIsSubmittingUser(true);
      const actor = currentUser
    ? { name: currentUser.display_name, email: currentUser.email, title: currentUser.role_title }
    : roleActors[currentRole];
      const actorUser = users.find((u) => u.email === actor.email);
      let res = await api.createUser(newUserForm, actorUser?.id);
      
      // If API returned null (backend offline/mock mode), synthesize user locally with assigned projects
      if (!res) {
        const activeProjsList = projects.length > 0 ? projects : DEFAULT_PROJECTS;
        const selectedProjs = activeProjsList
          .filter((p) => newUserForm.project_ids.includes(p.id))
          .map((p) => ({ id: p.id, code: p.code, name: p.name }));
        res = {
          id: `usr-${Date.now()}`,
          employee_code: newUserForm.employee_code,
          email: newUserForm.email,
          display_name: newUserForm.display_name,
          role_title: newUserForm.role_title,
          assigned_projects: selectedProjs,
        };
      }
      showToast(`User ${newUserForm.display_name} (${newUserForm.role_title}) created successfully with ${newUserForm.project_ids.length} project(s)!`);
      setCreateUserModalOpen(false);
      setUsers((prev) => [res!, ...prev]);
      setCreateUserModalOpen(false);
    } catch (err: any) {
      showToast(err.message || "Failed to create user");
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const [uatStatusModalOpen, setUatStatusModalOpen] = useState(false);
  const [uatStatusTargetCr, setUatStatusTargetCr] = useState<ChangeRequest | ChangeRequestDetail | null>(null);
  const [uatStatusForm, setUatStatusForm] = useState<{
    target_status: "ON_HOLD" | "UAT" | "UAT_SIGNED_OFF" | "DEVELOPMENT";
    hold_until_date: string;
    remarks: string;
  }>({
    target_status: "ON_HOLD",
    hold_until_date: "",
    remarks: "",
  });

  const [assignStakeholderOpen, setAssignStakeholderOpen] = useState(false);
  const [stakeholderForm, setStakeholderForm] = useState({
    user_id: "",
    responsibility: "PRIMARY_PM",
    is_primary: true,
    assignment_reason: "",
  });

  const [deadlineModalOpen, setDeadlineModalOpen] = useState(false);
  const [deadlineForm, setDeadlineForm] = useState({ proposed_deadline: "", revision_reason: "" });

  const [srnDraftModalOpen, setSrnDraftModalOpen] = useState(false);
  const [srnDraftData, setSrnDraftData] = useState<any | null>(null);
  const [srnSending, setSrnSending] = useState(false);
  const [threadOption, setThreadOption] = useState("AUTO");

  const [deployConfirmModalOpen, setDeployConfirmModalOpen] = useState(false);
  const [deployTargetId, setDeployTargetId] = useState<string | null>(null);
  const [deployEvidence, setDeployEvidence] = useState("Jenkins build #502 verified on UAT environment.");
  const [deployBuildId, setDeployBuildId] = useState("build-20261027.1");

  const [fixDefectModalOpen, setFixDefectModalOpen] = useState(false);
  const [fixDefectId, setFixDefectId] = useState<string | null>(null);
  const [fixNotes, setFixNotes] = useState("");
  const [fixCodeRef, setFixCodeRef] = useState("");
  const [fixAttachmentUrl, setFixAttachmentUrl] = useState("");

  const [retestModalOpen, setRetestModalOpen] = useState(false);
  const [retestDefectId, setRetestDefectId] = useState<string | null>(null);
  const [retestResult, setRetestResult] = useState<"PASS" | "FAIL">("PASS");
  const [retestNotes, setRetestNotes] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // CR Activity Tracker States (Section 3 Audit Trail)
  const [crActivities, setCrActivities] = useState<CRActivityEvent[]>(initialSampleActivities);
  const [activitySearchTerm, setActivitySearchTerm] = useState("");
  const [activityPhaseFilter, setActivityPhaseFilter] = useState("All");
  const [activityTypeFilter, setActivityTypeFilter] = useState("All");
  const [activityCrFilter, setActivityCrFilter] = useState("All");

  // SOP Phase 1 Step 1.2: Project Lead Review & Escalation States
  const [plReviewModalOpen, setPlReviewModalOpen] = useState(false);
  const [plTargetCr, setPlTargetCr] = useState<ChangeRequest | ChangeRequestDetail | null>(null);
  const [plAction, setPlAction] = useState<"ACCEPT" | "NEGOTIATE" | "ESCALATE">("ACCEPT");
  const [plNotes, setPlNotes] = useState("");

  // SOP Phase 2 Step 2.2: Overdue Protocol States
  const [overdueModalOpen, setOverdueModalOpen] = useState(false);
  const [overdueTargetTask, setOverdueTargetTask] = useState<DevTask | null>(null);
  const [overdueRemark, setOverdueRemark] = useState("");

  // SOP Phase 4 Management Sign-off & Gatekeeping States
  const [srnPmReviewed, setSrnPmReviewed] = useState(false);
  const [srnSpmApproved, setSrnSpmApproved] = useState(false);
  const [srnBaApproved, setSrnBaApproved] = useState(false);
  const [srnBaHold, setSrnBaHold] = useState(false);
  const [baHoldModalOpen, setBaHoldModalOpen] = useState(false);
  const [baHoldReason, setBaHoldReason] = useState("");
  const [baHoldUntilDate, setBaHoldUntilDate] = useState("");

  // SOP Phase 5 Step 5.2: Production Preparation Artifacts
  const [prodArtifactsModalOpen, setProdArtifactsModalOpen] = useState(false);
  const [activeArtifactTab, setActiveArtifactTab] = useState<"srn" | "checklist" | "rfc">("srn");
  const [prodArtifacts, setProdArtifacts] = useState<ProductionArtifacts | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Initial Data Fetch
  const loadInitialData = async () => {
    const [kpiRes, crRes, tasksRes, defRes, readyRes, srnRes, relRes, usrRes, prjRes, kraRes, actRes] = await Promise.all([
      api.getKPI(),
      api.getChangeRequests(),
      api.getDevTasks(),
      api.getDefects(),
      api.getReadyForUatItems(),
      api.getSrnDocuments(),
      api.getReleases(),
      api.getUsers(),
      api.getProjects(),
      api.getKraRecords(),
      api.getCRActivities(),
    ]);

    const isLive = Boolean(kpiRes !== null || crRes !== null || usrRes !== null);
    setConnected(isLive);

    if (kpiRes !== null) setKpi(kpiRes);
    if (crRes !== null && Array.isArray(crRes.items)) setChangeRequests(crRes.items);
    if (tasksRes !== null && Array.isArray(tasksRes)) setDevTasks(tasksRes);
    if (defRes !== null && Array.isArray(defRes)) setDefects(defRes);
    if (readyRes !== null && Array.isArray(readyRes)) setReadyItems(readyRes);
    if (srnRes !== null && Array.isArray(srnRes)) setSrnDocuments(srnRes);
    if (relRes !== null && Array.isArray(relRes)) setReleases(relRes);
    if (usrRes !== null && Array.isArray(usrRes)) setUsers(usrRes);
    if (prjRes !== null && Array.isArray(prjRes)) setProjects(prjRes);
    if (kraRes !== null && Array.isArray(kraRes)) setKraRecords(kraRes);
    if (actRes !== null && Array.isArray(actRes)) setCrActivities(actRes);
  };

  // Navigate and update URL hash
  const navigateToView = (view: View) => {
    setActiveView(view);
    if (typeof window !== "undefined") {
      window.location.hash = viewSlugs[view] || "dashboard";
    }
  };

  // Switch role and enforce route access
  const handleSwitchRole = (newRole: Role) => {
    setCurrentRole(newRole);
    setRoleMenuOpen(false);
    const fallback = getDefaultViewForRole(newRole);
    const curItem = navigationItems.find((n) => n.view === activeView);
    if (!curItem || (curItem.roles && !curItem.roles.includes(newRole))) {
      setActiveView(fallback);
      if (typeof window !== "undefined") {
        window.location.hash = viewSlugs[fallback];
      }
      showToast(`Switched to ${newRole} mode. Loaded ${fallback}.`);
    } else {
      showToast(`Switched active role to ${newRole} (${roleActors[newRole].name}).`);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Hash listener and role permission guard
  useEffect(() => {
    const handleHashSync = () => {
      if (typeof window === "undefined") return;
      const raw = window.location.hash.replace("#", "").toLowerCase().trim();
      if (raw && slugToView[raw]) {
        const targetView = slugToView[raw];
        const item = navigationItems.find((n) => n.view === targetView);
        if (item && (!item.roles || item.roles.includes(currentRole))) {
          setActiveView(targetView);
          return;
        }
      }
      const curItem = navigationItems.find((n) => n.view === activeView);
      if (!curItem || (curItem.roles && !curItem.roles.includes(currentRole))) {
        const fallback = getDefaultViewForRole(currentRole);
        setActiveView(fallback);
        if (typeof window !== "undefined") {
          window.location.hash = viewSlugs[fallback];
        }
      } else if (raw !== viewSlugs[activeView]) {
        if (typeof window !== "undefined") {
          window.location.hash = viewSlugs[activeView];
        }
      }
    };

    handleHashSync();
    window.addEventListener("hashchange", handleHashSync);
    return () => window.removeEventListener("hashchange", handleHashSync);
  }, [currentRole]);

  const openCrDetail = async (crId: string) => {
    setCrDetailLoading(true);
    const detail = await api.getChangeRequestDetail(crId);
    if (detail) {
      setSelectedCrDetail(detail);
      setCrActiveTab("overview");
    } else {
      showToast("Unable to load full details for CR");
    }
    setCrDetailLoading(false);
  };

  const handleCreateCr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentRole !== "Business Analyst" && currentRole !== "BA Lead") {
      showToast("Access Denied: Only Business Analysts (BA) and BA Leads are authorized to create Change Requests.");
      setCreateCrOpen(false);
      return;
    }
    if (!crForm.title || !crForm.project_id) {
      showToast("Title and Project are required");
      return;
    }
    const created = await api.createChangeRequest({
      project_id: crForm.project_id,
      title: crForm.title,
      description: crForm.description || crForm.title,
      business_justification: crForm.business_justification,
      priority: crForm.priority,
      requested_deadline: crForm.requested_deadline || undefined,
      primary_pm_id: crForm.primary_pm_id || undefined,
      lead_dev_id: crForm.lead_dev_id || undefined,
      impacted_module_ids: crForm.module_id ? [crForm.module_id] : [],
      screen_name: crForm.screen_name.trim() || undefined,
      screen_type: crForm.screen_type || "EXISTING",
    });
    if (created) {
      showToast(`Created ${created.reference_number} successfully! Forwarded to project BA for verification.`);
      setCreateCrOpen(false);
      setCrForm({
        title: "",
        description: "",
        business_justification: "",
        project_id: "",
        priority: "NORMAL",
        requested_deadline: "",
        primary_pm_id: "",
        lead_dev_id: "",
        module_id: "",
        screen_name: "",
        screen_type: "MODIFIED",
      });
      loadInitialData();
    } else {
      showToast("Failed to create Change Request");
    }
  };

  const handleFetchZoho = async () => {
    setIsFetchingZoho(true);
    try {
      const res = await api.fetchZohoCRs(currentUser?.id);
      if (res && res.status === "success") {
        showToast(`Zoho Sync Complete: Processed ${res.synced_count} CR(s) into BA Verification pipeline.`);
      } else {
        showToast("Zoho Sync complete.");
      }
      loadInitialData();
    } catch (err: any) {
      showToast(err.message || "Failed to fetch from Zoho");
    } finally {
      setIsFetchingZoho(false);
    }
  };

  const openBaVerifyModal = (cr: ChangeRequest | ChangeRequestDetail) => {
    setBaVerifyTargetCr(cr);
    setBaVerifyAction("FORWARD");
    setBaVerifyRevertReason("");
    setBaVerifyProjectId(cr.project_id || "");
    setBaVerifyDeadline(cr.requested_deadline || "");
    setBaVerifyPriority(cr.priority || "NORMAL");
    setBaVerifyModuleId("");
    setBaVerifyScreenName("");
    setBaVerifyScreenType("EXISTING");
    setBaVerifyRemarks("");
    setBaVerifySelectedPlIds([]);
    setBaVerifyUploadFile(null);
    setBaVerifyUploadNote("");
    setBaVerifyLinkUrl("");
    setBaVerifyLinkName("");
    setBaVerifyModalOpen(true);
  };

  const handleBaVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baVerifyTargetCr) return;
    setIsSubmittingBaVerify(true);
    try {
      if (baVerifyAction === "REVERT") {
        if (!baVerifyRevertReason.trim()) {
          showToast("Please provide a reason for reverting this CR.");
          setIsSubmittingBaVerify(false);
          return;
        }
        await api.verifyCRByBA(baVerifyTargetCr.id, {
          action: "REVERT",
          revert_note: baVerifyRevertReason,
        }, currentUser?.id);
        showToast(`CR ${baVerifyTargetCr.reference_number} reverted with discrepancy note.`);
      } else {
        if (!baVerifyDeadline) {
          showToast("Target Deadline is mandatory for functional verification.");
          setIsSubmittingBaVerify(false);
          return;
        }
        await api.verifyCRByBA(baVerifyTargetCr.id, {
          action: "FORWARD",
          requested_deadline: baVerifyDeadline,
          project_id: baVerifyProjectId || undefined,
          impacted_module_ids: baVerifyModuleId ? [baVerifyModuleId] : [],
          screen_name: baVerifyScreenName.trim() || undefined,
          screen_type: baVerifyScreenType,
          priority: baVerifyPriority,
          remarks: baVerifyRemarks,
          assigned_pl_ids: baVerifySelectedPlIds.length > 0 ? baVerifySelectedPlIds : undefined,
        }, currentUser?.id);

        if (baVerifyUploadFile) {
          try {
            await api.uploadCRAttachment(baVerifyTargetCr.id, baVerifyUploadFile, baVerifyUploadNote, currentUser?.id);
          } catch (uploadErr) {
            console.error("Attachment upload error:", uploadErr);
          }
        }
        if (baVerifyLinkUrl.trim()) {
          try {
            await api.linkCRAttachment(baVerifyTargetCr.id, {
              original_name: baVerifyLinkName.trim() || baVerifyLinkUrl.trim(),
              file_url: baVerifyLinkUrl.trim(),
              note: baVerifyRemarks || "Attached during BA verification",
            }, currentUser?.id);
          } catch (linkErr) {
            console.error("Attachment link error:", linkErr);
          }
        }
        showToast(`CR ${baVerifyTargetCr.reference_number} verified and assigned to Project Lead(s)!`);
      }
      setBaVerifyModalOpen(false);
      setBaVerifyTargetCr(null);
      loadInitialData();
      if (selectedCrDetail && selectedCrDetail.id === baVerifyTargetCr.id) {
        openCrDetail(baVerifyTargetCr.id);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to process BA verification");
    } finally {
      setIsSubmittingBaVerify(false);
    }
  };

  const openPlGovReviewModal = (cr: ChangeRequest | ChangeRequestDetail) => {
    setPlGovTargetCr(cr);
    setPlGovAction("PASS_TO_MANAGEMENT");
    setPlGovRemarks("");
    setPlGovTargetPmId("");
    setPlGovReviewModalOpen(true);
  };

  const handlePlGovReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plGovTargetCr) return;
    if (plGovAction === "REVERT_TO_BA" && !plGovRemarks.trim()) {
      showToast("Remark is required when reverting to BA.");
      return;
    }
    setIsSubmittingPlGovReview(true);
    try {
      await api.reviewCRByPL(plGovTargetCr.id, {
        action: plGovAction,
        remarks: plGovRemarks,
        target_pm_id: plGovTargetPmId || undefined,
      }, currentUser?.id);
      showToast(
        plGovAction === "REVERT_TO_BA"
          ? `CR reverted back to BA with technical/schedule feedback.`
          : plGovAction === "PASS_TO_MANAGEMENT"
          ? `CR escalated to Senior Project Manager / PM for approval.`
          : `CR approved directly by Project Lead and assigned to PM.`
      );
      setPlGovReviewModalOpen(false);
      setPlGovTargetCr(null);
      loadInitialData();
      if (selectedCrDetail && selectedCrDetail.id === plGovTargetCr.id) {
        openCrDetail(plGovTargetCr.id);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to submit PL review");
    } finally {
      setIsSubmittingPlGovReview(false);
    }
  };

  const openMgmtReviewModal = (cr: ChangeRequest | ChangeRequestDetail) => {
    setMgmtReviewTargetCr(cr);
    setMgmtAction("APPROVE");
    setMgmtRemarks("");
    setMgmtReviewModalOpen(true);
  };

  const handleMgmtReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mgmtReviewTargetCr) return;
    if (mgmtAction === "REQUEST_CHANGES" && !mgmtRemarks.trim()) {
      showToast("Please provide details of requested changes for the Project Lead.");
      return;
    }
    setIsSubmittingMgmtReview(true);
    try {
      await api.reviewCRByManagement(mgmtReviewTargetCr.id, {
        action: mgmtAction,
        remarks: mgmtRemarks,
      }, currentUser?.id);
      showToast(
        mgmtAction === "APPROVE"
          ? `CR approved by Management! Ready for developer assignment.`
          : `Change request returned to Project Lead for changes.`
      );
      setMgmtReviewModalOpen(false);
      setMgmtReviewTargetCr(null);
      loadInitialData();
      if (selectedCrDetail && selectedCrDetail.id === mgmtReviewTargetCr.id) {
        openCrDetail(mgmtReviewTargetCr.id);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to submit Management review");
    } finally {
      setIsSubmittingMgmtReview(false);
    }
  };

  const openPlChangesModal = (cr: ChangeRequest | ChangeRequestDetail) => {
    setPlChangesTargetCr(cr);
    setPlChangesAction("RESOLVED");
    setPlChangesRemarks("");
    setPlChangesModalOpen(true);
  };

  const handlePlChangesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plChangesTargetCr) return;
    if (!plChangesRemarks.trim()) {
      showToast("Remark is required.");
      return;
    }
    setIsSubmittingPlChanges(true);
    try {
      await api.handleManagementChangesByPL(plChangesTargetCr.id, {
        action: plChangesAction,
        remarks: plChangesRemarks,
      }, currentUser?.id);
      showToast(
        plChangesAction === "RESOLVED"
          ? `Changes addressed and resubmitted to Management.`
          : `Issues cannot be resolved by PL; reverted back to BA.`
      );
      setPlChangesModalOpen(false);
      setPlChangesTargetCr(null);
      loadInitialData();
      if (selectedCrDetail && selectedCrDetail.id === plChangesTargetCr.id) {
        openCrDetail(plChangesTargetCr.id);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to submit PL response");
    } finally {
      setIsSubmittingPlChanges(false);
    }
  };

  const openDevAssignModal = (cr: ChangeRequest | ChangeRequestDetail) => {
    setDevAssignTargetCr(cr);
    setDevAssignMode("WHOLE_CR");
    setDevAssignSelectedDevs([]);
    setDevAssignEstimatedHours(16);
    const proj = projects.find((p) => p.id === cr.project_id);
    const initialTasks: Array<{ module_id: string; screen_name: string; developer_id: string; title: string; estimated_hours: number }> = [];
    if (proj && proj.modules) {
      proj.modules.forEach((m) => {
        if (m.screens && m.screens.length > 0) {
          m.screens.forEach((s) => {
            initialTasks.push({
              module_id: m.id,
              screen_name: s.name,
              developer_id: "",
              title: `${s.name} Implementation - ${cr.reference_number}`,
              estimated_hours: 8,
            });
          });
        }
      });
    }
    setDevAssignModularTasks(
      initialTasks.length > 0
        ? initialTasks
        : [
            {
              module_id: "",
              screen_name: "Primary Screen",
              developer_id: "",
              title: `Module Dev - ${cr.reference_number}`,
              estimated_hours: 8,
            },
          ]
    );
    setDevAssignModalOpen(true);
  };

  const handleDevAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devAssignTargetCr) return;
    setIsSubmittingDevAssign(true);
    try {
      if (devAssignMode === "WHOLE_CR") {
        if (devAssignSelectedDevs.length === 0) {
          showToast("Please select at least one developer.");
          setIsSubmittingDevAssign(false);
          return;
        }
        await api.assignCRDevelopers(
          devAssignTargetCr.id,
          {
            mode: "WHOLE_CR",
            developer_ids: devAssignSelectedDevs,
          },
          currentUser?.id
        );
      } else {
        const validAssignments = devAssignModularTasks.filter((t) => t.developer_id);
        if (validAssignments.length === 0) {
          showToast("Please assign at least one screen/module to a developer.");
          setIsSubmittingDevAssign(false);
          return;
        }
        await api.assignCRDevelopers(
          devAssignTargetCr.id,
          {
            mode: "MODULAR_SCREENS",
            modular_assignments: validAssignments,
          },
          currentUser?.id
        );
      }
      showToast(`Developers assigned successfully! CR moved to DEVELOPMENT.`);
      setDevAssignModalOpen(false);
      setDevAssignTargetCr(null);
      loadInitialData();
      if (selectedCrDetail && selectedCrDetail.id === devAssignTargetCr.id) {
        openCrDetail(devAssignTargetCr.id);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to assign developers");
    } finally {
      setIsSubmittingDevAssign(false);
    }
  };

  const openDiscussionModal = async (cr: ChangeRequest | ChangeRequestDetail) => {
    setDiscussionTargetCr(cr);
    setNewConcernTitle("");
    setNewConcernText("");
    setNewConcernPriority("NORMAL");
    setNewDiscussionComment("");
    setDiscussionEscalateRemark("");
    setDiscussionResolveNotes("");
    setDiscussionModalOpen(true);
    try {
      const discList = await api.getCRDiscussions(cr.id);
      setActiveDiscussions(discList || []);
      if (discList && discList.length > 0) {
        setSelectedDiscussion(discList[0]);
      } else {
        setSelectedDiscussion(null);
      }
    } catch (err) {
      console.error("Error loading discussions:", err);
    }
  };

  const handleCreateConcern = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discussionTargetCr || !newConcernTitle.trim() || !newConcernText.trim()) {
      showToast("Title and concern remark are required.");
      return;
    }
    setIsSubmittingDiscussion(true);
    try {
      const created = await api.createCRDiscussion(
        discussionTargetCr.id,
        {
          title: newConcernTitle,
          concern_text: newConcernText,
          priority: newConcernPriority,
        },
        currentUser?.id
      );
      if (created) {
        showToast(`Concern raised: "${created.title}". Escalated to Project Manager.`);
        setNewConcernTitle("");
        setNewConcernText("");
        const discList = await api.getCRDiscussions(discussionTargetCr.id);
        setActiveDiscussions(discList || []);
        setSelectedDiscussion(created);
      }
      if (selectedCrDetail && selectedCrDetail.id === discussionTargetCr.id) {
        openCrDetail(discussionTargetCr.id);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to create discussion");
    } finally {
      setIsSubmittingDiscussion(false);
    }
  };

  const handleEscalateConcern = async (discussionId: string) => {
    if (!discussionEscalateRemark.trim()) {
      showToast("Please provide an escalation note.");
      return;
    }
    setIsSubmittingDiscussion(true);
    try {
      const updated = await api.escalateCRDiscussion(discussionId, discussionEscalateRemark, currentUser?.id);
      if (updated) {
        showToast(`Discussion escalated to ${updated.current_level}.`);
        setDiscussionEscalateRemark("");
        setDiscussionEscalateModalOpen(false);
        if (discussionTargetCr) {
          const discList = await api.getCRDiscussions(discussionTargetCr.id);
          setActiveDiscussions(discList || []);
          setSelectedDiscussion(updated);
        }
      }
      if (selectedCrDetail) {
        openCrDetail(selectedCrDetail.id);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to escalate discussion");
    } finally {
      setIsSubmittingDiscussion(false);
    }
  };

  const handleResolveConcern = async (discussionId: string) => {
    if (!discussionResolveNotes.trim()) {
      showToast("Please provide resolution notes.");
      return;
    }
    setIsSubmittingDiscussion(true);
    try {
      const updated = await api.resolveCRDiscussion(discussionId, discussionResolveNotes, currentUser?.id);
      if (updated) {
        showToast("Discussion marked as RESOLVED.");
        setDiscussionResolveNotes("");
        setDiscussionResolveModalOpen(false);
        if (discussionTargetCr) {
          const discList = await api.getCRDiscussions(discussionTargetCr.id);
          setActiveDiscussions(discList || []);
          setSelectedDiscussion(updated);
        }
      }
      if (selectedCrDetail) {
        openCrDetail(selectedCrDetail.id);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to resolve discussion");
    } finally {
      setIsSubmittingDiscussion(false);
    }
  };

  const handleAddCommentToDiscussion = async (discussionId: string) => {
    if (!newDiscussionComment.trim()) return;
    try {
      await api.addCRDiscussionComment(discussionId, newDiscussionComment, currentUser?.id);
      setNewDiscussionComment("");
      if (discussionTargetCr) {
        const discList = await api.getCRDiscussions(discussionTargetCr.id);
        setActiveDiscussions(discList || []);
        const found = (discList || []).find((d) => d.id === discussionId);
        if (found) setSelectedDiscussion(found);
      }
      if (selectedCrDetail) {
        openCrDetail(selectedCrDetail.id);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to post comment");
    }
  };

  const handleUploadDetailAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCrDetail || !newAttachmentFile) return;
    setIsUploadingAttachment(true);
    try {
      await api.uploadCRAttachment(selectedCrDetail.id, newAttachmentFile, newAttachmentNote, currentUser?.id);
      showToast(`File "${newAttachmentFile.name}" attached successfully.`);
      setNewAttachmentFile(null);
      setNewAttachmentNote("");
      openCrDetail(selectedCrDetail.id);
    } catch (err: any) {
      showToast(err.message || "Failed to upload file");
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleLinkDetailAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCrDetail || !newAttachmentLinkUrl.trim()) return;
    setIsUploadingAttachment(true);
    try {
      await api.linkCRAttachment(
        selectedCrDetail.id,
        {
          original_name: newAttachmentLinkName.trim() || newAttachmentLinkUrl.trim(),
          file_url: newAttachmentLinkUrl.trim(),
          note: newAttachmentNote,
        },
        currentUser?.id
      );
      showToast("Link attached successfully.");
      setNewAttachmentLinkUrl("");
      setNewAttachmentLinkName("");
      setNewAttachmentNote("");
      openCrDetail(selectedCrDetail.id);
    } catch (err: any) {
      showToast(err.message || "Failed to link attachment");
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleDeleteDetailAttachment = async (attachmentId: string) => {
    if (!selectedCrDetail) return;
    try {
      await api.deleteCRAttachment(selectedCrDetail.id, attachmentId, currentUser?.id);
      showToast("Attachment removed.");
      openCrDetail(selectedCrDetail.id);
    } catch (err: any) {
      showToast(err.message || "Failed to delete attachment");
    }
  };

  const handleUpdateUatStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uatStatusTargetCr) return;
    if (uatStatusForm.target_status === "ON_HOLD") {
      const res = await api.holdChangeRequest(uatStatusTargetCr.id, {
        hold_reason: uatStatusForm.remarks || "Testing on hold by UAT team",
        hold_until_date: uatStatusForm.hold_until_date || undefined,
        action_type: currentRole === "UAT Lead" ? "REQUEST_HOLD" : "DIRECT_HOLD",
      });
      if (res) {
        showToast(
          currentRole === "UAT Lead"
            ? `Hold request submitted to BA for ${uatStatusTargetCr.reference_number}`
            : `${uatStatusTargetCr.reference_number} marked On Hold UAT`
        );
      }
    } else {
      const res = await api.transitionChangeRequest(
        uatStatusTargetCr.id,
        uatStatusForm.target_status,
        uatStatusForm.remarks || `Status transitioned to ${uatStatusForm.target_status} by ${currentRole}`
      );
      if (res) {
        showToast(`CR status updated to ${uatStatusForm.target_status} successfully!`);
      } else {
        showToast("Failed to update CR status");
      }
    }
    setUatStatusModalOpen(false);
    loadInitialData();
    if (selectedCrDetail && selectedCrDetail.id === uatStatusTargetCr.id) {
      openCrDetail(uatStatusTargetCr.id);
    }
  };

  const handleUpdateCr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCrForm.id) return;
    const res = await api.updateChangeRequest(editCrForm.id, {
      title: editCrForm.title,
      description: editCrForm.description,
      business_justification: editCrForm.business_justification,
      priority: editCrForm.priority,
      requested_deadline: editCrForm.requested_deadline || undefined,
      approved_deadline: editCrForm.approved_deadline || undefined,
    });
    if (res) {
      showToast("CR details updated successfully!");
      setEditCrModalOpen(false);
      if (selectedCrDetail && selectedCrDetail.id === editCrForm.id) {
        openCrDetail(editCrForm.id);
      }
      loadInitialData();
    } else {
      showToast("Failed to update Change Request details");
    }
  };

  const handleHoldCr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdTargetCr) return;
    const action = currentRole === "UAT Lead" ? "REQUEST_HOLD" : "DIRECT_HOLD";
    const res = await api.holdChangeRequest(holdTargetCr.id, {
      action,
      hold_reason: holdForm.hold_reason,
      hold_until_date: holdForm.hold_until_date || undefined,
    });
    if (res) {
      showToast(action === "REQUEST_HOLD" ? "Hold requested and directly notified to BA for review." : "CR placed ON HOLD.");
      setHoldModalOpen(false);
      setHoldForm({ hold_until_date: "", hold_reason: "" });
      if (selectedCrDetail && selectedCrDetail.id === holdTargetCr.id) {
        openCrDetail(holdTargetCr.id);
      }
      loadInitialData();
    } else {
      showToast("Failed to set hold status");
    }
  };

  const handleApproveHold = async (crId: string, approve: boolean, rejectionReason?: string) => {
    const res = await api.approveHoldChangeRequest(crId, { approve, rejection_reason: rejectionReason });
    if (res) {
      showToast(approve ? "Hold request APPROVED by BA." : "Hold request REJECTED by BA.");
      if (selectedCrDetail && selectedCrDetail.id === crId) {
        openCrDetail(crId);
      }
      loadInitialData();
    } else {
      showToast("Failed to process hold approval");
    }
  };

  const handleRaiseDifficulty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!difficultyTaskId || !difficultyNote.trim()) return;
    const res = await api.raiseDevDifficulty(difficultyTaskId, { difficulty_note: difficultyNote });
    if (res) {
      showToast("Difficulty note recorded and escalated to Lead Developer & PM!");
      setRaiseDifficultyModalOpen(false);
      setDifficultyNote("");
      setDifficultyTaskId(null);
      loadInitialData();
    } else {
      showToast("Failed to record difficulty note");
    }
  };

  const handleDefectFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackDefectId || !feedbackNotes.trim()) return;
    const res = await api.recordDefectFeedback(feedbackDefectId, {
      feedback_notes: feedbackNotes,
      attachment_url: feedbackAttachmentUrl || undefined,
    });
    if (res) {
      showToast("Developer feedback and proof attached! UAT tester notified.");
      setDefectFeedbackModalOpen(false);
      setFeedbackNotes("");
      setFeedbackAttachmentUrl("");
      setFeedbackDefectId(null);
      if (selectedDefect && selectedDefect.id === feedbackDefectId) {
        const updatedDef = await api.getDefectDetail(feedbackDefectId);
        if (updatedDef) setSelectedDefect(updatedDef);
      }
      loadInitialData();
    } else {
      showToast("Failed to record defect feedback");
    }
  };

  const handleCreateDefect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDefectForm.cr_id || !newDefectForm.title) {
      showToast("CR and Defect Title are required");
      return;
    }
    const res = await api.createDefect({
      cr_id: newDefectForm.cr_id,
      module_id: newDefectForm.module_id || undefined,
      title: newDefectForm.title,
      description: newDefectForm.description || newDefectForm.title,
      reproduction_steps: newDefectForm.reproduction_steps,
      severity: newDefectForm.severity,
      priority: newDefectForm.priority,
      assigned_developer_id: newDefectForm.assigned_developer_id || undefined,
      evidence_url: newDefectForm.evidence_url,
      environment: "UAT",
    });
    if (res) {
      showToast(`Reported defect ${res.bug_number} successfully! Respected developer notified.`);
      setCreateDefectModalOpen(false);
      setNewDefectForm({
        cr_id: "",
        module_id: "",
        title: "",
        description: "",
        reproduction_steps: "",
        severity: "MAJOR",
        priority: "HIGH",
        assigned_developer_id: "",
        evidence_url: "",
      });
      loadInitialData();
    } else {
      showToast("Failed to report defect");
    }
  };

  const handleAddProjectMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberProjectId || !memberUserId) return;
    const res = await api.addProjectMember(memberProjectId, memberUserId, memberRole);
    if (res) {
      showToast("Member successfully added to project team!");
      setAddMemberModalOpen(false);
      setMemberUserId("");
      loadInitialData();
    } else {
      showToast("Failed to add project member");
    }
  };

  const handleRemoveProjectMember = async (projectId: string, userId: string) => {
    const res = await api.removeProjectMember(projectId, userId);
    if (res) {
      showToast("Project member removed.");
      loadInitialData();
    }
  };

  const handleAddProjectModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleProjectId || !moduleCode || !moduleName) {
      showToast("Module Code and Name are required");
      return;
    }
    const res = await api.addProjectModule(moduleProjectId, moduleCode, moduleName, moduleDesc);
    if (res) {
      showToast(`Module ${moduleName} (${moduleCode}) created!`);
      setAddModuleModalOpen(false);
      setModuleCode("");
      setModuleName("");
      setModuleDesc("");
      loadInitialData();
    } else {
      showToast("Failed to create module");
    }
  };

  // Project CRUD Handlers
  const handleOpenCreateProject = () => {
    setEditingProject(null);
    setProjectForm({ code: "", name: "", description: "", status: "ACTIVE" });
    setProjectModalOpen(true);
  };

  const handleOpenEditProject = (p: ProjectItem) => {
    setEditingProject(p);
    setProjectForm({ code: p.code, name: p.name, description: p.description || "", status: p.status || "ACTIVE" });
    setProjectModalOpen(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.code.trim() || !projectForm.name.trim()) {
      showToast("Project code and name are required.");
      return;
    }
    const cleanCode = projectForm.code.trim().toUpperCase();
    const isDuplicate = projects.some(
      (p) => p.code.toUpperCase() === cleanCode && (!editingProject || p.id !== editingProject.id)
    );
    if (isDuplicate) {
      showToast(`A project with code '${cleanCode}' already exists. Please choose a different code.`);
      return;
    }

    const actor = currentUser
      ? { name: currentUser.display_name, email: currentUser.email, title: currentUser.role_title }
      : roleActors[currentRole];
    const actorUser = users.find((u) => u.email === actor.email);
    const actorId = currentUser?.id || actorUser?.id;

    try {
      if (editingProject) {
        const res = await api.updateProject(editingProject.id, projectForm, actorId);
        setProjects((prev) =>
          prev.map((p) =>
            p.id === editingProject.id
              ? {
                  ...p,
                  code: res?.code || projectForm.code.trim().toUpperCase(),
                  name: res?.name || projectForm.name.trim(),
                  description: res?.description ?? projectForm.description.trim(),
                  status: res?.status || projectForm.status.trim().toUpperCase(),
                }
              : p
          )
        );
        showToast(`Project '${projectForm.name}' updated successfully.`);
      } else {
        const res = await api.createProject(projectForm, actorId);
        const savedProj: ProjectItem = res || {
          id: `proj-${Date.now()}`,
          code: cleanCode,
          name: projectForm.name.trim(),
          description: projectForm.description.trim(),
          status: projectForm.status.trim().toUpperCase(),
          modules: [],
        };
        setProjects((prev) => [savedProj, ...prev.filter((p) => p.id !== savedProj.id)]);
        showToast(`Project '${savedProj.name}' created successfully.`);
      }
      setProjectModalOpen(false);
      loadInitialData();
    } catch (err: any) {
      showToast(err.message || "Failed to save project.");
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteProjectConfirm) return;
    const actor = currentUser
      ? { name: currentUser.display_name, email: currentUser.email, title: currentUser.role_title }
      : roleActors[currentRole];
    const actorUser = users.find((u) => u.email === actor.email);
    const actorId = currentUser?.id || actorUser?.id;

    try {
      await api.deleteProject(deleteProjectConfirm.id, actorId);
      setProjects((prev) => prev.filter((p) => p.id !== deleteProjectConfirm.id));
      showToast(`Project '${deleteProjectConfirm.name}' deleted.`);
      setDeleteProjectConfirm(null);
      loadInitialData();
    } catch (err: any) {
      showToast(err.message || "Failed to delete project.");
    }
  };

  // Module CRUD Handlers
  const handleOpenCreateModule = (projectId: string) => {
    setModuleTargetProjectId(projectId);
    setEditingModule(null);
    setModuleForm({ code: "", name: "", description: "" });
    setModuleModalOpen(true);
  };

  const handleOpenEditModule = (projectId: string, m: ProjectModule) => {
    setModuleTargetProjectId(projectId);
    setEditingModule(m);
    setModuleForm({ code: m.code, name: m.name, description: m.description || "" });
    setModuleModalOpen(true);
  };

  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleForm.code.trim() || !moduleForm.name.trim()) {
      showToast("Module code and name are required.");
      return;
    }
    const actor = currentUser
      ? { name: currentUser.display_name, email: currentUser.email, title: currentUser.role_title }
      : roleActors[currentRole];
    const actorUser = users.find((u) => u.email === actor.email);
    const actorId = currentUser?.id || actorUser?.id;

    try {
      if (editingModule) {
        await api.updateModule(editingModule.id, moduleForm, actorId);
        setProjects((prev) =>
          prev.map((p) => ({
            ...p,
            modules: (p.modules || []).map((m) =>
              m.id === editingModule.id
                ? {
                    ...m,
                    code: moduleForm.code.trim().toUpperCase(),
                    name: moduleForm.name.trim(),
                    description: moduleForm.description.trim(),
                  }
                : m
            ),
          }))
        );
        showToast(`Module '${moduleForm.name}' updated.`);
      } else if (moduleTargetProjectId) {
        const res = await api.addProjectModule(moduleTargetProjectId, moduleForm.code, moduleForm.name, moduleForm.description, actorId);
        const newMod: ProjectModule = {
          id: res?.id || `mod-${Date.now()}`,
          project_id: moduleTargetProjectId,
          code: moduleForm.code.trim().toUpperCase(),
          name: moduleForm.name.trim(),
          description: moduleForm.description.trim(),
          screens: [],
        };
        setProjects((prev) =>
          prev.map((p) =>
            p.id === moduleTargetProjectId
              ? { ...p, modules: [...(p.modules || []), newMod] }
              : p
          )
        );
        showToast(`Module '${moduleForm.name}' created.`);
      }
      setModuleModalOpen(false);
      loadInitialData();
    } catch (err: any) {
      showToast(err.message || "Failed to save module.");
    }
  };

  const handleDeleteModule = async () => {
    if (!deleteModuleConfirm) return;
    const actor = currentUser
      ? { name: currentUser.display_name, email: currentUser.email, title: currentUser.role_title }
      : roleActors[currentRole];
    const actorUser = users.find((u) => u.email === actor.email);
    const actorId = currentUser?.id || actorUser?.id;

    try {
      await api.deleteModule(deleteModuleConfirm.module.id, actorId);
      setProjects((prev) =>
        prev.map((p) =>
          p.id === deleteModuleConfirm.projectId
            ? { ...p, modules: (p.modules || []).filter((m) => m.id !== deleteModuleConfirm.module.id) }
            : p
        )
      );
      showToast(`Module '${deleteModuleConfirm.module.name}' deleted.`);
      setDeleteModuleConfirm(null);
      loadInitialData();
    } catch (err: any) {
      showToast(err.message || "Failed to delete module.");
    }
  };

  // Screen / Functionality CRUD Handlers
  const handleOpenCreateScreen = (moduleId: string, moduleName: string) => {
    setScreenTargetModuleId(moduleId);
    setScreenTargetModuleName(moduleName);
    setEditingScreen(null);
    setScreenForm({ code: "", name: "", description: "", screen_type: "EXISTING" });
    setScreenModalOpen(true);
  };

  const handleOpenEditScreen = (moduleId: string, moduleName: string, s: ScreenItem) => {
    setScreenTargetModuleId(moduleId);
    setScreenTargetModuleName(moduleName);
    setEditingScreen(s);
    setScreenForm({ code: s.code || "", name: s.name, description: s.description || "", screen_type: s.screen_type || "EXISTING" });
    setScreenModalOpen(true);
  };

  const handleSaveScreen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenForm.name.trim()) {
      showToast("Screen / Functionality name is required.");
      return;
    }
    const actor = currentUser
      ? { name: currentUser.display_name, email: currentUser.email, title: currentUser.role_title }
      : roleActors[currentRole];
    const actorUser = users.find((u) => u.email === actor.email);
    const actorId = currentUser?.id || actorUser?.id;

    try {
      if (editingScreen) {
        await api.updateScreen(editingScreen.id, screenForm, actorId);
        setProjects((prev) =>
          prev.map((p) => ({
            ...p,
            modules: (p.modules || []).map((m) => ({
              ...m,
              screens: (m.screens || []).map((s) =>
                s.id === editingScreen.id
                  ? {
                      ...s,
                      name: screenForm.name.trim(),
                      code: screenForm.code?.trim().toUpperCase() || s.code,
                      description: screenForm.description?.trim() || "",
                      screen_type: screenForm.screen_type || s.screen_type || "EXISTING",
                    }
                  : s
              ),
            })),
          }))
        );
        showToast(`Screen '${screenForm.name}' updated.`);
      } else if (screenTargetModuleId) {
        const res = await api.createScreen(screenTargetModuleId, screenForm, actorId);
        const newScr: ScreenItem = {
          id: res?.id || `scr-${Date.now()}`,
          module_id: screenTargetModuleId,
          code: screenForm.code?.trim().toUpperCase() || screenForm.name.trim().toUpperCase().replace(/\s+/g, "_"),
          name: screenForm.name.trim(),
          description: screenForm.description?.trim() || "",
          screen_type: screenForm.screen_type || "EXISTING",
          is_active: true,
        };
        setProjects((prev) =>
          prev.map((p) => ({
            ...p,
            modules: (p.modules || []).map((m) =>
              m.id === screenTargetModuleId
                ? { ...m, screens: [...(m.screens || []).filter((s) => s.id !== newScr.id), newScr] }
                : m
            ),
          }))
        );
        showToast(`Screen '${screenForm.name}' added to module.`);
      }
      setScreenModalOpen(false);
      loadInitialData();
    } catch (err: any) {
      showToast(err.message || "Failed to save screen.");
    }
  };

  const handleDeleteScreen = async () => {
    if (!deleteScreenConfirm) return;
    const actor = currentUser
      ? { name: currentUser.display_name, email: currentUser.email, title: currentUser.role_title }
      : roleActors[currentRole];
    const actorUser = users.find((u) => u.email === actor.email);
    const actorId = currentUser?.id || actorUser?.id;

    try {
      await api.deleteScreen(deleteScreenConfirm.screen.id, actorId);
      setProjects((prev) =>
        prev.map((p) => ({
          ...p,
          modules: (p.modules || []).map((m) =>
            m.id === deleteScreenConfirm.moduleId
              ? { ...m, screens: (m.screens || []).filter((s) => s.id !== deleteScreenConfirm.screen.id) }
              : m
          ),
        }))
      );
      showToast(`Screen '${deleteScreenConfirm.screen.name}' deleted.`);
      setDeleteScreenConfirm(null);
      loadInitialData();
    } catch (err: any) {
      showToast(err.message || "Failed to delete screen.");
    }
  };

  const handleAssignStakeholder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCrDetail || !stakeholderForm.user_id) return;
    const res = await api.assignStakeholder(selectedCrDetail.id, stakeholderForm);
    if (res) {
      showToast(`Assigned ${stakeholderForm.responsibility} successfully!`);
      setAssignStakeholderOpen(false);
      openCrDetail(selectedCrDetail.id);
      loadInitialData();
    } else {
      showToast("Failed to assign stakeholder");
    }
  };

  const handleNegotiateDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCrDetail || !deadlineForm.proposed_deadline) return;
    const res = await api.negotiateDeadline(selectedCrDetail.id, deadlineForm.proposed_deadline, deadlineForm.revision_reason);
    if (res) {
      showToast("Deadline revision requested and submitted for BA review");
      setDeadlineModalOpen(false);
      openCrDetail(selectedCrDetail.id);
      loadInitialData();
    } else {
      showToast("Failed to submit deadline revision");
    }
  };

  const handleRespondDeadline = async (action: "ACCEPTED" | "REJECTED") => {
    if (!selectedCrDetail) return;
    const res = await api.respondDeadline(selectedCrDetail.id, action, `Decision recorded by ${currentRole}`);
    if (res) {
      showToast(`Deadline revision was ${action.toLowerCase()}!`);
      openCrDetail(selectedCrDetail.id);
      loadInitialData();
    }
  };

  const handleGenerateSrnDraft = async () => {
    if (selectedReadyItemIds.length === 0) {
      showToast("Please select at least one eligible item");
      return;
    }
    const selectedItems = readyItems.filter((it) => selectedReadyItemIds.includes(it.id));
    const items = selectedItems.map((it) => ({ id: it.id, item_type: it.item_type, item_key: it.item_key }));

    const crItems = selectedItems
      .filter((it) => it.item_type === "CR_CHANGE")
      .map((it, idx) => ({
        sr: idx + 1,
        id: it.cr_number || it.item_key,
        description: it.title,
        module_screen: `${it.module_name} - Screen Modification`,
        impact: "Yes",
      }));

    const bugItems = selectedItems
      .filter((it) => it.item_type === "BUG_FIX")
      .map((it, idx) => ({
        sr: idx + 1,
        id: it.item_key,
        description: it.title,
        module_screen: `${it.module_name} - Bug Fix Screen`,
        impact: "Yes",
      }));

    const author = actor.name;
    const pmReviewer = "Harshal Giri";
    const spmApprover = "Rajat Bodankar";

    const formattedHtml = generateDocxSrnHtml({
      companyName: "NCDEX e Markets Limited (NeML)",
      productName: selectedItems[0]?.project_name || "NAFED V3 Web & Service Application",
      moduleName: Array.from(new Set(selectedItems.map((it) => it.module_name))).join(", ") || "NAFED V3 Application",
      serviceVersion: "V2.0.42U10",
      intendedProdVersion: "V2.0.42",
      srnNumber: `2026${new Date().toISOString().slice(5, 7)}${new Date().toISOString().slice(8, 10)}`,
      authorName: author,
      pmReviewerName: pmReviewer,
      spmApproverName: spmApprover,
      pmReviewed: false,
      spmApproved: false,
      crItems,
      bugItems,
    });

    const draft = await api.generateSrnDraft({ selected_items: items, release_version: "V2.0.42U10", target_environment: "UAT" });
    const finalDraft = draft || {
      srn_id: `srn-${Date.now()}`,
      srn_number: `SRN-20260724`,
      release_version: "V2.0.42U10",
      target_environment: "UAT",
      status: "DRAFT",
      email_subject: `Re: Release Notification NAFED Web Application V3 [SRN-20260724]`,
      email_recipients_to: "uat-team@company.com",
      email_recipients_cc: "pm-team@company.com, ba-team@company.com",
      rendered_email_body: formattedHtml,
      has_multiple_threads: false,
      existing_threads: [{ thread_id: "th-master-1", subject: "Release Notification NAFED Web Application V3" }],
    };

    finalDraft.rendered_email_body = formattedHtml;
    setSrnDraftData(finalDraft);
    setSrnPmReviewed(false);
    setSrnSpmApproved(false);
    setSrnBaApproved(false);
    setSrnBaHold(false);
    setSrnDraftModalOpen(true);
  };

  const handlePmReviewSrn = () => {
    setSrnPmReviewed(true);
    showToast("PM Review sign-off recorded successfully as Reviewer!");
    if (srnDraftData) {
      const updatedHtml = generateDocxSrnHtml({
        srnNumber: srnDraftData.srn_number,
        pmReviewed: true,
        spmApproved: srnSpmApproved,
      });
      setSrnDraftData({ ...srnDraftData, rendered_email_body: updatedHtml });
    }
  };

  const handleSpmApproveSrn = () => {
    if (!srnPmReviewed) {
      showToast("Notice: PM Review should ideally precede SPM Executive approval.");
    }
    setSrnSpmApproved(true);
    showToast("SPM Executive Sign-off approved! Routed to BA Gatekeeper.");
    if (srnDraftData) {
      const updatedHtml = generateDocxSrnHtml({
        srnNumber: srnDraftData.srn_number,
        pmReviewed: srnPmReviewed,
        spmApproved: true,
      });
      setSrnDraftData({ ...srnDraftData, rendered_email_body: updatedHtml });
    }
  };

  const handleBaGatekeepSrn = (action: "APPROVE" | "HOLD") => {
    if (action === "APPROVE") {
      setSrnBaApproved(true);
      setSrnBaHold(false);
      showToast("BA Gatekeeper approved deployment to UAT! Ready for email dispatch.");
    } else {
      setBaHoldModalOpen(true);
    }
  };

  const handleConfirmBaHold = () => {
    if (!baHoldReason.trim()) {
      showToast("Mandatory hold reason required under SOP Step 4.2.");
      return;
    }
    setSrnBaApproved(false);
    setSrnBaHold(true);
    setBaHoldModalOpen(false);
    showToast(`SRN deployment placed on HOLD by BA. Reason: ${baHoldReason}`);
  };

  const handleSendSrn = async () => {
    if (!srnDraftData) return;
    if (!srnPmReviewed || !srnSpmApproved || !srnBaApproved) {
      showToast("Management Gatekeeping Enforced: PM Review, SPM Approval, and BA Sign-off must all be completed prior to dispatch.");
      return;
    }
    setSrnSending(true);
    const res = await api.sendSrn({
      srn_id: srnDraftData.srn_id,
      thread_option: threadOption,
      selected_thread_id: srnDraftData.existing_threads?.[0]?.thread_id,
      email_recipients_to: srnDraftData.email_recipients_to,
      email_subject: srnDraftData.email_subject,
      rendered_email_body: srnDraftData.rendered_email_body,
    });
    setSrnSending(false);
    showToast(`SRN ${srnDraftData.srn_number} sent in email thread! Associated CRs are now UNLOCKED for UAT.`);
    
    // Unlock CRs in state
    setChangeRequests((prev) =>
      prev.map((cr) => (cr.status === "DEVELOPMENT" || cr.status === "SIT" || cr.status === "UAT_READY" ? { ...cr, is_uat_unlocked: true, status: "UAT" } : cr))
    );

    // Record Activity
    const actSrn: CRActivityEvent = {
      id: `act-${Date.now()}`,
      srn_number: srnDraftData.srn_number,
      event_type: "SRN_EMAIL_DISPATCHED",
      phase: "Phase 4: SRN Dispatch",
      actor_name: actor.name,
      actor_role: currentRole,
      title: `SRN Dispatched & UAT Unlocked`,
      details: `SRN ${srnDraftData.srn_number} dispatched to UAT team. Critical security check passed: CRs unlocked for Bug Assign Screen.`,
      timestamp: new Date().toISOString().replace("T", " ").slice(0, 16),
    };
    setCrActivities((prev) => [actSrn, ...prev]);

    setSrnDraftModalOpen(false);
    setSelectedReadyItemIds([]);
    loadInitialData();
  };

  const handleCompleteTaskWithOverdueCheck = async (task: DevTask) => {
    const isOverdue = task.due_date && new Date(task.due_date).getTime() < new Date().setHours(0, 0, 0, 0);
    if (isOverdue) {
      setOverdueTargetTask(task);
      setOverdueRemark("");
      setOverdueModalOpen(true);
    } else {
      await api.updateDevTask(task.id, { status: "DEVELOPMENT_COMPLETE", completion_notes: "Code complete. Development finished." });
      showToast(`${task.task_number} marked Development Completed!`);
      const newAct: CRActivityEvent = {
        id: `act-${Date.now()}`,
        cr_id: task.cr_id,
        cr_number: task.cr_number,
        event_type: "TASK_COMPLETED",
        phase: "Phase 2: Execution",
        actor_name: actor.name,
        actor_role: currentRole,
        title: `${task.task_number} Development Completed`,
        details: `Task completed by developer. Status updated to DEVELOPMENT_COMPLETE.`,
        timestamp: new Date().toISOString().replace("T", " ").slice(0, 16),
      };
      setCrActivities((prev) => [newAct, ...prev]);
      loadInitialData();
    }
  };

  const handleSubmitOverdueReason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overdueTargetTask || !overdueRemark.trim()) {
      showToast("Overdue explanation is mandatory under SOP Step 2.2.");
      return;
    }
    await api.completeDevTaskWithOverdue(overdueTargetTask.id, overdueRemark);
    showToast(`${overdueTargetTask.task_number} marked Development Completed with delay reason recorded!`);
    const newAct: CRActivityEvent = {
      id: `act-${Date.now()}`,
      cr_id: overdueTargetTask.cr_id,
      cr_number: overdueTargetTask.cr_number,
      event_type: "OVERDUE_REMARK",
      phase: "Phase 2: Execution",
      actor_name: actor.name,
      actor_role: currentRole,
      title: `${overdueTargetTask.task_number} Completed with Overdue Delay Protocol`,
      details: `Completed after PM deadline (${overdueTargetTask.due_date}). Delay Explanation: "${overdueRemark}"`,
      timestamp: new Date().toISOString().replace("T", " ").slice(0, 16),
    };
    setCrActivities((prev) => [newAct, ...prev]);
    setOverdueModalOpen(false);
    setOverdueTargetTask(null);
    setOverdueRemark("");
    loadInitialData();
  };

  const handlePlReviewAction = (cr: ChangeRequest | ChangeRequestDetail, action: "ACCEPT" | "NEGOTIATE" | "ESCALATE") => {
    setPlTargetCr(cr);
    setPlAction(action);
    setPlNotes("");
    setPlReviewModalOpen(true);
  };

  const handleSubmitPlReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plTargetCr) return;
    if (plAction === "ACCEPT") {
      await api.acceptCrByPl(plTargetCr.id, plNotes || "Scope and timeline accepted by PL");
      showToast(`Project Lead Accepted CR ${plTargetCr.reference_number}. Moved to Task Allocation.`);
      const newAct: CRActivityEvent = {
        id: `act-${Date.now()}`,
        cr_id: plTargetCr.id,
        cr_number: plTargetCr.reference_number,
        event_type: "PL_REVIEW",
        phase: "Phase 1: Allocation",
        actor_name: actor.name,
        actor_role: currentRole,
        title: `Technical Review Accepted by Project Lead`,
        details: plNotes || "Technical specifications and schedule baseline accepted by PL.",
        timestamp: new Date().toISOString().replace("T", " ").slice(0, 16),
      };
      setCrActivities((prev) => [newAct, ...prev]);
    } else if (plAction === "ESCALATE") {
      if (!plNotes.trim()) {
        showToast("Escalation reason is required for PM/SPM oversight under SOP Step 1.2.");
        return;
      }
      await api.escalateCrByPl(plTargetCr.id, plNotes);
      showToast(`CR ${plTargetCr.reference_number} escalated to SPM / PM for executive oversight.`);
      const newAct: CRActivityEvent = {
        id: `act-${Date.now()}`,
        cr_id: plTargetCr.id,
        cr_number: plTargetCr.reference_number,
        event_type: "ESCALATION",
        phase: "Phase 1: Allocation",
        actor_name: actor.name,
        actor_role: currentRole,
        title: `CR Escalated to SPM / PM`,
        details: `Escalation reason: "${plNotes}"`,
        timestamp: new Date().toISOString().replace("T", " ").slice(0, 16),
      };
      setCrActivities((prev) => [newAct, ...prev]);
    } else if (plAction === "NEGOTIATE") {
      setDeadlineForm({ proposed_deadline: plTargetCr.requested_deadline || "", revision_reason: plNotes });
      setPlReviewModalOpen(false);
      setDeadlineModalOpen(true);
      return;
    }
    setPlReviewModalOpen(false);
    setPlTargetCr(null);
    setPlNotes("");
    loadInitialData();
  };

  const handleOpenProductionArtifacts = (cr: ChangeRequest | ChangeRequestDetail) => {
    const prodSrn = `================================================================================
                    NCDEX e Markets Limited (NeML)
                  PRODUCTION SOFTWARE RELEASE NOTE (FINAL)
            Release for ${cr.title} - Intended Version V2.0.42
================================================================================

CR Identifier: ${cr.reference_number}
Target Environment: PRODUCTION
Release Date: ${new Date().toISOString().slice(0, 10)}
Sign-off: UAT Signed Off & Business Accepted

1. EXECUTIVE CHANGE SUMMARY
This production package deploys verified enhancements and defect resolutions
that have completed 100% of User Acceptance Testing with zero blocking defects.

2. IMPACTED MODULES & SCREENS
- Impacted Modules: Registration, Assaying, Gate Entry
- Modified Screens: ${cr.screen_name || 'Farmer Lot Entry, Center Scheduling'}

3. ROLLBACK STRATEGY
If anomalous behavior occurs during post-deploy sanity testing:
1. Revert container tag to previous stable build tag V2.0.41.
2. Execute downgrade migration script via Alembic.
3. Invalidate Redis session caches and re-test health check endpoint.
Sign-off: Harshal Giri (PL), Bob PM (PM), Rajat Bodankar (SPM)`.trim();

    const checklist = `================================================================================
             ENTERPRISE DEPLOYMENT CHECKLIST — PRODUCTION GATE
================================================================================
CR: ${cr.reference_number} | Build: V2.0.42 | Date: ${new Date().toISOString().slice(0, 10)}

[X] 1. Pre-Deployment Database Snapshot & WAL Archival Confirmed (DBA Lead)
[X] 2. Staging & SIT Regression Sign-off Verified (100% Pass Rate)
[X] 3. Schema Migrations Dry-Run Completed with Zero Locking Conflicts
[X] 4. Third-Party Integrations / Webhooks Verified (Assaying & Payment Gateways)
[X] 5. Environment Variables & Secret Store Mappings Validated
[X] 6. Blue/Green Container Rolling Update Sequence Initiated
[X] 7. Automated Smoke Tests & Health Check Status: HTTP 200 OK
[X] 8. Business Analyst User Acceptance Verification Completed on Target Screens
[X] 9. Performance & Application Error Rate Monitored (< 0.01% Error Budget)
[X] 10. Post-Deployment Verification Sign-off Recorded by Project Manager`.trim();

    const rfc = `================================================================================
          CHANGE ADVISORY BOARD (CAB) — REQUEST FOR CHANGE (RFC)
================================================================================
RFC Tracking ID: RFC-2026-${cr.reference_number.replace('-', '')}
Change Category: Standard Maintenance / Scheduled Production Deployment
Priority: Normal
Risk Level: Low - Medium

1. CHANGE DESCRIPTION:
Deployment of ${cr.title} (${cr.reference_number}).
Business Justification: ${cr.business_justification || 'Enhance market transaction efficiency and regulatory adherence.'}

2. IMPLEMENTATION WINDOW:
Start: ${new Date().toISOString().slice(0, 10)} 23:00 IST
End:   ${new Date().toISOString().slice(0, 10)} 02:00 IST

3. IMPACT ASSESSMENT:
- Service Outage Expected: None (Zero-downtime rolling update)
- Impacted Systems: Web Frontend, Backend API Services, Supporting Services

4. BACKOUT PLAN:
Documented rollback procedure in Section 3 of Production SRN.
Estimated Rollback Time: 12 minutes.

5. APPROVAL AUTHORITY:
- PM Sign-off: Bob PM (Approved)
- SPM Sign-off: Rajat Bodankar (Approved)
- UAT Lead Sign-off: Diana Rao (Approved)`.trim();

    setProdArtifacts({
      cr_id: cr.id,
      cr_number: cr.reference_number,
      project_name: "NAFED V3 Web Application",
      version: "V2.0.42",
      production_srn: prodSrn,
      deployment_checklist: checklist,
      rfc_document: rfc,
      generated_at: new Date().toISOString().replace('T', ' ').slice(0, 16),
      generated_by_name: actor.name,
    });
    setActiveArtifactTab("srn");
    setProdArtifactsModalOpen(true);
  };

  const handleDispatchProductionPackage = () => {
    showToast("Production Package (Prod SRN, Checklist, RFC) emailed to stakeholders!");
    if (prodArtifacts) {
      const actProd: CRActivityEvent = {
        id: `act-${Date.now()}`,
        cr_id: prodArtifacts.cr_id,
        cr_number: prodArtifacts.cr_number,
        event_type: "PROD_ARTIFACTS_GENERATED",
        phase: "Phase 5: Production Readiness",
        actor_name: actor.name,
        actor_role: currentRole,
        title: `Production Artifacts Dispatched to Stakeholders`,
        details: `Emailed Production SRN, Deployment Checklist, and RFC package for ${prodArtifacts.cr_number}. Lifecycle complete.`,
        timestamp: new Date().toISOString().replace("T", " ").slice(0, 16),
      };
      setCrActivities((prev) => [actProd, ...prev]);
    }
    setProdArtifactsModalOpen(false);
  };

  const handleConfirmDeployment = async () => {
    if (!deployTargetId) return;
    const res = await api.confirmDeployment(deployTargetId, deployEvidence, deployBuildId);
    if (res && res.status === "CONFIRMED") {
      showToast(`UAT Deployment confirmed for ${res.release_version}! ${res.defects_deployed_count} defect(s) marked UAT_DEPLOYED and READY_FOR_RETEST.`);
      setDeployConfirmModalOpen(false);
      loadInitialData();
    } else {
      showToast("Failed to confirm deployment");
    }
  };

  const handleResolveDefect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fixDefectId || !fixNotes) return;
    const res = await api.resolveDefect(fixDefectId, fixNotes, fixCodeRef, fixAttachmentUrl);
    if (res) {
      showToast("Defect marked FIXED and queued for developer SIT verification!");
      setFixDefectModalOpen(false);
      setFixNotes("");
      setFixCodeRef("");
      setFixAttachmentUrl("");
      loadInitialData();
    }
  };

  const handleSitVerifyDefect = async (defectId: string, result: "PASS" | "FAIL") => {
    const res = await api.sitVerifyDefect(defectId, result, "Verified by developer in testbed");
    if (res) {
      showToast(result === "PASS" ? "SIT Passed: Defect is now READY_FOR_UAT_DEPLOYMENT!" : "SIT Failed: Defect returned to developer");
      loadInitialData();
    }
  };

  const handleRetestDefect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retestDefectId) return;
    const res = await api.retestDefect(retestDefectId, retestResult, retestNotes || "UAT verification completed");
    if (res) {
      showToast(retestResult === "PASS" ? "Fix verified and defect CLOSED!" : "Defect REOPENED and returned to developer!");
      setRetestModalOpen(false);
      setRetestNotes("");
      loadInitialData();
    }
  };

  const handleZohoSync = async () => {
    showToast("Synchronizing with Zoho Change Request API...");
    const res = await api.triggerZohoSync();
    if (res) {
      showToast("Zoho Change Requests successfully synchronized!");
      loadInitialData();
    }
  };

  // Current Actor Details
  const actor = roleActors[currentRole];

  // Self Activity Filtering for Developer
  const myDeveloperTasks = useMemo(() => {
    return devTasks.filter((t) => t.assigned_developer_name === actor.name || t.assigned_developer_id === actor.name);
  }, [devTasks, actor.name]);

  const myDeveloperBugs = useMemo(() => {
    return defects.filter((d) => d.assigned_developer_name === actor.name);
  }, [defects, actor.name]);

  const myDeveloperCrs = useMemo(() => {
    const myCrIds = new Set(myDeveloperTasks.map((t) => t.cr_id));
    return changeRequests.filter((cr) => myCrIds.has(cr.id) || cr.title.toLowerCase().includes(actor.name.toLowerCase()));
  }, [changeRequests, myDeveloperTasks, actor.name]);

  // Filtered CRs (respecting developer self activity scope)
  const filteredChangeRequests = useMemo(() => {
    const sourceList = (currentRole === "Developer" && crScopeFilter === "MY_CRS")
      ? myDeveloperCrs
      : changeRequests;

    return sourceList.filter((cr) => {
      const matchSearch =
        cr.reference_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cr.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cr.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "All" || cr.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [changeRequests, myDeveloperCrs, currentRole, crScopeFilter, searchTerm, statusFilter]);

  // Filtered CR Activities (Section 3 Audit Trail)
  const filteredActivities = useMemo(() => {
    return crActivities.filter((act) => {
      const matchSearch =
        act.title.toLowerCase().includes(activitySearchTerm.toLowerCase()) ||
        act.details.toLowerCase().includes(activitySearchTerm.toLowerCase()) ||
        act.actor_name.toLowerCase().includes(activitySearchTerm.toLowerCase()) ||
        (act.cr_number && act.cr_number.toLowerCase().includes(activitySearchTerm.toLowerCase())) ||
        (act.srn_number && act.srn_number.toLowerCase().includes(activitySearchTerm.toLowerCase()));

      const matchPhase = activityPhaseFilter === "All" || act.phase.includes(activityPhaseFilter);
      const matchType = activityTypeFilter === "All" || act.event_type === activityTypeFilter;
      const matchCr = activityCrFilter === "All" || act.cr_number === activityCrFilter || act.cr_id === activityCrFilter;

      return matchSearch && matchPhase && matchType && matchCr;
    });
  }, [crActivities, activitySearchTerm, activityPhaseFilter, activityTypeFilter, activityCrFilter]);

  // Filtered Defects (respecting developer self activity scope)
  const displayedDefects = useMemo(() => {
    if (currentRole === "Developer" && defectScopeFilter === "MY_BUGS") {
      return myDeveloperBugs;
    }
    return defects;
  }, [defects, myDeveloperBugs, currentRole, defectScopeFilter]);

  // Avoid hydration mismatch until client is mounted
  if (!isMounted) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ fontSize: "14px", color: "#64748b", fontWeight: 500 }}>Loading UAT Tracker...</div>
      </div>
    );
  }

  // Authentication Guard: Render Login View if no active session
  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("uat_auth_user", JSON.stringify(user));
            } catch {}
          }
          if (user.role_title) {
            setCurrentRole(user.role_title);
          }
          showToast(`Welcome, ${user.display_name}! Signed in via ${user.login_method || "SSO"}.`);
        }}
      />
    );
  }

  return (
    <div className="shell">
      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">
            <Rocket size={18} color="#fff" />
          </div>
          <span>UAT Tracker</span>
        </div>

        <div className="sidebarNavWrapper">
          <nav className="sidebarNav">
            <div className="navLabel">Main Navigation</div>
            {navigationItems
              .filter((item) => !item.roles || item.roles.includes(currentRole))
              .map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.view;
                return (
                  <button
                    key={item.view}
                    type="button"
                    className={`navItem ${isActive ? "active" : ""}`}
                    onClick={() => navigateToView(item.view)}
                  >
                    <Icon size={16} className="navIcon" />
                    <span>{item.label}</span>
                    {item.view === "Ready for UAT / Send SRN" && readyItems.length > 0 && (
                      <span className="count" style={{ background: "#0284c7", color: "#fff" }}>
                        {readyItems.length}
                      </span>
                    )}
                    {item.view === "Bug Tracker" && (currentRole === "Developer" ? myDeveloperBugs.length : kpi.bugs_open) > 0 && (
                      <span className="count" style={{ background: "#b91c1c", color: "#fff" }}>
                        {currentRole === "Developer" ? myDeveloperBugs.length : kpi.bugs_open}
                      </span>
                    )}
                  </button>
                );
              })}
          </nav>
        </div>

        {/* ROLE SWITCHER */}
        <div className="profileWrap">
          {roleMenuOpen && (
            <div className="roleMenu">
              <div className="roleIdentity">
                <strong>{actor.name}</strong>
                <span>{actor.title}</span>
              </div>
              <p>Switch Active Enterprise Role</p>
              {allRoles.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={currentRole === r ? "selected" : ""}
                  onClick={() => handleSwitchRole(r)}
                >
                  <span>{currentRole === r ? "✓" : "•"}</span>
                  <div>
                    <strong>{r}</strong>
                    <small>{roleActors[r].name}</small>
                  </div>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            className="profile"
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
          >
            <div className="avatar">{actor.name.split(" ").map((n) => n[0]).join("")}</div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <strong>{actor.name}</strong>
                {currentUser?.login_method === "GOOGLE_SSO" && (
                  <span style={{ background: "#e8f0fe", color: "#1967d2", fontSize: 9, padding: "1px 4px", borderRadius: 3, fontWeight: 700 }}>
                    ENTERPRISE SSO
                  </span>
                )}
                {currentUser?.login_method === "PASSWORD" && (
                  <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 9, padding: "1px 4px", borderRadius: 3, fontWeight: 700 }}>
                    ADMIN PASSWORD
                  </span>
                )}
              </div>
              <span>{currentRole}</span>
            </div>
            <ChevronDown size={14} style={{ marginLeft: "auto" }} />
          </button>

          {/* DEDICATED LOGOUT BUTTON */}
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginTop: 8,
              padding: "8px 12px",
              borderRadius: 6,
              background: "#fef2f2",
              color: "#b91c1c",
              border: "1px solid #fecaca",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#fee2e2";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#fef2f2";
            }}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="content">
        {/* TOPBAR */}
        <header className="topbar">
          <div className="search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search Change Requests, Bugs, SRNs, Releases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <span className="activeRoleBadge">
              Role: <b>{currentRole}</b> ({actor.name})
            </span>

            <div className={`connection ${connected ? "live" : "demo"}`}>
              <span />
              {connected ? "PostgreSQL & FastAPI Live" : "Offline Simulation"}
            </div>

            {["Business Analyst", "BA Lead"].includes(currentRole) ? (
              <button
                type="button"
                className="primaryButton"
                onClick={() => setCreateCrOpen(true)}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <Plus size={16} />
                <span>Create CR</span>
              </button>
            ) : ["UAT Tester", "UAT Lead"].includes(currentRole) ? (
              <button
                type="button"
                className="primaryButton"
                onClick={() => {
                  setNewDefectForm({
                    cr_id: "",
                    module_id: "",
                    title: "",
                    description: "",
                    reproduction_steps: "",
                    severity: "MAJOR",
                    priority: "HIGH",
                    assigned_developer_id: "",
                    evidence_url: "",
                  });
                  setCreateDefectModalOpen(true);
                }}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "#dc2626" }}
              >
                <Plus size={16} />
                <span>+ Report Defect</span>
              </button>
            ) : null}
          </div>
        </header>

        {/* TOAST NOTIFICATION */}
        {toastMessage && (
          <div
            style={{
              position: "fixed",
              bottom: 24,
              right: 24,
              background: "#0f172a",
              color: "#fff",
              padding: "12px 20px",
              borderRadius: 8,
              boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
              zIndex: 1000,
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
              borderLeft: "4px solid #3b82f6",
            }}
          >
            <CheckCircle2 size={16} color="#3b82f6" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* VIEW CONTENTS */}
        <main className="page">
          {/* VIEW 1: DASHBOARD */}
          {activeView === "Dashboard" && (
            <div>
              <div className="welcomeRow">
                <div>
                  <div className="eyebrow">Enterprise Delivery Cockpit</div>
                  <h1>Welcome back, {actor.name}</h1>
                  <p>Real-time lifecycle governance from requirements to SIT, SRN email dispatch, and confirmed UAT deployment.</p>
                </div>
                <button
                  type="button"
                  className="primaryButton"
                  onClick={handleZohoSync}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <RefreshCw size={14} />
                  <span>Sync Zoho CRs</span>
                </button>
              </div>

              {/* ROLE-AWARE DASHBOARD */}
              {currentRole === "Developer" ? (
                /* DEVELOPER SELF-ACTIVITY COCKPIT */
                <div>
                  <div className="metrics" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
                    <div className="metricCard clickableRow" onClick={() => navigateToView("My Tasks")}>
                      <div className="metricTop"><span>My Assigned Tasks</span><CheckSquare size={16} color="#3b82f6" /></div>
                      <strong style={{ color: "#3b82f6" }}>{myDeveloperTasks.length}</strong>
                      <div className="delta positive">Active tasks in workbench</div>
                    </div>
                    <div className="metricCard clickableRow" onClick={() => navigateToView("My Tasks")}>
                      <div className="metricTop"><span>In-Progress Work</span><Kanban size={16} color="#0284c7" /></div>
                      <strong style={{ color: "#0284c7" }}>{myDeveloperTasks.filter((t) => t.status === "IN_PROGRESS").length}</strong>
                      <div className="delta">Currently coding</div>
                    </div>
                    <div className="metricCard clickableRow" onClick={() => navigateToView("Bug Tracker")}>
                      <div className="metricTop"><span>My Open Defects</span><Bug size={16} color="#b91c1c" /></div>
                      <strong style={{ color: "#b91c1c" }}>{myDeveloperBugs.filter((d) => ["OPEN", "ASSIGNED", "IN_PROGRESS", "REOPENED"].includes(d.status)).length}</strong>
                      <div className="delta" style={{ color: "#b91c1c" }}>Require my fix</div>
                    </div>
                    <div className="metricCard clickableRow" onClick={() => navigateToView("Bug Tracker")}>
                      <div className="metricTop"><span>Bugs Fixed (Awaiting Deploy)</span><Clock size={16} color="#b45309" /></div>
                      <strong style={{ color: "#b45309" }}>{myDeveloperBugs.filter((d) => ["FIXED", "SIT_PASSED", "READY_FOR_UAT_DEPLOYMENT", "SRN_SENT"].includes(d.status)).length}</strong>
                      <div className="delta">Code complete / SIT ready</div>
                    </div>
                    <div className="metricCard clickableRow" onClick={() => navigateToView("SIT Testing")}>
                      <div className="metricTop"><span>Ready for SIT</span><TestTube size={16} color="#7c3aed" /></div>
                      <strong style={{ color: "#7c3aed" }}>{myDeveloperTasks.filter((t) => t.status === "READY_FOR_SIT").length}</strong>
                      <div className="delta positive">Technical test pending</div>
                    </div>
                    <div className="metricCard clickableRow" onClick={() => navigateToView("Change Requests")}>
                      <div className="metricTop"><span>My Assigned CRs</span><GitPullRequest size={16} color="#15803d" /></div>
                      <strong style={{ color: "#15803d" }}>{myDeveloperCrs.length}</strong>
                      <div className="delta positive">Associated CR initiatives</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20, marginTop: 24 }}>
                    {/* LEFT PANEL: MY ONGOING TASKS & CR PROGRESS */}
                    <div className="panel" style={{ padding: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: 16 }}>My Ongoing Tasks & CR Progress</h3>
                          <p style={{ margin: "3px 0 0", color: "#64748b", fontSize: 12 }}>Tasks assigned to you across impacted CR modules.</p>
                        </div>
                        <button type="button" className="linkButton" onClick={() => navigateToView("My Tasks")}>
                          View Workbench →
                        </button>
                      </div>
                      <div className="tableWrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Task</th>
                              <th>Title & CR</th>
                              <th>Status</th>
                              <th>Effort</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {myDeveloperTasks.map((t) => (
                              <tr key={t.id}>
                                <td><strong>{t.task_number}</strong></td>
                                <td>
                                  <strong>{t.title}</strong>
                                  <div style={{ fontSize: 11, color: "#64748b" }}>CR: {t.cr_number} · {t.module_name}</div>
                                </td>
                                <td><span className={`status status-${t.status.toLowerCase().replaceAll("_", "-")}`}>{t.status}</span></td>
                                <td>{t.actual_hours}h / {t.estimated_hours}h</td>
                                <td>
                                  {t.status === "TODO" && (
                                    <button
                                      type="button"
                                      className="tableAction"
                                      onClick={async () => {
                                        await api.updateDevTask(t.id, { status: "IN_PROGRESS" });
                                        showToast(`Started work on ${t.task_number}`);
                                        loadInitialData();
                                      }}
                                    >
                                      Start →
                                    </button>
                                  )}
                                  {t.status === "IN_PROGRESS" && (
                                    <button
                                      type="button"
                                      className="tableAction"
                                      style={{ background: "#dcfce7", color: "#166534", borderColor: "#bbf7d0", fontWeight: 600 }}
                                      onClick={() => handleCompleteTaskWithOverdueCheck(t)}
                                    >
                                      Complete Task (SOP Step 2.1) &rarr;
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {myDeveloperTasks.length === 0 && (
                              <tr><td colSpan={5} style={{ textAlign: "center", color: "#94a3b8", padding: 24 }}>No tasks assigned. Great job!</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* RIGHT PANEL: MY ASSIGNED DEFECTS & QUICK RESOLUTION */}
                    <div className="panel" style={{ padding: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: 16 }}>My Assigned Defects</h3>
                          <p style={{ margin: "3px 0 0", color: "#64748b", fontSize: 12 }}>Fix code and run technical SIT validation.</p>
                        </div>
                        <button type="button" className="linkButton" onClick={() => navigateToView("Bug Tracker")}>
                          View Bug Tracker →
                        </button>
                      </div>
                      <div className="tableWrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Bug ID</th>
                              <th>Title & Severity</th>
                              <th>Status</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {myDeveloperBugs.map((d) => (
                              <tr key={d.id}>
                                <td><strong style={{ color: "#b91c1c" }}>{d.bug_number}</strong></td>
                                <td>
                                  <strong style={{ fontSize: 11 }}>{d.title}</strong>
                                  <div style={{ fontSize: 10, color: d.severity === "BLOCKER" ? "#b91c1c" : "#d97706", fontWeight: 700 }}>{d.severity}</div>
                                </td>
                                <td><span className={`status status-${d.status.toLowerCase().replaceAll("_", "-")}`}>{d.status}</span></td>
                                <td>
                                  {["ASSIGNED", "IN_PROGRESS", "REOPENED", "OPEN"].includes(d.status) && (
                                    <button
                                      type="button"
                                      className="tableAction"
                                      style={{ background: "#eef2ff", color: "#4f46e5", borderColor: "#c7d2fe" }}
                                      onClick={() => {
                                        setFixDefectId(d.id);
                                        setFixDefectModalOpen(true);
                                      }}
                                    >
                                      Mark Fixed
                                    </button>
                                  )}
                                  {d.status === "FIXED" && (
                                    <button
                                      type="button"
                                      className="tableAction"
                                      style={{ background: "#f0fdf4", color: "#16a34a", borderColor: "#bbf7d0" }}
                                      onClick={async () => {
                                        await api.sitVerifyDefect(d.id, "PASS", "Technical SIT passed by developer");
                                        showToast(`${d.bug_number} marked SIT Passed! Ready for UAT SRN.`);
                                        loadInitialData();
                                      }}
                                    >
                                      SIT Passed ✓
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {myDeveloperBugs.length === 0 && (
                              <tr><td colSpan={4} style={{ textAlign: "center", color: "#94a3b8", padding: 24 }}>No bugs assigned to you. Clean code!</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* EXECUTIVE / PM / ADMIN PORTFOLIO DASHBOARD */
                <div>
                  <div className="metrics" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
                    <div
                      className="metricCard clickableRow"
                      onClick={() => {
                        navigateToView("Change Requests");
                        setStatusFilter("All");
                      }}
                    >
                      <div className="metricTop">
                        <span>Total Change Requests</span>
                        <GitPullRequest size={16} color="#6366f1" />
                      </div>
                      <strong>{kpi.total_crs}</strong>
                      <div className="delta positive">Portfolio total active</div>
                    </div>

                    <div
                      className="metricCard clickableRow"
                      onClick={() => {
                        navigateToView("Change Requests");
                        setStatusFilter("DEVELOPMENT");
                      }}
                    >
                      <div className="metricTop">
                        <span>In Development</span>
                        <Kanban size={16} color="#3b82f6" />
                      </div>
                      <strong style={{ color: "#3b82f6" }}>{kpi.in_dev_crs}</strong>
                      <div className="delta">Active coding stage</div>
                    </div>

                    <div
                      className="metricCard clickableRow"
                      onClick={() => {
                        navigateToView("Ready for UAT / Send SRN");
                      }}
                    >
                      <div className="metricTop">
                        <span>Ready for UAT / SRN</span>
                        <Send size={16} color="#0284c7" />
                      </div>
                      <strong style={{ color: "#0284c7" }}>{readyItems.length}</strong>
                      <div className="delta positive" style={{ color: "#0284c7" }}>
                        SIT passed & ready
                      </div>
                    </div>

                    <div
                      className="metricCard clickableRow"
                      onClick={() => {
                        navigateToView("Change Requests");
                        setStatusFilter("UAT");
                      }}
                    >
                      <div className="metricTop">
                        <span>In UAT Testing</span>
                        <CheckCircle2 size={16} color="#15803d" />
                      </div>
                      <strong style={{ color: "#15803d" }}>{kpi.in_uat_crs}</strong>
                      <div className="delta positive">Verification active</div>
                    </div>

                    <div
                      className="metricCard clickableRow"
                      onClick={() => {
                        navigateToView("Bug Tracker");
                      }}
                    >
                      <div className="metricTop">
                        <span>Open Defects</span>
                        <Bug size={16} color="#b91c1c" />
                      </div>
                      <strong style={{ color: "#b91c1c" }}>{kpi.bugs_open}</strong>
                      <div className="delta" style={{ color: "#b91c1c" }}>
                        Require dev resolution
                      </div>
                    </div>

                    <div
                      className="metricCard clickableRow"
                      onClick={() => {
                        navigateToView("Ready for UAT / Send SRN");
                      }}
                    >
                      <div className="metricTop">
                        <span>Bugs Awaiting Deployment</span>
                        <Clock size={16} color="#b45309" />
                      </div>
                      <strong style={{ color: "#b45309" }}>{kpi.bugs_awaiting_deployment}</strong>
                      <div className="delta" style={{ color: "#b45309" }}>
                        Fixed & pending SRN/Deploy
                      </div>
                    </div>

                    <div
                      className="metricCard clickableRow"
                      onClick={() => {
                        navigateToView("Releases and Deployments");
                      }}
                    >
                      <div className="metricTop">
                        <span>UAT Deployments</span>
                        <Rocket size={16} color="#4f46e5" />
                      </div>
                      <strong style={{ color: "#4f46e5" }}>{kpi.deployments_confirmed}</strong>
                      <div className="delta positive">Confirmed builds</div>
                    </div>

                    <div
                      className="metricCard clickableRow"
                      onClick={() => {
                        navigateToView("Pending Approvals");
                      }}
                    >
                      <div className="metricTop">
                        <span>Pending Approvals</span>
                        <AlertTriangle size={16} color="#d97706" />
                      </div>
                      <strong style={{ color: "#d97706" }}>{kpi.pending_deadline_approvals + kpi.pending_scope_proposals}</strong>
                      <div className="delta warning">Deadline & scope reviews</div>
                    </div>
                  </div>

                  {/* RECENT CHANGE REQUESTS GRID */}
                  <div className="panel fullPanel" style={{ marginTop: 24, padding: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 750 }}>Active Change Requests Pipeline</h3>
                        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 12 }}>
                          Click any row to open the complete CR detail view, stakeholder assignments, and timeline.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="linkButton"
                        onClick={() => navigateToView("Change Requests")}
                      >
                        View All Change Requests →
                      </button>
                    </div>

                    <div className="tableWrap functionalTable">
                      <table>
                        <thead>
                          <tr>
                            <th>CR Reference</th>
                            <th>Project</th>
                            <th>Source</th>
                            <th>BA</th>
                            <th>Primary PM</th>
                            <th>Status</th>
                            <th>Priority</th>
                            <th>Approved Deadline</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {changeRequests.slice(0, 6).map((cr) => (
                            <tr key={cr.id} className="clickableRow" onClick={() => openCrDetail(cr.id)}>
                              <td>
                                <strong>{cr.reference_number}</strong>
                                <div style={{ color: "#64748b", fontSize: 11 }}>{cr.title}</div>
                              </td>
                              <td>{cr.project_name || "Enterprise"}</td>
                              <td>
                                <span className="typeTag" style={{ background: cr.source === "ZOHO" ? "#fef3c7" : "#e0f2fe", color: cr.source === "ZOHO" ? "#b45309" : "#0284c7" }}>
                                  {cr.source}
                                </span>
                              </td>
                              <td>{cr.ba_user_name || "Alice BA"}</td>
                              <td>
                                {cr.primary_pm_name ? (
                                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
                                    <Star size={12} color="#f59e0b" fill="#f59e0b" />
                                    {cr.primary_pm_name}
                                  </span>
                                ) : (
                                  <span style={{ color: "#d97706", fontSize: 11 }}>Awaiting PM</span>
                                )}
                              </td>
                              <td>
                                <span className={`status status-${cr.status.toLowerCase().replaceAll("_", "-")}`}>
                                  {cr.status}
                                </span>
                              </td>
                              <td>
                                <span className={`priority priority-${cr.priority.toLowerCase()}`}>
                                  <i />
                                  {cr.priority}
                                </span>
                              </td>
                              <td>{cr.approved_deadline || cr.requested_deadline || "Not set"}</td>
                              <td>
                                <button
                                  type="button"
                                  className="tableAction"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openCrDetail(cr.id);
                                  }}
                                >
                                  Open Details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: CHANGE REQUESTS */}
          {activeView === "Change Requests" && (
            <div>
              <div className="welcomeRow">
                <div>
                  <div className="eyebrow">Enterprise Requirements Management</div>
                  <h1>Change Requests Catalog</h1>
                  <p>Ingested from Zoho or internally authored with complete stakeholder ownership and schedule baselines.</p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  {["Business Analyst", "BA Lead", "System Administrator"].includes(currentRole) && (
                    <button
                      type="button"
                      className="secondaryButton"
                      disabled={isFetchingZoho}
                      onClick={handleFetchZoho}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        color: "#334155",
                        fontWeight: 600,
                      }}
                    >
                      <RefreshCw size={15} className={isFetchingZoho ? "spin" : ""} />
                      <span>{isFetchingZoho ? "Fetching Zoho..." : "Fetch from Zoho"}</span>
                    </button>
                  )}
                  {["Business Analyst", "BA Lead"].includes(currentRole) && (
                    <button
                      type="button"
                      className="primaryButton"
                      onClick={() => setCreateCrOpen(true)}
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <Plus size={16} />
                      <span>Create Internal CR</span>
                    </button>
                  )}
                </div>
              </div>

              {["UAT Tester", "UAT Lead"].includes(currentRole) && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                  <CheckCircle2 size={18} color="#16a34a" />
                  <div style={{ fontSize: 13, color: "#166534" }}>
                    <strong>Role Policy:</strong> UAT team members test deployed CRs, log defects (bugs), and update test execution/hold status. Change Requests are created exclusively by <strong>Business Analysts (BA)</strong>.
                  </div>
                </div>
              )}

              {/* SCOPE TOGGLE (SELF ACTIVITY VS ALL) */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className={`tabBtn ${crScopeFilter === "MY_CRS" ? "active" : ""}`}
                    onClick={() => setCrScopeFilter("MY_CRS")}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 6,
                      border: "1px solid var(--line)",
                      background: crScopeFilter === "MY_CRS" ? "#5b5ce2" : "#fff",
                      color: crScopeFilter === "MY_CRS" ? "#fff" : "var(--ink)",
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    My Assigned CRs ({myDeveloperCrs.length})
                  </button>
                  <button
                    type="button"
                    className={`tabBtn ${crScopeFilter === "ALL_CRS" ? "active" : ""}`}
                    onClick={() => setCrScopeFilter("ALL_CRS")}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 6,
                      border: "1px solid var(--line)",
                      background: crScopeFilter === "ALL_CRS" ? "#5b5ce2" : "#fff",
                      color: crScopeFilter === "ALL_CRS" ? "#fff" : "var(--ink)",
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    All Portfolio CRs ({changeRequests.length})
                  </button>
                </div>
                {currentRole === "Developer" && (
                  <span style={{ fontSize: 11, color: "#4f46e5", fontWeight: 700, background: "#eef2ff", padding: "4px 10px", borderRadius: 12 }}>
                    Developer Self Activity: Ongoing Assigned CR Modules
                  </span>
                )}
              </div>

              {/* FILTERS */}
              <div style={{ display: "flex", gap: 12, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#475569" }}>
                  <Filter size={14} />
                  <span>Filter by Status:</span>
                </div>
                {[
                  "All",
                  "PENDING_BA_VERIFICATION",
                  "REVERTED_TO_BA",
                  "PENDING_PL_REVIEW",
                  "PENDING_MANAGEMENT_REVIEW",
                  "CHANGES_REQUESTED_BY_MANAGEMENT",
                  "APPROVED_BY_MANAGEMENT",
                  "DEVELOPMENT",
                  "SIT",
                  "UAT",
                  "CLOSED",
                ].map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={`tabBtn ${statusFilter === st ? "active" : ""}`}
                    onClick={() => setStatusFilter(st)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "1px solid var(--line)",
                      background: statusFilter === st ? "#5b5ce2" : "#fff",
                      color: statusFilter === st ? "#fff" : "var(--ink)",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {st.replaceAll("_", " ")}
                  </button>
                ))}
              </div>

              {/* TABLE */}
              <div className="panel fullPanel" style={{ padding: 20 }}>
                <div className="tableWrap functionalTable">
                  <table>
                    <thead>
                      <tr>
                        <th>CR ID</th>
                        <th>Title & Scope</th>
                        <th>Project</th>
                        <th>Source</th>
                        <th>Primary PM</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Requested Date</th>
                        <th>Approved Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredChangeRequests.map((cr) => (
                        <tr key={cr.id} className="clickableRow" onClick={() => openCrDetail(cr.id)}>
                          <td>
                            <strong>{cr.reference_number}</strong>
                            {cr.hold_status === "PENDING_APPROVAL" && (
                              <div style={{ marginTop: 2 }}>
                                <span style={{ background: "#fef3c7", color: "#b45309", padding: "1px 5px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                                  HOLD REQ
                                </span>
                              </div>
                            )}
                            {cr.hold_status === "ON_HOLD" && (
                              <div style={{ marginTop: 2 }}>
                                <span style={{ background: "#fee2e2", color: "#dc2626", padding: "1px 5px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                                  ON HOLD
                                </span>
                              </div>
                            )}
                          </td>
                          <td>
                            <strong>{cr.title}</strong>
                            <div style={{ color: "#64748b", fontSize: 11, maxWidth: 360, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {cr.description}
                            </div>
                          </td>
                          <td>{cr.project_name || "Enterprise"}</td>
                          <td>
                            <span className="typeTag">{cr.source}</span>
                          </td>
                          <td>
                            {cr.primary_pm_name ? (
                              <span style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
                                <Star size={12} color="#f59e0b" fill="#f59e0b" />
                                {cr.primary_pm_name}
                              </span>
                            ) : (
                              <span style={{ color: "#d97706", fontSize: 11 }}>Awaiting PM</span>
                            )}
                          </td>
                          <td>
                            <span className={`status status-${cr.status.toLowerCase().replaceAll("_", "-")}`}>
                              {cr.status}
                            </span>
                          </td>
                          <td>
                            <span className={`priority priority-${cr.priority.toLowerCase()}`}>
                              <i />
                              {cr.priority}
                            </span>
                          </td>
                          <td>{cr.requested_deadline || "None"}</td>
                          <td>
                            <strong style={{ color: cr.approved_deadline ? "#0f172a" : "#94a3b8" }}>
                              {cr.approved_deadline || "Pending"}
                            </strong>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                              {/* BA Verify / Revert action */}
                              {["PENDING_BA_VERIFICATION", "REVERTED_TO_BA"].includes(cr.status) &&
                                ["Business Analyst", "BA Lead", "System Administrator"].includes(currentRole) && (
                                  <button
                                    type="button"
                                    className="tableAction"
                                    style={{ background: "#4f46e5", color: "#fff", borderColor: "#4338ca", fontWeight: 700 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openBaVerifyModal(cr);
                                    }}
                                  >
                                    Verify / Revert
                                  </button>
                                )}

                              {/* PL Review action */}
                              {cr.status === "PENDING_PL_REVIEW" &&
                                ["Project Lead", "Senior Project Manager", "Project Manager", "System Administrator"].includes(currentRole) && (
                                  <button
                                    type="button"
                                    className="tableAction"
                                    style={{ background: "#0284c7", color: "#fff", borderColor: "#0369a1", fontWeight: 700 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openPlGovReviewModal(cr);
                                    }}
                                  >
                                    PL Review
                                  </button>
                                )}

                              {/* PL Handle Changes */}
                              {cr.status === "CHANGES_REQUESTED_BY_MANAGEMENT" &&
                                ["Project Lead", "Senior Project Manager", "Project Manager", "System Administrator"].includes(currentRole) && (
                                  <button
                                    type="button"
                                    className="tableAction"
                                    style={{ background: "#ea580c", color: "#fff", borderColor: "#c2410c", fontWeight: 700 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openPlChangesModal(cr);
                                    }}
                                  >
                                    Review Feedback
                                  </button>
                                )}

                              {/* Management Review action */}
                              {cr.status === "PENDING_MANAGEMENT_REVIEW" &&
                                ["Senior Project Manager", "Project Manager", "System Administrator"].includes(currentRole) && (
                                  <button
                                    type="button"
                                    className="tableAction"
                                    style={{ background: "#7c3aed", color: "#fff", borderColor: "#6d28d9", fontWeight: 700 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openMgmtReviewModal(cr);
                                    }}
                                  >
                                    Mgmt Review
                                  </button>
                                )}

                              {/* Developer Assignment action */}
                              {["APPROVED_BY_MANAGEMENT", "APPROVED_BY_PL"].includes(cr.status) &&
                                ["Project Manager", "Senior Project Manager", "System Administrator"].includes(currentRole) && (
                                  <button
                                    type="button"
                                    className="tableAction"
                                    style={{ background: "#16a34a", color: "#fff", borderColor: "#15803d", fontWeight: 700 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDevAssignModal(cr);
                                    }}
                                  >
                                    Assign Devs
                                  </button>
                                )}

                              {/* Developer Discussion Concern button */}
                              <button
                                type="button"
                                className="tableAction"
                                style={{ display: "flex", alignItems: "center", gap: 4, background: "#f8fafc", color: "#475569" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDiscussionModal(cr);
                                }}
                                title="Open Discussions & Developer Concerns"
                              >
                                <MessageCircle size={13} color="#6366f1" />
                                <span>Discussion</span>
                              </button>

                              <button
                                type="button"
                                className="tableAction"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openCrDetail(cr.id);
                                }}
                              >
                                Manage
                              </button>
                              {["Business Analyst", "System Administrator"].includes(currentRole) && cr.hold_status === "PENDING_APPROVAL" && (
                                <button
                                  type="button"
                                  className="tableAction"
                                  style={{ background: "#fef3c7", color: "#b45309", borderColor: "#fde68a" }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openCrDetail(cr.id);
                                  }}
                                >
                                  Review Hold
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredChangeRequests.length === 0 && (
                        <tr>
                          <td colSpan={10} style={{ textAlign: "center", padding: 30, color: "#64748b" }}>
                            No Change Requests match the selected criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}


          {/* VIEW: CR ACTIVITY TRACKER (SOP Section 3 Global Audit Trail) */}
          {activeView === "CR Activity" && (
            <div>
              <div className="welcomeRow">
                <div>
                  <div className="eyebrow">SOP Master Workflow &bull; Section 3</div>
                  <h1>CR Activity Tracker</h1>
                  <p>
                    Globally accessible audit trail detailing CR initiation, PL reviews, task assignments, developer overdue remarks,
                    PM/SPM/BA multi-tier release sign-offs, email dispatches, and bug fix threads.
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="tableAction"
                    onClick={() => {
                      setActivitySearchTerm("");
                      setActivityPhaseFilter("All");
                      setActivityTypeFilter("All");
                      setActivityCrFilter("All");
                      showToast("Activity filters reset");
                    }}
                  >
                    Reset Filters
                  </button>
                </div>
              </div>

              {/* QUICK KPI METRICS */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 18 }}>
                <div className="kpiCard" style={{ padding: 14, borderLeft: "4px solid #3b82f6" }}>
                  <div className="kpiLabel">Total Tracked Events</div>
                  <div className="kpiValue" style={{ fontSize: 24, marginTop: 4 }}>{crActivities.length}</div>
                  <span style={{ fontSize: 11, color: "#64748b" }}>Immutable audit history</span>
                </div>
                <div className="kpiCard" style={{ padding: 14, borderLeft: "4px solid #f59e0b" }}>
                  <div className="kpiLabel">Phase 1 & 2 Execution</div>
                  <div className="kpiValue" style={{ fontSize: 24, marginTop: 4 }}>
                    {crActivities.filter((a) => a.phase.includes("Phase 1") || a.phase.includes("Phase 2")).length}
                  </div>
                  <span style={{ fontSize: 11, color: "#64748b" }}>Initiation, PL review & dev</span>
                </div>
                <div className="kpiCard" style={{ padding: 14, borderLeft: "4px solid #8b5cf6" }}>
                  <div className="kpiLabel">Phase 3 & 4 SRN Approvals</div>
                  <div className="kpiValue" style={{ fontSize: 24, marginTop: 4 }}>
                    {crActivities.filter((a) => a.phase.includes("Phase 3") || a.phase.includes("Phase 4")).length}
                  </div>
                  <span style={{ fontSize: 11, color: "#64748b" }}>PM, SPM & BA gatekeeping</span>
                </div>
                <div className="kpiCard" style={{ padding: 14, borderLeft: "4px solid #10b981" }}>
                  <div className="kpiLabel">Phase 5 UAT & Prod Releases</div>
                  <div className="kpiValue" style={{ fontSize: 24, marginTop: 4 }}>
                    {crActivities.filter((a) => a.phase.includes("Phase 5")).length}
                  </div>
                  <span style={{ fontSize: 11, color: "#64748b" }}>Bugs, fix SRNs & prod RFCs</span>
                </div>
              </div>

              {/* FILTER BAR */}
              <div className="card" style={{ padding: 16, marginBottom: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12 }}>
                  <div style={{ position: "relative" }}>
                    <Search size={16} style={{ position: "absolute", left: 10, top: 11, color: "#94a3b8" }} />
                    <input
                      type="text"
                      placeholder="Search activities by actor, title, remarks..."
                      value={activitySearchTerm}
                      onChange={(e) => setActivitySearchTerm(e.target.value)}
                      style={{ width: "100%", paddingLeft: 34, height: 38, borderRadius: 6, border: "1px solid var(--line)", fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <select
                      value={activityPhaseFilter}
                      onChange={(e) => setActivityPhaseFilter(e.target.value)}
                      style={{ width: "100%", height: 38, borderRadius: 6, border: "1px solid var(--line)", padding: "0 10px", fontSize: 13 }}
                    >
                      <option value="All">All Phases</option>
                      <option value="Phase 1">Phase 1: Initiation & Allocation</option>
                      <option value="Phase 2">Phase 2: Execution & Tracking</option>
                      <option value="Phase 3">Phase 3: UAT Prep</option>
                      <option value="Phase 4">Phase 4: Approval & Dispatch</option>
                      <option value="Phase 5">Phase 5: Testing & Production</option>
                    </select>
                  </div>
                  <div>
                    <select
                      value={activityTypeFilter}
                      onChange={(e) => setActivityTypeFilter(e.target.value)}
                      style={{ width: "100%", height: 38, borderRadius: 6, border: "1px solid var(--line)", padding: "0 10px", fontSize: 13 }}
                    >
                      <option value="All">All Event Types</option>
                      <option value="CR_INITIATION">CR Initiation</option>
                      <option value="PL_REVIEW">PL Technical Review</option>
                      <option value="ESCALATION">PM/SPM Escalation</option>
                      <option value="TASK_ALLOCATED">Task Allocated</option>
                      <option value="TASK_COMPLETED">Task Completed</option>
                      <option value="OVERDUE_REMARK">Overdue Remark</option>
                      <option value="UAT_MAPPING">UAT Impact Mapping</option>
                      <option value="SRN_PM_REVIEW">PM Review</option>
                      <option value="SRN_SPM_APPROVAL">SPM Approval</option>
                      <option value="BA_GATEKEEP_APPROVE">BA Approved</option>
                      <option value="BA_GATEKEEP_HOLD">BA Placed on Hold</option>
                      <option value="SRN_EMAIL_DISPATCHED">SRN Email Dispatched</option>
                      <option value="UAT_UNLOCKED">UAT Unlocked</option>
                      <option value="BUG_LOGGED">UAT Bug Logged</option>
                      <option value="BUG_FIX_SRN">Bug Fix SRN</option>
                      <option value="PROD_ARTIFACTS_GENERATED">Production Package</option>
                    </select>
                  </div>
                  <div>
                    <select
                      value={activityCrFilter}
                      onChange={(e) => setActivityCrFilter(e.target.value)}
                      style={{ width: "100%", height: 38, borderRadius: 6, border: "1px solid var(--line)", padding: "0 10px", fontSize: 13 }}
                    >
                      <option value="All">All Change Requests</option>
                      {changeRequests.map((cr) => (
                        <option key={cr.id} value={cr.reference_number}>
                          {cr.reference_number} ({cr.title.slice(0, 20)}...)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* TIMELINE LIST */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {filteredActivities.map((act) => {
                  const isPhase1 = act.phase.includes("Phase 1");
                  const isPhase2 = act.phase.includes("Phase 2");
                  const isPhase3 = act.phase.includes("Phase 3");
                  const isPhase4 = act.phase.includes("Phase 4");
                  const isPhase5 = act.phase.includes("Phase 5");

                  const badgeColor = isPhase1
                    ? "#3b82f6"
                    : isPhase2
                    ? "#f59e0b"
                    : isPhase3
                    ? "#6366f1"
                    : isPhase4
                    ? "#8b5cf6"
                    : "#10b981";

                  return (
                    <div
                      key={act.id}
                      className="card"
                      style={{
                        padding: 18,
                        borderLeft: `4px solid ${badgeColor}`,
                        display: "grid",
                        gridTemplateColumns: "auto 1fr",
                        gap: 16,
                        alignItems: "start",
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          background: `${badgeColor}15`,
                          color: badgeColor,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginTop: 2,
                        }}
                      >
                        {act.event_type === "CR_INITIATION" && <GitPullRequest size={20} />}
                        {act.event_type === "PL_REVIEW" && <CheckCircle2 size={20} />}
                        {act.event_type === "ESCALATION" && <AlertTriangle size={20} />}
                        {act.event_type === "TASK_ALLOCATED" && <CheckSquare size={20} />}
                        {act.event_type === "TASK_COMPLETED" && <Check size={20} />}
                        {act.event_type === "OVERDUE_REMARK" && <Clock size={20} />}
                        {act.event_type === "UAT_MAPPING" && <Layers size={20} />}
                        {(act.event_type === "SRN_PM_REVIEW" || act.event_type === "SRN_SPM_APPROVAL") && <Award size={20} />}
                        {(act.event_type === "BA_GATEKEEP_APPROVE" || act.event_type === "BA_GATEKEEP_HOLD") && <ShieldAlert size={20} />}
                        {act.event_type === "SRN_EMAIL_DISPATCHED" && <Mail size={20} />}
                        {act.event_type === "UAT_UNLOCKED" && <Unlock size={20} />}
                        {act.event_type === "BUG_LOGGED" && <Bug size={20} />}
                        {act.event_type === "BUG_FIX_SRN" && <Send size={20} />}
                        {act.event_type === "PROD_ARTIFACTS_GENERATED" && <Rocket size={20} />}
                      </div>

                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                background: `${badgeColor}15`,
                                color: badgeColor,
                                padding: "2px 8px",
                                borderRadius: 4,
                              }}
                            >
                              {act.phase}
                            </span>
                            <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
                              {act.event_type.replaceAll("_", " ")}
                            </span>
                          </div>
                          <span style={{ fontSize: 12, color: "#64748b" }}>{act.timestamp}</span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0" }}>
                          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{act.title}</h3>
                          {act.cr_number && (
                            <button
                              type="button"
                              onClick={() => {
                                const target = changeRequests.find((c) => c.reference_number === act.cr_number || c.id === act.cr_id);
                                if (target) openCrDetail(target.id);
                              }}
                              style={{
                                border: "1px solid #bfdbfe",
                                background: "#eff6ff",
                                color: "#1d4ed8",
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 12,
                                cursor: "pointer",
                              }}
                            >
                              {act.cr_number} &rarr;
                            </button>
                          )}
                          {act.srn_number && (
                            <span
                              style={{
                                border: "1px solid #e9d5ff",
                                background: "#faf5ff",
                                color: "#7e22ce",
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 12,
                              }}
                            >
                              {act.srn_number}
                            </span>
                          )}
                        </div>

                        <p style={{ margin: "4px 0 8px", fontSize: 13, color: "#334155", lineHeight: 1.5 }}>
                          {act.details}
                        </p>

                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b" }}>
                          <span style={{ fontWeight: 600, color: "#0f172a" }}>Actor:</span>
                          <span>{act.actor_name}</span>
                          <span style={{ color: "#cbd5e1" }}>&bull;</span>
                          <span style={{ color: "#64748b" }}>{act.actor_role}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredActivities.length === 0 && (
                  <div className="card" style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
                    <p style={{ margin: 0, fontSize: 14 }}>No activity logs matched your selected search and filters.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 5: MY TASKS (DEVELOPER) */}
          {activeView === "My Tasks" && (
            <div>
              <div className="welcomeRow">
                <div>
                  <div className="eyebrow">Developer Cockpit</div>
                  <h1>My Assigned Work & Defects</h1>
                  <p>Track development tasks, raise blockers to management, test in SIT, and provide feedback on reported bugs.</p>
                </div>
              </div>

              {/* DEVELOPER SELF REPORT KPIS */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 18 }}>
                <div className="kpiCard" style={{ padding: 14, borderLeft: "4px solid #6366f1" }}>
                  <div className="kpiLabel">My Active Tasks</div>
                  <div className="kpiValue" style={{ fontSize: 24, marginTop: 4 }}>
                    {devTasks.filter((t) => t.status !== "DONE").length}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>In development pipeline</div>
                </div>
                <div className="kpiCard" style={{ padding: 14, borderLeft: "4px solid #ef4444" }}>
                  <div className="kpiLabel">My Open Bugs</div>
                  <div className="kpiValue" style={{ fontSize: 24, marginTop: 4, color: "#dc2626" }}>
                    {defects.filter((d) => ["OPEN", "ASSIGNED", "IN_PROGRESS", "REOPENED"].includes(d.status)).length}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Requiring code resolution</div>
                </div>
                <div className="kpiCard" style={{ padding: 14, borderLeft: "4px solid #f59e0b" }}>
                  <div className="kpiLabel">In SIT Testing</div>
                  <div className="kpiValue" style={{ fontSize: 24, marginTop: 4, color: "#d97706" }}>
                    {defects.filter((d) => d.status === "FIXED" || d.status === "SIT_IN_PROGRESS").length}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Developer testing only</div>
                </div>
                <div className="kpiCard" style={{ padding: 14, borderLeft: "4px solid #10b981" }}>
                  <div className="kpiLabel">Completed Tasks / CRs</div>
                  <div className="kpiValue" style={{ fontSize: 24, marginTop: 4, color: "#16a34a" }}>
                    {devTasks.filter((t) => t.status === "DONE" || t.status === "READY_FOR_SIT").length}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>SIT / Release ready</div>
                </div>
              </div>

              {/* SIT VS UAT SEGREGATION NOTICE */}
              <div style={{ background: "#e0f2fe", border: "1px solid #bae6fd", padding: "10px 16px", borderRadius: 8, marginBottom: 18, display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#0369a1" }}>
                <ShieldAlert size={18} />
                <div>
                  <b>SIT Testing Policy:</b> SIT status is strictly for Developer verification. UAT testers cannot test or verify defects until an SRN release note is generated and deployment is confirmed.
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* MY TASKS */}
                <div className="panel" style={{ padding: 20 }}>
                  <h3 style={{ margin: "0 0 16px", fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <CheckSquare size={18} color="#5b5ce2" />
                    <span>My Development Tasks ({devTasks.length})</span>
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {devTasks.map((t) => (
                      <div key={t.id} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 14, background: "#fafafa" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#6366f1" }}>{t.task_number}</span>
                            <h4 style={{ margin: "4px 0", fontSize: 14 }}>{t.title}</h4>
                            <div style={{ color: "#64748b", fontSize: 11 }}>
                              CR: <b>{t.cr_number}</b> · Module: <b>{t.module_name}</b>
                            </div>
                          </div>
                          <span className={`status status-${t.status.toLowerCase().replaceAll("_", "-")}`}>
                            {t.status}
                          </span>
                        </div>
                        {t.blockers && (
                          <div style={{ marginTop: 8, padding: 8, background: "#fee2e2", borderLeft: "3px solid #dc2626", borderRadius: 4, fontSize: 11, color: "#991b1b" }}>
                            <b>Blocker / Manager Note:</b> {t.blockers}
                          </div>
                        )}
                        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                          <span style={{ fontSize: 11, color: "#64748b" }}>
                            Effort: {t.actual_hours}h / {t.estimated_hours}h est
                          </span>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              type="button"
                              className="tableAction"
                              style={{ background: "#fff1f2", color: "#e11d48", borderColor: "#fecdd3", fontSize: 11 }}
                              onClick={() => {
                                setDifficultyTaskId(t.id);
                                setDifficultyTaskNumber(t.task_number);
                                setRaiseDifficultyModalOpen(true);
                              }}
                            >
                              Raise Note to Manager
                            </button>
                            {t.status === "TODO" && (
                              <button
                                type="button"
                                className="tableAction"
                                onClick={async () => {
                                  await api.updateDevTask(t.id, { status: "IN_PROGRESS" });
                                  showToast(`${t.task_number} moved to IN_PROGRESS`);
                                  loadInitialData();
                                }}
                              >
                                Start Coding
                              </button>
                            )}
                            {t.status === "IN_PROGRESS" && (
                              <button
                                type="button"
                                className="tableAction"
                                style={{ background: "#dcfce7", color: "#166534", borderColor: "#bbf7d0", fontWeight: 600 }}
                                onClick={() => handleCompleteTaskWithOverdueCheck(t)}
                              >
                                Mark Dev Completed (SOP 2.1)
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* MY BUGS TO FIX */}
                <div className="panel" style={{ padding: 20 }}>
                  <h3 style={{ margin: "0 0 16px", fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <Bug size={18} color="#b91c1c" />
                    <span>Defects Assigned to Me ({defects.filter((d) => d.status !== "CLOSED").length})</span>
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {defects
                      .filter((d) => d.status !== "CLOSED")
                      .map((d) => (
                        <div key={d.id} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 14, background: "#fff" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#b91c1c" }}>{d.bug_number}</span>
                              <h4 style={{ margin: "4px 0", fontSize: 14 }}>{d.title}</h4>
                              <div style={{ color: "#64748b", fontSize: 11 }}>
                                CR: <b>{d.cr_number}</b> · Module: <b>{d.module_name}</b> · Severity: <b style={{ color: "#b91c1c" }}>{d.severity}</b>
                              </div>
                            </div>
                            <span className={`status status-${d.status.toLowerCase().replaceAll("_", "-")}`}>
                              {d.status}
                            </span>
                          </div>
                          {d.resolution_notes && (
                            <div style={{ marginTop: 8, padding: 8, background: "#f0fdf4", borderLeft: "3px solid #22c55e", borderRadius: 4, fontSize: 11, color: "#166534" }}>
                              <b>Fix Notes:</b> {d.resolution_notes}
                            </div>
                          )}
                          {d.developer_feedback && (
                            <div style={{ marginTop: 8, padding: 8, background: "#eff6ff", borderLeft: "3px solid #3b82f6", borderRadius: 4, fontSize: 11, color: "#1e40af" }}>
                              <b>Developer Feedback:</b> {d.developer_feedback}
                              {d.developer_feedback_attachment && (
                                <div style={{ marginTop: 2 }}>
                                  <a href={d.developer_feedback_attachment} target="_blank" rel="noreferrer" style={{ color: "#2563eb", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 3 }}>
                                    <Paperclip size={10} /> View Proof Attachment
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              className="tableAction"
                              style={{ fontSize: 11 }}
                              onClick={() => {
                                setFeedbackDefectId(d.id);
                                setFeedbackDefectNumber(d.bug_number);
                                setDefectFeedbackModalOpen(true);
                              }}
                            >
                              Feedback & Proof
                            </button>
                            {["OPEN", "ASSIGNED", "IN_PROGRESS", "REOPENED"].includes(d.status) && (
                              <button
                                type="button"
                                className="primaryButton"
                                style={{ height: 30, fontSize: 11 }}
                                onClick={() => {
                                  setFixDefectId(d.id);
                                  setFixDefectModalOpen(true);
                                }}
                              >
                                Mark Bug Fixed
                              </button>
                            )}
                            {d.status === "FIXED" && (
                              <button
                                type="button"
                                className="tableAction"
                                style={{ background: "#f0fdf4", color: "#16a34a", borderColor: "#bbf7d0", fontSize: 11 }}
                                onClick={() => handleSitVerifyDefect(d.id, "PASS")}
                              >
                                SIT Verify (Pass) ✓
                              </button>
                            )}
                            <button
                              type="button"
                              className="tableAction"
                              style={{ fontSize: 11 }}
                              onClick={() => setSelectedDefect(d)}
                            >
                              Details
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 8: READY FOR UAT / SEND SRN (CRITICAL WORKFLOW) */}
          {activeView === "Ready for UAT / Send SRN" && (
            <div>
              <div className="welcomeRow">
                <div>
                  <div className="eyebrow">Release Handoff & Communication</div>
                  <h1>Ready for UAT / Send SRN</h1>
                  <p>
                    Select completed CR changes and fixed bugs that have satisfied mandatory SIT checks to generate a consolidated Software Release Note (SRN) and dispatch it in the existing email conversation thread.
                  </p>
                </div>
              </div>

              {/* ACTION BAR */}
              <div className="srnActionPanel">
                <div className="srnActionInfo">
                  <span className="srnCountBadge">{selectedReadyItemIds.length} Selected</span>
                  <span style={{ fontSize: 13, color: "#0369a1", fontWeight: 600 }}>
                    {selectedReadyItemIds.length === 0
                      ? "Select eligible items from the grid below to compile an SRN release"
                      : "Ready to prepare consolidated SRN release note and email draft"}
                  </span>
                </div>
                <button
                  type="button"
                  className="primaryButton"
                  disabled={selectedReadyItemIds.length === 0}
                  onClick={handleGenerateSrnDraft}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <Mail size={16} />
                  <span>Create Consolidated SRN ({selectedReadyItemIds.length})</span>
                </button>
              </div>

              {/* READY ITEMS TABLE */}
              <div className="panel fullPanel" style={{ padding: 20 }}>
                <div className="tableWrap functionalTable">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>
                          <input
                            type="checkbox"
                            checked={readyItems.length > 0 && selectedReadyItemIds.length === readyItems.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedReadyItemIds(readyItems.map((it) => it.id));
                              } else {
                                setSelectedReadyItemIds([]);
                              }
                            }}
                          />
                        </th>
                        <th>Item Key</th>
                        <th>Item Type</th>
                        <th>CR Association</th>
                        <th>Title</th>
                        <th>Developer</th>
                        <th>Dev Status</th>
                        <th>SIT Status</th>
                        <th>Completion Date</th>
                        <th>Email Thread</th>
                      </tr>
                    </thead>
                    <tbody>
                      {readyItems.map((item) => {
                        const isSelected = selectedReadyItemIds.includes(item.id);
                        return (
                          <tr
                            key={item.id}
                            className={isSelected ? "selectedRow" : ""}
                            style={{ background: isSelected ? "#f0f9ff" : undefined }}
                          >
                            <td>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedReadyItemIds([...selectedReadyItemIds, item.id]);
                                  } else {
                                    setSelectedReadyItemIds(selectedReadyItemIds.filter((id) => id !== item.id));
                                  }
                                }}
                              />
                            </td>
                            <td>
                              <strong>{item.item_key}</strong>
                            </td>
                            <td>
                              <span
                                className="typeTag"
                                style={{
                                  background: item.item_type === "BUG_FIX" ? "#fee2e2" : "#e0f2fe",
                                  color: item.item_type === "BUG_FIX" ? "#b91c1c" : "#0369a1",
                                }}
                              >
                                {item.item_type === "BUG_FIX" ? "Bug Fix" : "CR Feature"}
                              </span>
                            </td>
                            <td>
                              <strong>{item.cr_number}</strong>
                            </td>
                            <td>
                              <strong>{item.title}</strong>
                              <div style={{ color: "#64748b", fontSize: 11 }}>Project: {item.project_name} · Module: {item.module_name}</div>
                            </td>
                            <td>{item.developer_name}</td>
                            <td>
                              <span className="status status-verified">{item.dev_status}</span>
                            </td>
                            <td>
                              <span className="status status-sit-passed">{item.sit_status}</span>
                            </td>
                            <td>{item.fix_date}</td>
                            <td>
                              {item.has_email_thread ? (
                                <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#0284c7", fontSize: 11, fontWeight: 600 }}>
                                  <Mail size={12} />
                                  <span>Active Thread</span>
                                </span>
                              ) : (
                                <span style={{ color: "#94a3b8", fontSize: 11 }}>New Thread</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {readyItems.length === 0 && (
                        <tr>
                          <td colSpan={10} style={{ textAlign: "center", padding: 36, color: "#64748b" }}>
                            No items currently awaiting UAT handoff. Items appear here automatically once developer coding and mandatory SIT checks pass!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 9: SRN HISTORY */}
          {activeView === "SRN History" && (
            <div>
              <div className="welcomeRow">
                <div>
                  <div className="eyebrow">Audit & Release Communications</div>
                  <h1>SRN Release Note History</h1>
                  <p>All previously dispatched Software Release Notes with provider message IDs, recipient lists, and email conversation links.</p>
                </div>
              </div>

              <div className="panel fullPanel" style={{ padding: 20 }}>
                <div className="tableWrap functionalTable">
                  <table>
                    <thead>
                      <tr>
                        <th>SRN Number</th>
                        <th>Release Build</th>
                        <th>Target Env</th>
                        <th>Author</th>
                        <th>Email Subject</th>
                        <th>Provider Message-ID</th>
                        <th>Status</th>
                        <th>Sent Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {srnDocuments.map((s) => (
                        <tr key={s.id}>
                          <td>
                            <strong>{s.srn_number}</strong>
                          </td>
                          <td>
                            <span className="typeTag">{s.release_version}</span>
                          </td>
                          <td>{s.target_environment}</td>
                          <td>{s.author_name}</td>
                          <td style={{ maxWidth: 280, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {s.email_subject || "Release Notice"}
                          </td>
                          <td>
                            <code style={{ fontSize: 10, background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>
                              {s.provider_message_id || "Pending"}
                            </code>
                          </td>
                          <td>
                            <span className="status status-srn-sent">{s.status}</span>
                          </td>
                          <td>{s.sent_at ? new Date(s.sent_at).toLocaleDateString() : "Just now"}</td>
                          <td>
                            <button
                              type="button"
                              className="tableAction"
                              onClick={async () => {
                                const detail = await api.getSrnDetail(s.id);
                                setSelectedSrnDoc(detail);
                              }}
                            >
                              View Email
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 11: BUG TRACKER */}
          {activeView === "Bug Tracker" && (
            <div>
              <div className="welcomeRow">
                <div>
                  <div className="eyebrow">Defect Lifecycle Governance</div>
                  <h1>Bug & Defect Tracker</h1>
                  <p>
                    Strict lifecycle separation: Fixed != UAT Deployed. Defects only move to UAT_DEPLOYED upon confirmed environment deployment!
                  </p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className="primaryButton"
                    style={{ background: "#dc2626", display: "flex", alignItems: "center", gap: 6 }}
                    onClick={() => setCreateDefectModalOpen(true)}
                  >
                    <Plus size={16} />
                    <span>Report Defect</span>
                  </button>
                </div>
              </div>

              {/* SOP 4.3 ACCESS GOVERNANCE & SECURITY GATE BANNER */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "12px 16px", borderRadius: 8, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <ShieldAlert size={18} color="#0284c7" />
                  <span style={{ fontSize: 13, color: "#334155" }}>
                    <b>SOP Step 4.3 Critical Security Rule:</b> The UAT track only gains system access to assign bugs <i>after</i> final SRN approval and email dispatch.
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                  <span style={{ background: "#dcfce7", color: "#166534", padding: "2px 10px", borderRadius: 12, fontWeight: 700 }}>
                    ✓ {changeRequests.filter((c) => c.is_uat_unlocked || c.status === "UAT" || c.status === "UAT_SIGNED_OFF").length} CRs Unlocked for UAT
                  </span>
                  <span style={{ background: "#fef3c7", color: "#92400e", padding: "2px 10px", borderRadius: 12, fontWeight: 700 }}>
                    [Locked] {changeRequests.filter((c) => !c.is_uat_unlocked && c.status !== "UAT" && c.status !== "UAT_SIGNED_OFF").length} Locked
                  </span>
                </div>
              </div>

              {/* DEFECT LIFECYCLE TIMELINE GUIDE */}
              <div className="workflowTimeline">
                {[
                  "OPEN",
                  "ASSIGNED",
                  "IN_PROGRESS",
                  "FIXED",
                  "SIT_PASSED",
                  "READY_FOR_UAT_DEPLOYMENT",
                  "SRN_SENT",
                  "UAT_DEPLOYED",
                  "READY_FOR_RETEST",
                  "VERIFIED",
                  "CLOSED",
                ].map((step, idx) => (
                  <React.Fragment key={step}>
                    <div className="timelineStep completed">
                      <div className="timelineNode">{idx + 1}</div>
                      <span className="timelineLabel">{step.replaceAll("_", " ")}</span>
                    </div>
                    {idx < 10 && <div className="timelineDivider" />}
                  </React.Fragment>
                ))}
              </div>

              {/* DEFECT SCOPE TOGGLE (SELF ACTIVITY VS ALL) */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className={`tabBtn ${defectScopeFilter === "MY_BUGS" ? "active" : ""}`}
                    onClick={() => setDefectScopeFilter("MY_BUGS")}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 6,
                      border: "1px solid var(--line)",
                      background: defectScopeFilter === "MY_BUGS" ? "#5b5ce2" : "#fff",
                      color: defectScopeFilter === "MY_BUGS" ? "#fff" : "var(--ink)",
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    My Assigned Defects ({myDeveloperBugs.length})
                  </button>
                  <button
                    type="button"
                    className={`tabBtn ${defectScopeFilter === "ALL_BUGS" ? "active" : ""}`}
                    onClick={() => setDefectScopeFilter("ALL_BUGS")}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 6,
                      border: "1px solid var(--line)",
                      background: defectScopeFilter === "ALL_BUGS" ? "#5b5ce2" : "#fff",
                      color: defectScopeFilter === "ALL_BUGS" ? "#fff" : "var(--ink)",
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    All Project Defects ({defects.length})
                  </button>
                </div>
                {currentRole === "Developer" && (
                  <span style={{ fontSize: 11, color: "#4f46e5", fontWeight: 700, background: "#eef2ff", padding: "4px 10px", borderRadius: 12 }}>
                    Developer Self Activity: Only Assigned Defects Displayed
                  </span>
                )}
              </div>

              <div className="panel fullPanel" style={{ padding: 20 }}>
                <div className="tableWrap functionalTable">
                  <table>
                    <thead>
                      <tr>
                        <th>Bug ID</th>
                        <th>CR Association</th>
                        <th>Title</th>
                        <th>Severity</th>
                        <th>Priority</th>
                        <th>Developer</th>
                        <th>Status</th>
                        <th>SIT Passed</th>
                        <th>UAT Deployed</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedDefects.map((d) => (
                        <tr key={d.id} className="clickableRow" onClick={() => setSelectedDefect(d)}>
                          <td>
                            <strong style={{ color: "#b91c1c" }}>{d.bug_number}</strong>
                          </td>
                          <td>
                            <strong>{d.cr_number}</strong>
                          </td>
                          <td>
                            <strong>{d.title}</strong>
                            <div style={{ color: "#64748b", fontSize: 11 }}>Project: {d.project_name}</div>
                            {d.developer_feedback && (
                              <div style={{ fontSize: 11, color: "#2563eb", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                                <MessageSquare size={11} /> Feedback: {d.developer_feedback.slice(0, 32)}...
                              </div>
                            )}
                            {d.evidence_url && (
                              <div style={{ fontSize: 10, color: "#dc2626", marginTop: 2 }}>
                                <a href={d.evidence_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 3 }}>
                                  <Paperclip size={10} /> View Proof
                                </a>
                              </div>
                            )}
                          </td>
                          <td>
                            <span style={{ color: d.severity === "BLOCKER" ? "#b91c1c" : d.severity === "CRITICAL" ? "#dc2626" : "#d97706", fontWeight: 700, fontSize: 11 }}>
                              {d.severity}
                            </span>
                          </td>
                          <td>{d.priority}</td>
                          <td>{d.assigned_developer_name}</td>
                          <td>
                            <span className={`status status-${d.status.toLowerCase().replaceAll("_", "-")}`}>
                              {d.status}
                            </span>
                          </td>
                          <td>{d.sit_passed_at ? "✓ Passed" : "Pending"}</td>
                          <td>{d.uat_deployed_at ? "✓ Deployed" : "Pending Deploy"}</td>
                          <td>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              <button
                                type="button"
                                className="tableAction"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFeedbackDefectId(d.id);
                                  setFeedbackDefectNumber(d.bug_number);
                                  setDefectFeedbackModalOpen(true);
                                }}
                              >
                                Feedback
                              </button>

                              {/* DEVELOPER ACTION 1: RESOLVE / FIX DEFECT */}
                              {["ASSIGNED", "IN_PROGRESS", "REOPENED", "OPEN"].includes(d.status) && (
                                <button
                                  type="button"
                                  className="tableAction"
                                  style={{ background: "#eef2ff", color: "#4f46e5", borderColor: "#c7d2fe" }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFixDefectId(d.id);
                                    setFixDefectModalOpen(true);
                                  }}
                                >
                                  Mark Fixed
                                </button>
                              )}

                              {/* DEVELOPER ACTION 2: TECHNICAL SIT PASS */}
                              {d.status === "FIXED" && (
                                <button
                                  type="button"
                                  className="tableAction"
                                  style={{ background: "#f0fdf4", color: "#16a34a", borderColor: "#bbf7d0" }}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await api.sitVerifyDefect(d.id, "PASS", "Technical SIT passed by developer");
                                    showToast(`${d.bug_number} SIT passed! Ready for UAT SRN.`);
                                    loadInitialData();
                                  }}
                                >
                                  SIT Passed ✓
                                </button>
                              )}

                              {/* UAT RETEST ACTION: STRICTLY RESTRICTED TO UAT / ADMIN */}
                              {["UAT Tester", "UAT Lead", "System Administrator"].includes(currentRole) && d.status === "READY_FOR_RETEST" && (
                                <button
                                  type="button"
                                  className="tableAction"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRetestDefectId(d.id);
                                    setRetestModalOpen(true);
                                  }}
                                >
                                  Retest
                                </button>
                              )}

                              <button
                                type="button"
                                className="tableAction"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDefect(d);
                                }}
                              >
                                Details
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 12: RELEASES & DEPLOYMENTS */}
          {activeView === "Releases and Deployments" && (
            <div>
              <div className="welcomeRow">
                <div>
                  <div className="eyebrow">Environment & CI/CD Governance</div>
                  <h1>Releases & Deployment Gates</h1>
                  <p>
                    Confirm UAT deployments to advance release status and unlock bug retesting for UAT testers.
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
                {releases.map((rel) => (
                  <div key={rel.id} className="panel" style={{ padding: 22, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#6366f1" }}>{rel.release_number}</span>
                          <h3 style={{ margin: "4px 0", fontSize: 18 }}>{rel.version}</h3>
                          <div style={{ color: "#64748b", fontSize: 12 }}>{rel.title}</div>
                        </div>
                        <span className={`status status-${rel.status.toLowerCase()}`}>
                          {rel.status}
                        </span>
                      </div>

                      <div style={{ margin: "16px 0", padding: 12, background: "#f8fafc", borderRadius: 8, fontSize: 12, color: "#334155" }}>
                        <div>Environment: <b>{rel.environment}</b></div>
                        <div style={{ marginTop: 4 }}>Release Owner: <b>{rel.owner_name}</b></div>
                        <div style={{ marginTop: 4 }}>Planned Date: <b>{rel.planned_date || "Continuous"}</b></div>
                        {rel.deployment && (
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #e2e8f0" }}>
                            <div>Deployment Status: <b style={{ color: rel.deployment.status === "CONFIRMED" ? "#16a34a" : "#d97706" }}>{rel.deployment.status}</b></div>
                            <div>Build ID: <code>{rel.deployment.build_identifier || "Pending build"}</code></div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      {rel.deployment?.status !== "CONFIRMED" ? (
                        <button
                          type="button"
                          className="primaryButton"
                          style={{ width: "100%", background: "#16a34a" }}
                          onClick={() => {
                            if (rel.deployment) {
                              setDeployTargetId(rel.deployment.id);
                              setDeployConfirmModalOpen(true);
                            }
                          }}
                        >
                          Confirm UAT Deployment →
                        </button>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#16a34a", fontSize: 12, fontWeight: 700 }}>
                          <CheckCircle2 size={16} />
                          <span>Deployment Confirmed to {rel.environment}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 15: KRA AND PERFORMANCE */}
          {activeView === "KRA and Performance" && (
            <div>
              <div className="welcomeRow">
                <div>
                  <div className="eyebrow">Objective Performance & Evidence</div>
                  <h1>Employee Contribution & KRA Evidence</h1>
                  <p>
                    Performance evaluated with contextual delivery evidence, scope change delays, and complexity weights—not simplistic bug counts.
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
                {kraRecords.map((k) => (
                  <div key={k.id} className="panel" style={{ padding: 22 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16 }}>{k.employee_name}</h3>
                        <div style={{ color: "#64748b", fontSize: 12 }}>
                          {k.role_title} · {k.employee_code}
                        </div>
                      </div>
                      <span className="typeTag">{k.reporting_period}</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "16px 0", padding: 12, background: "#f8fafc", borderRadius: 8, fontSize: 12 }}>
                      <div>Tasks Completed: <b>{k.tasks_completed}</b></div>
                      <div>Defects Resolved: <b>{k.defects_fixed}</b></div>
                      <div>SIT Executions: <b>{k.sit_executions_count}</b></div>
                      <div>Complexity Weight: <b>{k.complexity_weight}x</b></div>
                    </div>

                    <div style={{ fontSize: 12, color: "#475569" }}>
                      <div><b>Delivery Variance:</b> {k.delivery_variance_days} days</div>
                      <div style={{ marginTop: 6 }}>
                        <b>Contextual Business Reason:</b> {k.delays_business_reason}
                      </div>
                      <div style={{ marginTop: 6, color: "#166534" }}>
                        <b>Reviewer Note:</b> {k.comments}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 16: ADMIN SETTINGS */}
          {activeView === "Admin Settings" && (
            <div>
              <div className="welcomeRow">
                <div>
                  <div className="eyebrow">Platform Administration</div>
                  <h1>System Settings & Integrations</h1>
                  <p>Manage external Zoho API synchronization, email SMTP configurations, and enterprise access governance.</p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <div className="panel" style={{ padding: 24 }}>
                  <h3 style={{ margin: "0 0 16px", fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <RefreshCw size={18} color="#5b5ce2" />
                    <span>Zoho Change Request Integration</span>
                  </h3>
                  <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6 }}>
                    Connected to Zoho Change Request webhooks and scheduled pollers. Deduplication is enforced on external record IDs. If Zoho alters an approved scope, baseline preservation automatically generates a pending Scope Change Proposal.
                  </p>
                  <div style={{ marginTop: 20 }}>
                    <button
                      type="button"
                      className="primaryButton"
                      onClick={handleZohoSync}
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <RefreshCw size={16} />
                      <span>Trigger Zoho CR Synchronization</span>
                    </button>
                  </div>
                </div>

                <div className="panel" style={{ padding: 24 }}>
                  <h3 style={{ margin: "0 0 16px", fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <Mail size={18} color="#0284c7" />
                    <span>Email & Same-Thread SMTP Engine</span>
                  </h3>
                  <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6 }}>
                    Configured for RFC-compliant Message-ID, In-Reply-To, and References email threading. When sending consolidated SRNs, the engine preserves active conversation threads so all stakeholders receive updates in the same mail trail.
                  </p>
                  <div style={{ marginTop: 20, padding: 12, background: "#f8fafc", borderRadius: 8, fontSize: 12 }}>
                    <div>Connected Mailbox: <b>uat-distribution@company.com</b></div>
                    <div style={{ marginTop: 4 }}>Protocol: <b>SMTP / RFC 5322 Threaded</b></div>
                    <div style={{ marginTop: 4 }}>Idempotency Guard: <b>Enabled</b></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: PROJECTS & MODULES MANAGEMENT */}
          {activeView === "Projects" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="welcomeRow" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
                <div>
                  <div className="eyebrow">Enterprise Architecture & Governance</div>
                  <h1 style={{ margin: "4px 0" }}>Projects, Modules & Functional Screens</h1>
                  <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
                    Configure initiatives, microservice boundaries, and screens/functionality. Changes directly reflect in Change Requests & UAT tracking.
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ position: "relative" }}>
                    <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                    <input
                      type="text"
                      placeholder="Search projects, modules, screens..."
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                      style={{ padding: "8px 12px 8px 32px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 13, width: 260 }}
                    />
                  </div>

                  {canManageProjects && (
                    <button
                      type="button"
                      className="primaryButton"
                      onClick={handleOpenCreateProject}
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <Plus size={16} />
                      <span>Create Project</span>
                    </button>
                  )}
                </div>
              </div>

              {/* GOVERNANCE ACCESS BADGE */}
              <div
                style={{
                  background: canManageProjects ? "#f0fdf4" : "#f8fafc",
                  border: `1px solid ${canManageProjects ? "#bbf7d0" : "#e2e8f0"}`,
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: canManageProjects ? "#166534" : "#64748b",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Layers size={16} color={canManageProjects ? "#16a34a" : "#64748b"} />
                  <span>
                    <strong>Access Policy:</strong>{" "}
                    {canManageProjects
                      ? `Authorized as ${currentRole} — you have full permissions to add, edit, and delete projects, modules, and screens.`
                      : `View-Only Mode (${currentRole}) — creation, editing, and deletion are authorized for System Administrator, Senior Project Manager, Project Manager, and Project Lead.`}
                  </span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: canManageProjects ? "#dcfce7" : "#e2e8f0" }}>
                  {canManageProjects ? "FULL ACCESS" : "READ-ONLY"}
                </span>
              </div>

              {/* PROJECT CARDS ACCORDION / TREE */}
              {(() => {
                const searchLower = projectSearch.trim().toLowerCase();
                const filteredProjects = projects.filter((p) => {
                  if (!searchLower) return true;
                  if (p.name.toLowerCase().includes(searchLower) || p.code.toLowerCase().includes(searchLower) || (p.description || "").toLowerCase().includes(searchLower)) {
                    return true;
                  }
                  return p.modules?.some(
                    (m) =>
                      m.name.toLowerCase().includes(searchLower) ||
                      m.code.toLowerCase().includes(searchLower) ||
                      m.screens?.some((s) => s.name.toLowerCase().includes(searchLower) || s.code.toLowerCase().includes(searchLower))
                  );
                });

                if (filteredProjects.length === 0) {
                  return (
                    <div className="panel" style={{ padding: 48, textAlign: "center" }}>
                      <Layers size={36} color="#94a3b8" style={{ margin: "0 auto 12px" }} />
                      <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>No Projects Found</h3>
                      <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: 13 }}>
                        {projectSearch ? `No project or module matches '${projectSearch}'.` : "Get started by creating your first enterprise project."}
                      </p>
                      {canManageProjects && (
                        <button type="button" className="primaryButton" onClick={handleOpenCreateProject}>
                          <Plus size={15} style={{ marginRight: 6 }} />
                          <span>Create First Project</span>
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {filteredProjects.map((p) => {
                      const isExpanded = expandedProjects[p.id] !== false; // Default expanded
                      const totalScreens = p.modules?.reduce((acc, m) => acc + (m.screens?.length || 0), 0) || 0;
                      const crCount = changeRequests.filter((c) => c.project_id === p.id).length;
                      const bugCount = defects.filter((d) => d.project_name === p.name).length;

                      return (
                        <div key={p.id} className="panel" style={{ padding: 20, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" }}>
                          {/* PROJECT HEADER ROW */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                              <button
                                type="button"
                                onClick={() => setExpandedProjects({ ...expandedProjects, [p.id]: !isExpanded })}
                                style={{
                                  background: "#f1f5f9",
                                  border: "none",
                                  borderRadius: 6,
                                  width: 28,
                                  height: 28,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  color: "#475569",
                                  marginTop: 2,
                                }}
                              >
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </button>

                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                  <span style={{ fontSize: 12, fontWeight: 800, padding: "2px 8px", borderRadius: 4, background: "#e0e7ff", color: "#3730a3" }}>
                                    {p.code}
                                  </span>
                                  <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
                                    {p.name}
                                  </h2>
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      padding: "2px 6px",
                                      borderRadius: 4,
                                      background: p.status === "ACTIVE" ? "#dcfce7" : "#f1f5f9",
                                      color: p.status === "ACTIVE" ? "#166534" : "#475569",
                                    }}
                                  >
                                    {p.status || "ACTIVE"}
                                  </span>
                                  <span style={{ fontSize: 11, color: "#64748b", background: "#f8fafc", padding: "2px 8px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                                    {p.modules?.length || 0} Modules · {totalScreens} Screens
                                  </span>
                                </div>

                                <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13, lineHeight: 1.4 }}>
                                  {p.description || "Core enterprise service initiative and delivery scope."}
                                </p>
                              </div>
                            </div>

                            {/* PROJECT LEVEL ACTIONS */}
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {canManageProjects && (
                                <>
                                  <button
                                    type="button"
                                    className="tableAction"
                                    onClick={() => handleOpenCreateModule(p.id)}
                                    style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" }}
                                  >
                                    <FolderPlus size={13} />
                                    <span>+ Add Module</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="tableAction"
                                    onClick={() => {
                                      setMemberProjectId(p.id);
                                      setAddMemberModalOpen(true);
                                    }}
                                    style={{ fontSize: 11 }}
                                  >
                                    Assign Member
                                  </button>
                                  <button
                                    type="button"
                                    className="iconButton"
                                    onClick={() => handleOpenEditProject(p)}
                                    title="Edit Project"
                                    style={{ color: "#2563eb", padding: 6 }}
                                  >
                                    <Edit3 size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    className="iconButton"
                                    onClick={() => setDeleteProjectConfirm(p)}
                                    title="Delete Project"
                                    style={{ color: "#dc2626", padding: 6 }}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* EXPANDED MODULES & SCREENS CATALOG */}
                          {isExpanded && (
                            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
                              {/* METRICS ROW */}
                              <div style={{ display: "flex", gap: 16, marginBottom: 14, fontSize: 12, color: "#64748b" }}>
                                <span><b>{crCount}</b> Active CRs</span>
                                <span>·</span>
                                <span><b style={{ color: "#dc2626" }}>{bugCount}</b> Logged Defects</span>
                                <span>·</span>
                                <span><b>{p.modules?.length || 0}</b> Functional Modules</span>
                              </div>

                              {(!p.modules || p.modules.length === 0) ? (
                                <div style={{ padding: "16px 20px", background: "#f8fafc", borderRadius: 8, border: "1px dashed #cbd5e1", textAlign: "center" }}>
                                  <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>No modules configured for this project yet.</p>
                                  {canManageProjects && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenCreateModule(p.id)}
                                      style={{ padding: "5px 12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                                    >
                                      + Add First Module
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                  {p.modules.map((m) => {
                                    const isModExpanded = expandedModules[m.id] !== false; // Default expanded
                                    return (
                                      <div key={m.id} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "14px 16px" }}>
                                        {/* MODULE HEADER ROW */}
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                                          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                                            <button
                                              type="button"
                                              onClick={() => setExpandedModules({ ...expandedModules, [m.id]: !isModExpanded })}
                                              style={{ background: "transparent", border: "none", cursor: "pointer", padding: 2, color: "#64748b", marginTop: 2 }}
                                            >
                                              {isModExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                            </button>

                                            <Folder size={17} color="#2563eb" style={{ marginTop: 2, flexShrink: 0 }} />

                                            <div>
                                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "#e2e8f0", color: "#334155" }}>
                                                  {m.code}
                                                </span>
                                                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1e293b" }}>
                                                  {m.name}
                                                </h4>
                                                <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 10, background: "#e0e7ff", color: "#3730a3" }}>
                                                  {m.screens?.length || 0} Screens
                                                </span>
                                              </div>
                                              {m.description && (
                                                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>{m.description}</p>
                                              )}
                                            </div>
                                          </div>

                                          {/* MODULE ACTIONS */}
                                          {canManageProjects && (
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                              <button
                                                type="button"
                                                onClick={() => handleOpenCreateScreen(m.id, m.name)}
                                                style={{
                                                  padding: "3px 8px",
                                                  background: "#eff6ff",
                                                  border: "1px solid #bfdbfe",
                                                  borderRadius: 4,
                                                  fontSize: 11,
                                                  fontWeight: 600,
                                                  color: "#1d4ed8",
                                                  cursor: "pointer",
                                                  display: "inline-flex",
                                                  alignItems: "center",
                                                  gap: 4,
                                                }}
                                              >
                                                <Monitor size={12} />
                                                <span>+ Add Screen</span>
                                              </button>
                                              <button
                                                type="button"
                                                className="iconButton"
                                                onClick={() => handleOpenEditModule(p.id, m)}
                                                title="Edit Module"
                                                style={{ color: "#2563eb", padding: 4 }}
                                              >
                                                <Edit3 size={13} />
                                              </button>
                                              <button
                                                type="button"
                                                className="iconButton"
                                                onClick={() => setDeleteModuleConfirm({ projectId: p.id, module: m })}
                                                title="Delete Module"
                                                style={{ color: "#dc2626", padding: 4 }}
                                              >
                                                <Trash2 size={13} />
                                              </button>
                                            </div>
                                          )}
                                        </div>

                                        {/* SCREENS / FUNCTIONALITIES CATALOG */}
                                        {isModExpanded && (
                                          <div style={{ marginTop: 12, paddingLeft: 28 }}>
                                            {(!m.screens || m.screens.length === 0) ? (
                                              <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", padding: "6px 0" }}>
                                                No functional screens or features registered yet.{" "}
                                                {canManageProjects && (
                                                  <span
                                                    onClick={() => handleOpenCreateScreen(m.id, m.name)}
                                                    style={{ color: "#2563eb", textDecoration: "underline", cursor: "pointer", fontStyle: "normal", fontWeight: 600 }}
                                                  >
                                                    + Add screen now
                                                  </span>
                                                )}
                                              </div>
                                            ) : (
                                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                                                {m.screens.map((s) => (
                                                  <div
                                                    key={s.id}
                                                    style={{
                                                      background: "#ffffff",
                                                      border: "1px solid #e2e8f0",
                                                      borderRadius: 6,
                                                      padding: "8px 10px",
                                                      display: "flex",
                                                      justifyContent: "space-between",
                                                      alignItems: "flex-start",
                                                      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                                                    }}
                                                  >
                                                    <div style={{ flex: 1, marginRight: 6 }}>
                                                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                                        <Monitor size={12} color="#475569" />
                                                        <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>
                                                          {s.name}
                                                        </span>
                                                        <span
                                                          style={{
                                                            fontSize: 9,
                                                            fontWeight: 700,
                                                            padding: "1px 5px",
                                                            borderRadius: 3,
                                                            background: s.screen_type === "NEW" ? "#dcfce7" : "#e0e7ff",
                                                            color: s.screen_type === "NEW" ? "#15803d" : "#3730a3",
                                                          }}
                                                        >
                                                          {s.screen_type || "EXISTING"}
                                                        </span>
                                                      </div>
                                                      {s.description && (
                                                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
                                                          {s.description}
                                                        </div>
                                                      )}
                                                      {s.code && (
                                                        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                                                          Code: {s.code}
                                                        </div>
                                                      )}
                                                    </div>

                                                    {canManageProjects && (
                                                      <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                                                        <button
                                                          type="button"
                                                          onClick={() => handleOpenEditScreen(m.id, m.name, s)}
                                                          title="Edit Screen"
                                                          style={{ background: "transparent", border: "none", color: "#2563eb", cursor: "pointer", padding: 2 }}
                                                        >
                                                          <Edit3 size={12} />
                                                        </button>
                                                        <button
                                                          type="button"
                                                          onClick={() => setDeleteScreenConfirm({ moduleId: m.id, screen: s })}
                                                          title="Delete Screen"
                                                          style={{ background: "transparent", border: "none", color: "#dc2626", cursor: "pointer", padding: 2 }}
                                                        >
                                                          <Trash2 size={12} />
                                                        </button>
                                                      </div>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* VIEW 4: TEAMS & USERS */}
          {activeView === "Teams and Users" && (
            <div>
              <div className="welcomeRow" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div className="eyebrow">Organization & Access</div>
                  <h1>Teams & Employee Directory</h1>
                  <p>Enterprise stakeholders, delivery leads, primary PMs, developers, and UAT testing specialists.</p>
                </div>
                <div>
                  {getCreatableRoles(currentRole).length > 0 ? (
                    <button
                      type="button"
                      className="primaryButton"
                      style={{ display: "flex", alignItems: "center", gap: 8, background: "#1d4ed8" }}
                      onClick={() => {
                        const nextCode = `EMP-${String(users.length + 1).padStart(3, "0")}`;
                        const allowed = getCreatableRoles(currentRole);
                        const activeList = projects.length > 0 ? projects : DEFAULT_PROJECTS;
                        setNewUserForm({
                          display_name: "",
                          email: "",
                          employee_code: nextCode,
                          role_title: allowed[0] || "Developer",
                          project_ids: activeList.slice(0, 3).map((p) => p.id),
                        });
                        setCreateUserModalOpen(true);
                      }}
                    >
                      <Plus size={16} />
                      <span>+ Create User</span>
                    </button>
                  ) : (
                    <div style={{ padding: "6px 12px", background: "#f1f5f9", borderRadius: 8, fontSize: 12, color: "#64748b", border: "1px solid #cbd5e1" }}>
                      🔒 User creation requires Manager, Lead, or Admin role
                    </div>
                  )}
                </div>
              </div>

              <div className="panel">
                <div className="tableWrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Role & Title</th>
                        <th>Email</th>
                        <th>Assigned Projects</th>
                        <th>Department</th>
                        <th>Assigned Tasks</th>
                        <th>Defects Handled</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => {
                        const userTasks = devTasks.filter((t) => t.assigned_developer_id === u.id).length;
                        const userDefects = defects.filter((d) => d.assigned_developer_id === u.id).length;
                        return (
                          <tr key={u.id}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div className="avatar" style={{ width: 32, height: 32, fontSize: 11 }}>
                                  {u.display_name.split(" ").map((n) => n[0]).join("")}
                                </div>
                                <div>
                                  <strong>{u.display_name}</strong>
                                  <div style={{ fontSize: 11, color: "#64748b" }}>{u.employee_code}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              {currentRole === "System Administrator" ? (
                                <select
                                  value={u.role_title || "Developer"}
                                  onChange={async (e) => {
                                    const newRole = e.target.value;
                                    const res = await api.updateUserRole(u.id, newRole);
                                    if (res) {
                                      showToast(`Updated ${u.display_name} role to ${newRole}`);
                                      loadInitialData();
                                    }
                                  }}
                                  style={{
                                    padding: "4px 8px",
                                    borderRadius: 6,
                                    border: "1px solid var(--line)",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    background: "#fff",
                                  }}
                                >
                                  <option value="Business Analyst">Business Analyst</option>
                                  <option value="Project Manager">Project Manager</option>
                                  <option value="Developer Lead">Developer Lead</option>
                                  <option value="Developer">Developer</option>
                                  <option value="UAT Lead">UAT Lead</option>
                                  <option value="UAT Tester">UAT Tester</option>
                                  <option value="System Administrator">System Administrator</option>
                                </select>
                              ) : (
                                <span style={{ fontWeight: 600, color: "#334155", fontSize: 12 }}>{u.role_title || "Member"}</span>
                              )}
                            </td>
                            <td style={{ color: "#64748b", fontSize: 12 }}>{u.email}</td>
                            <td>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 220 }}>
                                {u.assigned_projects && u.assigned_projects.length > 0 ? (
                                  u.assigned_projects.map((proj) => (
                                    <span
                                      key={proj.id}
                                      style={{
                                        display: "inline-block",
                                        fontSize: 10,
                                        fontWeight: 700,
                                        padding: "2px 6px",
                                        borderRadius: 4,
                                        background: "#e0f2fe",
                                        color: "#0369a1",
                                        border: "1px solid #bae6fd",
                                      }}
                                      title={proj.name}
                                    >
                                      {proj.code}
                                    </span>
                                  ))
                                ) : (
                                  <span style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>All Projects</span>
                                )}
                              </div>
                            </td>
                            <td>Engineering</td>
                            <td><b>{userTasks}</b> tasks</td>
                            <td><b>{userDefects}</b> bugs</td>
                            <td>
                              <span className="status status-verified">ACTIVE</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 6: DEVELOPMENT BOARD */}
          {activeView === "Development Board" && (
            <div>
              <div className="welcomeRow">
                <div>
                  <div className="eyebrow">Task Board</div>
                  <h1>Engineering Kanban Board</h1>
                  <p>Module-wise development progress across all active Change Requests.</p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, overflowX: "auto" }}>
                {[
                  { status: "TODO", label: "To Do", color: "#64748b" },
                  { status: "IN_PROGRESS", label: "In Progress", color: "#0284c7" },
                  { status: "CODE_REVIEW", label: "Code Review", color: "#d97706" },
                  { status: "READY_FOR_SIT", label: "Ready for SIT", color: "#7c3aed" },
                  { status: "SIT_PASSED", label: "SIT Passed", color: "#16a34a" },
                  { status: "DEVELOPMENT_COMPLETE", label: "Completed", color: "#059669" },
                ].map((col) => {
                  const colTasks = devTasks.filter((t) => t.status === col.status);
                  return (
                    <div key={col.status} style={{ background: "#f8fafc", borderRadius: 10, padding: 14, minWidth: 240, border: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <span style={{ fontWeight: 700, fontSize: 12, color: col.color }}>{col.label}</span>
                        <span style={{ background: "#e2e8f0", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                          {colTasks.length}
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {colTasks.map((t) => (
                          <div key={t.id} className="panel" style={{ padding: 12, border: "1px solid #cbd5e1" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: "#6366f1" }}>{t.task_number}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, color: t.priority === "URGENT" ? "#b91c1c" : "#475569" }}>{t.priority}</span>
                            </div>
                            <strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>{t.title}</strong>
                            <div style={{ fontSize: 11, color: "#64748b" }}>CR: {t.cr_number} · {t.module_name}</div>
                            <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
                              <span>{t.assigned_developer_name}</span>
                              <span style={{ fontWeight: 700 }}>{t.actual_hours}h / {t.estimated_hours}h</span>
                            </div>
                          </div>
                        ))}
                        {colTasks.length === 0 && (
                          <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 12 }}>No tasks</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 7: SIT TESTING */}
          {activeView === "SIT Testing" && (
            <div>
              <div className="welcomeRow">
                <div>
                  <div className="eyebrow">Technical Validation Gate</div>
                  <h1>System Integration Testing (SIT)</h1>
                  <p>Developer and technical tester verification before code is eligible for UAT release handoff.</p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
                <div className="metricCard">
                  <div className="metricTop"><span>Total Tasks in SIT</span><TestTube size={16} /></div>
                  <strong>{devTasks.filter((t) => ["READY_FOR_SIT", "SIT_IN_PROGRESS", "SIT_PASSED"].includes(t.status)).length}</strong>
                  <span className="delta positive">Active technical tests</span>
                </div>
                <div className="metricCard">
                  <div className="metricTop"><span>SIT Passed Tasks</span><CheckCircle2 size={16} /></div>
                  <strong>{devTasks.filter((t) => t.status === "SIT_PASSED").length}</strong>
                  <span className="delta positive">Eligible for SRN</span>
                </div>
                <div className="metricCard">
                  <div className="metricTop"><span>SIT Discovered Defects</span><Bug size={16} /></div>
                  <strong>{defects.filter((d) => d.status === "FIXED" || d.status === "SIT_IN_PROGRESS").length}</strong>
                  <span className="delta warning">Under SIT verification</span>
                </div>
              </div>

              <div className="panel">
                <div className="panelHeader">
                  <h2>SIT Candidate Tasks & Executions</h2>
                </div>
                <div className="tableWrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Task Number</th>
                        <th>CR Association</th>
                        <th>Title & Module</th>
                        <th>Developer</th>
                        <th>SIT Status</th>
                        <th>Estimated Effort</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devTasks.map((t) => (
                        <tr key={t.id}>
                          <td><strong>{t.task_number}</strong></td>
                          <td><strong>{t.cr_number}</strong></td>
                          <td>
                            <strong>{t.title}</strong>
                            <div style={{ fontSize: 11, color: "#64748b" }}>{t.module_name}</div>
                          </td>
                          <td>{t.assigned_developer_name}</td>
                          <td>
                            <span className={`status status-${t.status.toLowerCase().replaceAll("_", "-")}`}>{t.status}</span>
                          </td>
                          <td>{t.estimated_hours} hrs</td>
                          <td>
                            {t.status === "READY_FOR_SIT" && (
                              <button
                                type="button"
                                className="tableAction"
                                onClick={async () => {
                                  await api.updateDevTask(t.id, { status: "SIT_PASSED", completion_notes: "SIT verification completed with all test cases passing." });
                                  showToast(`${t.task_number} marked SIT_PASSED!`);
                                  loadInitialData();
                                }}
                              >
                                Mark SIT Passed ✓
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 10: UAT TESTING */}
          {activeView === "UAT Testing" && (
            <div>
              <div className="welcomeRow">
                <div>
                  <div className="eyebrow">Business Acceptance Gate</div>
                  <h1>User Acceptance Testing (UAT)</h1>
                  <p>Business user and UAT testing cycles, defect verification, and formal business sign-off.</p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className="primaryButton"
                    style={{ background: "#dc2626", display: "flex", alignItems: "center", gap: 6 }}
                    onClick={() => setCreateDefectModalOpen(true)}
                  >
                    <Plus size={16} />
                    <span>Report UAT Defect</span>
                  </button>
                </div>
              </div>

              <div className="panel" style={{ marginBottom: 20, padding: 22, background: "linear-gradient(135deg, #fff 0%, #f0fdf4 100%)", border: "1px solid #bbf7d0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a" }}>ACTIVE UAT CYCLE</span>
                    <h2 style={{ margin: "4px 0", fontSize: 20 }}>UAT Cycle 01 — Customer Onboarding & KYC Digitisation</h2>
                    <p style={{ margin: 0, color: "#475569", fontSize: 13 }}>
                      Associated with CR-1048 · Target Sign-off: 2026-11-05 · Lead: Diana Rao
                    </p>
                  </div>
                  <span className="status status-verified">IN PROGRESS</span>
                </div>
              </div>

              <div className="panel">
                <div className="panelHeader">
                  <h2>UAT Candidate Change Requests</h2>
                </div>
                <div className="tableWrap">
                  <table>
                    <thead>
                      <tr>
                        <th>CR Number</th>
                        <th>Title & Project</th>
                        <th>Business Analyst</th>
                        <th>Primary PM</th>
                        <th>UAT Status</th>
                        <th>Requested Deadline</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changeRequests
                        .filter((c) => ["UAT_DEPLOYED", "UAT_IN_PROGRESS", "READY_FOR_UAT", "UAT"].includes(c.status) || c.hold_status === "ON_HOLD")
                        .map((c) => (
                          <tr key={c.id}>
                            <td>
                              <strong style={{ color: "#0284c7" }}>{c.reference_number}</strong>
                              {c.hold_status === "PENDING_APPROVAL" && (
                                <div style={{ marginTop: 2 }}>
                                  <span style={{ background: "#fef3c7", color: "#b45309", padding: "1px 5px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                                    HOLD REQ
                                  </span>
                                </div>
                              )}
                              {c.hold_status === "ON_HOLD" && (
                                <div style={{ marginTop: 2 }}>
                                  <span style={{ background: "#fee2e2", color: "#dc2626", padding: "1px 5px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                                    ON HOLD
                                  </span>
                                </div>
                              )}
                            </td>
                            <td>
                              <strong>{c.title}</strong>
                              <div style={{ fontSize: 11, color: "#64748b" }}>{c.project_name}</div>
                            </td>
                            <td>{c.ba_user_name}</td>
                            <td>{c.primary_pm_name}</td>
                            <td>
                              <span className={`status status-${c.status.toLowerCase().replaceAll("_", "-")}`}>
                                {c.status === "ON_HOLD" ? "ON HOLD (UAT)" : c.status}
                              </span>
                              {c.hold_status && c.hold_status !== "RELEASED" && (
                                <div style={{ fontSize: 10, color: "#b45309", fontWeight: 700, marginTop: 2 }}>{c.hold_status}</div>
                              )}
                            </td>
                            <td>{c.requested_deadline || "Pending"}</td>
                            <td>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                <button type="button" className="tableAction" onClick={() => openCrDetail(c.id)}>
                                  Details
                                </button>
                                {["UAT Lead", "UAT Tester", "System Administrator"].includes(currentRole) && (
                                  <>
                                    <button
                                      type="button"
                                      className="tableAction"
                                      style={{ color: "#2563eb", borderColor: "#bfdbfe", fontSize: 11 }}
                                      onClick={() => {
                                        setUatStatusTargetCr(c);
                                        setUatStatusForm({
                                          target_status: c.status === "ON_HOLD" ? "UAT" : "ON_HOLD",
                                          hold_until_date: c.hold_until_date || "",
                                          remarks: "",
                                        });
                                        setUatStatusModalOpen(true);
                                      }}
                                    >
                                      Update Status
                                    </button>
                                    <button
                                      type="button"
                                      className="tableAction"
                                      style={{ color: "#dc2626", borderColor: "#fecaca", fontSize: 11 }}
                                      onClick={() => {
                                        setNewDefectForm({
                                          cr_id: c.id,
                                          module_id: "",
                                          title: "",
                                          description: "",
                                          reproduction_steps: "",
                                          severity: "MAJOR",
                                          priority: "HIGH",
                                          assigned_developer_id: "",
                                          evidence_url: "",
                                        });
                                        setCreateDefectModalOpen(true);
                                      }}
                                    >
                                      + Bug
                                    </button>
                                  </>
                                )}
                                {["UAT Lead", "System Administrator"].includes(currentRole) && c.status !== "UAT" && c.status !== "ON_HOLD" && (
                                  <button
                                    type="button"
                                    className="primaryButton"
                                    style={{ background: "#16a34a", height: 28, fontSize: 11 }}
                                    onClick={async () => {
                                      await api.transitionChangeRequest(c.id, "UAT", "Approved for active UAT testing by UAT Lead");
                                      showToast(`${c.reference_number} approved for active UAT testing!`);
                                      loadInitialData();
                                    }}
                                  >
                                    Approve UAT ✓
                                  </button>
                                )}
                                {["UAT Lead", "Business Analyst", "System Administrator"].includes(currentRole) && c.hold_status !== "ON_HOLD" && c.status !== "ON_HOLD" && (
                                  <button
                                    type="button"
                                    className="tableAction"
                                    style={{ color: "#b45309", borderColor: "#fde68a", fontSize: 11 }}
                                    onClick={() => {
                                      setHoldTargetCr(c);
                                      setHoldModalOpen(true);
                                    }}
                                  >
                                    {currentRole === "UAT Lead" ? "Request Hold" : "Put On Hold"}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 13: PENDING APPROVALS */}
          {activeView === "Pending Approvals" && (
            <div>
              <div className="welcomeRow">
                <div>
                  <div className="eyebrow">Governance & Baselines</div>
                  <h1>Pending Approvals & Negotiations</h1>
                  <p>Deadline revision requests and scope change proposals requiring formal authorization.</p>
                </div>
              </div>

              <div className="panel" style={{ marginBottom: 20 }}>
                <div className="panelHeader">
                  <h2>Deadline Revision Requests</h2>
                </div>
                <div className="tableWrap">
                  <table>
                    <thead>
                      <tr>
                        <th>CR Number</th>
                        <th>Title</th>
                        <th>Requested Deadline</th>
                        <th>PM Proposed Deadline</th>
                        <th>Revision Reason</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changeRequests
                        .filter((c) => c.pm_proposed_deadline)
                        .map((c) => (
                          <tr key={c.id}>
                            <td><strong style={{ color: "#0284c7" }}>{c.reference_number}</strong></td>
                            <td><strong>{c.title}</strong></td>
                            <td><span style={{ color: "#b91c1c", fontWeight: 700 }}>{c.requested_deadline}</span></td>
                            <td><span style={{ color: "#16a34a", fontWeight: 700 }}>{c.pm_proposed_deadline}</span></td>
                            <td style={{ maxWidth: 300, whiteSpace: "normal", fontSize: 12, color: "#475569" }}>
                              {c.pm_proposed_deadline ? "Proposed delivery revision: " + c.pm_proposed_deadline : "Under negotiation"}
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button
                                  type="button"
                                  className="tableAction"
                                  style={{ background: "#f0fdf4", color: "#16a34a", borderColor: "#bbf7d0" }}
                                  onClick={async () => {
                                    await api.respondDeadline(c.id, "ACCEPTED", "Approved revised delivery date.");
                                    showToast("Revision accepted!");
                                    loadInitialData();
                                  }}
                                >
                                  Accept Revision ✓
                                </button>
                                <button
                                  type="button"
                                  className="tableAction"
                                  style={{ background: "#fef2f2", color: "#b91c1c", borderColor: "#fecaca" }}
                                  onClick={async () => {
                                    await api.respondDeadline(c.id, "REJECTED", "Scope must be compressed to meet target.");
                                    showToast("Revision rejected!");
                                    loadInitialData();
                                  }}
                                >
                                  Reject ✕
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION: ON-HOLD APPROVAL REQUESTS (UAT LEAD TO BA) */}
              <div className="panel" style={{ marginBottom: 20 }}>
                <div className="panelHeader">
                  <h2>CR On-Hold Approval Requests (from UAT Lead to BA)</h2>
                </div>
                <div className="tableWrap">
                  <table>
                    <thead>
                      <tr>
                        <th>CR Number</th>
                        <th>Title & Project</th>
                        <th>Requested Hold Until</th>
                        <th>UAT Lead Remark</th>
                        <th>Action (BA Decision)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changeRequests.filter((c) => c.hold_status === "PENDING_APPROVAL").length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: "center", padding: 24, color: "#64748b" }}>
                            No pending On-Hold approval requests from UAT Lead.
                          </td>
                        </tr>
                      ) : (
                        changeRequests
                          .filter((c) => c.hold_status === "PENDING_APPROVAL")
                          .map((c) => (
                            <tr key={c.id}>
                              <td><strong style={{ color: "#d97706" }}>{c.reference_number}</strong></td>
                              <td>
                                <strong>{c.title}</strong>
                                <div style={{ fontSize: 11, color: "#64748b" }}>{c.project_name}</div>
                              </td>
                              <td>
                                <strong style={{ color: "#dc2626" }}>{c.hold_until_date || "Until Further Notice"}</strong>
                              </td>
                              <td style={{ maxWidth: 320, whiteSpace: "normal", fontSize: 12, color: "#475569" }}>
                                <em>"{c.hold_reason}"</em>
                              </td>
                              <td>
                                <div style={{ display: "flex", gap: 6 }}>
                                  <button
                                    type="button"
                                    className="primaryButton"
                                    style={{ background: "#16a34a", height: 30, fontSize: 11 }}
                                    onClick={() => handleApproveHold(c.id, true)}
                                  >
                                    Approve Hold ✓
                                  </button>
                                  <button
                                    type="button"
                                    className="tableAction"
                                    style={{ background: "#fef2f2", color: "#dc2626", borderColor: "#fecaca", height: 30, fontSize: 11 }}
                                    onClick={() => handleApproveHold(c.id, false, "Hold rejected by BA")}
                                  >
                                    Reject Hold ✕
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 14: REPORTS & ANALYTICS */}
          {activeView === "Reports and Analytics" && (
            <div>
              <div className="welcomeRow">
                <div>
                  <div className="eyebrow">Executive Intelligence</div>
                  <h1>Management Reports & Delivery Metrics</h1>
                  <p>Comprehensive delivery lifecycle analysis, Zoho vs internal intake, and SIT quality trends.</p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
                <div className="metricCard">
                  <div className="metricTop"><span>Total Change Requests</span><GitPullRequest size={16} /></div>
                  <strong>{kpi.total_crs}</strong>
                  <span className="delta positive">Active portfolio count</span>
                </div>
                <div className="metricCard">
                  <div className="metricTop"><span>Zoho Ingestion Ratio</span><RefreshCw size={16} /></div>
                  <strong>{Math.round((changeRequests.filter((c) => c.source === "ZOHO").length / (changeRequests.length || 1)) * 100)}%</strong>
                  <span className="delta positive">{changeRequests.filter((c) => c.source === "ZOHO").length} from Zoho CRM</span>
                </div>
                <div className="metricCard">
                  <div className="metricTop"><span>SIT First-Pass Rate</span><ShieldAlert size={16} /></div>
                  <strong>92%</strong>
                  <span className="delta positive">High code readiness</span>
                </div>
                <div className="metricCard">
                  <div className="metricTop"><span>Delivery Delay Avg</span><Clock size={16} /></div>
                  <strong>+1.8d</strong>
                  <span className="delta warning">Driven by scope revisions</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div className="panel" style={{ padding: 22 }}>
                  <div className="panelHeader">
                    <h2>Change Request Status Distribution</h2>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {[
                      { label: "Under Review / Draft", count: changeRequests.filter((c) => ["DRAFT", "SUBMITTED", "UNDER_REVIEW"].includes(c.status)).length, color: "#64748b" },
                      { label: "In Development", count: kpi.in_dev_crs, color: "#0284c7" },
                      { label: "SIT & Ready for UAT", count: kpi.in_sit_crs + kpi.ready_uat_crs, color: "#7c3aed" },
                      { label: "In UAT Testing", count: kpi.in_uat_crs, color: "#16a34a" },
                      { label: "Completed & Closed", count: kpi.completed_crs, color: "#059669" },
                    ].map((row) => (
                      <div key={row.label}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                          <span>{row.label}</span>
                          <b>{row.count} ({Math.round((row.count / (changeRequests.length || 1)) * 100)}%)</b>
                        </div>
                        <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${(row.count / (changeRequests.length || 1)) * 100}%`, height: "100%", background: row.color, borderRadius: 4 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel" style={{ padding: 22 }}>
                  <div className="panelHeader">
                    <h2>Defect Severity & Resolution Velocity</h2>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {[
                      { label: "Blocker Defects", count: defects.filter((d) => d.severity === "BLOCKER").length, color: "#b91c1c" },
                      { label: "Critical Defects", count: defects.filter((d) => d.severity === "CRITICAL").length, color: "#dc2626" },
                      { label: "Major Defects", count: defects.filter((d) => d.severity === "MAJOR").length, color: "#d97706" },
                      { label: "Minor / Trivial", count: defects.filter((d) => ["MINOR"].includes(d.severity)).length, color: "#64748b" },
                    ].map((row) => (
                      <div key={row.label}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                          <span>{row.label}</span>
                          <b>{row.count} ({Math.round((row.count / (defects.length || 1)) * 100)}%)</b>
                        </div>
                        <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${(row.count / (defects.length || 1)) * 100}%`, height: "100%", background: row.color, borderRadius: 4 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: CHANGE REQUEST DETAIL WITH COMPLETE TABS & TIMELINE */}
      {selectedCrDetail && (
        <div className="modalBackdrop" onClick={() => setSelectedCrDetail(null)}>
          <div className="modalCard" style={{ width: "min(1080px, 95vw)" }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#6366f1" }}>{selectedCrDetail.reference_number}</span>
                <h2 style={{ margin: "2px 0 0" }}>{selectedCrDetail.title}</h2>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {["Business Analyst", "System Administrator", "Project Manager"].includes(currentRole) && (
                  <button
                    type="button"
                    className="tableAction"
                    style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
                    onClick={() => {
                      setEditCrForm({
                        id: selectedCrDetail.id,
                        title: selectedCrDetail.title,
                        description: selectedCrDetail.description,
                        business_justification: selectedCrDetail.business_justification,
                        priority: selectedCrDetail.priority,
                        requested_deadline: selectedCrDetail.requested_deadline || "",
                        approved_deadline: selectedCrDetail.approved_deadline || "",
                      });
                      setEditCrModalOpen(true);
                    }}
                  >
                    <Edit3 size={14} /> Edit Details
                  </button>
                )}
                {["Business Analyst", "System Administrator"].includes(currentRole) && selectedCrDetail.hold_status !== "ON_HOLD" && (
                  <button
                    type="button"
                    className="tableAction"
                    style={{ color: "#b91c1c", borderColor: "#fca5a5", fontSize: 12 }}
                    onClick={() => {
                      setHoldTargetCr(selectedCrDetail);
                      setHoldModalOpen(true);
                    }}
                  >
                    Put On Hold
                  </button>
                )}
                {currentRole === "UAT Lead" && selectedCrDetail.hold_status !== "ON_HOLD" && (
                  <button
                    type="button"
                    className="tableAction"
                    style={{ color: "#b45309", borderColor: "#fcd34d", fontSize: 12 }}
                    onClick={() => {
                      setHoldTargetCr(selectedCrDetail);
                      setHoldModalOpen(true);
                    }}
                  >
                    Request Hold to BA
                  </button>
                )}
                {["UAT Lead", "UAT Tester", "System Administrator"].includes(currentRole) && (
                  <>
                    <button
                      type="button"
                      className="tableAction"
                      style={{ color: "#2563eb", borderColor: "#bfdbfe", fontSize: 12 }}
                      onClick={() => {
                        setUatStatusTargetCr(selectedCrDetail);
                        setUatStatusForm({
                          target_status: selectedCrDetail.status === "ON_HOLD" ? "UAT" : "ON_HOLD",
                          hold_until_date: selectedCrDetail.hold_until_date || "",
                          remarks: "",
                        });
                        setUatStatusModalOpen(true);
                      }}
                    >
                      Update UAT Status
                    </button>
                    <button
                      type="button"
                      className="tableAction"
                      style={{ color: "#dc2626", borderColor: "#fecaca", fontSize: 12 }}
                      onClick={() => {
                        setNewDefectForm({
                          cr_id: selectedCrDetail.id,
                          module_id: "",
                          title: "",
                          description: "",
                          reproduction_steps: "",
                          severity: "MAJOR",
                          priority: "HIGH",
                          assigned_developer_id: "",
                          evidence_url: "",
                        });
                        setCreateDefectModalOpen(true);
                      }}
                    >
                      + Log Bug
                    </button>
                  </>
                )}

                {/* Lifecycle Governance Actions */}
                {["PENDING_BA_VERIFICATION", "REVERTED_TO_BA"].includes(selectedCrDetail.status) &&
                  ["Business Analyst", "BA Lead", "System Administrator"].includes(currentRole) && (
                    <button
                      type="button"
                      className="primaryButton"
                      style={{ background: "#4f46e5", height: 32, fontSize: 12 }}
                      onClick={() => openBaVerifyModal(selectedCrDetail)}
                    >
                      BA Verify / Revert
                    </button>
                  )}

                {selectedCrDetail.status === "PENDING_PL_REVIEW" &&
                  ["Project Lead", "Senior Project Manager", "Project Manager", "System Administrator"].includes(currentRole) && (
                    <button
                      type="button"
                      className="primaryButton"
                      style={{ background: "#0284c7", height: 32, fontSize: 12 }}
                      onClick={() => openPlGovReviewModal(selectedCrDetail)}
                    >
                      PL Review Scope
                    </button>
                  )}

                {selectedCrDetail.status === "CHANGES_REQUESTED_BY_MANAGEMENT" &&
                  ["Project Lead", "Senior Project Manager", "Project Manager", "System Administrator"].includes(currentRole) && (
                    <button
                      type="button"
                      className="primaryButton"
                      style={{ background: "#ea580c", height: 32, fontSize: 12 }}
                      onClick={() => openPlChangesModal(selectedCrDetail)}
                    >
                      Address Feedback
                    </button>
                  )}

                {selectedCrDetail.status === "PENDING_MANAGEMENT_REVIEW" &&
                  ["Senior Project Manager", "Project Manager", "System Administrator"].includes(currentRole) && (
                    <button
                      type="button"
                      className="primaryButton"
                      style={{ background: "#7c3aed", height: 32, fontSize: 12 }}
                      onClick={() => openMgmtReviewModal(selectedCrDetail)}
                    >
                      Management Review
                    </button>
                  )}

                {["APPROVED_BY_MANAGEMENT", "APPROVED_BY_PL"].includes(selectedCrDetail.status) &&
                  ["Project Manager", "Senior Project Manager", "System Administrator"].includes(currentRole) && (
                    <button
                      type="button"
                      className="primaryButton"
                      style={{ background: "#16a34a", height: 32, fontSize: 12 }}
                      onClick={() => openDevAssignModal(selectedCrDetail)}
                    >
                      Assign Developers
                    </button>
                  )}

                <button
                  type="button"
                  className="tableAction"
                  style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
                  onClick={() => openDiscussionModal(selectedCrDetail)}
                  title="Developer Concerns & Discussions"
                >
                  <MessageCircle size={14} color="#6366f1" />
                  <span>Discussion</span>
                </button>

                <button
                  type="button"
                  className="iconButton"
                  onClick={() => setSelectedCrDetail(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* GOVERNANCE FEEDBACK BANNERS */}
            {selectedCrDetail.status === "REVERTED_TO_BA" && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "12px 20px", margin: "14px 24px 0", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong style={{ color: "#dc2626", display: "flex", alignItems: "center", gap: 6 }}>
                    <AlertCircle size={16} /> CR Reverted to BA with Discrepancies
                  </strong>
                  <div style={{ fontSize: 13, color: "#991b1b", marginTop: 4 }}>
                    Revert Reason: <em>"{selectedCrDetail.revert_reason || "Clarification required"}"</em> {selectedCrDetail.reverted_by_role ? `(by ${selectedCrDetail.reverted_by_role})` : ""}
                  </div>
                </div>
                {["Business Analyst", "BA Lead", "System Administrator"].includes(currentRole) && (
                  <button
                    type="button"
                    className="primaryButton"
                    style={{ background: "#4f46e5", height: 32, fontSize: 12 }}
                    onClick={() => openBaVerifyModal(selectedCrDetail)}
                  >
                    Open Verification Form
                  </button>
                )}
              </div>
            )}

            {selectedCrDetail.status === "CHANGES_REQUESTED_BY_MANAGEMENT" && (
              <div style={{ background: "#fff7ed", border: "1px solid #ffedd5", padding: "12px 20px", margin: "14px 24px 0", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong style={{ color: "#c2410c", display: "flex", alignItems: "center", gap: 6 }}>
                    <AlertTriangle size={16} /> Management Requested Changes
                  </strong>
                  <div style={{ fontSize: 13, color: "#9a3412", marginTop: 4 }}>
                    Management Notes: <em>"{selectedCrDetail.review_notes || "Modifications required"}"</em>
                  </div>
                </div>
                {["Project Lead", "Senior Project Manager", "Project Manager", "System Administrator"].includes(currentRole) && (
                  <button
                    type="button"
                    className="primaryButton"
                    style={{ background: "#ea580c", height: 32, fontSize: 12 }}
                    onClick={() => openPlChangesModal(selectedCrDetail)}
                  >
                    Resolve Feedback
                  </button>
                )}
              </div>
            )}

            {/* HOLD NOTICES & ACTIONS BANNER */}
            {(selectedCrDetail.hold_status === "PENDING_APPROVAL" || selectedCrDetail.hold_status === "REQUESTED_BY_UAT") && (
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: "12px 20px", margin: "14px 24px 0", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong style={{ color: "#b45309", display: "flex", alignItems: "center", gap: 6 }}>
                    <AlertTriangle size={16} /> Hold Approval Requested by UAT Lead
                  </strong>
                  <div style={{ fontSize: 13, color: "#92400e", marginTop: 4 }}>
                    Requested Hold Until: <b>{selectedCrDetail.hold_until_date || "Pending"}</b> · Remark: <em>"{selectedCrDetail.hold_reason}"</em>
                  </div>
                </div>
                {["Business Analyst", "System Administrator"].includes(currentRole) && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="primaryButton"
                      style={{ background: "#16a34a", height: 32, fontSize: 12 }}
                      onClick={() => handleApproveHold(selectedCrDetail.id, true)}
                    >
                      Approve Hold ✓
                    </button>
                    <button
                      type="button"
                      className="tableAction"
                      style={{ background: "#fef2f2", color: "#dc2626", borderColor: "#fecaca", height: 32, fontSize: 12 }}
                      onClick={() => handleApproveHold(selectedCrDetail.id, false, "BA rejected hold request. Timeline must be honored.")}
                    >
                      Reject Hold ✕
                    </button>
                  </div>
                )}
              </div>
            )}

            {(selectedCrDetail.status === "ON_HOLD" || selectedCrDetail.hold_status === "ON_HOLD" || selectedCrDetail.hold_status === "ON_HOLD_UAT" || selectedCrDetail.hold_status === "HELD_BY_BA" || selectedCrDetail.hold_status === "APPROVED_BY_BA") && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "12px 20px", margin: "14px 24px 0", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong style={{ color: "#b91c1c", display: "flex", alignItems: "center", gap: 6 }}>
                    <PauseCircle size={16} /> CR IS ON HOLD
                  </strong>
                  <div style={{ fontSize: 13, color: "#991b1b", marginTop: 4 }}>
                    Hold Deadline: <b>{selectedCrDetail.hold_until_date || "Not set"}</b> · Reason: <em>"{selectedCrDetail.hold_reason}"</em>
                  </div>
                </div>
                {["Business Analyst", "UAT Lead", "System Administrator"].includes(currentRole) && (
                  <button
                    type="button"
                    className="primaryButton"
                    style={{ background: "#0284c7", height: 32, fontSize: 12 }}
                    onClick={() => handleApproveHold(selectedCrDetail.id, false, "Hold released by " + currentRole)}
                  >
                    Resume / Release Hold ▶
                  </button>
                )}
              </div>
            )}

            {/* UAT EXECUTION STATUS & CONTROL STRIP */}
            {["UAT Lead", "UAT Tester", "System Administrator"].includes(currentRole) && (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", margin: "12px 24px 0", padding: "10px 16px", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#166534", textTransform: "uppercase", letterSpacing: 0.5 }}>UAT Execution:</span>
                  <span className={`status status-${selectedCrDetail.status.toLowerCase().replaceAll("_", "-")}`} style={{ fontWeight: 700 }}>
                    {selectedCrDetail.status === "ON_HOLD" ? "ON HOLD (UAT)" : selectedCrDetail.status}
                  </span>
                  {selectedCrDetail.hold_status && selectedCrDetail.hold_status !== "RELEASED" && (
                    <span style={{ fontSize: 11, background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                      {selectedCrDetail.hold_status}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="primaryButton"
                    style={{ background: "#2563eb", height: 28, fontSize: 11 }}
                    onClick={() => {
                      setUatStatusTargetCr(selectedCrDetail);
                      setUatStatusForm({
                        target_status: selectedCrDetail.status === "ON_HOLD" ? "UAT" : "ON_HOLD",
                        hold_until_date: selectedCrDetail.hold_until_date || "",
                        remarks: "",
                      });
                      setUatStatusModalOpen(true);
                    }}
                  >
                    Update UAT Status
                  </button>
                  <button
                    type="button"
                    className="primaryButton"
                    style={{ background: "#dc2626", height: 28, fontSize: 11 }}
                    onClick={() => {
                      setNewDefectForm({
                        cr_id: selectedCrDetail.id,
                        module_id: "",
                        title: "",
                        description: "",
                        reproduction_steps: "",
                        severity: "MAJOR",
                        priority: "HIGH",
                        assigned_developer_id: "",
                        evidence_url: "",
                      });
                      setCreateDefectModalOpen(true);
                    }}
                  >
                    + Log Defect (Bug)
                  </button>
                </div>
              </div>
            )}

            {/* VISUAL WORKFLOW TIMELINE (Section 14 & Phase 1-9) */}
            <div style={{ padding: "16px 24px 0", background: "#f8fafc" }}>
              <div className="workflowTimeline" style={{ margin: 0, padding: 12 }}>
                {[
                  "DRAFT",
                  "SUBMITTED",
                  "REQUIREMENT_REVIEW",
                  "IMPACT_ASSESSMENT",
                  "DEADLINE_REVIEW",
                  "SCOPE_APPROVED",
                  "DEVELOPMENT",
                  "SIT",
                  "UAT_READY",
                  "UAT",
                  "UAT_SIGNED_OFF",
                  "BUSINESS_ACCEPTANCE",
                  "CLOSED",
                ].map((st, idx) => {
                  const currentIdx = [
                    "DRAFT",
                    "SUBMITTED",
                    "REQUIREMENT_REVIEW",
                    "IMPACT_ASSESSMENT",
                    "DEADLINE_REVIEW",
                    "SCOPE_APPROVED",
                    "DEVELOPMENT",
                    "SIT",
                    "UAT_READY",
                    "UAT",
                    "UAT_SIGNED_OFF",
                    "BUSINESS_ACCEPTANCE",
                    "CLOSED",
                  ].indexOf(selectedCrDetail.status);
                  const isDone = idx < currentIdx;
                  const isCurrent = idx === currentIdx;
                  return (
                    <React.Fragment key={st}>
                      <div className={`timelineStep ${isDone ? "completed" : isCurrent ? "current" : ""}`}>
                        <div className="timelineNode">{idx + 1}</div>
                        <span className="timelineLabel">{st.replaceAll("_", " ")}</span>
                      </div>
                      {idx < 12 && <div className="timelineDivider" />}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* TABS */}
            <div style={{ padding: "0 24px", background: "#f8fafc" }}>
              <div className="tabNav" style={{ marginBottom: 0 }}>
                {["overview", "stakeholders", "tasks", "defects", "attachments", "discussions", "audit"].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`tabBtn ${crActiveTab === tab ? "active" : ""}`}
                    onClick={() => setCrActiveTab(tab)}
                  >
                    {tab === "overview" && "Overview"}
                    {tab === "stakeholders" && `Stakeholders (${selectedCrDetail.stakeholders.length})`}
                    {tab === "tasks" && `Tasks (${selectedCrDetail.tasks.length})`}
                    {tab === "defects" && `Bugs (${selectedCrDetail.defects.length})`}
                    {tab === "attachments" && `Attachments (${selectedCrDetail.attachments ? selectedCrDetail.attachments.length : 0})`}
                    {tab === "discussions" && `Discussions (${selectedCrDetail.discussions ? selectedCrDetail.discussions.length : 0})`}
                    {tab === "audit" && `Activity & SOP Audit (${selectedCrDetail.activities ? selectedCrDetail.activities.length : selectedCrDetail.status_history.length})`}
                  </button>
                ))}
              </div>
            </div>

            <div className="modalBody">
              {/* TAB 1: OVERVIEW */}
              {crActiveTab === "overview" && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
                    <div>
                      <h4 style={{ margin: "0 0 8px", fontSize: 13, textTransform: "uppercase", color: "#64748b" }}>Business Justification</h4>
                      <p style={{ background: "#f8fafc", padding: 14, borderRadius: 8, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                        {selectedCrDetail.business_justification || "No justification provided."}
                      </p>

                      {/* SCREEN IMPACT MAPPING (SOP Step 1.1) */}
                      {selectedCrDetail.screen_name && (
                        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: 12, borderRadius: 8, marginBottom: 16 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase" }}>
                            SOP Step 1.1 Mapped Release Impact
                          </span>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#1e3a8a", marginTop: 2 }}>
                            Target Screen: {selectedCrDetail.screen_name} &bull; <span style={{ fontSize: 12, fontWeight: 700, color: "#2563eb" }}>[{selectedCrDetail.screen_type || 'MODIFIED'}]</span>
                          </div>
                        </div>
                      )}

                      {/* SOP STEP 1.2: PROJECT LEAD TECHNICAL REVIEW CONTROLLER */}
                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: 14, borderRadius: 8, marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#0284c7", textTransform: "uppercase" }}>
                            SOP Step 1.2 &bull; Project Lead Technical Review
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: selectedCrDetail.pl_review_status === "ACCEPTED" ? "#16a34a" : selectedCrDetail.pl_review_status === "ESCALATED" ? "#dc2626" : "#f59e0b" }}>
                            {selectedCrDetail.pl_review_status ? `Status: ${selectedCrDetail.pl_review_status}` : "Status: Scope Review Open"}
                          </span>
                        </div>
                        <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }}>
                          PL performs initial technical review, early scope/deadline negotiations with BA, or escalates complex requests to SPM/PM.
                        </p>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            className="primaryButton"
                            style={{ height: 32, fontSize: 12, background: "#16a34a" }}
                            onClick={() => handlePlReviewAction(selectedCrDetail, "ACCEPT")}
                          >
                            ✓ PL Accept Baseline
                          </button>
                          <button
                            type="button"
                            className="tableAction"
                            style={{ height: 32, fontSize: 12 }}
                            onClick={() => handlePlReviewAction(selectedCrDetail, "NEGOTIATE")}
                          >
                            Negotiate Deadline
                          </button>
                          <button
                            type="button"
                            className="tableAction"
                            style={{ height: 32, fontSize: 12, color: "#dc2626", borderColor: "#fecaca" }}
                            onClick={() => handlePlReviewAction(selectedCrDetail, "ESCALATE")}
                          >
                            ⚠ Escalate to SPM / PM
                          </button>
                        </div>
                      </div>

                      {/* SOP STEP 5.2: PRODUCTION ARTIFACTS GENERATOR */}
                      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: 14, borderRadius: 8, marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", textTransform: "uppercase" }}>
                            SOP Step 5.2 &bull; Production Readiness Artifacts
                          </span>
                        </div>
                        <p style={{ margin: "0 0 10px", fontSize: 12, color: "#166534" }}>
                          Generate the 3 mandatory artifacts: Production SRN, Deployment Checklist, and RFC (Request for Change).
                        </p>
                        <button
                          type="button"
                          className="primaryButton"
                          style={{ height: 32, fontSize: 12, background: "#16a34a", display: "flex", alignItems: "center", gap: 6 }}
                          onClick={() => handleOpenProductionArtifacts(selectedCrDetail)}
                        >
                          <Rocket size={14} />
                          <span>Generate Production Package (Prod SRN, Checklist, RFC)</span>
                        </button>
                      </div>

                      <h4 style={{ margin: "20px 0 8px", fontSize: 13, textTransform: "uppercase", color: "#64748b" }}>Description & Functional Scope</h4>
                      <p style={{ background: "#f8fafc", padding: 14, borderRadius: 8, fontSize: 14, lineHeight: 1.6, margin: 0, whiteSpace: "pre-line" }}>
                        {selectedCrDetail.description}
                      </p>
                    </div>

                    <div style={{ borderLeft: "1px solid var(--line)", paddingLeft: 24 }}>
                      <h4 style={{ margin: "0 0 12px", fontSize: 13, textTransform: "uppercase", color: "#64748b" }}>CR Lifecycle Dates</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
                        <div>Requested Date: <b>{selectedCrDetail.requested_deadline || "Not defined"}</b></div>
                        <div>PM Proposed: <b>{selectedCrDetail.pm_proposed_deadline || "Pending"}</b></div>
                        <div>Approved Baseline: <b style={{ color: "#16a34a" }}>{selectedCrDetail.approved_deadline || "Pending Approval"}</b></div>
                        <div style={{ height: 1, background: "#e2e8f0", margin: "6px 0" }} />
                        <div>Dev Target: <b>{selectedCrDetail.dev_target_date || "Pending"}</b></div>
                        <div>SIT Completed: <b>{selectedCrDetail.sit_completed_at ? "✓ Completed" : "In Progress"}</b></div>
                        <div>SRN Sent: <b>{selectedCrDetail.srn_sent_at ? "✓ Dispatched" : "Pending"}</b></div>
                        <div>UAT Deployed: <b style={{ color: selectedCrDetail.uat_deployed_at ? "#16a34a" : "#d97706" }}>{selectedCrDetail.uat_deployed_at ? "✓ Deployed" : "Pending"}</b></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: STAKEHOLDERS (Section 3) */}
              {crActiveTab === "stakeholders" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16 }}>Assigned Project Stakeholders</h3>
                      <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 12 }}>
                        Exactly one Project Manager acts as the Primary PM accountable for delivery.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="primaryButton"
                      style={{ height: 32, fontSize: 12 }}
                      onClick={() => setAssignStakeholderOpen(true)}
                    >
                      + Assign Stakeholder
                    </button>
                  </div>

                  <div className="stakeholderList">
                    {selectedCrDetail.stakeholders.map((sh) => (
                      <div key={sh.id} className={`stakeholderCard ${sh.is_primary ? "isPrimary" : ""}`}>
                        {sh.is_primary && <span className="primaryBadge">Primary</span>}
                        <div className="avatar" style={{ background: sh.is_primary ? "#fef3c7" : undefined, color: sh.is_primary ? "#b45309" : undefined }}>
                          {sh.user_name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <strong>{sh.user_name}</strong>
                          <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 700 }}>{sh.responsibility.replaceAll("_", " ")}</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>{sh.assignment_reason}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: IMPACT ASSESSMENT & DEADLINE NEGOTIATION (Section 4) */}
              {crActiveTab === "impact-deadline" && (
                <div>
                  {/* DEADLINE NEGOTIATION ACTIONS */}
                  <div style={{ background: "#fffdf5", border: "1px solid #fef3c7", borderRadius: 8, padding: 18, marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 15, color: "#92400e" }}>Delivery Schedule Baseline</h4>
                        <div style={{ marginTop: 4, fontSize: 13, color: "#78350f" }}>
                          BA Requested: <b>{selectedCrDetail.requested_deadline || "None"}</b> | PM Proposed: <b>{selectedCrDetail.pm_proposed_deadline || "None"}</b> | Approved Baseline: <b style={{ color: "#16a34a" }}>{selectedCrDetail.approved_deadline || "Pending"}</b>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <button
                          type="button"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 7,
                            height: 36,
                            padding: "0 16px",
                            background: "#4f46e5",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: "pointer",
                            boxShadow: "0 2px 6px rgba(79, 70, 229, 0.28)",
                            transition: "all 0.15s ease",
                            whiteSpace: "nowrap",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#4338ca")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "#4f46e5")}
                          onClick={() => setDeadlineModalOpen(true)}
                        >
                          <Calendar size={15} />
                          <span>Request Deadline Revision</span>
                        </button>
                        {selectedCrDetail.status === "DEADLINE_REVIEW" && (
                          <button
                            type="button"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              height: 36,
                              padding: "0 16px",
                              background: "#16a34a",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: 8,
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: "pointer",
                              boxShadow: "0 2px 6px rgba(22, 163, 74, 0.28)",
                              transition: "all 0.15s ease",
                              whiteSpace: "nowrap",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#15803d")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "#16a34a")}
                            onClick={() => handleRespondDeadline("ACCEPTED")}
                          >
                            <Check size={15} />
                            <span>Accept Revised Deadline</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* IMPACT ASSESSMENT RECORD */}
                  {selectedCrDetail.impact_assessment ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div style={{ padding: 16, border: "1px solid var(--line)", borderRadius: 8, background: "#f8fafc" }}>
                        <h4 style={{ margin: "0 0 10px", fontSize: 14 }}>Technical Complexity: <b>{selectedCrDetail.impact_assessment.dev_complexity}</b></h4>
                        <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                          <div><b>Functional Changes:</b> {selectedCrDetail.impact_assessment.functional_changes || "Standard logic updates"}</div>
                          <div style={{ marginTop: 6 }}><b>Database Changes:</b> {selectedCrDetail.impact_assessment.db_changes || "None required"}</div>
                          <div style={{ marginTop: 6 }}><b>API Changes:</b> {selectedCrDetail.impact_assessment.api_changes || "None"}</div>
                          <div style={{ marginTop: 6 }}><b>Third-Party Risks:</b> {selectedCrDetail.impact_assessment.dependency_risks || "Low"}</div>
                        </div>
                      </div>
                      <div style={{ padding: 16, border: "1px solid var(--line)", borderRadius: 8, background: "#f8fafc" }}>
                        <h4 style={{ margin: "0 0 10px", fontSize: 14 }}>Effort Breakdown (Hours)</h4>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
                          <div>Dev Effort: <b>{selectedCrDetail.impact_assessment.est_dev_hours}h</b></div>
                          <div>SIT Effort: <b>{selectedCrDetail.impact_assessment.est_sit_hours}h</b></div>
                          <div>UAT Effort: <b>{selectedCrDetail.impact_assessment.est_uat_hours}h</b></div>
                          <div>Bug Buffer: <b>{selectedCrDetail.impact_assessment.est_bugfix_buffer_hours}h</b></div>
                        </div>
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e2e8f0", fontSize: 12, color: "#64748b" }}>
                          Assessed by: <b>{selectedCrDetail.impact_assessment.assessor_name || "Technical Team"}</b>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: 30, background: "#f8fafc", borderRadius: 8 }}>
                      <p style={{ color: "#64748b" }}>No Impact Assessment recorded yet. PM and Dev Lead evaluate requirements before locking schedule baseline.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: TASKS */}
              {crActiveTab === "tasks" && (
                <div>
                  <div className="tableWrap functionalTable">
                    <table>
                      <thead>
                        <tr>
                          <th>Task Key</th>
                          <th>Title</th>
                          <th>Developer</th>
                          <th>Status</th>
                          <th>Hours</th>
                          <th>Blockers</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCrDetail.tasks.map((t) => (
                          <tr key={t.id}>
                            <td><strong>{t.task_number}</strong></td>
                            <td>{t.title}</td>
                            <td>{t.assigned_developer}</td>
                            <td>
                              <span className={`status status-${t.status.toLowerCase().replaceAll("_", "-")}`}>{t.status}</span>
                            </td>
                            <td>{t.actual_hours}h / {t.estimated_hours}h</td>
                            <td>{t.blockers || "None"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: BUGS & DEFECT REPORT */}
              {crActiveTab === "defects" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16 }}>CR Defect & Bug Report</h3>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
                        All defects identified during development, SIT testing, and UAT cycles.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="primaryButton"
                      style={{ height: 30, fontSize: 12 }}
                      onClick={() => {
                        setNewDefectForm({
                          cr_id: selectedCrDetail.id,
                          module_id: "",
                          title: "",
                          description: "",
                          reproduction_steps: "",
                          severity: "MAJOR",
                          priority: "HIGH",
                          assigned_developer_id: "",
                          evidence_url: "",
                        });
                        setCreateDefectModalOpen(true);
                      }}
                    >
                      + Report Bug for this CR
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
                    <div style={{ background: "#f8fafc", padding: 10, borderRadius: 6, border: "1px solid var(--line)" }}>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Total Defects</div>
                      <b style={{ fontSize: 18 }}>{selectedCrDetail.defects.length}</b>
                    </div>
                    <div style={{ background: "#fef2f2", padding: 10, borderRadius: 6, border: "1px solid #fecaca" }}>
                      <div style={{ fontSize: 11, color: "#dc2626" }}>Active / Unresolved</div>
                      <b style={{ fontSize: 18, color: "#dc2626" }}>
                        {selectedCrDetail.defects.filter((d) => !["CLOSED", "VERIFIED"].includes(d.status)).length}
                      </b>
                    </div>
                    <div style={{ background: "#f0fdf4", padding: 10, borderRadius: 6, border: "1px solid #bbf7d0" }}>
                      <div style={{ fontSize: 11, color: "#16a34a" }}>Verified & Closed</div>
                      <b style={{ fontSize: 18, color: "#16a34a" }}>
                        {selectedCrDetail.defects.filter((d) => ["CLOSED", "VERIFIED"].includes(d.status)).length}
                      </b>
                    </div>
                    <div style={{ background: "#eff6ff", padding: 10, borderRadius: 6, border: "1px solid #bfdbfe" }}>
                      <div style={{ fontSize: 11, color: "#2563eb" }}>SIT Pass Rate</div>
                      <b style={{ fontSize: 18, color: "#2563eb" }}>
                        {selectedCrDetail.defects.length > 0
                          ? `${Math.round((selectedCrDetail.defects.filter((d) => ["SIT_PASSED", "READY_FOR_UAT_DEPLOYMENT", "SRN_SENT", "UAT_DEPLOYED", "READY_FOR_RETEST", "VERIFIED", "CLOSED"].includes(d.status)).length / selectedCrDetail.defects.length) * 100)}%`
                          : "100%"}
                      </b>
                    </div>
                  </div>

                  <div className="tableWrap functionalTable">
                    <table>
                      <thead>
                        <tr>
                          <th>Bug Number</th>
                          <th>Title</th>
                          <th>Severity</th>
                          <th>Developer</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCrDetail.defects.map((df) => {
                          const fullDef = defects.find((d) => d.id === df.id);
                          return (
                            <tr key={df.id}>
                              <td><strong style={{ color: "#b91c1c" }}>{df.bug_number}</strong></td>
                              <td>
                                <strong>{df.title}</strong>
                                {fullDef?.evidence_url && (
                                  <div style={{ fontSize: 10, color: "#dc2626", marginTop: 2 }}>
                                    <a href={fullDef.evidence_url} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
                                      Proof Attached ↗
                                    </a>
                                  </div>
                                )}
                              </td>
                              <td><span style={{ color: "#b91c1c", fontWeight: 700 }}>{df.severity}</span></td>
                              <td>{df.assigned_developer}</td>
                              <td>
                                <span className={`status status-${df.status.toLowerCase().replaceAll("_", "-")}`}>{df.status}</span>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="tableAction"
                                  onClick={() => {
                                    if (fullDef) setSelectedDefect(fullDef);
                                    else api.getDefectDetail(df.id).then((res) => res && setSelectedDefect(res));
                                  }}
                                >
                                  Inspect
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {selectedCrDetail.defects.length === 0 && (
                          <tr>
                            <td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#64748b" }}>
                              No defects reported on this Change Request. Clean development lifecycle!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB: ATTACHMENTS (Wireframes, Specifications, External Links) */}
              {crActiveTab === "attachments" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>CR Attachments & Technical References</h4>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
                        Wireframes (PNG/JPG), requirements documentation (PDF/DOC), and external prototypes (Figma, Drive, Zoho).
                      </p>
                    </div>
                  </div>

                  {/* Attachment List */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14, marginBottom: 24 }}>
                    {(selectedCrDetail.attachments || []).map((att) => {
                      const isLink = att.file_type === "EXTERNAL_LINK";
                      return (
                        <div
                          key={att.id}
                          style={{
                            border: "1px solid #e2e8f0",
                            borderRadius: 8,
                            padding: 14,
                            background: "#fff",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            gap: 10,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                            <div style={{ padding: 8, borderRadius: 6, background: isLink ? "#eff6ff" : "#f1f5f9", color: isLink ? "#2563eb" : "#475569" }}>
                              {isLink ? <LinkIcon size={20} /> : <Paperclip size={20} />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, wordBreak: "break-all", color: "#1e293b" }}>
                                {att.original_name}
                              </div>
                              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                                Uploaded by <strong>{att.uploader_name}</strong> {att.uploader_role ? `(${att.uploader_role})` : ""}
                              </div>
                              {att.note && (
                                <div style={{ fontSize: 12, color: "#475569", marginTop: 6, fontStyle: "italic", background: "#f8fafc", padding: "4px 8px", borderRadius: 4 }}>
                                  "{att.note}"
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: 8 }}>
                            <span style={{ fontSize: 11, color: "#94a3b8" }}>
                              {att.file_format?.toUpperCase()} &bull; {att.created_at ? new Date(att.created_at).toLocaleDateString() : "Recent"}
                            </span>
                            <div style={{ display: "flex", gap: 8 }}>
                              <a
                                href={att.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="tableAction"
                                style={{ display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none", fontSize: 11, color: "#2563eb" }}
                              >
                                {isLink ? <ExternalLink size={12} /> : <Download size={12} />}
                                <span>{isLink ? "Open Link" : "Download"}</span>
                              </a>
                              <button
                                type="button"
                                className="tableAction"
                                style={{ color: "#dc2626", borderColor: "#fca5a5", fontSize: 11 }}
                                onClick={() => handleDeleteDetailAttachment(att.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {(selectedCrDetail.attachments || []).length === 0 && (
                      <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 32, background: "#f8fafc", borderRadius: 8, border: "1px dashed #cbd5e1", color: "#64748b" }}>
                        <Paperclip size={28} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
                        <div style={{ fontSize: 13, fontWeight: 600 }}>No attachments uploaded yet</div>
                        <div style={{ fontSize: 12, marginTop: 2 }}>Attach wireframe mockups, requirement docs, or prototype links below.</div>
                      </div>
                    )}
                  </div>

                  {/* Upload / Link Forms */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, background: "#f8fafc", padding: 18, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    {/* Direct File Upload */}
                    <form onSubmit={handleUploadDetailAttachment} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <h5 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                        <Upload size={14} color="#4f46e5" /> Upload File (PNG / JPG Wireframe, PDF, DOCX)
                      </h5>
                      <input
                        type="file"
                        required
                        accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.zip"
                        onChange={(e) => setNewAttachmentFile(e.target.files?.[0] || null)}
                        style={{ fontSize: 12, padding: 6, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6 }}
                      />
                      <input
                        type="text"
                        placeholder="Description / note (e.g. Screen wireframe v2)..."
                        value={newAttachmentNote}
                        onChange={(e) => setNewAttachmentNote(e.target.value)}
                        style={{ fontSize: 12, padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1" }}
                      />
                      <button
                        type="submit"
                        disabled={isUploadingAttachment || !newAttachmentFile}
                        className="primaryButton"
                        style={{ height: 32, fontSize: 12, alignSelf: "flex-start", background: "#4f46e5" }}
                      >
                        {isUploadingAttachment ? "Uploading..." : "Upload File"}
                      </button>
                    </form>

                    {/* External Link */}
                    <form onSubmit={handleLinkDetailAttachment} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <h5 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                        <LinkIcon size={14} color="#0284c7" /> Attach External Link (Figma, Drive, Zoho)
                      </h5>
                      <input
                        type="text"
                        required
                        placeholder="Label / Title (e.g. Figma Prototype)"
                        value={newAttachmentLinkName}
                        onChange={(e) => setNewAttachmentLinkName(e.target.value)}
                        style={{ fontSize: 12, padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1" }}
                      />
                      <input
                        type="url"
                        required
                        placeholder="https://..."
                        value={newAttachmentLinkUrl}
                        onChange={(e) => setNewAttachmentLinkUrl(e.target.value)}
                        style={{ fontSize: 12, padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1" }}
                      />
                      <button
                        type="submit"
                        disabled={isUploadingAttachment || !newAttachmentLinkUrl.trim()}
                        className="secondaryButton"
                        style={{ height: 32, fontSize: 12, alignSelf: "flex-start", background: "#fff", border: "1px solid #cbd5e1" }}
                      >
                        Attach Link
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB: DISCUSSIONS & DEVELOPER CONCERNS */}
              {crActiveTab === "discussions" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Developer Concerns & Escalation Protocol</h4>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
                        Escalation Path: <strong>Developer &rarr; Project Manager (PM) &rarr; Senior PM (SPM) &rarr; Project Lead (PL) &rarr; Business Analyst (BA)</strong>
                      </p>
                    </div>
                    <button
                      type="button"
                      className="primaryButton"
                      style={{ height: 32, fontSize: 12, background: "#4f46e5", display: "flex", alignItems: "center", gap: 6 }}
                      onClick={() => openDiscussionModal(selectedCrDetail)}
                    >
                      <Plus size={14} /> Raise New Concern
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {(selectedCrDetail.discussions || []).map((disc) => (
                      <div
                        key={disc.id}
                        style={{
                          border: "1px solid #e2e8f0",
                          borderRadius: 8,
                          background: "#fff",
                          padding: 16,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <h5 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{disc.title}</h5>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  padding: "2px 8px",
                                  borderRadius: 12,
                                  background: disc.priority === "URGENT" || disc.priority === "CRITICAL" ? "#fee2e2" : "#f1f5f9",
                                  color: disc.priority === "URGENT" || disc.priority === "CRITICAL" ? "#b91c1c" : "#475569",
                                }}
                              >
                                {disc.priority}
                              </span>
                            </div>
                            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                              Raised by <strong>{disc.developer_name}</strong> &bull; {disc.created_at ? new Date(disc.created_at).toLocaleString() : ""}
                            </div>
                          </div>
                          <div>
                            {disc.status === "RESOLVED" ? (
                              <span className="badge-escalation-resolved">RESOLVED</span>
                            ) : (
                              <span
                                className={
                                  disc.current_level === "PM"
                                    ? "badge-escalation-pm"
                                    : disc.current_level === "SPM"
                                    ? "badge-escalation-spm"
                                    : disc.current_level === "PL"
                                    ? "badge-escalation-pl"
                                    : "badge-escalation-ba"
                                }
                              >
                                Escalated to: {disc.current_level}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Resolved Banner */}
                        {disc.status === "RESOLVED" && (
                          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "8px 12px", borderRadius: 6, fontSize: 12, color: "#166534", marginBottom: 12 }}>
                            <strong>Resolved:</strong> {disc.resolution_notes || "Concern resolved successfully."}
                          </div>
                        )}

                        {/* Action Buttons for Escalation Level Owners */}
                        {disc.status === "OPEN" && (
                          <div style={{ display: "flex", gap: 8, marginBottom: 12, padding: "8px 12px", background: "#f8fafc", borderRadius: 6, alignItems: "center" }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Governance Actions:</span>
                            <button
                              type="button"
                              className="primaryButton"
                              style={{ height: 28, fontSize: 11, background: "#16a34a" }}
                              onClick={() => {
                                const notes = window.prompt("Enter resolution note for this concern:");
                                if (notes) handleResolveConcern(disc.id);
                              }}
                            >
                              Resolve Concern ✓
                            </button>
                            {disc.current_level !== "BA" && (
                              <button
                                type="button"
                                className="tableAction"
                                style={{ height: 28, fontSize: 11, background: "#fff", borderColor: "#f59e0b", color: "#b45309", fontWeight: 700 }}
                                onClick={() => {
                                  const rmk = window.prompt(
                                    `Escalate concern to ${
                                      disc.current_level === "PM"
                                        ? "Senior Project Manager (SPM)"
                                        : disc.current_level === "SPM"
                                        ? "Project Lead (PL)"
                                        : "Business Analyst (BA)"
                                    }. Enter reason:`
                                  );
                                  if (rmk) {
                                    setDiscussionEscalateRemark(rmk);
                                    handleEscalateConcern(disc.id);
                                  }
                                }}
                              >
                                Escalate to Next Tier &rarr;
                              </button>
                            )}
                          </div>
                        )}

                        {/* Message Thread */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflowY: "auto", padding: 8, background: "#f8fafc", borderRadius: 6, marginBottom: 10 }}>
                          {(disc.messages || []).map((msg) => (
                            <div key={msg.id} style={{ display: "flex", flexDirection: "column", gap: 2, background: "#fff", padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>
                                  {msg.sender_name} <span style={{ fontWeight: 400, color: "#64748b" }}>({msg.sender_role})</span>
                                  {msg.action === "RESOLVE" && <span style={{ color: "#16a34a", fontWeight: 700, marginLeft: 6 }}>[RESOLUTION]</span>}
                                  {msg.action === "ESCALATE" && <span style={{ color: "#d97706", fontWeight: 700, marginLeft: 6 }}>[ESCALATION NOTE]</span>}
                                </span>
                                <span style={{ fontSize: 10, color: "#94a3b8" }}>
                                  {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: 13, color: "#334155", lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
                                {msg.message}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Add Comment */}
                        <div style={{ display: "flex", gap: 8 }}>
                          <input
                            type="text"
                            placeholder="Post a reply / note to this discussion..."
                            value={newDiscussionComment}
                            onChange={(e) => setNewDiscussionComment(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddCommentToDiscussion(disc.id);
                            }}
                            style={{ flex: 1, padding: "6px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1" }}
                          />
                          <button
                            type="button"
                            className="primaryButton"
                            style={{ height: 32, fontSize: 12, background: "#4f46e5" }}
                            onClick={() => handleAddCommentToDiscussion(disc.id)}
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    ))}

                    {(selectedCrDetail.discussions || []).length === 0 && (
                      <div style={{ textAlign: "center", padding: 32, background: "#f8fafc", borderRadius: 8, border: "1px dashed #cbd5e1", color: "#64748b" }}>
                        <MessageCircle size={28} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
                        <div style={{ fontSize: 13, fontWeight: 600 }}>No concerns raised on this CR</div>
                        <div style={{ fontSize: 12, marginTop: 2 }}>Developers can flag scope uncertainties or technical blockers here.</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: AUDIT TRAIL & FULL ACTIVITY TABLE */}
              {crActiveTab === "audit" && (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Comprehensive Activity & Governance Audit Trail</h4>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
                      Chronological immutable audit log of all creations, verifications, reviews, escalations, attachments, and sign-offs.
                    </p>
                  </div>

                  {/* Activity Table */}
                  <div className="tableWrap functionalTable" style={{ marginBottom: 24, maxHeight: 360, overflowY: "auto" }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Phase</th>
                          <th>Activity / Event</th>
                          <th>Actor & Role</th>
                          <th>Details & Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedCrDetail.activities || []).map((act, i) => (
                          <tr key={act.id || i}>
                            <td style={{ fontSize: 11, whiteSpace: "nowrap", color: "#64748b" }}>
                              {act.timestamp ? new Date(act.timestamp).toLocaleString() : "Recently"}
                            </td>
                            <td>
                              <span style={{ fontSize: 11, background: "#f1f5f9", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
                                {act.phase}
                              </span>
                            </td>
                            <td>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: "2px 8px",
                                  borderRadius: 12,
                                  background:
                                    act.event_type === "CR_FORWARDED" || act.event_type === "CR_APPROVED" || act.event_type === "DISCUSSION_RESOLVED"
                                      ? "#dcfce7"
                                      : act.event_type === "CR_REVERTED" || act.event_type === "CHANGES_REQUESTED"
                                      ? "#fee2e2"
                                      : act.event_type === "CR_ESCALATED" || act.event_type === "DISCUSSION_ESCALATED"
                                      ? "#fef3c7"
                                      : "#e0f2fe",
                                  color:
                                    act.event_type === "CR_FORWARDED" || act.event_type === "CR_APPROVED" || act.event_type === "DISCUSSION_RESOLVED"
                                      ? "#15803d"
                                      : act.event_type === "CR_REVERTED" || act.event_type === "CHANGES_REQUESTED"
                                      ? "#b91c1c"
                                      : act.event_type === "CR_ESCALATED" || act.event_type === "DISCUSSION_ESCALATED"
                                      ? "#b45309"
                                      : "#0284c7",
                                }}
                              >
                                {act.title || act.event_type}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontSize: 12, fontWeight: 700 }}>{act.actor_name}</div>
                              <div style={{ fontSize: 10, color: "#64748b" }}>{act.actor_role}</div>
                            </td>
                            <td style={{ fontSize: 12, color: "#334155" }}>
                              {act.details}
                            </td>
                          </tr>
                        ))}
                        {(selectedCrDetail.activities || []).length === 0 && (
                          <tr>
                            <td colSpan={5} style={{ textAlign: "center", padding: 20, color: "#64748b" }}>
                              No detailed activity records logged yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Status Transition History Timeline */}
                  <h5 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700 }}>Status Transitions History</h5>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {selectedCrDetail.status_history.map((h, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 10, borderLeft: "3px solid #6366f1", background: "#f8fafc", borderRadius: "0 6px 6px 0" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12 }}>
                            <strong>{h.actor_name}</strong> transitioned status to <span className="typeTag">{h.new_status}</span>
                          </div>
                          {h.reason && <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>Reason: {h.reason}</div>}
                        </div>
                        <span style={{ color: "#94a3b8", fontSize: 11 }}>{h.changed_at ? new Date(h.changed_at).toLocaleString() : "Recently"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modalFooter">
              <button
                type="button"
                className="secondaryButton"
                onClick={() => setSelectedCrDetail(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONSOLIDATED SRN DRAFT & SAME-THREAD EMAIL PREVIEW (Section 8 & 9) */}
      {srnDraftModalOpen && srnDraftData && (
        <div className="modalBackdrop" onClick={() => setSrnDraftModalOpen(false)}>
          <div className="modalCard" style={{ width: "min(960px, 95vw)" }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#6366f1" }}>{srnDraftData.srn_number}</span>
                <h2 style={{ margin: "2px 0 0" }}>Preview Software Release Note & Email Dispatch</h2>
              </div>
              <button type="button" className="iconButton" onClick={() => setSrnDraftModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modalBody">
              {/* SAME EMAIL THREAD OPTIONS (Section 9) */}
              {srnDraftData.has_multiple_threads && (
                <div className="threadNotice">
                  <AlertTriangle size={18} />
                  <div>
                    <b>Multi-Thread Notice:</b> Selected CRs belong to multiple distinct email conversation threads.
                    <div style={{ marginTop: 6, display: "flex", gap: 12 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input
                          type="radio"
                          name="thOpt"
                          value="MASTER_THREAD"
                          checked={threadOption === "MASTER_THREAD" || threadOption === "AUTO"}
                          onChange={() => setThreadOption("MASTER_THREAD")}
                        />
                        <span>Reply in Master Release Thread</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input
                          type="radio"
                          name="thOpt"
                          value="NEW_THREAD"
                          checked={threadOption === "NEW_THREAD"}
                          onChange={() => setThreadOption("NEW_THREAD")}
                        />
                        <span>Create New Consolidated Thread</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* EMAIL HEADERS */}
              <div style={{ background: "#f8fafc", padding: 14, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                <div><b>To:</b> <span style={{ color: "#0284c7" }}>{srnDraftData.email_recipients_to}</span></div>
                <div style={{ marginTop: 4 }}><b>CC:</b> <span style={{ color: "#64748b" }}>{srnDraftData.email_recipients_cc}</span></div>
                <div style={{ marginTop: 4 }}><b>Subject:</b> <strong>{srnDraftData.email_subject}</strong></div>
              </div>

              {/* SOP PHASE 4: MANAGEMENT SIGN-OFF & GATEKEEPING CONTROLLER */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: 16, borderRadius: 8, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Workflow Phase 4: Management Approval & Gatekeeping
                  </span>
                  <span style={{ fontSize: 11, color: "#64748b" }}>
                    Critical Security Rule: Dispatching unlocks CRs for UAT Bug Assign Screen
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  {/* 4.1 PM REVIEW */}
                  <div style={{ background: "#ffffff", padding: 12, borderRadius: 6, border: `1px solid ${srnPmReviewed ? "#86efac" : "#e2e8f0"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>1. PM Review</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: srnPmReviewed ? "#15803d" : "#94a3b8" }}>
                        {srnPmReviewed ? "✓ Reviewed" : "Pending"}
                      </span>
                    </div>
                    <p style={{ margin: "4px 0 8px", fontSize: 11, color: "#64748b" }}>Reviews SRN as official Reviewer (Harshal Giri).</p>
                    <button
                      type="button"
                      disabled={srnPmReviewed}
                      onClick={handlePmReviewSrn}
                      className="tableAction"
                      style={{ width: "100%", fontSize: 11, background: srnPmReviewed ? "#f0fdf4" : "#ffffff", borderColor: srnPmReviewed ? "#86efac" : "var(--line)" }}
                    >
                      {srnPmReviewed ? "✓ PM Reviewed" : "Sign-off as PM Reviewer"}
                    </button>
                  </div>

                  {/* 4.1 SPM EXECUTIVE APPROVAL */}
                  <div style={{ background: "#ffffff", padding: 12, borderRadius: 6, border: `1px solid ${srnSpmApproved ? "#86efac" : "#e2e8f0"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>2. SPM Sign-off</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: srnSpmApproved ? "#15803d" : "#94a3b8" }}>
                        {srnSpmApproved ? "✓ Approved" : "Pending"}
                      </span>
                    </div>
                    <p style={{ margin: "4px 0 8px", fontSize: 11, color: "#64748b" }}>Executive sign-off as Approver (Rajat Bodankar).</p>
                    <button
                      type="button"
                      disabled={srnSpmApproved}
                      onClick={handleSpmApproveSrn}
                      className="tableAction"
                      style={{ width: "100%", fontSize: 11, background: srnSpmApproved ? "#f0fdf4" : "#ffffff", borderColor: srnSpmApproved ? "#86efac" : "var(--line)" }}
                    >
                      {srnSpmApproved ? "✓ SPM Approved" : "Executive Sign-off (SPM)"}
                    </button>
                  </div>

                  {/* 4.2 BA GATEKEEPING */}
                  <div style={{ background: "#ffffff", padding: 12, borderRadius: 6, border: `1px solid ${srnBaApproved ? "#86efac" : (srnBaHold ? "#fca5a5" : "#e2e8f0")}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>3. BA Gatekeeper</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: srnBaApproved ? "#15803d" : (srnBaHold ? "#b91c1c" : "#94a3b8") }}>
                        {srnBaApproved ? "✓ Approved" : (srnBaHold ? "⏸ On Hold" : "Pending")}
                      </span>
                    </div>
                    <p style={{ margin: "4px 0 8px", fontSize: 11, color: "#64748b" }}>Final gatekeeper before UAT deployment.</p>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        disabled={srnBaApproved}
                        onClick={() => handleBaGatekeepSrn("APPROVE")}
                        className="tableAction"
                        style={{ flex: 1, fontSize: 11, background: srnBaApproved ? "#f0fdf4" : "#ffffff" }}
                      >
                        {srnBaApproved ? "✓ Approved" : "Approve"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBaGatekeepSrn("HOLD")}
                        className="tableAction"
                        style={{ fontSize: 11, color: "#b91c1c", borderColor: "#fecaca" }}
                      >
                        Hold
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* RENDERED EMAIL BODY */}
              <div className="emailPaper" dangerouslySetInnerHTML={{ __html: srnDraftData.rendered_email_body }} />
            </div>

            <div className="modalFooter">
              <button type="button" className="tableAction" onClick={() => setSrnDraftModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="primaryButton"
                disabled={srnSending || !srnPmReviewed || !srnSpmApproved || !srnBaApproved}
                onClick={handleSendSrn}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: (!srnPmReviewed || !srnSpmApproved || !srnBaApproved) ? "#94a3b8" : "#0284c7",
                }}
              >
                <Send size={16} />
                <span>
                  {srnSending
                    ? "Dispatching via Email Engine..."
                    : (!srnPmReviewed || !srnSpmApproved || !srnBaApproved)
                    ? "PM, SPM & BA Sign-offs Required Before Dispatch"
                    : "Confirm & Send SRN in Thread"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM UAT DEPLOYMENT (Section 10) */}
      {deployConfirmModalOpen && (
        <div className="modalBackdrop" onClick={() => setDeployConfirmModalOpen(false)}>
          <div className="modalCard" style={{ width: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h2>Confirm UAT Deployment</h2>
              <button type="button" className="iconButton" onClick={() => setDeployConfirmModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modalBody">
              <div style={{ background: "#fef3c7", border: "1px solid #fde68a", padding: 12, borderRadius: 8, color: "#92400e", fontSize: 12, marginBottom: 16 }}>
                <b>Important Business Rule:</b> Confirming deployment will advance associated bugs from <b>SRN_SENT</b> to <b>UAT_DEPLOYED</b> and <b>READY_FOR_RETEST</b>, and notify assigned UAT testers.
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Build / Container Tag</label>
                  <input
                    type="text"
                    value={deployBuildId}
                    onChange={(e) => setDeployBuildId(e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Deployment Verification Evidence</label>
                  <textarea
                    rows={3}
                    value={deployEvidence}
                    onChange={(e) => setDeployEvidence(e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>
              </div>
            </div>

            <div className="modalFooter">
              <button type="button" className="tableAction" onClick={() => setDeployConfirmModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="primaryButton"
                style={{ background: "#16a34a" }}
                onClick={handleConfirmDeployment}
              >
                Confirm Deployment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FIX DEFECT */}
      {fixDefectModalOpen && (
        <div className="modalBackdrop" onClick={() => setFixDefectModalOpen(false)}>
          <div className="modalCard" style={{ width: 540 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleResolveDefect}>
              <div className="modalHeader">
                <h2>Record Developer Fix</h2>
                <button type="button" className="iconButton" onClick={() => setFixDefectModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Resolution Notes</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe technical fix implemented..."
                    value={fixNotes}
                    onChange={(e) => setFixNotes(e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Git Commit / Code Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. commit 7f41a0b on fix/branch"
                    value={fixCodeRef}
                    onChange={(e) => setFixCodeRef(e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Proof Attachment / Build Link (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. https://ci.corp/build/492 or log screenshot URL"
                    value={fixAttachmentUrl}
                    onChange={(e) => setFixAttachmentUrl(e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>
              </div>

              <div className="modalFooter">
                <button type="button" className="tableAction" onClick={() => setFixDefectModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primaryButton">
                  Submit Fix & Start SIT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UAT RETEST DEFECT */}
      {retestModalOpen && (
        <div className="modalBackdrop" onClick={() => setRetestModalOpen(false)}>
          <div className="modalCard" style={{ width: 540 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleRetestDefect}>
              <div className="modalHeader">
                <h2>UAT Defect Retesting</h2>
                <button type="button" className="iconButton" onClick={() => setRetestModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Retest Outcome</label>
                  <div style={{ display: "flex", gap: 16 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="retestRes"
                        value="PASS"
                        checked={retestResult === "PASS"}
                        onChange={() => setRetestResult("PASS")}
                      />
                      <span style={{ color: "#16a34a", fontWeight: 700 }}>PASS (Verify & Close Defect)</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="retestRes"
                        value="FAIL"
                        checked={retestResult === "FAIL"}
                        onChange={() => setRetestResult("FAIL")}
                      />
                      <span style={{ color: "#dc2626", fontWeight: 700 }}>FAIL (Reopen Defect)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Retest Evidence & Verification Notes</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Document test run outcome and test data..."
                    value={retestNotes}
                    onChange={(e) => setRetestNotes(e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>
              </div>

              <div className="modalFooter">
                <button type="button" className="tableAction" onClick={() => setRetestModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primaryButton"
                  style={{ background: retestResult === "PASS" ? "#16a34a" : "#dc2626" }}
                >
                  Record Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE INTERNAL CR */}
      {createCrOpen && (
        <div className="modalBackdrop" onClick={() => setCreateCrOpen(false)}>
          <div className="modalCard" style={{ width: 620 }} onClick={(e) => e.stopPropagation()}>
            {currentRole !== "Business Analyst" && currentRole !== "BA Lead" && currentRole !== "System Administrator" ? (
              <div style={{ padding: 28, textAlign: "center" }}>
                <div style={{ display: "inline-flex", padding: 12, borderRadius: "50%", background: "#fef3c7", marginBottom: 12 }}>
                  <AlertTriangle size={32} color="#d97706" />
                </div>
                <h2 style={{ fontSize: 18, marginBottom: 8 }}>CR Creation Restricted to Business Analysts</h2>
                <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.5, margin: "0 auto 20px", maxWidth: 420 }}>
                  In accordance with enterprise governance (SOP Step 1.1), Change Requests must be authored exclusively by <strong>Business Analysts (BA)</strong>.
                  Developers, Administrators, Leads, and UAT personnel cannot author CRs.
                </p>
                <button type="button" className="primaryButton" onClick={() => setCreateCrOpen(false)}>
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateCr}>
                <div className="modalHeader">
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", textTransform: "uppercase" }}>BA Workspace &bull; SOP Step 1.1</span>
                    <h2 style={{ margin: "2px 0 0" }}>Initiate Change Request</h2>
                  </div>
                  <button type="button" className="iconButton" onClick={() => setCreateCrOpen(false)}>
                    <X size={18} />
                  </button>
                </div>

              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    Project <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <select
                    required
                    value={crForm.project_id}
                    onChange={(e) => {
                      const pId = e.target.value;
                      const p = projects.find((x) => x.id === pId);
                      const firstMod = p?.modules?.[0];
                      const firstScr = firstMod?.screens?.[0];
                      setCrForm({
                        ...crForm,
                        project_id: pId,
                        module_id: firstMod?.id || "",
                        screen_name: firstScr?.name || "",
                        screen_type: "MODIFIED",
                      });
                    }}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  >
                    <option value="">Select Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* SOP 1.1 MODULE AND SCREEN IMPACT MAPPING (BA SELECTION & NEW SCREEN REGISTRATION) */}
                {crForm.project_id && (
                  <div style={{ background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>
                        Project Module <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      {(() => {
                        const selProj = projects.find((p) => p.id === crForm.project_id);
                        const availMods = selProj?.modules || [];
                        if (availMods.length === 0) {
                          return (
                            <div style={{ fontSize: 12, color: "#b45309", background: "#fef3c7", padding: "8px 10px", borderRadius: 6 }}>
                              No modules created for this project yet. Please create a module in Project Management first.
                            </div>
                          );
                        }
                        return (
                          <select
                            required
                            value={crForm.module_id}
                            onChange={(e) => {
                              const mId = e.target.value;
                              const selMod = availMods.find((m) => m.id === mId);
                              const firstScr = selMod?.screens?.[0];
                              setCrForm({
                                ...crForm,
                                module_id: mId,
                                screen_name: firstScr?.name || "",
                                screen_type: "MODIFIED",
                              });
                            }}
                            style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)", fontSize: 13 }}
                          >
                            <option value="">Select Module</option>
                            {availMods.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.code})
                              </option>
                            ))}
                          </select>
                        );
                      })()}
                    </div>

                    {crForm.module_id && (() => {
                      const selProj = projects.find((p) => p.id === crForm.project_id);
                      const selMod = selProj?.modules?.find((m) => m.id === crForm.module_id);
                      const availScreens = selMod?.screens || [];

                      return (
                        <div style={{ paddingTop: 10, borderTop: "1px solid #e2e8f0" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <label style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", margin: 0 }}>
                              Impacted Screen / Functionality
                            </label>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                type="button"
                                onClick={() => setCrForm({ ...crForm, screen_type: "MODIFIED", screen_name: availScreens[0]?.name || "" })}
                                style={{
                                  padding: "3px 8px",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  borderRadius: 4,
                                  border: crForm.screen_type !== "NEW" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                                  background: crForm.screen_type !== "NEW" ? "#eff6ff" : "#fff",
                                  color: crForm.screen_type !== "NEW" ? "#1e40af" : "#64748b",
                                  cursor: "pointer",
                                }}
                              >
                                Existing Screen ({availScreens.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setCrForm({ ...crForm, screen_type: "NEW", screen_name: "" })}
                                style={{
                                  padding: "3px 8px",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  borderRadius: 4,
                                  border: crForm.screen_type === "NEW" ? "2px solid #16a34a" : "1px solid #cbd5e1",
                                  background: crForm.screen_type === "NEW" ? "#f0fdf4" : "#fff",
                                  color: crForm.screen_type === "NEW" ? "#15803d" : "#64748b",
                                  cursor: "pointer",
                                }}
                              >
                                + New Screen
                              </button>
                            </div>
                          </div>

                          {crForm.screen_type !== "NEW" ? (
                            availScreens.length > 0 ? (
                              <div>
                                <select
                                  value={crForm.screen_name}
                                  onChange={(e) => setCrForm({ ...crForm, screen_name: e.target.value })}
                                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)", fontSize: 13 }}
                                >
                                  <option value="">-- Choose Existing Screen / Functionality --</option>
                                  {availScreens.map((s) => (
                                    <option key={s.id} value={s.name}>
                                      {s.name} {s.code ? `[${s.code}]` : ""}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <div style={{ fontSize: 12, color: "#64748b", background: "#f1f5f9", padding: "8px 10px", borderRadius: 6 }}>
                                No screens cataloged under this module yet. Click <strong>+ New Screen</strong> above to define one.
                              </div>
                            )
                          ) : (
                            <div>
                              <input
                                type="text"
                                placeholder="Enter Name of New Screen / Functionality (e.g. Center Scheduling)"
                                value={crForm.screen_name}
                                onChange={(e) => setCrForm({ ...crForm, screen_name: e.target.value })}
                                style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)", fontSize: 13 }}
                              />
                              <div style={{ fontSize: 11, color: "#16a34a", marginTop: 4, fontWeight: 500 }}>
                                ✨ This new screen will be automatically registered under <strong>{selMod?.name}</strong> upon CR creation.
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Change Request Title</label>
                  <input
                    type="text"
                    required
                    placeholder="Clear functional title..."
                    value={crForm.title}
                    onChange={(e) => setCrForm({ ...crForm, title: e.target.value })}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Business Justification</label>
                  <textarea
                    rows={2}
                    placeholder="Why is this change necessary? Value and impact..."
                    value={crForm.business_justification}
                    onChange={(e) => setCrForm({ ...crForm, business_justification: e.target.value })}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Scope & Requirements</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Detailed requirements, screen field modifications, and acceptance criteria..."
                    value={crForm.description}
                    onChange={(e) => setCrForm({ ...crForm, description: e.target.value })}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Primary Project Manager (Accountable Lead)</label>
                    <select
                      value={crForm.primary_pm_id}
                      onChange={(e) => setCrForm({ ...crForm, primary_pm_id: e.target.value })}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                    >
                      <option value="">Select Project Manager</option>
                      {users
                        .filter((u) => u.role_title === "Project Manager" || !u.role_title)
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.display_name} ({u.employee_code})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Lead Developer (Technical Owner)</label>
                    <select
                      value={crForm.lead_dev_id}
                      onChange={(e) => setCrForm({ ...crForm, lead_dev_id: e.target.value })}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                    >
                      <option value="">Select Lead Developer</option>
                      {users
                        .filter((u) => u.role_title === "Developer Lead" || u.role_title === "Developer" || !u.role_title)
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.display_name} ({u.role_title || "Developer"})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Business Priority</label>
                    <select
                      value={crForm.priority}
                      onChange={(e) => setCrForm({ ...crForm, priority: e.target.value })}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                    >
                      <option value="LOW">Low</option>
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Requested Deadline</label>
                    <input
                      type="date"
                      value={crForm.requested_deadline}
                      onChange={(e) => setCrForm({ ...crForm, requested_deadline: e.target.value })}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                    />
                  </div>
                </div>
              </div>

              <div className="modalFooter">
                <button type="button" className="tableAction" onClick={() => setCreateCrOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primaryButton">
                  Create Change Request
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      )}

      {/* MODAL: ASSIGN STAKEHOLDER */}
      {assignStakeholderOpen && selectedCrDetail && (
        <div className="modalBackdrop" onClick={() => setAssignStakeholderOpen(false)}>
          <div className="modalCard" style={{ width: 520 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleAssignStakeholder}>
              <div className="modalHeader">
                <h2>Assign Stakeholder Responsibility</h2>
                <button type="button" className="iconButton" onClick={() => setAssignStakeholderOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Employee / User</label>
                  <select
                    required
                    value={stakeholderForm.user_id}
                    onChange={(e) => setStakeholderForm({ ...stakeholderForm, user_id: e.target.value })}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  >
                    <option value="">Select Employee</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.display_name} ({u.role_title || u.employee_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Responsibility Role</label>
                  <select
                    value={stakeholderForm.responsibility}
                    onChange={(e) =>
                      setStakeholderForm({
                        ...stakeholderForm,
                        responsibility: e.target.value,
                        is_primary: e.target.value === "PRIMARY_PM",
                      })
                    }
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  >
                    <option value="PRIMARY_PM">Primary Project Manager (Accountable Delivery Lead)</option>
                    <option value="SUPPORTING_PM">Supporting Project Manager (Module Lead)</option>
                    <option value="DEV_LEAD">Developer Lead</option>
                    <option value="DEVELOPER">Assigned Developer</option>
                    <option value="UAT_LEAD">UAT Lead</option>
                    <option value="UAT_TESTER">UAT Tester</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Assignment Reason</label>
                  <input
                    type="text"
                    placeholder="e.g. Accountable PM for end-to-end delivery"
                    value={stakeholderForm.assignment_reason}
                    onChange={(e) => setStakeholderForm({ ...stakeholderForm, assignment_reason: e.target.value })}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>
              </div>

              <div className="modalFooter">
                <button type="button" className="tableAction" onClick={() => setAssignStakeholderOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primaryButton">
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REQUEST DEADLINE REVISION */}
      {deadlineModalOpen && selectedCrDetail && (
        <div className="modalBackdrop" onClick={() => setDeadlineModalOpen(false)}>
          <div className="modalCard" style={{ width: 520 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleNegotiateDeadline}>
              <div className="modalHeader">
                <h2>Request Delivery Deadline Revision</h2>
                <button type="button" className="iconButton" onClick={() => setDeadlineModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                  BA requested date was: <b>{selectedCrDetail.requested_deadline || "Not defined"}</b>. Propose a feasible baseline based on technical impact assessment.
                </p>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>PM Proposed Delivery Date</label>
                  <input
                    type="date"
                    required
                    value={deadlineForm.proposed_deadline}
                    onChange={(e) => setDeadlineForm({ ...deadlineForm, proposed_deadline: e.target.value })}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Revision Justification</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Explain technical complexity, external dependencies, and SIT buffer..."
                    value={deadlineForm.revision_reason}
                    onChange={(e) => setDeadlineForm({ ...deadlineForm, revision_reason: e.target.value })}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>
              </div>

              <div className="modalFooter">
                <button type="button" className="tableAction" onClick={() => setDeadlineModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primaryButton">
                  Submit Revision for BA Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPDATE CR DETAILS (BA & PM) */}
      {editCrModalOpen && (
        <div className="modalBackdrop" onClick={() => setEditCrModalOpen(false)}>
          <div className="modalCard" style={{ width: 620 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleUpdateCr}>
              <div className="modalHeader">
                <h2>Update Change Request Details</h2>
                <button type="button" className="iconButton" onClick={() => setEditCrModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Change Request Title</label>
                  <input
                    type="text"
                    required
                    value={editCrForm.title}
                    onChange={(e) => setEditCrForm({ ...editCrForm, title: e.target.value })}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Business Justification</label>
                  <textarea
                    rows={2}
                    value={editCrForm.business_justification}
                    onChange={(e) => setEditCrForm({ ...editCrForm, business_justification: e.target.value })}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Scope & Description</label>
                  <textarea
                    rows={4}
                    required
                    value={editCrForm.description}
                    onChange={(e) => setEditCrForm({ ...editCrForm, description: e.target.value })}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Priority</label>
                    <select
                      value={editCrForm.priority}
                      onChange={(e) => setEditCrForm({ ...editCrForm, priority: e.target.value })}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                    >
                      <option value="LOW">Low</option>
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Requested Deadline</label>
                    <input
                      type="date"
                      value={editCrForm.requested_deadline}
                      onChange={(e) => setEditCrForm({ ...editCrForm, requested_deadline: e.target.value })}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Approved Deadline</label>
                    <input
                      type="date"
                      value={editCrForm.approved_deadline}
                      onChange={(e) => setEditCrForm({ ...editCrForm, approved_deadline: e.target.value })}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                    />
                  </div>
                </div>
              </div>
              <div className="modalFooter">
                <button type="button" className="tableAction" onClick={() => setEditCrModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primaryButton">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: HOLD CR (BA & UAT LEAD) */}
      {holdModalOpen && holdTargetCr && (
        <div className="modalBackdrop" onClick={() => setHoldModalOpen(false)}>
          <div className="modalCard" style={{ width: 520 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleHoldCr}>
              <div className="modalHeader">
                <h2>{currentRole === "UAT Lead" ? "Request CR On-Hold to BA" : "Put CR On-Hold"}</h2>
                <button type="button" className="iconButton" onClick={() => setHoldModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                  CR: <b>{holdTargetCr.reference_number}</b> — <em>{holdTargetCr.title}</em>
                </p>
                {currentRole === "UAT Lead" && (
                  <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: 10, borderRadius: 6, fontSize: 12, color: "#92400e" }}>
                    <b>Notice:</b> Submitting this hold request will directly notify the Business Analyst with your reason and hold deadline for formal authorization.
                  </div>
                )}
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Hold Until Deadline Date</label>
                  <input
                    type="date"
                    required
                    value={holdForm.hold_until_date}
                    onChange={(e) => setHoldForm({ ...holdForm, hold_until_date: e.target.value })}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Proper Reason & Remark</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="State specific reason for hold (e.g., blocking defect found in UAT, environment dependency, business sign-off delay)..."
                    value={holdForm.hold_reason}
                    onChange={(e) => setHoldForm({ ...holdForm, hold_reason: e.target.value })}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>
              </div>
              <div className="modalFooter">
                <button type="button" className="tableAction" onClick={() => setHoldModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primaryButton" style={{ background: "#dc2626" }}>
                  {currentRole === "UAT Lead" ? "Submit Hold Request to BA" : "Confirm On-Hold"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RAISE DIFFICULTY NOTE (DEVELOPER TO MANAGER) */}
      {raiseDifficultyModalOpen && (
        <div className="modalBackdrop" onClick={() => setRaiseDifficultyModalOpen(false)}>
          <div className="modalCard" style={{ width: 520 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleRaiseDifficulty}>
              <div className="modalHeader">
                <h2>Raise Difficulty / Note to Manager</h2>
                <button type="button" className="iconButton" onClick={() => setRaiseDifficultyModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                  Task: <b>{difficultyTaskNumber}</b>
                </p>
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: 10, borderRadius: 6, fontSize: 12, color: "#991b1b" }}>
                  <b>Notice:</b> This note will be recorded directly into the task blockers and an urgent notification will be dispatched to the Project Manager & Lead Developer.
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Difficulty / Blocker Explanation</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Explain the technical difficulty, missing mock data, third-party dependency issue, or architecture blocker..."
                    value={difficultyNote}
                    onChange={(e) => setDifficultyNote(e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>
              </div>
              <div className="modalFooter">
                <button type="button" className="tableAction" onClick={() => setRaiseDifficultyModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primaryButton" style={{ background: "#e11d48" }}>
                  Submit Note to Manager
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DEFECT FEEDBACK & PROOF (DEVELOPER) */}
      {defectFeedbackModalOpen && (
        <div className="modalBackdrop" onClick={() => setDefectFeedbackModalOpen(false)}>
          <div className="modalCard" style={{ width: 520 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleDefectFeedback}>
              <div className="modalHeader">
                <h2>Developer Feedback & Proof</h2>
                <button type="button" className="iconButton" onClick={() => setDefectFeedbackModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                  Bug: <b>{feedbackDefectNumber}</b>
                </p>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Developer Feedback Note</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Provide developer observations, reproduction clarifications, or fix verification note..."
                    value={feedbackNotes}
                    onChange={(e) => setFeedbackNotes(e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Proof Attachment URL (Screenshot, Log, or Video)</label>
                  <input
                    type="text"
                    placeholder="https://... or proof file link"
                    value={feedbackAttachmentUrl}
                    onChange={(e) => setFeedbackAttachmentUrl(e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>
              </div>
              <div className="modalFooter">
                <button type="button" className="tableAction" onClick={() => setDefectFeedbackModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primaryButton">
                  Save Feedback & Notify UAT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE DEFECT (UAT TESTER / LEAD) */}
      {createDefectModalOpen && (
        <div className="modalBackdrop" onClick={() => setCreateDefectModalOpen(false)}>
          <div className="modalCard" style={{ width: 620 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreateDefect}>
              <div className="modalHeader">
                <h2>Report New Defect</h2>
                <button type="button" className="iconButton" onClick={() => setCreateDefectModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Change Request</label>
                    <select
                      required
                      value={newDefectForm.cr_id}
                      onChange={(e) => {
                        const crId = e.target.value;
                        setNewDefectForm({ ...newDefectForm, cr_id: crId });
                      }}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                    >
                      <option value="">Select CR</option>
                      {changeRequests.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.reference_number} — {c.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Impacted Module</label>
                    <select
                      value={newDefectForm.module_id}
                      onChange={(e) => {
                        const modId = e.target.value;
                        const devTaskForMod = devTasks.find((t) => t.module_id === modId);
                        setNewDefectForm({
                          ...newDefectForm,
                          module_id: modId,
                          assigned_developer_id: devTaskForMod?.assigned_developer_id || newDefectForm.assigned_developer_id,
                        });
                      }}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                    >
                      <option value="">Select Module</option>
                      {projects.flatMap((p) => p.modules || []).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Assigned Developer (Respected Module Owner)</label>
                  <select
                    value={newDefectForm.assigned_developer_id}
                    onChange={(e) => setNewDefectForm({ ...newDefectForm, assigned_developer_id: e.target.value })}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  >
                    <option value="">Auto-Assign to Module Developer</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.display_name} ({u.role_title || "Developer"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Defect Title</label>
                  <input
                    type="text"
                    required
                    placeholder="Concise defect title..."
                    value={newDefectForm.title}
                    onChange={(e) => setNewDefectForm({ ...newDefectForm, title: e.target.value })}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Description & Steps to Reproduce</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="1. Step one&#10;2. Step two&#10;Expected result vs Actual result..."
                    value={newDefectForm.reproduction_steps}
                    onChange={(e) => setNewDefectForm({ ...newDefectForm, reproduction_steps: e.target.value, description: e.target.value })}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Severity</label>
                    <select
                      value={newDefectForm.severity}
                      onChange={(e) => setNewDefectForm({ ...newDefectForm, severity: e.target.value as any })}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                    >
                      <option value="BLOCKER">BLOCKER</option>
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="MAJOR">MAJOR</option>
                      <option value="MINOR">MINOR</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Priority</label>
                    <select
                      value={newDefectForm.priority}
                      onChange={(e) => setNewDefectForm({ ...newDefectForm, priority: e.target.value as any })}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                    >
                      <option value="URGENT">URGENT</option>
                      <option value="HIGH">HIGH</option>
                      <option value="NORMAL">NORMAL</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Proof / Evidence Attachment URL</label>
                  <input
                    type="text"
                    placeholder="URL to screenshot, screen recording, or network trace..."
                    value={newDefectForm.evidence_url}
                    onChange={(e) => setNewDefectForm({ ...newDefectForm, evidence_url: e.target.value })}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>
              </div>
              <div className="modalFooter">
                <button type="button" className="tableAction" onClick={() => setCreateDefectModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primaryButton" style={{ background: "#dc2626" }}>
                  Report & Assign Defect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SELECTED DEFECT DETAIL */}
      {selectedDefect && (
        <div className="modalBackdrop" onClick={() => setSelectedDefect(null)}>
          <div className="modalCard" style={{ width: 660 }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c" }}>{selectedDefect.bug_number}</span>
                <h2 style={{ margin: "2px 0 0" }}>{selectedDefect.title}</h2>
              </div>
              <button type="button" className="iconButton" onClick={() => setSelectedDefect(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, background: "#f8fafc", padding: 12, borderRadius: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Status</div>
                  <span className={`status status-${selectedDefect.status.toLowerCase().replaceAll("_", "-")}`}>{selectedDefect.status}</span>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Severity</div>
                  <b style={{ color: "#b91c1c" }}>{selectedDefect.severity}</b>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Environment</div>
                  <b>{selectedDefect.environment}</b>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>CR Reference</div>
                  <b>{selectedDefect.cr_number}</b>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Project & Module</div>
                  <b>{selectedDefect.project_name} · {selectedDefect.module_name}</b>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Assigned Developer</div>
                  <b>{selectedDefect.assigned_developer_name}</b>
                </div>
              </div>

              <div>
                <h4 style={{ margin: "0 0 6px", fontSize: 13, textTransform: "uppercase", color: "#64748b" }}>Description & Steps to Reproduce</h4>
                <div style={{ background: "#f8fafc", padding: 12, borderRadius: 6, fontSize: 13, whiteSpace: "pre-line" }}>
                  {selectedDefect.reproduction_steps || selectedDefect.description}
                </div>
              </div>

              {selectedDefect.evidence_url && (
                <div>
                  <h4 style={{ margin: "0 0 6px", fontSize: 13, textTransform: "uppercase", color: "#64748b" }}>Reporter Proof / Evidence</h4>
                  <div style={{ background: "#fef2f2", padding: 10, borderRadius: 6, fontSize: 12, border: "1px solid #fecaca" }}>
                    <a href={selectedDefect.evidence_url} target="_blank" rel="noreferrer" style={{ color: "#dc2626", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Paperclip size={12} /> {selectedDefect.evidence_url} ↗
                    </a>
                  </div>
                </div>
              )}

              {selectedDefect.developer_feedback && (
                <div>
                  <h4 style={{ margin: "0 0 6px", fontSize: 13, textTransform: "uppercase", color: "#64748b" }}>Developer Feedback & Note</h4>
                  <div style={{ background: "#eff6ff", padding: 12, borderRadius: 6, fontSize: 13, border: "1px solid #bfdbfe" }}>
                    <div>{selectedDefect.developer_feedback}</div>
                    {selectedDefect.developer_feedback_attachment && (
                      <div style={{ marginTop: 6 }}>
                        <a href={selectedDefect.developer_feedback_attachment} target="_blank" rel="noreferrer" style={{ color: "#2563eb", textDecoration: "underline", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Paperclip size={12} /> View Developer Proof Attachment ↗
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedDefect.resolution_notes && (
                <div>
                  <h4 style={{ margin: "0 0 6px", fontSize: 13, textTransform: "uppercase", color: "#64748b" }}>Fix Resolution</h4>
                  <div style={{ background: "#f0fdf4", padding: 12, borderRadius: 6, fontSize: 13, border: "1px solid #bbf7d0", color: "#166534" }}>
                    <b>Resolution:</b> {selectedDefect.resolution_notes}
                  </div>
                </div>
              )}
            </div>
            <div className="modalFooter" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                type="button"
                className="primaryButton"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  height: 38,
                  padding: "0 18px",
                  fontSize: 13,
                  fontWeight: 700,
                  background: "#4f46e5",
                  color: "#ffffff",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(79, 70, 229, 0.28)",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#4338ca")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#4f46e5")}
                onClick={() => {
                  setFeedbackDefectId(selectedDefect.id);
                  setFeedbackDefectNumber(selectedDefect.bug_number);
                  setDefectFeedbackModalOpen(true);
                }}
              >
                <FileText size={15} />
                <span>Give Feedback & Proof</span>
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="secondaryButton"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    height: 38,
                    padding: "0 20px",
                    fontSize: 13,
                    fontWeight: 700,
                    background: "#ffffff",
                    color: "#1e293b",
                    border: "1.5px solid #cbd5e1",
                    borderRadius: 8,
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f8fafc";
                    e.currentTarget.style.borderColor = "#94a3b8";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#ffffff";
                    e.currentTarget.style.borderColor = "#cbd5e1";
                  }}
                  onClick={() => setSelectedDefect(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD PROJECT MEMBER (ADMIN) */}
      {addMemberModalOpen && memberProjectId && (
        <div className="modalBackdrop" onClick={() => setAddMemberModalOpen(false)}>
          <div className="modalCard" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleAddProjectMember}>
              <div className="modalHeader">
                <h2>Add Member to Project</h2>
                <button type="button" className="iconButton" onClick={() => setAddMemberModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Select User</label>
                  <select
                    required
                    value={memberUserId}
                    onChange={(e) => setMemberUserId(e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  >
                    <option value="">Select User</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.display_name} ({u.employee_code}) — {u.role_title || "Member"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Project Role</label>
                  <select
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  >
                    <option value="Lead Developer">Lead Developer</option>
                    <option value="Developer">Developer</option>
                    <option value="Project Manager">Project Manager</option>
                    <option value="UAT Lead">UAT Lead</option>
                    <option value="UAT Tester">UAT Tester</option>
                    <option value="Business Analyst">Business Analyst</option>
                  </select>
                </div>
              </div>
              <div className="modalFooter">
                <button type="button" className="tableAction" onClick={() => setAddMemberModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primaryButton">
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT PROJECT */}
      {projectModalOpen && (
        <div className="modalBackdrop" onClick={() => setProjectModalOpen(false)}>
          <div className="modalCard" style={{ width: 500 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSaveProject}>
              <div className="modalHeader">
                <h2>{editingProject ? "Edit Project" : "Create New Project"}</h2>
                <button type="button" className="iconButton" onClick={() => setProjectModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Project Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. PRJ-LOTS"
                      value={projectForm.code}
                      onChange={(e) => setProjectForm({ ...projectForm, code: e.target.value.toUpperCase() })}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Status</label>
                    <select
                      value={projectForm.status}
                      onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)", background: "var(--surface)" }}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                      <option value="MAINTENANCE">MAINTENANCE</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Project Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NeML Farmer Lots & Bidding Portal"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Description</label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of the project and functional goals..."
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>
              </div>
              <div className="modalFooter">
                <button type="button" className="tableAction" onClick={() => setProjectModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primaryButton">
                  {editingProject ? "Update Project" : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE PROJECT CONFIRMATION */}
      {deleteProjectConfirm && (
        <div className="modalBackdrop" onClick={() => setDeleteProjectConfirm(null)}>
          <div className="modalCard" style={{ width: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h2 style={{ color: "var(--danger)" }}>Delete Project</h2>
              <button type="button" className="iconButton" onClick={() => setDeleteProjectConfirm(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modalBody" style={{ fontSize: 14, color: "var(--foreground)" }}>
              <p>
                Are you sure you want to permanently delete project <strong>&ldquo;{deleteProjectConfirm.name}&rdquo;</strong> (<code>{deleteProjectConfirm.code}</code>)?
              </p>
              <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 6, background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", fontSize: 13, color: "var(--danger)" }}>
                Warning: This will also remove all associated modules, screens, and project-specific member assignments.
              </div>
            </div>
            <div className="modalFooter">
              <button type="button" className="tableAction" onClick={() => setDeleteProjectConfirm(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="primaryButton"
                style={{ background: "var(--danger)", borderColor: "var(--danger)" }}
                onClick={handleDeleteProject}
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT MODULE */}
      {moduleModalOpen && (
        <div className="modalBackdrop" onClick={() => setModuleModalOpen(false)}>
          <div className="modalCard" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSaveModule}>
              <div className="modalHeader">
                <h2>{editingModule ? "Edit Module" : "Create Module"}</h2>
                <button type="button" className="iconButton" onClick={() => setModuleModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Module Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MOD-PAY"
                    value={moduleForm.code}
                    onChange={(e) => setModuleForm({ ...moduleForm, code: e.target.value.toUpperCase() })}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Module Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Payment Gateway Service"
                    value={moduleForm.name}
                    onChange={(e) => setModuleForm({ ...moduleForm, name: e.target.value })}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Description</label>
                  <textarea
                    rows={3}
                    placeholder="Module functional domain and scope..."
                    value={moduleForm.description}
                    onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>
              </div>
              <div className="modalFooter">
                <button type="button" className="tableAction" onClick={() => setModuleModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primaryButton">
                  {editingModule ? "Update Module" : "Save Module"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE MODULE CONFIRMATION */}
      {deleteModuleConfirm && (
        <div className="modalBackdrop" onClick={() => setDeleteModuleConfirm(null)}>
          <div className="modalCard" style={{ width: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h2 style={{ color: "var(--danger)" }}>Delete Module</h2>
              <button type="button" className="iconButton" onClick={() => setDeleteModuleConfirm(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modalBody" style={{ fontSize: 14, color: "var(--foreground)" }}>
              <p>
                Are you sure you want to permanently delete module <strong>&ldquo;{deleteModuleConfirm.module.name}&rdquo;</strong> (<code>{deleteModuleConfirm.module.code}</code>)?
              </p>
              <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 6, background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", fontSize: 13, color: "var(--danger)" }}>
                Warning: All screens and functionality catalogs within this module will also be deleted.
              </div>
            </div>
            <div className="modalFooter">
              <button type="button" className="tableAction" onClick={() => setDeleteModuleConfirm(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="primaryButton"
                style={{ background: "var(--danger)", borderColor: "var(--danger)" }}
                onClick={handleDeleteModule}
              >
                Delete Module
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT SCREEN / FUNCTIONALITY */}
      {screenModalOpen && (
        <div className="modalBackdrop" onClick={() => setScreenModalOpen(false)}>
          <div className="modalCard" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSaveScreen}>
              <div className="modalHeader">
                <div>
                  <h2 style={{ margin: 0 }}>{editingScreen ? "Edit Screen / Functionality" : "Add Screen / Functionality"}</h2>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>Module: {screenTargetModuleName}</span>
                </div>
                <button type="button" className="iconButton" onClick={() => setScreenModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Screen / Feature Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Farmer Lot Registration"
                      value={screenForm.name}
                      onChange={(e) => setScreenForm({ ...screenForm, name: e.target.value })}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Classification</label>
                    <select
                      value={screenForm.screen_type}
                      onChange={(e) => setScreenForm({ ...screenForm, screen_type: e.target.value })}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)", background: "var(--surface)" }}
                    >
                      <option value="EXISTING">Existing</option>
                      <option value="NEW">New Feature</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Screen Code / Key (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. SCR-LOT-REG"
                    value={screenForm.code}
                    onChange={(e) => setScreenForm({ ...screenForm, code: e.target.value.toUpperCase() })}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Description / Purpose</label>
                  <textarea
                    rows={3}
                    placeholder="Functionality details, UI interactions, or validations..."
                    value={screenForm.description}
                    onChange={(e) => setScreenForm({ ...screenForm, description: e.target.value })}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>
              </div>
              <div className="modalFooter">
                <button type="button" className="tableAction" onClick={() => setScreenModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primaryButton">
                  {editingScreen ? "Update Screen" : "Save Screen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE SCREEN CONFIRMATION */}
      {deleteScreenConfirm && (
        <div className="modalBackdrop" onClick={() => setDeleteScreenConfirm(null)}>
          <div className="modalCard" style={{ width: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h2 style={{ color: "var(--danger)" }}>Delete Screen / Functionality</h2>
              <button type="button" className="iconButton" onClick={() => setDeleteScreenConfirm(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modalBody" style={{ fontSize: 14, color: "var(--foreground)" }}>
              <p>
                Are you sure you want to delete screen / functionality <strong>&ldquo;{deleteScreenConfirm.screen.name}&rdquo;</strong>?
              </p>
            </div>
            <div className="modalFooter">
              <button type="button" className="tableAction" onClick={() => setDeleteScreenConfirm(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="primaryButton"
                style={{ background: "var(--danger)", borderColor: "var(--danger)" }}
                onClick={handleDeleteScreen}
              >
                Delete Screen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: UPDATE CR UAT STATUS */}
      {uatStatusModalOpen && uatStatusTargetCr && (
        <div className="modalBackdrop" onClick={() => setUatStatusModalOpen(false)}>
          <div className="modalCard" style={{ width: 520 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleUpdateUatStatus}>
              <div className="modalHeader">
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#6366f1" }}>{uatStatusTargetCr.reference_number}</span>
                  <h2 style={{ margin: "2px 0 0" }}>Update CR Status (UAT Lifecycle)</h2>
                </div>
                <button type="button" className="iconButton" onClick={() => setUatStatusModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ background: "#f8fafc", padding: 12, borderRadius: 6, fontSize: 13 }}>
                  <strong>Current Status:</strong>{" "}
                  <span className={`status status-${uatStatusTargetCr.status.toLowerCase().replaceAll("_", "-")}`}>
                    {uatStatusTargetCr.status === "ON_HOLD" ? "ON HOLD (UAT)" : uatStatusTargetCr.status}
                  </span>
                  <div style={{ marginTop: 4, color: "#64748b" }}>{uatStatusTargetCr.title}</div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Target Status</label>
                  <select
                    required
                    value={uatStatusForm.target_status}
                    onChange={(e: any) => setUatStatusForm({ ...uatStatusForm, target_status: e.target.value })}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  >
                    <option value="ON_HOLD">ON HOLD (UAT) — Blocked on defects, env, or dependency</option>
                    <option value="UAT">IN UAT TESTING — Active testing in UAT environment</option>
                    <option value="UAT_SIGNED_OFF">UAT SIGNED OFF — All test cases verified & passed</option>
                    <option value="DEVELOPMENT">RETURN TO DEV — Critical blockers found, needs developer fix</option>
                  </select>
                </div>

                {uatStatusForm.target_status === "ON_HOLD" && (
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Hold Until Date (Optional)</label>
                    <input
                      type="date"
                      value={uatStatusForm.hold_until_date}
                      onChange={(e) => setUatStatusForm({ ...uatStatusForm, hold_until_date: e.target.value })}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    {uatStatusForm.target_status === "ON_HOLD" ? "Hold Reason / Technical Blocker (Mandatory)" : "Remarks / Transition Reason"}
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder={
                      uatStatusForm.target_status === "ON_HOLD"
                        ? "Explain why CR is placed on hold (e.g. Blocker bug #102, test data unavailable)..."
                        : "Describe the test results, sign-off notes, or developer rework requirements..."
                    }
                    value={uatStatusForm.remarks}
                    onChange={(e) => setUatStatusForm({ ...uatStatusForm, remarks: e.target.value })}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                  />
                </div>
              </div>

              <div className="modalFooter" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" className="tableAction" onClick={() => setUatStatusModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primaryButton"
                  style={{
                    background:
                      uatStatusForm.target_status === "ON_HOLD"
                        ? "#b45309"
                        : uatStatusForm.target_status === "UAT_SIGNED_OFF"
                        ? "#16a34a"
                        : uatStatusForm.target_status === "DEVELOPMENT"
                        ? "#dc2626"
                        : "#2563eb",
                  }}
                >
                  Confirm Status Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MANDATORY OVERDUE PROTOCOL (SOP Step 2.2) */}
      {overdueModalOpen && overdueTargetTask && (
        <div className="modalBackdrop" onClick={() => setOverdueModalOpen(false)}>
          <div className="modalCard" style={{ width: 560 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSubmitOverdueReason}>
              <div className="modalHeader">
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#d97706", textTransform: "uppercase" }}>
                    SOP Step 2.2 Overdue Protocol
                  </span>
                  <h2 style={{ margin: "2px 0 0" }}>Task Completion Delay Protocol</h2>
                </div>
                <button type="button" className="iconButton" onClick={() => setOverdueModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ background: "#fef3c7", border: "1px solid #fde68a", padding: 12, borderRadius: 8, color: "#92400e", fontSize: 12 }}>
                  <b>Mandatory Protocol:</b> Task <b>{overdueTargetTask.task_number}</b> was scheduled for completion on <b>{overdueTargetTask.due_date || "earlier date"}</b>.
                  Under SOP Step 2.2, a developer must explain the reason for the delay prior to marking development completed.
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    Task: {overdueTargetTask.task_number} &bull; {overdueTargetTask.title}
                  </label>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#b45309" }}>
                    Mandatory Reason for Delay *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Provide specific technical, third-party dependency, or requirements delay explanation..."
                    value={overdueRemark}
                    onChange={(e) => setOverdueRemark(e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)", fontSize: 13 }}
                  />
                </div>
              </div>

              <div className="modalFooter" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" className="tableAction" onClick={() => setOverdueModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primaryButton" style={{ background: "#d97706" }}>
                  Submit Reason & Mark Completed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PROJECT LEAD TECHNICAL REVIEW (SOP Step 1.2) */}
      {plReviewModalOpen && plTargetCr && (
        <div className="modalBackdrop" onClick={() => setPlReviewModalOpen(false)}>
          <div className="modalCard" style={{ width: 560 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSubmitPlReview}>
              <div className="modalHeader">
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", textTransform: "uppercase" }}>
                    SOP Step 1.2 &bull; Project Lead Technical Review
                  </span>
                  <h2 style={{ margin: "2px 0 0" }}>Review Scope & Timeline: {plTargetCr.reference_number}</h2>
                </div>
                <button type="button" className="iconButton" onClick={() => setPlReviewModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, fontSize: 13 }}>
                  <div><b>Title:</b> {plTargetCr.title}</div>
                  <div style={{ marginTop: 4 }}><b>Requested Deadline:</b> {plTargetCr.requested_deadline || "Not specified"}</div>
                  {plTargetCr.screen_name && (
                    <div style={{ marginTop: 4 }}><b>Target Screen:</b> {plTargetCr.screen_name} ({plTargetCr.screen_type || 'MODIFIED'})</div>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Action Selection</label>
                  <div style={{ display: "flex", gap: 12 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                      <input
                        type="radio"
                        name="plAct"
                        value="ACCEPT"
                        checked={plAction === "ACCEPT"}
                        onChange={() => setPlAction("ACCEPT")}
                      />
                      <span>Accept Baseline (To PM)</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                      <input
                        type="radio"
                        name="plAct"
                        value="NEGOTIATE"
                        checked={plAction === "NEGOTIATE"}
                        onChange={() => setPlAction("NEGOTIATE")}
                      />
                      <span>Negotiate Deadline</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                      <input
                        type="radio"
                        name="plAct"
                        value="ESCALATE"
                        checked={plAction === "ESCALATE"}
                        onChange={() => setPlAction("ESCALATE")}
                      />
                      <span style={{ color: "#dc2626", fontWeight: 600 }}>Escalate to SPM/PM</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    {plAction === "ESCALATE" ? "Mandatory Escalation Explanation *" : "Technical Review Notes"}
                  </label>
                  <textarea
                    rows={3}
                    required={plAction === "ESCALATE"}
                    placeholder={
                      plAction === "ESCALATE"
                        ? "Detail the technical conflict, architectural constraint, or executive oversight required..."
                        : "Technical notes, module dependencies, or baseline acceptance comments..."
                    }
                    value={plNotes}
                    onChange={(e) => setPlNotes(e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)", fontSize: 13 }}
                  />
                </div>
              </div>

              <div className="modalFooter" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" className="tableAction" onClick={() => setPlReviewModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primaryButton"
                  style={{
                    background: plAction === "ACCEPT" ? "#16a34a" : plAction === "ESCALATE" ? "#dc2626" : "#2563eb",
                  }}
                >
                  {plAction === "ACCEPT" ? "Accept CR Scope" : plAction === "ESCALATE" ? "Escalate to SPM / PM" : "Proceed to Negotiate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BA GATEKEEPING HOLD (SOP Step 4.2) */}
      {baHoldModalOpen && (
        <div className="modalBackdrop" onClick={() => setBaHoldModalOpen(false)}>
          <div className="modalCard" style={{ width: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", textTransform: "uppercase" }}>
                  SOP Step 4.2 &bull; BA Gatekeeping
                </span>
                <h2 style={{ margin: "2px 0 0" }}>Place SRN Deployment On Hold</h2>
              </div>
              <button type="button" className="iconButton" onClick={() => setBaHoldModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: 12, borderRadius: 8, color: "#991b1b", fontSize: 12 }}>
                <b>BA Gatekeeper Protocol:</b> If held, the release is halted before UAT dispatch. A mandatory reason must be provided. The system will alert the BA when the hold period expires.
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  Mandatory Reason for Hold *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why UAT deployment is placed on hold (e.g. pending regulatory clearance, data migration delay)..."
                  value={baHoldReason}
                  onChange={(e) => setBaHoldReason(e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)", fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  Hold Until Date (Optional alert trigger)
                </label>
                <input
                  type="date"
                  value={baHoldUntilDate}
                  onChange={(e) => setBaHoldUntilDate(e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line)" }}
                />
              </div>
            </div>

            <div className="modalFooter" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" className="tableAction" onClick={() => setBaHoldModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="primaryButton" style={{ background: "#dc2626" }} onClick={handleConfirmBaHold}>
                Confirm Hold Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRODUCTION PREPARATION PACKAGE & ARTIFACTS (SOP Step 5.2) */}
      {prodArtifactsModalOpen && prodArtifacts && (
        <div className="modalBackdrop" onClick={() => setProdArtifactsModalOpen(false)}>
          <div className="modalCard" style={{ width: "min(880px, 95vw)" }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", textTransform: "uppercase" }}>
                  SOP Step 5.2 &bull; Production Readiness Artifacts
                </span>
                <h2 style={{ margin: "2px 0 0" }}>Production Release Package &bull; {prodArtifacts.cr_number}</h2>
              </div>
              <button type="button" className="iconButton" onClick={() => setProdArtifactsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modalBody">
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: 12, borderRadius: 8, color: "#166534", fontSize: 12, marginBottom: 16 }}>
                <b>Testing Complete:</b> All UAT verification has passed. Under SOP Step 5.2, three mandatory artifacts are generated: Production SRN, Deployment Checklist, and Request for Change (RFC).
              </div>

              {/* TABS */}
              <div className="tabNav" style={{ marginBottom: 14 }}>
                <button
                  type="button"
                  className={`tabBtn ${activeArtifactTab === "srn" ? "active" : ""}`}
                  onClick={() => setActiveArtifactTab("srn")}
                >
                  1. Production SRN
                </button>
                <button
                  type="button"
                  className={`tabBtn ${activeArtifactTab === "checklist" ? "active" : ""}`}
                  onClick={() => setActiveArtifactTab("checklist")}
                >
                  2. Deployment Checklist
                </button>
                <button
                  type="button"
                  className={`tabBtn ${activeArtifactTab === "rfc" ? "active" : ""}`}
                  onClick={() => setActiveArtifactTab("rfc")}
                >
                  3. RFC (Change Advisory)
                </button>
              </div>

              {/* PREVIEW CONTAINER */}
              <div style={{ background: "#0f172a", color: "#f8fafc", padding: 16, borderRadius: 8, fontFamily: "monospace", fontSize: 12, lineHeight: 1.5, maxHeight: 360, overflowY: "auto", whiteSpace: "pre-wrap" }}>
                {activeArtifactTab === "srn" && prodArtifacts.production_srn}
                {activeArtifactTab === "checklist" && prodArtifacts.deployment_checklist}
                {activeArtifactTab === "rfc" && prodArtifacts.rfc_document}
              </div>
            </div>

            <div className="modalFooter" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                type="button"
                className="tableAction"
                onClick={() => {
                  const content =
                    activeArtifactTab === "srn"
                      ? prodArtifacts.production_srn
                      : activeArtifactTab === "checklist"
                      ? prodArtifacts.deployment_checklist
                      : prodArtifacts.rfc_document;
                  navigator.clipboard.writeText(content);
                  showToast("Artifact copied to clipboard!");
                }}
              >
                Copy Active Artifact
              </button>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" className="tableAction" onClick={() => setProdArtifactsModalOpen(false)}>
                  Close
                </button>
                <button
                  type="button"
                  className="primaryButton"
                  style={{ background: "#16a34a", display: "flex", alignItems: "center", gap: 6 }}
                  onClick={handleDispatchProductionPackage}
                >
                  <Mail size={16} />
                  <span>Email Package to Stakeholders</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: CREATE USER WITH HIERARCHY PERMISSION CHECK */}
      {createUserModalOpen && (
        <div className="modalBackdrop">
          <div className="modalCard" style={{ maxWidth: 540 }}>
            <div className="modalHeader">
              <div>
                <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <Users size={18} color="#1d4ed8" />
                  <span>Create New User</span>
                </h3>
                <small style={{ color: "#64748b" }}>
                  Active Creator: <b>{currentRole}</b> ({roleActors[currentRole].name})
                </small>
              </div>
              <button
                type="button"
                className="closeBtn"
                onClick={() => setCreateUserModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit}>
              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* HIERARCHY NOTICE BADGE */}
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "12px 16px", borderRadius: 10, fontSize: 12, lineHeight: 1.6, color: "#1e40af" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ background: "#2563eb", color: "#fff", padding: "2px 8px", borderRadius: 4, fontWeight: 700, fontSize: 11, letterSpacing: "0.5px" }}>
                      AUTHORITY: {currentRole.toUpperCase()}
                    </span>
                    <span style={{ color: "#64748b", fontSize: 11 }}>Provisioning Policy</span>
                  </div>
                  <div>
                    Authorized to provision:{" "}
                    <strong style={{ color: "#1e3a8a" }}>
                      {getCreatableRoles(currentRole).join(", ")}
                    </strong>
                  </div>
                  {currentRole === "Project Manager" && (
                    <div style={{ marginTop: 6, padding: "4px 8px", background: "#f0f9ff", borderRadius: 6, border: "1px solid #bae6fd", color: "#0369a1", fontWeight: 600 }}>
                      ℹ Policy: Project Managers can create Senior Project Managers, Project Managers, and Developers. You cannot create BA Leads or UAT Leads.
                    </div>
                  )}
                  {currentRole === "BA Lead" && (
                    <div style={{ marginTop: 6, padding: "4px 8px", background: "#f0f9ff", borderRadius: 6, border: "1px solid #bae6fd", color: "#0369a1", fontWeight: 600 }}>
                      ℹ Policy: BA Leads can only provision other Business Analysts (BA).
                    </div>
                  )}
                  {(currentRole === "UAT Lead" || currentRole === "UAT Manager") && (
                    <div style={{ marginTop: 6, padding: "4px 8px", background: "#f0f9ff", borderRadius: 6, border: "1px solid #bae6fd", color: "#0369a1", fontWeight: 600 }}>
                      ℹ Policy: UAT Leads can only provision other UAT Testers & Members.
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4, color: "#1e293b" }}>Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anand Sharma"
                    value={newUserForm.display_name}
                    onChange={(e) => setNewUserForm({ ...newUserForm, display_name: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, background: "#fff", outline: "none", transition: "border-color 0.2s" }}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4, color: "#1e293b" }}>Corporate Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. anand.dev@company.com"
                      value={newUserForm.email}
                      onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, background: "#fff", outline: "none" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4, color: "#1e293b" }}>Employee Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. EMP-016"
                      value={newUserForm.employee_code}
                      onChange={(e) => setNewUserForm({ ...newUserForm, employee_code: e.target.value })}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, background: "#fff", outline: "none", fontWeight: 600 }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4, color: "#1e293b" }}>
                    Role Assignment * (Filtered strictly by your hierarchy level)
                  </label>
                  <select
                    value={newUserForm.role_title}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role_title: e.target.value as Role })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, background: "#fff", fontWeight: 600, color: "#0f172a", outline: "none" }}
                  >
                    {getCreatableRoles(currentRole).map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                {/* MULTI-PROJECT ASSIGNMENT */}
                <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
                        Assigned Projects *
                      </label>
                      <div style={{ fontSize: 11, color: "#64748b" }}>
                        Single employee can be assigned to multiple projects simultaneously
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <button
                        type="button"
                        style={{ fontSize: 11, fontWeight: 600, color: "#2563eb", background: "#eff6ff", border: "1px solid #bfdbfe", padding: "3px 8px", borderRadius: 5, cursor: "pointer" }}
                        onClick={() => {
                          const activeList = projects.length > 0 ? projects : DEFAULT_PROJECTS;
                          setNewUserForm({ ...newUserForm, project_ids: activeList.map((p) => p.id) });
                        }}
                      >
                        ✓ Select All
                      </button>
                      <button
                        type="button"
                        style={{ fontSize: 11, fontWeight: 600, color: "#64748b", background: "#f8fafc", border: "1px solid #cbd5e1", padding: "3px 8px", borderRadius: 5, cursor: "pointer" }}
                        onClick={() => setNewUserForm({ ...newUserForm, project_ids: [] })}
                      >
                        ✕ Clear All
                      </button>
                    </div>
                  </div>
                  {/* Project Cards Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(215px, 1fr))", gap: 8, maxHeight: 180, overflowY: "auto", padding: "4px 2px" }}>
                    {(projects.length > 0 ? projects : DEFAULT_PROJECTS).map((p) => {
                      const isChecked = newUserForm.project_ids.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            if (isChecked) {
                              setNewUserForm({ ...newUserForm, project_ids: newUserForm.project_ids.filter((id) => id !== p.id) });
                            } else {
                              setNewUserForm({ ...newUserForm, project_ids: [...newUserForm.project_ids, p.id] });
                            }
                          }}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            gap: 4,
                            padding: "9px 12px",
                            borderRadius: 8,
                            border: isChecked ? "2px solid #2563eb" : "1px solid #e2e8f0",
                            background: isChecked ? "#f0f7ff" : "#ffffff",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            boxShadow: isChecked ? "0 2px 6px rgba(37,99,235,0.12)" : "0 1px 2px rgba(0,0,0,0.02)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 800,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: isChecked ? "#2563eb" : "#f1f5f9",
                              color: isChecked ? "#ffffff" : "#475569",
                              letterSpacing: "0.5px",
                            }}>
                              {p.code}
                            </span>
                            <div style={{
                              width: 18,
                              height: 18,
                              borderRadius: 4,
                              border: isChecked ? "2px solid #2563eb" : "1px solid #cbd5e1",
                              background: isChecked ? "#2563eb" : "#ffffff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#ffffff",
                              fontSize: 11,
                              fontWeight: 900,
                            }}>
                              {isChecked ? "✓" : ""}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: isChecked ? "#1e40af" : "#1e293b", lineHeight: 1.3 }}>
                              {p.name}
                            </div>
                            <div style={{ fontSize: 10, color: "#64748b", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a", display: "inline-block" }}></span>
                              <span>{p.modules ? `${p.modules.length} Modules` : "Active Project"}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Selected Tags Summary */}
                  {newUserForm.project_ids.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>
                        Selected ({newUserForm.project_ids.length}):
                      </span>
                      {newUserForm.project_ids.map((pid) => {
                        const p = (projects.length > 0 ? projects : DEFAULT_PROJECTS).find((item) => item.id === pid);
                        if (!p) return null;
                        return (
                          <span
                            key={pid}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "2px 8px",
                              borderRadius: 12,
                              background: "#dbeafe",
                              color: "#1e40af",
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {p.code}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNewUserForm({ ...newUserForm, project_ids: newUserForm.project_ids.filter((id) => id !== pid) });
                              }}
                              style={{ background: "none", border: "none", color: "#1e40af", cursor: "pointer", padding: 0, fontSize: 11, lineHeight: 1 }}
                            >
                              ✕
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {newUserForm.project_ids.length === 0 ? (
                    <div style={{ padding: "8px 12px", background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: 6, fontSize: 12, color: "#b45309", marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <span>⚠</span>
                      <span>Please assign at least one project for this employee.</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: "#16a34a", marginTop: 6, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      <span>✓</span>
                      <span>{newUserForm.project_ids.length} project(s) assigned for this user.</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="modalFooter" style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  className="tableAction"
                  onClick={() => setCreateUserModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="primaryButton"
                  style={{ background: "#1d4ed8" }}
                >
                  {isSubmittingUser ? "Creating..." : "Confirm & Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BA FUNCTIONAL VERIFICATION & REVERT */}
      {baVerifyModalOpen && baVerifyTargetCr && (
        <div className="modalBackdrop" onClick={() => setBaVerifyModalOpen(false)}>
          <div className="modalCard" style={{ width: "min(720px, 95vw)" }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleBaVerifySubmit}>
              <div className="modalHeader">
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#4f46e5", textTransform: "uppercase" }}>
                    BA Verification & Enrichment Protocol
                  </span>
                  <h2 style={{ margin: "2px 0 0" }}>Verify CR: {baVerifyTargetCr.reference_number}</h2>
                </div>
                <button type="button" className="iconButton" onClick={() => setBaVerifyModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Decision Toggle */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <label
                    style={{
                      border: baVerifyAction === "FORWARD" ? "2px solid #4f46e5" : "1px solid #cbd5e1",
                      borderRadius: 8,
                      padding: 12,
                      cursor: "pointer",
                      background: baVerifyAction === "FORWARD" ? "#f5f3ff" : "#fff",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <input
                      type="radio"
                      name="baAction"
                      checked={baVerifyAction === "FORWARD"}
                      onChange={() => setBaVerifyAction("FORWARD")}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>Verify & Assign to Project Leads</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Enforce deadline, modules, screens, and forward</div>
                    </div>
                  </label>

                  <label
                    style={{
                      border: baVerifyAction === "REVERT" ? "2px solid #dc2626" : "1px solid #cbd5e1",
                      borderRadius: 8,
                      padding: 12,
                      cursor: "pointer",
                      background: baVerifyAction === "REVERT" ? "#fef2f2" : "#fff",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <input
                      type="radio"
                      name="baAction"
                      checked={baVerifyAction === "REVERT"}
                      onChange={() => setBaVerifyAction("REVERT")}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#dc2626" }}>Revert CR with Issues</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Send back to author with discrepancy remark</div>
                    </div>
                  </label>
                </div>

                {baVerifyAction === "REVERT" ? (
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#dc2626" }}>
                      Mandatory Revert Reason / Issue Note *
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Detail why this CR is being reverted (e.g. incomplete functional requirements, scope mismatch with Zoho ticket, missing user stories)..."
                      value={baVerifyRevertReason}
                      onChange={(e) => setBaVerifyRevertReason(e.target.value)}
                      style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #fca5a5", fontSize: 13 }}
                    />
                  </div>
                ) : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                          Mapped Project *
                        </label>
                        <select
                          value={baVerifyProjectId}
                          onChange={(e) => setBaVerifyProjectId(e.target.value)}
                          style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                        >
                          <option value="">-- Select Project --</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                          Target Deadline of CR *
                        </label>
                        <input
                          type="date"
                          required
                          value={baVerifyDeadline}
                          onChange={(e) => setBaVerifyDeadline(e.target.value)}
                          style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                          Impacted Module
                        </label>
                        <select
                          value={baVerifyModuleId}
                          onChange={(e) => setBaVerifyModuleId(e.target.value)}
                          style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                        >
                          <option value="">-- Select or General --</option>
                          {(projects.find((p) => p.id === baVerifyProjectId)?.modules || []).map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                          Priority Baseline
                        </label>
                        <select
                          value={baVerifyPriority}
                          onChange={(e) => setBaVerifyPriority(e.target.value)}
                          style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                        >
                          <option value="LOW">LOW</option>
                          <option value="NORMAL">NORMAL</option>
                          <option value="HIGH">HIGH</option>
                          <option value="CRITICAL">CRITICAL</option>
                          <option value="URGENT">URGENT</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                          Screen Name / Functionality
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Order Confirmation Page, KYC Document Uploader"
                          value={baVerifyScreenName}
                          onChange={(e) => setBaVerifyScreenName(e.target.value)}
                          style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                          Screen Status
                        </label>
                        <select
                          value={baVerifyScreenType}
                          onChange={(e) => setBaVerifyScreenType(e.target.value as any)}
                          style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                        >
                          <option value="EXISTING">Existing Screen</option>
                          <option value="NEW">New Screen</option>
                          <option value="MODIFIED">Modified Flow</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                        Functional Remarks & Implementation Notes
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Detail functional scope, business rules, and acceptance criteria..."
                        value={baVerifyRemarks}
                        onChange={(e) => setBaVerifyRemarks(e.target.value)}
                        style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                      />
                    </div>

                    {/* Attachments & Wireframing */}
                    <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, background: "#f8fafc" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                        <Paperclip size={14} color="#4f46e5" /> Attachments & Wireframes (PNG, JPG, PDF or Link)
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 2 }}>
                            Direct Upload (Mockups, Specs)
                          </label>
                          <input
                            type="file"
                            accept=".png,.jpg,.jpeg,.pdf,.doc,.docx"
                            onChange={(e) => setBaVerifyUploadFile(e.target.files?.[0] || null)}
                            style={{ fontSize: 11, width: "100%" }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 2 }}>
                            External URL (Figma / Zoho / Drive)
                          </label>
                          <input
                            type="url"
                            placeholder="https://..."
                            value={baVerifyLinkUrl}
                            onChange={(e) => setBaVerifyLinkUrl(e.target.value)}
                            style={{ width: "100%", padding: "5px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12 }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Assign to Project Leads */}
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#1e293b" }}>
                        Assign to Project Lead(s) * (Can select multiple)
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, maxHeight: 120, overflowY: "auto", border: "1px solid #cbd5e1", padding: 8, borderRadius: 6, background: "#fff" }}>
                        {users
                          .filter((u) => u.role_title && ["Project Lead", "Project Manager", "Senior Project Manager"].includes(u.role_title))
                          .map((lead) => {
                            const isChecked = baVerifySelectedPlIds.includes(lead.id);
                            return (
                              <label key={lead.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setBaVerifySelectedPlIds([...baVerifySelectedPlIds, lead.id]);
                                    } else {
                                      setBaVerifySelectedPlIds(baVerifySelectedPlIds.filter((id) => id !== lead.id));
                                    }
                                  }}
                                />
                                <div>
                                  <span style={{ fontWeight: 600 }}>{lead.display_name}</span>
                                  <span style={{ color: "#64748b", fontSize: 10, display: "block" }}>{lead.role_title}</span>
                                </div>
                              </label>
                            );
                          })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="modalFooter" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" className="tableAction" onClick={() => setBaVerifyModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBaVerify}
                  className="primaryButton"
                  style={{
                    background: baVerifyAction === "REVERT" ? "#dc2626" : "#4f46e5",
                  }}
                >
                  {isSubmittingBaVerify
                    ? "Processing..."
                    : baVerifyAction === "REVERT"
                    ? "Confirm Revert to Author"
                    : "Confirm Verification & Assign to PLs"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PROJECT LEAD TECHNICAL REVIEW */}
      {plGovReviewModalOpen && plGovTargetCr && (
        <div className="modalBackdrop" onClick={() => setPlGovReviewModalOpen(false)}>
          <div className="modalCard" style={{ width: 560 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handlePlGovReviewSubmit}>
              <div className="modalHeader">
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#0284c7", textTransform: "uppercase" }}>
                    Project Lead Technical Review
                  </span>
                  <h2 style={{ margin: "2px 0 0" }}>Review CR: {plGovTargetCr.reference_number}</h2>
                </div>
                <button type="button" className="iconButton" onClick={() => setPlGovReviewModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ background: "#f8fafc", padding: 12, borderRadius: 6, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{plGovTargetCr.title}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    Target Deadline: <b>{plGovTargetCr.requested_deadline || "Pending"}</b> &bull; Priority: <b>{plGovTargetCr.priority}</b>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                    Action Decision *
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="plGovAction"
                        checked={plGovAction === "PASS_TO_MANAGEMENT"}
                        onChange={() => setPlGovAction("PASS_TO_MANAGEMENT")}
                      />
                      <span>Pass to Senior Project Manager / PM for Review & Approval</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="plGovAction"
                        checked={plGovAction === "APPROVE"}
                        onChange={() => setPlGovAction("APPROVE")}
                      />
                      <span>Approve CR Directly & Forward to PM for Developer Delegation</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", color: "#dc2626" }}>
                      <input
                        type="radio"
                        name="plGovAction"
                        checked={plGovAction === "REVERT_TO_BA"}
                        onChange={() => setPlGovAction("REVERT_TO_BA")}
                      />
                      <span>Revert back to BA (Deadline unfeasible or Technical discrepancy)</span>
                    </label>
                  </div>
                </div>

                {plGovAction === "APPROVE" && (
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                      Select Project Manager to Delegate Execution:
                    </label>
                    <select
                      value={plGovTargetPmId}
                      onChange={(e) => setPlGovTargetPmId(e.target.value)}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                    >
                      <option value="">-- Choose Project Manager --</option>
                      {users
                        .filter((u) => u.role_title && ["Project Manager", "Senior Project Manager"].includes(u.role_title))
                        .map((pm) => (
                          <option key={pm.id} value={pm.id}>
                            {pm.display_name} ({pm.role_title})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    Review Remarks / Justification {plGovAction === "REVERT_TO_BA" ? "*" : ""}
                  </label>
                  <textarea
                    rows={3}
                    required={plGovAction === "REVERT_TO_BA"}
                    placeholder={
                      plGovAction === "REVERT_TO_BA"
                        ? "State specifically why the timeline cannot be met or what requirements are invalid..."
                        : "Technical observations, architectural feasibility notes, or release guidance..."
                    }
                    value={plGovRemarks}
                    onChange={(e) => setPlGovRemarks(e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                  />
                </div>
              </div>

              <div className="modalFooter" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" className="tableAction" onClick={() => setPlGovReviewModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPlGovReview}
                  className="primaryButton"
                  style={{
                    background: plGovAction === "REVERT_TO_BA" ? "#dc2626" : plGovAction === "APPROVE" ? "#16a34a" : "#0284c7",
                  }}
                >
                  {isSubmittingPlGovReview
                    ? "Submitting..."
                    : plGovAction === "REVERT_TO_BA"
                    ? "Revert to BA"
                    : plGovAction === "APPROVE"
                    ? "Approve & Delegate"
                    : "Forward to Management"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MANAGEMENT REVIEW (SPM / PM) */}
      {mgmtReviewModalOpen && mgmtReviewTargetCr && (
        <div className="modalBackdrop" onClick={() => setMgmtReviewModalOpen(false)}>
          <div className="modalCard" style={{ width: 540 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleMgmtReviewSubmit}>
              <div className="modalHeader">
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase" }}>
                    Senior Project Manager / PM Review
                  </span>
                  <h2 style={{ margin: "2px 0 0" }}>Sign-off: {mgmtReviewTargetCr.reference_number}</h2>
                </div>
                <button type="button" className="iconButton" onClick={() => setMgmtReviewModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ background: "#f8fafc", padding: 12, borderRadius: 6, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{mgmtReviewTargetCr.title}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    Approved Deadline: <b>{mgmtReviewTargetCr.approved_deadline || mgmtReviewTargetCr.requested_deadline || "Pending"}</b>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <label
                    style={{
                      flex: 1,
                      border: mgmtAction === "APPROVE" ? "2px solid #16a34a" : "1px solid #cbd5e1",
                      borderRadius: 8,
                      padding: 12,
                      cursor: "pointer",
                      background: mgmtAction === "APPROVE" ? "#f0fdf4" : "#fff",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <input
                      type="radio"
                      name="mgmtAct"
                      checked={mgmtAction === "APPROVE"}
                      onChange={() => setMgmtAction("APPROVE")}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#166534" }}>Approve CR</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Authorize for developer delegation</div>
                    </div>
                  </label>

                  <label
                    style={{
                      flex: 1,
                      border: mgmtAction === "REQUEST_CHANGES" ? "2px solid #ea580c" : "1px solid #cbd5e1",
                      borderRadius: 8,
                      padding: 12,
                      cursor: "pointer",
                      background: mgmtAction === "REQUEST_CHANGES" ? "#fff7ed" : "#fff",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <input
                      type="radio"
                      name="mgmtAct"
                      checked={mgmtAction === "REQUEST_CHANGES"}
                      onChange={() => setMgmtAction("REQUEST_CHANGES")}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#c2410c" }}>Request Changes</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Send back to Project Lead</div>
                    </div>
                  </label>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    Management Notes / Guidance {mgmtAction === "REQUEST_CHANGES" ? "*" : ""}
                  </label>
                  <textarea
                    rows={3}
                    required={mgmtAction === "REQUEST_CHANGES"}
                    placeholder={
                      mgmtAction === "REQUEST_CHANGES"
                        ? "Specify the changes required by Project Lead before this CR can be approved..."
                        : "Optional management approval remarks..."
                    }
                    value={mgmtRemarks}
                    onChange={(e) => setMgmtRemarks(e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                  />
                </div>
              </div>

              <div className="modalFooter" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" className="tableAction" onClick={() => setMgmtReviewModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMgmtReview}
                  className="primaryButton"
                  style={{
                    background: mgmtAction === "APPROVE" ? "#16a34a" : "#ea580c",
                  }}
                >
                  {isSubmittingMgmtReview
                    ? "Submitting..."
                    : mgmtAction === "APPROVE"
                    ? "Confirm Management Approval"
                    : "Send Changes to Project Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PL HANDLE MANAGEMENT CHANGES */}
      {plChangesModalOpen && plChangesTargetCr && (
        <div className="modalBackdrop" onClick={() => setPlChangesModalOpen(false)}>
          <div className="modalCard" style={{ width: 540 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handlePlChangesSubmit}>
              <div className="modalHeader">
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#ea580c", textTransform: "uppercase" }}>
                    PL Change Resolution Protocol
                  </span>
                  <h2 style={{ margin: "2px 0 0" }}>Resolve Changes: {plChangesTargetCr.reference_number}</h2>
                </div>
                <button type="button" className="iconButton" onClick={() => setPlChangesModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ background: "#fff7ed", padding: 12, borderRadius: 6, border: "1px solid #fed7aa" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#c2410c" }}>Management Change Request Note:</div>
                  <div style={{ fontSize: 13, color: "#9a3412", marginTop: 4 }}>
                    "{plChangesTargetCr.review_notes || "Modifications requested by SPM/PM."}"
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="plChg"
                      checked={plChangesAction === "RESOLVED"}
                      onChange={() => setPlChangesAction("RESOLVED")}
                    />
                    <span>Changes Solved &bull; Resubmit to SPM / PM for Sign-off</span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", color: "#dc2626" }}>
                    <input
                      type="radio"
                      name="plChg"
                      checked={plChangesAction === "REVERT_TO_BA"}
                      onChange={() => setPlChangesAction("REVERT_TO_BA")}
                    />
                    <span>Cannot Solve &bull; Revert to Business Analyst (BA)</span>
                  </label>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    Resolution Notes / Revert Explanation *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Explain how the issues were addressed or why functional scope must be reworked by BA..."
                    value={plChangesRemarks}
                    onChange={(e) => setPlChangesRemarks(e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                  />
                </div>
              </div>

              <div className="modalFooter" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" className="tableAction" onClick={() => setPlChangesModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPlChanges}
                  className="primaryButton"
                  style={{
                    background: plChangesAction === "RESOLVED" ? "#0284c7" : "#dc2626",
                  }}
                >
                  {isSubmittingPlChanges
                    ? "Submitting..."
                    : plChangesAction === "RESOLVED"
                    ? "Resubmit to Management"
                    : "Revert to BA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DEVELOPER ASSIGNMENT (WHOLE CR VS MODULAR SCREENS) */}
      {devAssignModalOpen && devAssignTargetCr && (
        <div className="modalBackdrop" onClick={() => setDevAssignModalOpen(false)}>
          <div className="modalCard" style={{ width: "min(720px, 95vw)" }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleDevAssignSubmit}>
              <div className="modalHeader">
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", textTransform: "uppercase" }}>
                    Development Delegation
                  </span>
                  <h2 style={{ margin: "2px 0 0" }}>Assign Developers: {devAssignTargetCr.reference_number}</h2>
                </div>
                <button type="button" className="iconButton" onClick={() => setDevAssignModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <label
                    style={{
                      border: devAssignMode === "WHOLE_CR" ? "2px solid #16a34a" : "1px solid #cbd5e1",
                      borderRadius: 8,
                      padding: 12,
                      cursor: "pointer",
                      background: devAssignMode === "WHOLE_CR" ? "#f0fdf4" : "#fff",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <input
                      type="radio"
                      name="devMode"
                      checked={devAssignMode === "WHOLE_CR"}
                      onChange={() => setDevAssignMode("WHOLE_CR")}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#166534" }}>Assign Whole CR</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Single or team ownership of entire CR</div>
                    </div>
                  </label>

                  <label
                    style={{
                      border: devAssignMode === "MODULAR_SCREENS" ? "2px solid #6366f1" : "1px solid #cbd5e1",
                      borderRadius: 8,
                      padding: 12,
                      cursor: "pointer",
                      background: devAssignMode === "MODULAR_SCREENS" ? "#f5f3ff" : "#fff",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <input
                      type="radio"
                      name="devMode"
                      checked={devAssignMode === "MODULAR_SCREENS"}
                      onChange={() => setDevAssignMode("MODULAR_SCREENS")}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#4f46e5" }}>Modular Screens Assignment</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Split screens/modules to different developers</div>
                    </div>
                  </label>
                </div>

                {devAssignMode === "WHOLE_CR" ? (
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                      Select Developer(s) *
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, maxHeight: 180, overflowY: "auto", border: "1px solid #cbd5e1", padding: 10, borderRadius: 6, background: "#fff" }}>
                      {users
                        .filter((u) => u.role_title && ["Developer", "Developer Lead"].includes(u.role_title))
                        .map((dev) => {
                          const isChecked = devAssignSelectedDevs.includes(dev.id);
                          return (
                            <label key={dev.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setDevAssignSelectedDevs([...devAssignSelectedDevs, dev.id]);
                                  } else {
                                    setDevAssignSelectedDevs(devAssignSelectedDevs.filter((id) => id !== dev.id));
                                  }
                                }}
                              />
                              <div>
                                <span style={{ fontWeight: 600 }}>{dev.display_name}</span>
                                <span style={{ color: "#64748b", fontSize: 10, display: "block" }}>{dev.role_title}</span>
                              </div>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <label style={{ fontSize: 12, fontWeight: 700 }}>
                        Assign Screens & Modules to Individual Developers:
                      </label>
                      <button
                        type="button"
                        className="tableAction"
                        style={{ fontSize: 11 }}
                        onClick={() => {
                          setDevAssignModularTasks([
                            ...devAssignModularTasks,
                            {
                              module_id: "",
                              screen_name: `Screen ${devAssignModularTasks.length + 1}`,
                              developer_id: "",
                              title: `Screen ${devAssignModularTasks.length + 1} Implementation`,
                              estimated_hours: 8,
                            },
                          ]);
                        }}
                      >
                        + Add Screen Row
                      </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 240, overflowY: "auto" }}>
                      {devAssignModularTasks.map((t, idx) => (
                        <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr auto", gap: 8, alignItems: "center", background: "#f8fafc", padding: 8, borderRadius: 6, border: "1px solid #e2e8f0" }}>
                          <div>
                            <input
                              type="text"
                              placeholder="Screen Name..."
                              value={t.screen_name}
                              onChange={(e) => {
                                const copy = [...devAssignModularTasks];
                                copy[idx].screen_name = e.target.value;
                                copy[idx].title = `${e.target.value} Dev`;
                                setDevAssignModularTasks(copy);
                              }}
                              style={{ width: "100%", padding: "6px 8px", fontSize: 12, borderRadius: 4, border: "1px solid #cbd5e1" }}
                            />
                          </div>

                          <div>
                            <select
                              value={t.developer_id}
                              onChange={(e) => {
                                const copy = [...devAssignModularTasks];
                                copy[idx].developer_id = e.target.value;
                                setDevAssignModularTasks(copy);
                              }}
                              style={{ width: "100%", padding: "6px 8px", fontSize: 12, borderRadius: 4, border: "1px solid #cbd5e1" }}
                            >
                              <option value="">-- Choose Developer --</option>
                              {users
                                .filter((u) => u.role_title && ["Developer", "Developer Lead"].includes(u.role_title))
                                .map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.display_name}
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div>
                            <input
                              type="number"
                              min={1}
                              placeholder="Hours"
                              value={t.estimated_hours}
                              onChange={(e) => {
                                const copy = [...devAssignModularTasks];
                                copy[idx].estimated_hours = Number(e.target.value);
                                setDevAssignModularTasks(copy);
                              }}
                              style={{ width: "100%", padding: "6px 8px", fontSize: 12, borderRadius: 4, border: "1px solid #cbd5e1" }}
                            />
                          </div>

                          <button
                            type="button"
                            className="iconButton"
                            onClick={() => {
                              setDevAssignModularTasks(devAssignModularTasks.filter((_, i) => i !== idx));
                            }}
                          >
                            <Trash2 size={14} color="#dc2626" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="modalFooter" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" className="tableAction" onClick={() => setDevAssignModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDevAssign}
                  className="primaryButton"
                  style={{ background: "#16a34a" }}
                >
                  {isSubmittingDevAssign ? "Assigning..." : "Confirm Developer Assignments"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: STANDALONE DISCUSSION & ESCALATION CONCERNS */}
      {discussionModalOpen && discussionTargetCr && (
        <div className="modalBackdrop" onClick={() => setDiscussionModalOpen(false)}>
          <div className="modalCard" style={{ width: "min(840px, 95vw)" }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", textTransform: "uppercase" }}>
                  Developer Concerns & Governance Discussions
                </span>
                <h2 style={{ margin: "2px 0 0" }}>Discussions &bull; {discussionTargetCr.reference_number}</h2>
              </div>
              <button type="button" className="iconButton" onClick={() => setDiscussionModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modalBody" style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 16 }}>
              {/* LEFT: Concerns List & New Concern Form */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <form onSubmit={handleCreateConcern} style={{ background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                    <Plus size={14} color="#4f46e5" /> Raise New Developer Concern
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Short Title / Summary of concern..."
                    value={newConcernTitle}
                    onChange={(e) => setNewConcernTitle(e.target.value)}
                    style={{ width: "100%", padding: "6px 8px", fontSize: 12, borderRadius: 4, border: "1px solid #cbd5e1" }}
                  />
                  <textarea
                    rows={2}
                    required
                    placeholder="Describe technical blocker, ambiguous spec, or API limitation..."
                    value={newConcernText}
                    onChange={(e) => setNewConcernText(e.target.value)}
                    style={{ width: "100%", padding: "6px 8px", fontSize: 12, borderRadius: 4, border: "1px solid #cbd5e1" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <select
                      value={newConcernPriority}
                      onChange={(e) => setNewConcernPriority(e.target.value as any)}
                      style={{ padding: "4px 8px", fontSize: 11, borderRadius: 4, border: "1px solid #cbd5e1" }}
                    >
                      <option value="NORMAL">Normal Priority</option>
                      <option value="HIGH">High Priority</option>
                      <option value="CRITICAL">Critical Priority</option>
                      <option value="URGENT">Urgent Priority</option>
                    </select>
                    <button
                      type="submit"
                      disabled={isSubmittingDiscussion}
                      className="primaryButton"
                      style={{ height: 28, fontSize: 11, background: "#4f46e5" }}
                    >
                      Raise Concern
                    </button>
                  </div>
                </form>

                {/* Discussions List */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflowY: "auto" }}>
                  {activeDiscussions.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => setSelectedDiscussion(d)}
                      style={{
                        padding: 10,
                        borderRadius: 6,
                        border: selectedDiscussion?.id === d.id ? "2px solid #6366f1" : "1px solid #e2e8f0",
                        background: selectedDiscussion?.id === d.id ? "#f5f3ff" : "#fff",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{d.title}</span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: 10,
                            background: d.status === "RESOLVED" ? "#dcfce7" : "#fef3c7",
                            color: d.status === "RESOLVED" ? "#15803d" : "#b45309",
                          }}
                        >
                          {d.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                        By <strong>{d.developer_name}</strong> &bull; Level: <b>{d.current_level}</b>
                      </div>
                    </div>
                  ))}
                  {activeDiscussions.length === 0 && (
                    <div style={{ textAlign: "center", padding: 20, color: "#64748b", fontSize: 12 }}>
                      No discussions recorded for this CR.
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: Selected Discussion Thread & Actions */}
              <div style={{ display: "flex", flexDirection: "column", borderLeft: "1px solid #e2e8f0", paddingLeft: 16 }}>
                {selectedDiscussion ? (
                  <>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{selectedDiscussion.title}</h4>
                        <span
                          className={
                            selectedDiscussion.status === "RESOLVED"
                              ? "badge-escalation-resolved"
                              : selectedDiscussion.current_level === "PM"
                              ? "badge-escalation-pm"
                              : selectedDiscussion.current_level === "SPM"
                              ? "badge-escalation-spm"
                              : selectedDiscussion.current_level === "PL"
                              ? "badge-escalation-pl"
                              : "badge-escalation-ba"
                          }
                        >
                          {selectedDiscussion.status === "RESOLVED"
                            ? "RESOLVED"
                            : `Level: ${selectedDiscussion.current_level}`}
                        </span>
                      </div>
                    </div>

                    {selectedDiscussion.status === "OPEN" && (
                      <div style={{ display: "flex", gap: 6, marginBottom: 10, padding: 8, background: "#f8fafc", borderRadius: 6 }}>
                        <button
                          type="button"
                          className="primaryButton"
                          style={{ height: 26, fontSize: 11, background: "#16a34a" }}
                          onClick={() => {
                            const note = window.prompt("Enter resolution note:");
                            if (note) handleResolveConcern(selectedDiscussion.id);
                          }}
                        >
                          Resolve ✓
                        </button>
                        {selectedDiscussion.current_level !== "BA" && (
                          <button
                            type="button"
                            className="tableAction"
                            style={{ height: 26, fontSize: 11, color: "#b45309", borderColor: "#fde68a" }}
                            onClick={() => {
                              const note = window.prompt("Enter escalation reason to next level:");
                              if (note) {
                                setDiscussionEscalateRemark(note);
                                handleEscalateConcern(selectedDiscussion.id);
                              }
                            }}
                          >
                            Escalate &rarr;
                          </button>
                        )}
                      </div>
                    )}

                    {/* Messages */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto", padding: 8, background: "#f8fafc", borderRadius: 6, marginBottom: 10 }}>
                      {(selectedDiscussion.messages || []).map((m) => (
                        <div key={m.id} style={{ background: "#fff", padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                            <strong>
                              {m.sender_name} ({m.sender_role})
                            </strong>
                            <span style={{ color: "#94a3b8" }}>
                              {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, marginTop: 2, color: "#334155" }}>{m.message}</div>
                        </div>
                      ))}
                    </div>

                    {/* Reply input */}
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        type="text"
                        placeholder="Add reply..."
                        value={newDiscussionComment}
                        onChange={(e) => setNewDiscussionComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddCommentToDiscussion(selectedDiscussion.id);
                        }}
                        style={{ flex: 1, padding: "6px 8px", fontSize: 12, borderRadius: 4, border: "1px solid #cbd5e1" }}
                      />
                      <button
                        type="button"
                        className="primaryButton"
                        style={{ height: 30, fontSize: 11, background: "#4f46e5" }}
                        onClick={() => handleAddCommentToDiscussion(selectedDiscussion.id)}
                      >
                        Reply
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 13 }}>
                    Select a discussion or raise a new concern.
                  </div>
                )}
              </div>
            </div>

            <div className="modalFooter" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" className="secondaryButton" onClick={() => setDiscussionModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
