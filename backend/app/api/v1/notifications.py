"""
관리자 알림 API — 고객이 예약을 걸면 AiActionLog에 'pending_reservation'으로
기록되고, 관리자는 /notifications/pending 으로 목록을 받아 확정/거절한다.
"""
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.analytics import AiActionLog
from app.models.customer import Customer
from app.models.golf import GolfTeetime
from app.models.resort import RoomReservation
from app.models.staff import Staff

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/count")
def unread_count(
    _: Staff = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """폴링용 — 미처리 알림 수만 반환 (가벼운 쿼리)."""
    count = (
        db.query(AiActionLog)
        .filter(
            AiActionLog.action_type == "pending_reservation",
            AiActionLog.status == "pending",
        )
        .count()
    )
    return {"pending": count}


@router.get("/pending")
def list_pending(
    _: Staff = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """미처리 고객 예약 알림 목록."""
    logs = (
        db.query(AiActionLog)
        .filter(
            AiActionLog.action_type == "pending_reservation",
            AiActionLog.status == "pending",
        )
        .order_by(AiActionLog.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": str(log.id),
            "created_at": log.created_at.isoformat() if log.created_at else None,
            "kind": (log.payload or {}).get("kind"),
            "customer_id": str(log.target_customer_id) if log.target_customer_id else None,
            "payload": log.payload or {},
        }
        for log in logs
    ]


@router.post("/{action_id}/confirm")
def confirm_notification(
    action_id: UUID,
    _: Staff = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """예약 확정: AiActionLog.status='approved' + 실제 예약 상태도 확정으로 전환."""
    log = db.query(AiActionLog).filter(AiActionLog.id == action_id).first()
    if not log:
        raise HTTPException(404, "Notification not found")
    if log.action_type != "pending_reservation":
        raise HTTPException(400, "Not a pending reservation")

    payload = log.payload or {}
    kind = payload.get("kind")
    now = datetime.now(timezone.utc).isoformat()

    if kind == "golf":
        tt_id = payload.get("teetime_id")
        if tt_id:
            tt = db.query(GolfTeetime).filter(GolfTeetime.id == UUID(tt_id)).first()
            if tt:
                tt.status = "reserved"
    elif kind == "room":
        res_id = payload.get("reservation_id")
        if res_id:
            res = db.query(RoomReservation).filter(RoomReservation.id == UUID(res_id)).first()
            if res:
                res.status = "confirmed"

    log.status = "approved"
    log.result = {"confirmed_at": now}
    db.commit()
    return {"ok": True, "action_id": str(log.id), "kind": kind}


@router.post("/{action_id}/reject")
def reject_notification(
    action_id: UUID,
    _: Staff = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """예약 거절: AiActionLog.status='dismissed' + 실제 예약 취소."""
    log = db.query(AiActionLog).filter(AiActionLog.id == action_id).first()
    if not log:
        raise HTTPException(404, "Notification not found")
    if log.action_type != "pending_reservation":
        raise HTTPException(400, "Not a pending reservation")

    payload = log.payload or {}
    kind = payload.get("kind")
    now = datetime.now(timezone.utc).isoformat()

    if kind == "golf":
        tt_id = payload.get("teetime_id")
        if tt_id:
            tt = db.query(GolfTeetime).filter(GolfTeetime.id == UUID(tt_id)).first()
            if tt:
                tt.status = "available"
                tt.customer_id = None
                tt.party_size = 4
                tt.booked_at = None
                tt.notes = None
    elif kind == "room":
        res_id = payload.get("reservation_id")
        if res_id:
            res = db.query(RoomReservation).filter(RoomReservation.id == UUID(res_id)).first()
            if res:
                res.status = "cancelled"

    log.status = "dismissed"
    log.result = {"rejected_at": now}
    db.commit()
    return {"ok": True, "action_id": str(log.id), "kind": kind}
