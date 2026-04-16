from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.analytics import AiActionLog, DailyStat
from app.models.customer import Customer

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/kpi")
def get_kpi(
    period: str = Query("monthly"),
    db: Session = Depends(get_db),
):
    today = date.today()
    if period == "monthly":
        start = today.replace(day=1)
    else:
        start = today - timedelta(days=7)

    stats = db.query(DailyStat).filter(DailyStat.stat_date >= start, DailyStat.stat_date <= today).all()

    total_revenue = sum(int(s.total_revenue or 0) for s in stats)
    total_rounds = sum(int(s.golf_rounds or 0) for s in stats)
    avg_occupancy = (
        sum(float(s.room_occupancy_rate or 0) for s in stats) / len(stats)
        if stats else 0
    )

    return {
        "revenue": total_revenue,
        "golf_rounds": total_rounds,
        "occupancy_rate": round(avg_occupancy, 2),
        "period": period,
        "days": len(stats),
    }


@router.get("/revenue")
def get_revenue(
    start: date = Query(alias="from"),
    end: date = Query(alias="to"),
    db: Session = Depends(get_db),
):
    stats = (
        db.query(DailyStat)
        .filter(DailyStat.stat_date >= start, DailyStat.stat_date <= end)
        .order_by(DailyStat.stat_date)
        .all()
    )
    return [
        {
            "date": str(s.stat_date),
            "golf": int(s.golf_revenue or 0),
            "room": int(s.room_revenue or 0),
            "fnb": int(s.fnb_revenue or 0),
            "oncheon": int(s.oncheon_revenue or 0),
            "total": int(s.total_revenue or 0),
        }
        for s in stats
    ]


@router.get("/customer-stats")
def get_customer_stats(db: Session = Depends(get_db)):
    rows = db.query(Customer.grade, func.count()).group_by(Customer.grade).all()
    return {grade: count for grade, count in rows}


@router.get("/ai-actions/recent")
def get_recent_ai_actions(db: Session = Depends(get_db)):
    actions = (
        db.query(AiActionLog)
        .order_by(AiActionLog.created_at.desc())
        .limit(10)
        .all()
    )
    return [
        {
            "id": str(a.id),
            "type": a.action_type,
            "target_customer_id": str(a.target_customer_id) if a.target_customer_id else None,
            "status": a.status,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in actions
    ]
