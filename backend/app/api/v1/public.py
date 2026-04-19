"""
공개 고객 예약 API — 로그인 없이 접근 가능한 고객용 예약 엔드포인트
"""
from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, or_, text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.customer import Customer
from app.models.golf import GolfCourse, GolfTeetime
from app.models.package import Package
from app.models.resort import Room, RoomReservation

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/golf/courses")
def list_public_courses(db: Session = Depends(get_db)):
    courses = db.query(GolfCourse).filter(GolfCourse.status == "open").order_by(GolfCourse.name).all()
    course_info = {
        "마운틴": {"desc": "산 전망의 편안한 9홀 코스", "price": 320000, "difficulty": "★★☆"},
        "오션": {"desc": "동해를 바라보는 시원한 9홀 코스", "price": 380000, "difficulty": "★★★"},
        "레전드": {"desc": "설해원 플래그십 18홀 프리미엄 코스", "price": 450000, "difficulty": "★★★★"},
    }
    return [
        {
            "id": str(c.id),
            "name": c.name,
            "holes": c.holes,
            "par": c.par,
            "description": course_info.get(c.name, {}).get("desc", ""),
            "price_per_person": course_info.get(c.name, {}).get("price", 350000),
            "difficulty": course_info.get(c.name, {}).get("difficulty", "★★★"),
        }
        for c in courses
    ]


@router.get("/golf/available-slots")
def available_slots(
    tee_date: date,
    course_id: UUID | None = None,
    db: Session = Depends(get_db),
):
    """특정 날짜/코스의 예약 가능한 티타임 조회"""
    q = db.query(GolfTeetime).filter(
        GolfTeetime.tee_date == tee_date,
        GolfTeetime.status == "available",
    )
    if course_id:
        q = q.filter(GolfTeetime.course_id == course_id)
    slots = q.order_by(GolfTeetime.tee_time).all()
    return [
        {
            "id": str(s.id),
            "course_id": str(s.course_id),
            "tee_time": s.tee_time.strftime("%H:%M"),
            "party_size": s.party_size,
        }
        for s in slots
    ]


@router.get("/golf/availability")
def golf_monthly_availability(
    month: str = Query(..., description="YYYY-MM"),
    course_id: UUID | None = None,
    db: Session = Depends(get_db),
):
    """월별 날짜-코스별 가용 슬롯 수 집계"""
    year, mon = int(month.split("-")[0]), int(month.split("-")[1])
    start = date(year, mon, 1)
    end = date(year + (1 if mon == 12 else 0), (mon % 12) + 1, 1)

    q = db.query(
        GolfTeetime.tee_date,
        func.count(GolfTeetime.id).filter(GolfTeetime.status == "available").label("available"),
        func.count(GolfTeetime.id).label("total"),
    ).filter(GolfTeetime.tee_date >= start, GolfTeetime.tee_date < end)

    if course_id:
        q = q.filter(GolfTeetime.course_id == course_id)

    rows = q.group_by(GolfTeetime.tee_date).all()

    result: dict[str, dict[str, int]] = {}
    for d, available, total in rows:
        result[str(d)] = {"available": int(available or 0), "total": int(total or 0)}
    return result


@router.get("/rooms/availability")
def room_monthly_availability(
    month: str = Query(..., description="YYYY-MM"),
    db: Session = Depends(get_db),
):
    """월별 날짜별 가용 객실 수 집계.
    각 날짜를 순회하며 활성 예약과 overlap 카운팅을 SQL GENERATE_SERIES + JOIN으로
    한 번에 처리 — Python 루프(O(days × reservations)) 대비 훨씬 빠름."""
    year, mon = int(month.split("-")[0]), int(month.split("-")[1])
    start = date(year, mon, 1)
    end = date(year + (1 if mon == 12 else 0), (mon % 12) + 1, 1)

    total_rooms = db.query(Room).filter(Room.status == "available").count()

    # PostgreSQL GENERATE_SERIES로 일자별 점유 수 한 번에 계산
    sql = text("""
        SELECT d::date AS day,
               COUNT(r.id) FILTER (
                   WHERE r.status IN ('pending', 'confirmed', 'checked_in')
                   AND r.check_in <= d::date
                   AND r.check_out > d::date
               ) AS occupied
        FROM generate_series(:start, :end - INTERVAL '1 day', '1 day') d
        LEFT JOIN room_reservations r ON TRUE
        GROUP BY d
        ORDER BY d
    """)
    rows = db.execute(sql, {"start": start, "end": end}).fetchall()

    result: dict[str, dict[str, int]] = {}
    for row in rows:
        day, occupied = row[0], int(row[1] or 0)
        result[str(day)] = {
            "available": max(0, total_rooms - occupied),
            "total": total_rooms,
        }
    return result


@router.get("/rooms")
def list_public_rooms(db: Session = Depends(get_db)):
    """예약 가능한 객실 목록 (건물+룸타입별 대표 1개씩)"""
    rooms = db.query(Room).filter(Room.status == "available").all()

    # Group by building + room_type
    by_type: dict[tuple[str, str], Room] = {}
    for r in rooms:
        key = (r.building, r.room_type)
        if key not in by_type:
            by_type[key] = r

    result = []
    desc_map = {
        ("마운틴스테이", "풀스위트"): "산 전망의 최고급 스위트 · 4인",
        ("마운틴스테이", "스파스위트"): "프라이빗 스파가 포함된 스위트 · 2인",
        ("마운틴스테이", "디럭스"): "편안한 디럭스 룸 · 2인",
        ("설해온천", "레귤러"): "온천 이용 가능 · 2인",
        ("설해온천", "디럭스"): "온천 객실 디럭스 · 2인",
        ("골프텔", "레귤러"): "골프장 바로 옆 숙소 · 2인",
    }

    for (building, rtype), room in by_type.items():
        result.append({
            "id": str(room.id),
            "building": building,
            "room_type": rtype,
            "capacity": room.capacity,
            "base_price": int(room.base_price),
            "description": desc_map.get((building, rtype), "편안한 객실"),
        })
    return result


@router.get("/packages")
def list_public_packages(db: Session = Depends(get_db)):
    packages = db.query(Package).filter(Package.is_active.is_(True)).all()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "description": p.description,
            "base_price": int(p.base_price or 0),
            "components": p.components,
            "target_segment": p.target_segment,
        }
        for p in packages
    ]


class GolfReservationRequest(BaseModel):
    name: str
    phone: str
    email: str | None = None
    teetime_id: str
    party_size: int = Field(ge=1, le=4)
    notes: str | None = None


@router.post("/reserve/golf", status_code=201)
def reserve_golf(body: GolfReservationRequest, db: Session = Depends(get_db)):
    """고객 골프 예약 — 관리자 확정 대기(status='pending')로 저장."""
    from app.models.analytics import AiActionLog
    # Find or create customer by phone
    cust = db.query(Customer).filter(Customer.phone == body.phone).first()
    if not cust:
        cust = Customer(
            name=body.name,
            phone=body.phone,
            email=body.email,
            grade="member",
        )
        db.add(cust)
        db.flush()

    # Find and lock the teetime
    tt = db.query(GolfTeetime).filter(GolfTeetime.id == UUID(body.teetime_id)).first()
    if not tt:
        raise HTTPException(404, "Teetime not found")
    if tt.status != "available":
        raise HTTPException(409, "이미 예약된 시간입니다.")

    tt.customer_id = cust.id
    tt.party_size = body.party_size
    tt.notes = body.notes
    tt.status = "pending"  # 관리자 확정 전
    from datetime import datetime, timezone, timedelta
    tt.booked_at = datetime.now(timezone(timedelta(hours=9)))

    # 관리자 알림용 로그 생성
    course = db.query(GolfCourse).filter(GolfCourse.id == tt.course_id).first()
    db.add(AiActionLog(
        action_type="pending_reservation",
        target_customer_id=cust.id,
        payload={
            "kind": "golf",
            "teetime_id": str(tt.id),
            "tee_date": str(tt.tee_date),
            "tee_time": tt.tee_time.strftime("%H:%M"),
            "course_name": course.name if course else None,
            "party_size": body.party_size,
            "customer_name": cust.name,
            "customer_phone": cust.phone,
            "notes": body.notes,
        },
        status="pending",
        created_by="customer",
    ))

    db.commit()
    db.refresh(tt)
    return {
        "id": str(tt.id),
        "customer_id": str(cust.id),
        "tee_date": str(tt.tee_date),
        "tee_time": tt.tee_time.strftime("%H:%M"),
        "party_size": tt.party_size,
        "status": "pending",
    }


class RoomReservationRequest(BaseModel):
    name: str
    phone: str
    email: str | None = None
    room_id: str
    check_in: date
    check_out: date
    guest_count: int = Field(ge=1, le=4)
    special_requests: str | None = None


@router.post("/reserve/room", status_code=201)
def reserve_room(body: RoomReservationRequest, db: Session = Depends(get_db)):
    """고객 객실 예약"""
    if body.check_out <= body.check_in:
        raise HTTPException(400, "체크아웃 날짜가 체크인보다 이후여야 합니다.")

    cust = db.query(Customer).filter(Customer.phone == body.phone).first()
    if not cust:
        cust = Customer(
            name=body.name,
            phone=body.phone,
            email=body.email,
            grade="member",
        )
        db.add(cust)
        db.flush()

    room = db.query(Room).filter(Room.id == UUID(body.room_id)).first()
    if not room:
        raise HTTPException(404, "Room not found")

    # Check availability
    from sqlalchemy import and_, or_
    conflict = db.query(RoomReservation).filter(
        RoomReservation.room_id == room.id,
        RoomReservation.status.in_(["pending", "confirmed", "checked_in"]),
        or_(
            and_(RoomReservation.check_in <= body.check_in, RoomReservation.check_out > body.check_in),
            and_(RoomReservation.check_in < body.check_out, RoomReservation.check_out >= body.check_out),
            and_(RoomReservation.check_in >= body.check_in, RoomReservation.check_out <= body.check_out),
        ),
    ).first()

    if conflict:
        raise HTTPException(409, "해당 기간에 이미 예약된 객실입니다.")

    nights = (body.check_out - body.check_in).days
    total = int(room.base_price) * nights

    res = RoomReservation(
        room_id=room.id,
        customer_id=cust.id,
        check_in=body.check_in,
        check_out=body.check_out,
        status="pending",  # 관리자 확정 전
        total_price=total,
        special_requests=body.special_requests,
    )
    db.add(res)
    db.flush()

    # 관리자 알림용 로그 생성
    from app.models.analytics import AiActionLog
    db.add(AiActionLog(
        action_type="pending_reservation",
        target_customer_id=cust.id,
        payload={
            "kind": "room",
            "reservation_id": str(res.id),
            "room_id": str(room.id),
            "building": room.building,
            "room_type": room.room_type,
            "room_number": room.room_number,
            "check_in": str(body.check_in),
            "check_out": str(body.check_out),
            "nights": nights,
            "total_price": total,
            "guest_count": body.guest_count,
            "customer_name": cust.name,
            "customer_phone": cust.phone,
            "special_requests": body.special_requests,
        },
        status="pending",
        created_by="customer",
    ))
    db.commit()
    db.refresh(res)
    return {
        "id": str(res.id),
        "customer_id": str(cust.id),
        "room_type": room.room_type,
        "building": room.building,
        "check_in": str(res.check_in),
        "check_out": str(res.check_out),
        "total_price": int(res.total_price),
        "nights": nights,
    }
