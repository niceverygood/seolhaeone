import time
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.analytics import AiActionLog, DailyStat
from app.models.customer import Customer

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


# ─── 프로세스 내 TTL 캐시 ────────────────────────────────────────────
# 관리자 전원이 공유 가능한(민감하지 않은) 집계값만 캐시.
# Vercel 서버리스 인스턴스가 warm일 동안 반복 호출을 DB 없이 응답.
_CACHE: dict[str, tuple[float, object]] = {}


def _cached(key: str, ttl: float, loader):
    now = time.time()
    hit = _CACHE.get(key)
    if hit and now - hit[0] < ttl:
        return hit[1]
    value = loader()
    _CACHE[key] = (now, value)
    return value


def _set_cache_headers(response: Response, max_age: int) -> None:
    # 브라우저·CDN이 stale-while-revalidate로 즉시 이전 응답 반환 후 백그라운드 갱신
    response.headers["Cache-Control"] = (
        f"private, max-age={max_age}, stale-while-revalidate={max_age * 4}"
    )


@router.get("/kpi")
def get_kpi(
    response: Response,
    period: str = Query("monthly"),
    db: Session = Depends(get_db),
):
    _set_cache_headers(response, 60)

    def compute():
        today = date.today()
        if period == "monthly":
            start = today.replace(day=1)
        else:
            start = today - timedelta(days=7)

        days_count = (today - start).days + 1
        prev_start = start - timedelta(days=days_count)
        prev_end = start - timedelta(days=1)

        # 현재 + 이전 기간 집계를 한 번의 쿼리로 처리 (네트워크 왕복 절반)
        rev_col = func.coalesce(func.sum(DailyStat.total_revenue), 0)
        rounds_col = func.coalesce(func.sum(DailyStat.golf_rounds), 0)
        occ_col = func.coalesce(func.avg(DailyStat.room_occupancy_rate), 0)
        cnt_col = func.count(DailyStat.id)

        cur_row = db.query(rev_col, rounds_col, occ_col, cnt_col).filter(
            DailyStat.stat_date >= start, DailyStat.stat_date <= today,
        ).one()
        prev_row = db.query(rev_col, rounds_col, occ_col, cnt_col).filter(
            DailyStat.stat_date >= prev_start, DailyStat.stat_date <= prev_end,
        ).one()

        total_revenue = int(cur_row[0] or 0)
        total_rounds = int(cur_row[1] or 0)
        avg_occupancy = float(cur_row[2] or 0)
        days = int(cur_row[3] or 0)

        prev_revenue = int(prev_row[0] or 0)
        prev_rounds = int(prev_row[1] or 0)
        prev_occupancy = float(prev_row[2] or 0)

        def delta(cur: float, prev: float) -> float:
            if prev == 0:
                return 0
            return round((cur - prev) / prev * 100, 1)

        return {
            "revenue": total_revenue,
            "golf_rounds": total_rounds,
            "occupancy_rate": round(avg_occupancy, 2),
            "revenue_delta": delta(total_revenue, prev_revenue),
            "rounds_delta": delta(total_rounds, prev_rounds),
            "occupancy_delta": round((avg_occupancy - prev_occupancy) * 100, 1),
            "period": period,
            "days": days,
        }

    return _cached(f"kpi:{period}:{date.today()}", 60, compute)


@router.get("/revenue")
def get_revenue(
    response: Response,
    start: date = Query(alias="from"),
    end: date = Query(alias="to"),
    db: Session = Depends(get_db),
):
    _set_cache_headers(response, 120)

    key = f"revenue:{start}:{end}"

    def compute():
        # 필요한 컬럼만 SELECT — ORM 객체 생성 비용 제거, 네트워크 전송량 감소
        rows = (
            db.query(
                DailyStat.stat_date,
                DailyStat.golf_revenue,
                DailyStat.room_revenue,
                DailyStat.fnb_revenue,
                DailyStat.oncheon_revenue,
                DailyStat.total_revenue,
            )
            .filter(DailyStat.stat_date >= start, DailyStat.stat_date <= end)
            .order_by(DailyStat.stat_date)
            .all()
        )
        return [
            {
                "date": str(d),
                "golf": int(g or 0),
                "room": int(r or 0),
                "fnb": int(f or 0),
                "oncheon": int(o or 0),
                "total": int(t or 0),
            }
            for d, g, r, f, o, t in rows
        ]

    return _cached(key, 120, compute)


@router.get("/customer-stats")
def get_customer_stats(response: Response, db: Session = Depends(get_db)):
    _set_cache_headers(response, 300)
    return _cached(
        "customer_stats",
        300,
        lambda: {
            grade: count
            for grade, count in db.query(Customer.grade, func.count()).group_by(Customer.grade).all()
        },
    )


@router.get("/ai-actions/recent")
def get_recent_ai_actions(db: Session = Depends(get_db)):
    actions = (
        db.query(AiActionLog, Customer)
        .outerjoin(Customer, AiActionLog.target_customer_id == Customer.id)
        .order_by(AiActionLog.created_at.desc())
        .limit(10)
        .all()
    )

    type_label = {
        "noshow_alert": "노쇼 경보",
        "upsell": "업셀 제안",
        "churn_prevention": "이탈 방지",
        "package_recommend": "패키지 추천",
        "pricing": "가격 최적화",
        "briefing": "브리핑",
    }
    status_label = {
        "pending": "대기",
        "approved": "승인",
        "executed": "실행",
        "dismissed": "무시",
    }

    return [
        {
            "id": str(a.id),
            "type": type_label.get(a.action_type, a.action_type),
            "target_customer_id": str(a.target_customer_id) if a.target_customer_id else None,
            "target_customer_name": cust.name if cust else None,
            "status": status_label.get(a.status, a.status),
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a, cust in actions
    ]
