from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.analytics import AiActionLog
from app.models.customer import Customer
from app.models.golf import GolfTeetime
from app.models.resort import RoomReservation

router = APIRouter(prefix="/customers", tags=["customers"])


class CustomerCreate(BaseModel):
    name: str
    phone: str
    email: str | None = None
    grade: str = "member"


class CustomerUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: str | None = None
    grade: str | None = None
    preferences: dict | None = None


@router.get("")
def list_customers(
    grade: str | None = Query(None),
    sort: str = Query("-clv"),
    search: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: Session = Depends(get_db),
):
    q = db.query(Customer)

    if grade:
        q = q.filter(Customer.grade == grade)
    if search:
        q = q.filter(Customer.name.ilike(f"%{search}%") | Customer.phone.ilike(f"%{search}%"))

    # Sorting
    if sort.startswith("-"):
        col = getattr(Customer, sort[1:], Customer.clv)
        q = q.order_by(col.desc())
    else:
        col = getattr(Customer, sort, Customer.clv)
        q = q.order_by(col.asc())

    total = q.count()
    customers = q.offset(offset).limit(limit).all()

    return {
        "total": total,
        "items": [
            {
                "id": str(c.id),
                "name": c.name,
                "phone": c.phone,
                "email": c.email,
                "grade": c.grade,
                "clv": int(c.clv or 0),
                "churn_risk": float(c.churn_risk or 0),
                "total_visits": c.total_visits,
                "last_visit_at": c.last_visit_at.isoformat() if c.last_visit_at else None,
                "ai_tags": c.ai_tags or [],
            }
            for c in customers
        ],
    }


@router.get("/{customer_id}")
def get_customer(customer_id: UUID, db: Session = Depends(get_db)):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")
    return {
        "id": str(c.id),
        "name": c.name,
        "phone": c.phone,
        "email": c.email,
        "grade": c.grade,
        "clv": int(c.clv or 0),
        "churn_risk": float(c.churn_risk or 0),
        "total_visits": c.total_visits,
        "last_visit_at": c.last_visit_at.isoformat() if c.last_visit_at else None,
        "ai_tags": c.ai_tags or [],
        "ai_memo": c.ai_memo or [],
        "preferences": c.preferences or {},
    }


@router.get("/{customer_id}/visits")
def get_customer_visits(
    customer_id: UUID,
    limit: int = Query(20),
    db: Session = Depends(get_db),
):
    """고객 방문 이력 (골프 + 객실)"""
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")

    from app.models.golf import GolfCourse
    from app.models.resort import Room

    golf_visits = (
        db.query(GolfTeetime, GolfCourse)
        .join(GolfCourse, GolfTeetime.course_id == GolfCourse.id)
        .filter(GolfTeetime.customer_id == customer_id)
        .filter(GolfTeetime.status.in_(["completed", "reserved"]))
        .order_by(GolfTeetime.tee_date.desc())
        .limit(limit)
        .all()
    )
    room_visits = (
        db.query(RoomReservation, Room)
        .join(Room, RoomReservation.room_id == Room.id)
        .filter(RoomReservation.customer_id == customer_id)
        .order_by(RoomReservation.check_in.desc())
        .limit(limit)
        .all()
    )

    visits = []
    for tt, course in golf_visits:
        visits.append({
            "date": str(tt.tee_date),
            "type": "golf",
            "label": f"{course.name}코스 라운딩",
            "amount": 380000 if course.name == "오션" else 450000 if course.name == "레전드" else 320000,
        })
    for res, room in room_visits:
        visits.append({
            "date": str(res.check_in),
            "type": "room",
            "label": f"{room.building} {room.room_type}",
            "amount": int(res.total_price or room.base_price),
        })

    visits.sort(key=lambda v: v["date"], reverse=True)
    return visits[:limit]


@router.get("/{customer_id}/spending")
def get_customer_spending(
    customer_id: UUID,
    db: Session = Depends(get_db),
):
    """고객 연도별 소비 트렌드"""
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")

    from sqlalchemy import extract

    from app.models.golf import GolfCourse
    from app.models.resort import Room

    golf_rows = (
        db.query(
            extract("year", GolfTeetime.tee_date).label("yr"),
            GolfCourse.name,
            func.count().label("cnt"),
        )
        .join(GolfCourse, GolfTeetime.course_id == GolfCourse.id)
        .filter(GolfTeetime.customer_id == customer_id)
        .filter(GolfTeetime.status.in_(["completed", "reserved"]))
        .group_by("yr", GolfCourse.name)
        .all()
    )

    room_rows = (
        db.query(
            extract("year", RoomReservation.check_in).label("yr"),
            func.sum(RoomReservation.total_price).label("total"),
        )
        .filter(RoomReservation.customer_id == customer_id)
        .group_by("yr")
        .all()
    )

    years: dict[str, dict[str, int]] = {}
    price_map = {"오션": 380000, "레전드": 450000, "마운틴": 320000}

    for yr, name, cnt in golf_rows:
        y = str(int(yr))
        if y not in years:
            years[y] = {"golf": 0, "room": 0, "fnb": 0, "oncheon": 0}
        years[y]["golf"] += price_map.get(name, 350000) * int(cnt)

    for yr, total in room_rows:
        y = str(int(yr))
        if y not in years:
            years[y] = {"golf": 0, "room": 0, "fnb": 0, "oncheon": 0}
        years[y]["room"] += int(total or 0)

    # estimate F&B and oncheon as fraction of golf/room
    for y in years:
        years[y]["fnb"] = int(years[y]["golf"] * 0.3)
        years[y]["oncheon"] = int(years[y]["room"] * 0.1)

    return [{"year": y, **years[y]} for y in sorted(years.keys())]


@router.get("/{customer_id}/ai-actions")
def get_customer_ai_actions(
    customer_id: UUID,
    limit: int = Query(10),
    db: Session = Depends(get_db),
):
    """고객 관련 AI 추천 액션"""
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")

    actions = (
        db.query(AiActionLog)
        .filter(AiActionLog.target_customer_id == customer_id)
        .order_by(AiActionLog.created_at.desc())
        .limit(limit)
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
    impact_map = {
        "noshow_alert": "노쇼 방지",
        "upsell": "₩350,000",
        "churn_prevention": "이탈 방지",
        "package_recommend": "₩1,500,000",
        "pricing": "매출 최적화",
        "briefing": "운영 효율",
    }

    return [
        {
            "id": str(a.id),
            "type": type_label.get(a.action_type, a.action_type),
            "detail": a.payload.get("reason", "") if a.payload else "",
            "impact": impact_map.get(a.action_type, ""),
            "status": a.status,
        }
        for a in actions
    ]


@router.post("", status_code=201)
def create_customer(body: CustomerCreate, db: Session = Depends(get_db)):
    customer = Customer(**body.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return {"id": str(customer.id)}


@router.patch("/{customer_id}")
def update_customer(customer_id: UUID, body: CustomerUpdate, db: Session = Depends(get_db)):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")
    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(c, field, val)
    db.commit()
    return {"ok": True}
