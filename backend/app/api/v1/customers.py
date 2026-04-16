from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.customer import Customer

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
