"""
Parent Dashboard Controller

Responsibility: Orchestrates parent dashboard endpoint logic.
Layer: Controller
Domain: Parent Dashboard
"""

from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from controllers.controller_guard import guarded_controller_call
from models.user import User
from schemas.parent_dashboard_schema import (
    BulkDeleteRequest,
    BulkDeleteResponse,
    ControlAuditResponse,
    HistoryExportResponse,
    ChildPauseResponse,
    NotificationPrefsRead,
    NotificationPrefsUpdate,
    ParentHistoryResponse,
    ParentOverviewResponse,
    ParentProgressResponse,
)
from services.parent_dashboard_service import ParentDashboardService


async def get_overview_controller(
    child_id: UUID,
    current_user: User,
    db: Session,
) -> ParentOverviewResponse:
    return await guarded_controller_call(
        operation="fetching parent overview",
        context={"parent_id": current_user.id, "child_id": child_id},
        func=lambda: ParentDashboardService(db).get_overview(child_id, current_user.id),
    )


async def get_progress_controller(
    child_id: UUID,
    current_user: User,
    db: Session,
) -> ParentProgressResponse:
    return await guarded_controller_call(
        operation="fetching parent progress",
        context={"parent_id": current_user.id, "child_id": child_id},
        func=lambda: ParentDashboardService(db).get_progress(child_id, current_user.id),
    )


async def get_history_controller(
    child_id: UUID,
    current_user: User,
    db: Session,
    *,
    flagged_only: bool = False,
    limit: int = 20,
    offset: int = 0,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> ParentHistoryResponse:
    return await guarded_controller_call(
        operation="fetching parent history",
        context={"parent_id": current_user.id, "child_id": child_id},
        func=lambda: ParentDashboardService(db).get_history(
            child_id=child_id,
            parent_id=current_user.id,
            flagged_only=flagged_only,
            limit=limit,
            offset=offset,
            date_from=date_from,
            date_to=date_to,
        ),
    )


async def bulk_delete_sessions_controller(
    child_id: UUID,
    current_user: User,
    db: Session,
    payload: BulkDeleteRequest,
) -> BulkDeleteResponse:
    return await guarded_controller_call(
        operation="bulk deleting session history",
        context={"parent_id": current_user.id, "child_id": child_id},
        func=lambda: ParentDashboardService(db).bulk_delete_sessions(
            child_id=child_id,
            parent_id=current_user.id,
            session_ids=payload.session_ids,
        ),
    )


async def export_history_controller(
    child_id: UUID,
    current_user: User,
    db: Session,
    export_format: str = "json",
) -> HistoryExportResponse:
    return await guarded_controller_call(
        operation="exporting session history",
        context={"parent_id": current_user.id, "child_id": child_id},
        func=lambda: ParentDashboardService(db).export_history(
            child_id=child_id,
            parent_id=current_user.id,
            export_format=export_format,
        ),
    )


async def pause_child_controller(
    child_id: UUID,
    current_user: User,
    db: Session,
) -> ChildPauseResponse:
    return await guarded_controller_call(
        operation="pausing child access",
        context={"parent_id": current_user.id, "child_id": child_id},
        func=lambda: ParentDashboardService(db).pause_child(child_id, current_user.id),
    )


async def resume_child_controller(
    child_id: UUID,
    current_user: User,
    db: Session,
) -> ChildPauseResponse:
    return await guarded_controller_call(
        operation="resuming child access",
        context={"parent_id": current_user.id, "child_id": child_id},
        func=lambda: ParentDashboardService(db).resume_child(child_id, current_user.id),
    )


async def get_notification_prefs_controller(
    current_user: User,
    db: Session,
) -> NotificationPrefsRead:
    return await guarded_controller_call(
        operation="fetching notification preferences",
        context={"parent_id": current_user.id},
        func=lambda: ParentDashboardService(db).get_notification_prefs(current_user.id),
    )


async def update_notification_prefs_controller(
    current_user: User,
    db: Session,
    payload: NotificationPrefsUpdate,
) -> NotificationPrefsRead:
    return await guarded_controller_call(
        operation="updating notification preferences",
        context={"parent_id": current_user.id},
        func=lambda: ParentDashboardService(db).update_notification_prefs(current_user.id, payload),
    )


async def get_control_audit_controller(
    current_user: User,
    db: Session,
    *,
    child_id: UUID | None = None,
    limit: int = 20,
    offset: int = 0,
) -> ControlAuditResponse:
    return await guarded_controller_call(
        operation="fetching control audit log",
        context={"parent_id": current_user.id, "child_id": child_id},
        func=lambda: ParentDashboardService(db).get_control_audit(
            parent_id=current_user.id,
            child_id=child_id,
            limit=limit,
            offset=offset,
        ),
    )
