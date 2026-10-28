import uuid
from datetime import date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import Deployment, Project, Release, ReleaseItem, User
from app.services.deployment_service import (
    DeploymentServiceError,
    confirm_uat_deployment,
)

router = APIRouter()
DbSession = Annotated[AsyncSession, Depends(get_db)]


async def active_actor(
    db: DbSession,
    actor_id: Annotated[uuid.UUID | None, Header(alias="X-Actor-Id")] = None,
) -> User:
    if actor_id:
        actor = await db.get(User, actor_id)
        if actor and actor.is_active:
            return actor
    actor = await db.scalar(select(User).where(User.is_active.is_(True)).order_by(User.employee_code.asc()).limit(1))
    if not actor:
        raise HTTPException(status_code=401, detail="No active actor")
    return actor


class ReleaseCreate(BaseModel):
    version: str = Field(min_length=2, max_length=64)
    title: str = Field(min_length=5, max_length=240)
    environment: str = Field(default="UAT", pattern=r"^(UAT|PROD)$")
    project_id: uuid.UUID | None = None
    planned_date: date | None = None
    release_notes: str = Field(default="", max_length=5_000)


class DeploymentConfirmRequest(BaseModel):
    evidence: str = Field(default="", max_length=2_000)
    build_identifier: str = Field(default="", max_length=120)


@router.get("")
async def list_releases(db: DbSession) -> list[dict]:
    query = select(Release, Project, User).outerjoin(Project, Project.id == Release.project_id).outerjoin(User, User.id == Release.release_owner_id)
    rows = (await db.execute(query.order_by(Release.created_at.desc()))).all()
    results = []
    for r, p, u in rows:
        dep = await db.scalar(select(Deployment).where(Deployment.release_id == r.id).order_by(Deployment.created_at.desc()).limit(1))
        if not dep:
            dep = Deployment(
                release_id=r.id,
                environment=r.environment,
                deployment_owner_id=r.release_owner_id or (u.id if u else None),
                status="PENDING",
                build_identifier="pending-build",
                confirmation_evidence="",
                failure_reason="",
            )
            db.add(dep)
            await db.commit()
            await db.refresh(dep)
        results.append({
            "id": str(r.id),
            "release_number": r.release_number,
            "version": r.version,
            "title": r.title,
            "environment": r.environment,
            "project_name": p.name if p else "Multi-Project",
            "owner_name": u.display_name if u else "Release Team",
            "planned_date": str(r.planned_date) if r.planned_date else None,
            "status": r.status,
            "release_notes": r.release_notes,
            "deployment": {
                "id": str(dep.id),
                "status": dep.status,
                "build_identifier": dep.build_identifier,
                "confirmation_evidence": dep.confirmation_evidence,
                "completion_time": dep.completion_time.isoformat() if dep.completion_time else None,
            } if dep else None,
        })
    return results


@router.post("")
async def create_release(
    payload: ReleaseCreate,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    count = (await db.scalars(select(Release))).all()
    rel_num = f"REL-{date.today().strftime('%Y-%m')}-{len(count) + 1:02d}"

    rel = Release(
        release_number=rel_num,
        version=payload.version,
        title=payload.title,
        environment=payload.environment,
        project_id=payload.project_id,
        release_owner_id=actor.id,
        planned_date=payload.planned_date,
        status="PLANNED",
        release_notes=payload.release_notes,
    )
    db.add(rel)
    await db.flush()

    # Create associated pending deployment record
    dep = Deployment(
        release_id=rel.id,
        environment=payload.environment,
        deployment_owner_id=actor.id,
        status="PENDING",
    )
    db.add(dep)
    await db.commit()
    await db.refresh(rel)
    return {"id": str(rel.id), "release_number": rel.release_number, "version": rel.version, "deployment_id": str(dep.id)}


@router.get("/deployments")
async def list_deployments(db: DbSession) -> list[dict]:
    query = (
        select(Deployment, Release, User)
        .join(Release, Release.id == Deployment.release_id)
        .join(User, User.id == Deployment.deployment_owner_id)
    )
    rows = (await db.execute(query.order_by(Deployment.created_at.desc()))).all()
    results = []
    for d, r, u in rows:
        results.append({
            "id": str(d.id),
            "release_id": str(r.id),
            "release_version": r.version,
            "release_title": r.title,
            "environment": d.environment,
            "owner_name": u.display_name,
            "status": d.status,
            "build_identifier": d.build_identifier,
            "confirmation_evidence": d.confirmation_evidence,
            "completion_time": d.completion_time.isoformat() if d.completion_time else None,
            "created_at": d.created_at.isoformat(),
        })
    return results


@router.post("/deployments/{deployment_id}/confirm")
async def confirm_deployment_action(
    deployment_id: uuid.UUID,
    payload: DeploymentConfirmRequest,
    db: DbSession,
    actor: Annotated[User, Depends(active_actor)],
) -> dict:
    """Crucial Business Rule: Confirms UAT deployment and transitions fixed bugs to UAT_DEPLOYED and READY_FOR_RETEST."""
    try:
        return await confirm_uat_deployment(
            db=db,
            deployment_id=deployment_id,
            actor_id=actor.id,
            evidence=payload.evidence,
            build_identifier=payload.build_identifier,
        )
    except DeploymentServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
