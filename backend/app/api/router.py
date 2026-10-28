from fastapi import APIRouter

from app.api.routes import (
    auth,
    change_requests,
    dashboard,
    defects,
    dev_tasks,
    health,
    notifications,
    projects,
    releases,
    reports,
    sit,
    srn,
    uat,
    users,
    work_items,
    zoho,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["authentication & sso"])
api_router.include_router(health.router, tags=["health"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects, modules and screens"])
api_router.include_router(work_items.router, prefix="/work-items", tags=["work items"])
api_router.include_router(change_requests.router, prefix="/change-requests", tags=["change requests"])
api_router.include_router(dev_tasks.router, prefix="/dev-tasks", tags=["development tasks"])
api_router.include_router(sit.router, prefix="/sit", tags=["SIT testing"])
api_router.include_router(defects.router, prefix="/defects", tags=["defects and bug tracking"])
api_router.include_router(srn.router, prefix="/srn", tags=["SRN and release notes"])
api_router.include_router(releases.router, prefix="/releases", tags=["releases and deployments"])
api_router.include_router(uat.router, prefix="/uat", tags=["UAT testing"])
api_router.include_router(users.router, tags=["organization and projects"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports and management analytics"])
api_router.include_router(zoho.router, prefix="/zoho", tags=["zoho integration"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
