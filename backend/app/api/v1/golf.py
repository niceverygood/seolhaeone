from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.golf import GolfCourse, GolfTeetime

router = APIRouter(prefix="/golf", tags=["golf"])


class TeetimeCreate(BaseModel):
    course_id: UUID
    tee_date: date
    tee_time: str  # "HH:MM"
    customer_id: UUID | None = None
    party_size: int = 4
    caddy_id: UUID | None = None
    notes: str | None = None


class TeetimeUpdate(BaseModel):
    status: str | None = None
    customer_id: UUID | None = None
    party_size: int | None = None
    caddy_id: UUID | None = None
    notes: str | None = None


@router.get("/courses")
def list_courses(db: Session = Depends(get_db)):
    courses = db.query(GolfCourse).order_by(GolfCourse.name).all()
    return [
        {"id": str(c.id), "name": c.name, "holes": c.holes, "par": c.par, "status": c.status}
        for c in courses
    ]


@router.get("/teetimes")
def list_teetimes(
    tee_date: date = Query(..., alias="date"),
    course_id: UUID | None = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(GolfTeetime).filter(GolfTeetime.tee_date == tee_date)
    if course_id:
        q = q.filter(GolfTeetime.course_id == course_id)
    teetimes = q.order_by(GolfTeetime.tee_time).all()
    return [
        {
            "id": str(t.id),
            "course_id": str(t.course_id),
            "tee_date": str(t.tee_date),
            "tee_time": t.tee_time.strftime("%H:%M"),
            "status": t.status,
            "customer_id": str(t.customer_id) if t.customer_id else None,
            "party_size": t.party_size,
            "caddy_id": str(t.caddy_id) if t.caddy_id else None,
            "noshow_score": float(t.noshow_score) if t.noshow_score else 0,
            "notes": t.notes,
        }
        for t in teetimes
    ]


@router.post("/teetimes", status_code=201)
def create_teetime(body: TeetimeCreate, db: Session = Depends(get_db)):
    from datetime import time as dt_time

    h, m = body.tee_time.split(":")
    teetime = GolfTeetime(
        course_id=body.course_id,
        tee_date=body.tee_date,
        tee_time=dt_time(int(h), int(m)),
        customer_id=body.customer_id,
        party_size=body.party_size,
        caddy_id=body.caddy_id,
        notes=body.notes,
        status="reserved" if body.customer_id else "available",
    )
    db.add(teetime)
    db.commit()
    db.refresh(teetime)
    return {"id": str(teetime.id)}


@router.patch("/teetimes/{teetime_id}")
def update_teetime(teetime_id: UUID, body: TeetimeUpdate, db: Session = Depends(get_db)):
    tt = db.query(GolfTeetime).filter(GolfTeetime.id == teetime_id).first()
    if not tt:
        raise HTTPException(404, "Teetime not found")
    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(tt, field, val)
    db.commit()
    return {"ok": True}
