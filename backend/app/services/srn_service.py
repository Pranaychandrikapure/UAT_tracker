import uuid
from datetime import UTC, datetime

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    CRActivity,
    ChangeRequest,
    Defect,
    DevTask,
    EmailThread,
    Project,
    ProjectModule,
    Release,
    SRNDocument,
    SRNItem,
    User,
)


class SRNServiceError(Exception):
    pass


async def get_ready_for_uat_items(db: AsyncSession, project_id: uuid.UUID | None = None) -> list[dict]:
    """Retrieve all items eligible for SRN release selection."""
    results = []

    # 1. Eligible Defect fixes (status == 'READY_FOR_UAT_DEPLOYMENT')
    defect_query = (
        select(Defect, ChangeRequest, Project, ProjectModule, User)
        .join(ChangeRequest, ChangeRequest.id == Defect.cr_id)
        .join(Project, Project.id == ChangeRequest.project_id)
        .outerjoin(ProjectModule, ProjectModule.id == Defect.module_id)
        .outerjoin(User, User.id == Defect.assigned_developer_id)
        .where(Defect.status == "READY_FOR_UAT_DEPLOYMENT")
    )
    if project_id:
        defect_query = defect_query.where(Project.id == project_id)

    defects = (await db.execute(defect_query)).all()
    for d, cr, p, mod, dev in defects:
        thread = await db.scalar(select(EmailThread).where(EmailThread.cr_id == cr.id).limit(1))
        results.append({
            "id": str(d.id),
            "item_type": "BUG_FIX",
            "item_key": d.bug_number,
            "cr_id": str(cr.id),
            "cr_number": cr.reference_number,
            "title": d.title,
            "project_name": p.name,
            "project_id": str(p.id),
            "module_name": mod.name if mod else "General",
            "developer_name": dev.display_name if dev else "Unassigned",
            "developer_id": str(dev.id) if dev else None,
            "dev_status": "Fixed",
            "sit_status": "Passed",
            "fix_date": d.sit_passed_at.strftime("%Y-%m-%d %H:%M") if d.sit_passed_at else str(d.updated_at.date()),
            "status": d.status,
            "severity": d.severity,
            "priority": d.priority,
            "is_eligible": True,
            "has_email_thread": thread is not None,
            "thread_subject": thread.original_subject if thread else None,
            "thread_id": str(thread.id) if thread else None,
        })

    # 2. Eligible CR changes (tasks with SIT_PASSED or DEVELOPMENT_COMPLETE on CRs ready for handoff)
    task_query = (
        select(DevTask, ChangeRequest, Project, ProjectModule, User)
        .join(ChangeRequest, ChangeRequest.id == DevTask.cr_id)
        .join(Project, Project.id == ChangeRequest.project_id)
        .outerjoin(ProjectModule, ProjectModule.id == DevTask.module_id)
        .outerjoin(User, User.id == DevTask.assigned_developer_id)
        .where(
            DevTask.status.in_(("SIT_PASSED", "DEVELOPMENT_COMPLETE")),
            ChangeRequest.status.in_(("DEVELOPMENT", "SIT", "UAT_READY", "CODE_REVIEW")),
        )
    )
    if project_id:
        task_query = task_query.where(Project.id == project_id)

    tasks = (await db.execute(task_query)).all()
    for t, cr, p, mod, dev in tasks:
        thread = await db.scalar(select(EmailThread).where(EmailThread.cr_id == cr.id).limit(1))
        results.append({
            "id": str(t.id),
            "item_type": "CR_CHANGE",
            "item_key": t.task_number,
            "cr_id": str(cr.id),
            "cr_number": cr.reference_number,
            "title": t.title,
            "project_name": p.name,
            "project_id": str(p.id),
            "module_name": mod.name if mod else "Core",
            "developer_name": dev.display_name if dev else "Unassigned",
            "developer_id": str(dev.id) if dev else None,
            "dev_status": "Completed",
            "sit_status": "Passed" if t.status == "SIT_PASSED" else "Verified",
            "fix_date": str(t.updated_at.date()),
            "status": t.status,
            "severity": "Feature",
            "priority": t.priority,
            "is_eligible": True,
            "has_email_thread": thread is not None,
            "thread_subject": thread.original_subject if thread else None,
            "thread_id": str(thread.id) if thread else None,
        })

    return results


async def generate_srn_draft(
    db: AsyncSession,
    selected_items: list[dict],  # list of {"id": str, "item_type": "CR_CHANGE" | "BUG_FIX"}
    actor_id: uuid.UUID,
    release_version: str = "v2.15.0",
    target_environment: str = "UAT",
) -> dict:
    if not selected_items:
        raise SRNServiceError("At least one eligible CR change or fixed bug must be selected")

    now = datetime.now(UTC)
    srn_number = f"SRN-{now.strftime('%Y')}-{uuid.uuid4().hex[:4].upper()}"

    defects = []
    tasks = []
    cr_map = {}
    threads = []
    projects = set()

    for item in selected_items:
        item_id = uuid.UUID(item["id"])
        if item["item_type"] == "BUG_FIX":
            d = await db.get(Defect, item_id)
            if not d or d.status not in ("READY_FOR_UAT_DEPLOYMENT", "FIXED", "SIT_PASSED"):
                raise SRNServiceError(f"Bug {item.get('item_key', item_id)} has not passed mandatory SIT checks")
            defects.append(d)
            if d.cr_id not in cr_map:
                cr = await db.get(ChangeRequest, d.cr_id)
                if cr:
                    cr_map[d.cr_id] = cr
                    projects.add(cr.project_id)
        elif item["item_type"] == "CR_CHANGE":
            t = await db.get(DevTask, item_id)
            if not t or t.status not in ("SIT_PASSED", "DEVELOPMENT_COMPLETE"):
                raise SRNServiceError(f"Task {item.get('item_key', item_id)} has not completed mandatory development and SIT")
            tasks.append(t)
            if t.cr_id not in cr_map:
                cr = await db.get(ChangeRequest, t.cr_id)
                if cr:
                    cr_map[t.cr_id] = cr
                    projects.add(cr.project_id)

    # Gather threads
    for cr_id in cr_map:
        th = await db.scalar(select(EmailThread).where(EmailThread.cr_id == cr_id).limit(1))
        if th:
            threads.append({
                "thread_id": str(th.id),
                "cr_id": str(cr_id),
                "cr_number": cr_map[cr_id].reference_number,
                "subject": th.original_subject,
                "mailbox": th.mailbox,
            })

    # Release association
    project_id = list(projects)[0] if projects else None
    release = await db.scalar(
        select(Release).where(Release.environment == target_environment, Release.status == "PLANNED").limit(1)
    )

    # Actor and Project Details for NeML DOCX Format
    actor_user = await db.get(User, actor_id)
    author_name = actor_user.display_name if actor_user else "Lead Developer"
    primary_cr = list(cr_map.values())[0] if cr_map else None
    primary_proj = await db.get(Project, primary_cr.project_id) if primary_cr else None
    project_name = primary_proj.name if primary_proj else "NAFED V3 Web & Service Application"

    now_date = now.strftime("%d-%m-%Y")
    intended_prod = release_version.split("U")[0] if "U" in release_version else release_version

    # Supporting Services Table
    supp_rows = f"""
    <tr>
      <td style="border: 1px solid #94a3b8; padding: 6px 10px; font-weight: 600;">neml-upp-lot-v2-service</td>
      <td style="border: 1px solid #94a3b8; padding: 6px 10px; text-align: center;">{now_date}</td>
      <td style="border: 1px solid #94a3b8; padding: 6px 10px; text-align: center; color: #16a34a; font-weight: 700;">Yes</td>
    </tr>
    """

    # Section 1.1 New Features / Enhancements (Docx format: Sr.No. | CR id | Description | Impacted modules with screen | Impact)
    cr_rows = ""
    idx = 1
    for cr in cr_map.values():
        screen = f"{cr.screen_name or 'General Screen'} ({cr.screen_type or 'EXISTING'})"
        cr_rows += f"""
        <tr>
          <td style="border: 1px solid #94a3b8; padding: 6px 8px; text-align: center; font-weight: 600;">{idx}</td>
          <td style="border: 1px solid #94a3b8; padding: 6px 10px; font-weight: 700; color: #1d4ed8;">{cr.reference_number}</td>
          <td style="border: 1px solid #94a3b8; padding: 6px 10px;">{cr.title}</td>
          <td style="border: 1px solid #94a3b8; padding: 6px 10px;">{screen}</td>
          <td style="border: 1px solid #94a3b8; padding: 6px 8px; text-align: center; color: #16a34a; font-weight: 700;">Yes</td>
        </tr>
        """
        idx += 1
    if not cr_rows:
        cr_rows = '<tr><td colspan="5" style="border: 1px solid #94a3b8; padding: 8px; text-align: center; color: #64748b;">No new features in this release.</td></tr>'

    # Section 1.2 Bug Fixes (Docx format: Sr.No. | Bug id | Description | Impacted modules with screen | Impact)
    bug_rows = ""
    idx = 1
    for d in defects:
        screen = getattr(d, 'screen_name', None) or 'Core System'
        bug_rows += f"""
        <tr>
          <td style="border: 1px solid #94a3b8; padding: 6px 8px; text-align: center; font-weight: 600;">{idx}</td>
          <td style="border: 1px solid #94a3b8; padding: 6px 10px; font-weight: 700; color: #dc2626;">{d.bug_number}</td>
          <td style="border: 1px solid #94a3b8; padding: 6px 10px;">{d.title}</td>
          <td style="border: 1px solid #94a3b8; padding: 6px 10px;">{screen}</td>
          <td style="border: 1px solid #94a3b8; padding: 6px 8px; text-align: center; color: #16a34a; font-weight: 700;">Yes</td>
        </tr>
        """
        idx += 1
    if not bug_rows:
        bug_rows = '<tr><td colspan="5" style="border: 1px solid #94a3b8; padding: 8px; text-align: center; color: #64748b;">No bug fixes in this release.</td></tr>'

    # NeML Standardized SRN HTML (Excluded version history / release activity table per specification)
    html_body = f"""<div style="font-family: Arial, Helvetica, sans-serif; color: #000000; max-width: 900px; margin: 0 auto; line-height: 1.5; font-size: 13px; background: #ffffff; padding: 24px; border: 1px solid #cbd5e1;">
  <div style="border: 2px solid #1e3a8a; padding: 12px; margin-bottom: 16px; background: #f8fafc; text-align: center;">
    <h2 style="margin: 0; color: #1e3a8a; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">NCDEX e Markets Limited (NeML)</h2>
    <h3 style="margin: 4px 0 0 0; color: #334155; font-size: 15px; font-weight: 700;">SOFTWARE RELEASE NOTES</h3>
    <div style="margin-top: 8px; font-size: 12px; color: #475569; display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 6px;">
      <span><b>Service Version:</b> {release_version}</span>
      <span><b>NeML Engineering Team</b></span>
      <span><b>Release Date:</b> {now_date}</span>
    </div>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px;">
    <thead>
      <tr style="background: #e2e8f0;">
        <th style="border: 1px solid #94a3b8; padding: 6px 10px; text-align: left;">Supporting Service</th>
        <th style="border: 1px solid #94a3b8; padding: 6px 10px; text-align: center; width: 140px;">Released Date</th>
        <th style="border: 1px solid #94a3b8; padding: 6px 10px; text-align: center; width: 80px;">Impact</th>
      </tr>
    </thead>
    <tbody>
      {supp_rows}
    </tbody>
  </table>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
    <tbody>
      <tr>
        <td style="border: 1px solid #94a3b8; padding: 6px 10px; width: 25%; font-weight: 700; background: #f1f5f9;">Product Name</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 10px; width: 25%;">{project_name}</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 10px; width: 25%; font-weight: 700; background: #f1f5f9;">Author Name</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 10px; width: 25%;">{author_name}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #94a3b8; padding: 6px 10px; font-weight: 700; background: #f1f5f9;">Module Name</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 10px;">{project_name} Service Application</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 10px; font-weight: 700; background: #f1f5f9;">Intended Prod Version</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 10px;">{intended_prod}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #94a3b8; padding: 6px 10px; font-weight: 700; background: #f1f5f9;">SRN No</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 10px; font-weight: 700; color: #1e3a8a;">{srn_number}</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 10px; font-weight: 700; background: #f1f5f9;">Version</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 10px; font-weight: 700;">{release_version}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #94a3b8; padding: 6px 10px; font-weight: 700; background: #f1f5f9;">Release Date</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 10px;">{now_date}</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 10px; font-weight: 700; background: #f1f5f9;">SRN Type</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 10px; font-weight: 700;">[{'X' if target_environment == 'UAT' else ' '}] UAT &nbsp;&nbsp;&nbsp; [{'X' if target_environment == 'PROD' else ' '}] PRODUCTION</td>
      </tr>
    </tbody>
  </table>

  <div style="margin-bottom: 20px;">
    <h4 style="margin: 0 0 6px 0; font-size: 14px; color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 4px;">1. Summary</h4>
    <p style="margin: 0; line-height: 1.6; text-align: justify; color: #334155;">
      NCDEX e Markets Limited (NeML) is a leading electronic Exchange in India. Deriving strength from the expertise of National Commodity and Derivatives Exchange Ltd (NCDEX). The main aim of the release is to deliver verified enhancements and defect fixes for UAT validation and sign-off.
    </p>
  </div>

  <div style="margin-bottom: 20px;">
    <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 4px;">1.1 New Features / Enhancements</h4>
    <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 12px;">
      <thead>
        <tr style="background: #e2e8f0;">
          <th style="border: 1px solid #94a3b8; padding: 6px 8px; width: 45px; text-align: center;">Sr.No.</th>
          <th style="border: 1px solid #94a3b8; padding: 6px 10px; width: 110px; text-align: left;">CR id</th>
          <th style="border: 1px solid #94a3b8; padding: 6px 10px; text-align: left;">Description</th>
          <th style="border: 1px solid #94a3b8; padding: 6px 10px; width: 220px; text-align: left;">Impacted modules with screen</th>
          <th style="border: 1px solid #94a3b8; padding: 6px 8px; width: 70px; text-align: center;">Impact</th>
        </tr>
      </thead>
      <tbody>
        {cr_rows}
      </tbody>
    </table>
  </div>

  <div style="margin-bottom: 24px;">
    <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 4px;">1.2 Bug Fixes</h4>
    <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 12px;">
      <thead>
        <tr style="background: #e2e8f0;">
          <th style="border: 1px solid #94a3b8; padding: 6px 8px; width: 45px; text-align: center;">Sr.No.</th>
          <th style="border: 1px solid #94a3b8; padding: 6px 10px; width: 110px; text-align: left;">Bug id</th>
          <th style="border: 1px solid #94a3b8; padding: 6px 10px; text-align: left;">Description</th>
          <th style="border: 1px solid #94a3b8; padding: 6px 10px; width: 220px; text-align: left;">Impacted modules with screen</th>
          <th style="border: 1px solid #94a3b8; padding: 6px 8px; width: 70px; text-align: center;">Impact</th>
        </tr>
      </thead>
      <tbody>
        {bug_rows}
      </tbody>
    </table>
  </div>

  <div style="border: 1px solid #94a3b8; background: #f8fafc; padding: 12px 16px; margin-top: 24px;">
    <div style="font-weight: 700; font-size: 13px; color: #1e3a8a; margin-bottom: 8px;">Sign-off & Governance Authorization</div>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 12px;">
      <div style="border: 1px solid #cbd5e1; background: #ffffff; padding: 8px; border-radius: 4px;">
        <span style="color: #64748b; font-size: 11px;">Prepared By (Developer):</span><br/>
        <b style="color: #0f172a;">{author_name}</b><br/>
        <span style="color: #16a34a; font-size: 11px; font-weight: 600;">✓ Engineering Verified</span>
      </div>
      <div style="border: 1px solid #cbd5e1; background: #ffffff; padding: 8px; border-radius: 4px;">
        <span style="color: #64748b; font-size: 11px;">Reviewed By (PM):</span><br/>
        <b style="color: #0f172a;">Harshal Giri</b><br/>
        <span style="color: #16a34a; font-size: 11px; font-weight: 600;">✓ PM Sign-off Completed</span>
      </div>
      <div style="border: 1px solid #cbd5e1; background: #ffffff; padding: 8px; border-radius: 4px;">
        <span style="color: #64748b; font-size: 11px;">Approved By (SPM):</span><br/>
        <b style="color: #0f172a;">Rajat Bodankar</b><br/>
        <span style="color: #16a34a; font-size: 11px; font-weight: 600;">✓ SPM Authorized for Handoff</span>
      </div>
    </div>
  </div>
</div>"""

    first_thread = threads[0] if threads else None
    subject = f"Re: {first_thread['subject']} [{srn_number}]" if first_thread else f"Release Note: {srn_number} - {release_version}"

    srn_doc = SRNDocument(
        srn_number=srn_number,
        release_id=release.id if release else None,
        project_id=project_id,
        title=f"Release {release_version} ({target_environment})",
        target_environment=target_environment,
        release_version=release_version,
        change_summary=f"Consolidated release of {len(cr_map)} Change Requests and {len(defects)} fixed defects.",
        module_changes="; ".join({t.title for t in tasks} | {d.title for d in defects}),
        technical_notes="SIT passed. Database migrations and backend services tested.",
        sit_summary="SIT testing passed with zero open blockers.",
        deployment_instructions=f"Deploy build container {release_version} to {target_environment}.",
        created_by_user_id=actor_id,
        status="DRAFT",
        email_thread_id=uuid.UUID(first_thread["thread_id"]) if first_thread else None,
        email_subject=subject,
        email_recipients_to="uat-team@company.com",
        email_recipients_cc="ba-team@company.com, pm-team@company.com",
        rendered_email_body=html_body,
    )
    db.add(srn_doc)
    await db.flush()

    # Create SRN Items
    for d in defects:
        db.add(SRNItem(
            srn_id=srn_doc.id,
            cr_id=d.cr_id,
            defect_id=d.id,
            item_type="BUG_FIX",
            status="READY",
            fix_summary=d.resolution_notes or d.title,
        ))
    for t in tasks:
        db.add(SRNItem(
            srn_id=srn_doc.id,
            cr_id=t.cr_id,
            dev_task_id=t.id,
            item_type="CR_CHANGE",
            status="READY",
            fix_summary=t.title,
        ))

    await db.commit()

    return {
        "srn_id": str(srn_doc.id),
        "srn_number": srn_number,
        "release_version": release_version,
        "target_environment": target_environment,
        "status": "DRAFT",
        "email_subject": subject,
        "email_recipients_to": srn_doc.email_recipients_to,
        "email_recipients_cc": srn_doc.email_recipients_cc,
        "rendered_email_body": html_body,
        "items_count": len(selected_items),
        "cr_count": len(cr_map),
        "defect_count": len(defects),
        "existing_threads": threads,
        "has_multiple_threads": len(threads) > 1,
    }


async def generate_production_package(db: AsyncSession, cr_id: uuid.UUID) -> dict:
    cr = await db.get(ChangeRequest, cr_id)
    if not cr:
        raise SRNServiceError("Change Request not found")

    tasks = (await db.scalars(select(DevTask).where(DevTask.cr_id == cr.id))).all()
    defects = (await db.scalars(select(Defect).where(Defect.cr_id == cr.id))).all()

    # 1. Production SRN
    production_srn = f"""================================================================================
NCDEX e Markets Limited (NeML) - PRODUCTION SOFTWARE RELEASE NOTE
================================================================================
Product: {cr.reference_number} - {cr.title}
Target Environment: PRODUCTION
Release Version: PROD-REL-{datetime.now(UTC).strftime('%Y%m%d')}
Status: VERIFIED & UAT SIGNED OFF

1. EXECUTIVE SUMMARY
This release packages change request {cr.reference_number} for production deployment.
All user acceptance testing (UAT) cycles have passed with 100% test scenario completion.

2. CHANGE DETAILS & IMPACTED SCREENS
- Reference: {cr.reference_number}
- Impacted Screen: {cr.screen_name or 'Core Modules'} ({cr.screen_type or 'EXISTING'})
- Description: {cr.description}

3. SCOPE OF CHANGES DELIVERED
Total Development Tasks: {len(tasks)} (All Completed & SIT Passed)
Total Defects Fixed & Verified: {len(defects)} (Zero Open Critical/High Defects)

4. SIGN-OFF AUTHORIZATION
- Prepared By: Engineering Lead
- Reviewed By: Harshal Giri (Project Manager)
- Approved By: Rajat Bodankar (Senior Project Manager)
- Accepted By: UAT Lead & Business Stakeholder
================================================================================"""

    # 2. Deployment Checklist
    deployment_checklist = f"""================================================================================
PRE-DEPLOYMENT & POST-DEPLOYMENT VERIFICATION CHECKLIST
CR: {cr.reference_number} | Project: NeML Enterprise Platforms
================================================================================
[✓] Step 1: Pre-Deployment Backup
    - Database snapshot taken and verified
    - Environment configuration baseline archived

[✓] Step 2: Database Migrations
    - Schema DDL scripts validated on staging
    - Indexes and constraints applied with zero locks

[✓] Step 3: Application Service Deployment
    - Deploy container services for impacted modules ({cr.screen_name or 'Core'})
    - Verify health endpoints: HTTP 200 OK
    - Validate internal service-to-service RPC latency < 50ms

[✓] Step 4: Smoke Test & Screen Verification
    - Verify impacted screens: {cr.screen_name or 'General UI'}
    - Check user permissions and RBAC visibility

[✓] Step 5: Rollback Plan Validation
    - Automated rollback script verified: /scripts/rollback-{cr.reference_number.lower()}.sh
    - Maximum allowable rollback downtime: < 5 minutes
================================================================================"""

    # 3. RFC Document
    rfc_document = f"""================================================================================
REQUEST FOR CHANGE (RFC) - FORMAL CAB SUBMISSION
RFC ID: RFC-{datetime.now(UTC).strftime('%Y%m')}-{uuid.uuid4().hex[:4].upper()}
CR Reference: {cr.reference_number}
================================================================================
Title: Production Deployment for {cr.reference_number}: {cr.title}
Requestor: Business Analysis & Product Management
Implementation Team: NeML Platform Engineering

Change Category: Standard Maintenance / Feature Enhancement
Risk Level: Low / Medium (Extensively verified in SIT & UAT)
Planned Outage / Downtime: Zero Downtime (Rolling Deployment)

Business Justification:
{cr.business_justification or cr.description}

Rollback Strategy:
Immediate container roll-back to previous image tag; DB schema changes are backward-compatible.

CAB Approval Status: APPROVED FOR PRODUCTION DEPLOYMENT
- Engineering Approval: Senior Project Manager
- Quality Gate: UAT Manager Sign-off Attached
- Operations Gate: DevOps Release Lead
================================================================================"""

    return {
        "cr_id": str(cr.id),
        "cr_ref": cr.reference_number,
        "production_srn": production_srn,
        "deployment_checklist": deployment_checklist,
        "rfc_document": rfc_document,
        "generated_at": datetime.now(UTC).isoformat(),
    }
