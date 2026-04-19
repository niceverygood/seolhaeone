from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.customer import Customer
from app.models.resort import Room, RoomReservation

router = APIRouter(prefix="/resort", tags=["resort"])


class ReservationCreate(BaseModel):
    room_id: UUID
    customer_id: UUID
    check_in: date
    check_out: date
    total_price: int | None = None
    special_requests: str | None = None


@router.get("/rooms/{room_id}/detail")
def get_room_detail(room_id: UUID, db: Session = Depends(get_db)):
    """객실 상세 — 기본 정보 + 현재 점유/예정 예약 + 최근 이용 이력."""
    from datetime import date as _date, timedelta
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(404, "Room not found")

    today = _date.today()

    # 현재 점유 중 또는 대기 중인 예약 (오늘 체크인~체크아웃 범위 포함)
    current = (
        db.query(RoomReservation, Customer)
        .outerjoin(Customer, RoomReservation.customer_id == Customer.id)
        .filter(
            RoomReservation.room_id == room.id,
            RoomReservation.status.in_(["pending", "confirmed", "checked_in"]),
            RoomReservation.check_in <= today,
            RoomReservation.check_out > today,
        )
        .first()
    )
    # 다가오는 예약 (오늘 이후)
    upcoming = (
        db.query(RoomReservation, Customer)
        .outerjoin(Customer, RoomReservation.customer_id == Customer.id)
        .filter(
            RoomReservation.room_id == room.id,
            RoomReservation.status.in_(["pending", "confirmed"]),
            RoomReservation.check_in > today,
        )
        .order_by(RoomReservation.check_in)
        .limit(5)
        .all()
    )
    # 최근 이용 이력 (체크아웃 완료 + 기간 지난 것)
    past = (
        db.query(RoomReservation, Customer)
        .outerjoin(Customer, RoomReservation.customer_id == Customer.id)
        .filter(
            RoomReservation.room_id == room.id,
            RoomReservation.check_out <= today,
        )
        .order_by(RoomReservation.check_out.desc())
        .limit(10)
        .all()
    )

    def _res_row(r: RoomReservation, c: Customer | None):
        nights = (r.check_out - r.check_in).days
        return {
            "id": str(r.id),
            "status": r.status,
            "check_in": str(r.check_in),
            "check_out": str(r.check_out),
            "nights": nights,
            "total_price": int(r.total_price or 0),
            "special_requests": r.special_requests,
            "dynamic_price_applied": bool(r.dynamic_price_applied),
            "customer_id": str(c.id) if c else None,
            "customer_name": c.name if c else None,
            "customer_phone": c.phone if c else None,
            "customer_grade": c.grade if c else None,
        }

    # 최근 30일 이용률
    thirty = today - timedelta(days=30)
    recent_nights = (
        db.query(RoomReservation)
        .filter(
            RoomReservation.room_id == room.id,
            RoomReservation.status.in_(["checked_in", "checked_out"]),
            RoomReservation.check_out >= thirty,
        )
        .all()
    )
    occupied_nights = sum(
        max(0, (min(r.check_out, today) - max(r.check_in, thirty)).days)
        for r in recent_nights
    )

    return {
        "room": {
            "id": str(room.id),
            "building": room.building,
            "room_type": room.room_type,
            "room_number": room.room_number,
            "floor": room.floor,
            "capacity": room.capacity,
            "base_price": int(room.base_price or 0),
            "amenities": room.amenities or [],
            "status": room.status,
        },
        "current": _res_row(*current) if current else None,
        "upcoming": [_res_row(r, c) for r, c in upcoming],
        "past": [_res_row(r, c) for r, c in past],
        "stats_30d": {
            "occupied_nights": occupied_nights,
            "occupancy_rate": round(occupied_nights / 30, 2),
            "total_reservations": len(recent_nights),
        },
    }


@router.get("/rooms")
def list_rooms(
    building: str | None = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Room)
    if building:
        q = q.filter(Room.building == building)
    rooms = q.order_by(Room.building, Room.room_number).all()
    return [
        {
            "id": str(r.id),
            "building": r.building,
            "room_type": r.room_type,
            "room_number": r.room_number,
            "floor": r.floor,
            "capacity": r.capacity,
            "base_price": int(r.base_price or 0),
            "status": r.status,
        }
        for r in rooms
    ]


@router.get("/reservations")
def list_reservations(
    check_in: date | None = Query(None),
    status: str | None = Query(None),
    db: Session = Depends(get_db),
):
    q = (
        db.query(RoomReservation, Customer, Room)
        .outerjoin(Customer, RoomReservation.customer_id == Customer.id)
        .outerjoin(Room, RoomReservation.room_id == Room.id)
    )
    if check_in:
        q = q.filter(RoomReservation.check_in == check_in)
    if status:
        q = q.filter(RoomReservation.status == status)
    items = q.order_by(RoomReservation.check_in.desc()).limit(100).all()
    return [
        {
            "id": str(r.id),
            "room_id": str(r.room_id),
            "customer_id": str(r.customer_id),
            "customer_name": cust.name if cust else None,
            "room_number": room.room_number if room else None,
            "room_type": room.room_type if room else None,
            "building": room.building if room else None,
            "check_in": str(r.check_in),
            "check_out": str(r.check_out),
            "status": r.status,
            "total_price": int(r.total_price or 0),
        }
        for r, cust, room in items
    ]


@router.post("/reservations", status_code=201)
def create_reservation(body: ReservationCreate, db: Session = Depends(get_db)):
    res = RoomReservation(**body.model_dump())
    db.add(res)
    db.commit()
    db.refresh(res)
    return {"id": str(res.id)}


@router.patch("/reservations/{res_id}/checkin")
def checkin(res_id: UUID, db: Session = Depends(get_db)):
    r = db.query(RoomReservation).filter(RoomReservation.id == res_id).first()
    if not r:
        raise HTTPException(404, "Reservation not found")
    r.status = "checked_in"
    db.commit()
    return {"ok": True}


@router.patch("/reservations/{res_id}/checkout")
def checkout(res_id: UUID, db: Session = Depends(get_db)):
    r = db.query(RoomReservation).filter(RoomReservation.id == res_id).first()
    if not r:
        raise HTTPException(404, "Reservation not found")
    r.status = "checked_out"
    db.commit()
    return {"ok": True}
