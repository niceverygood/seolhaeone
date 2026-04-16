from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import create_access_token, verify_password
from app.models.staff import Staff
from app.schemas.auth import LoginRequest, StaffProfile, Token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(Staff).filter(Staff.email == body.email).first()
    if not user or not user.hashed_password or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(str(user.id))
    return Token(access_token=token)


@router.get("/me", response_model=StaffProfile)
def me(current_user: Staff = Depends(get_current_user)):
    return StaffProfile(
        id=str(current_user.id),
        name=current_user.name,
        role=current_user.role,
        department=current_user.department,
        email=current_user.email,
    )
