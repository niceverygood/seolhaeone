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
