from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
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


class ProfileUpdate(BaseModel):
    name: str | None = None
    email: str | None = None


@router.patch("/me", response_model=StaffProfile)
def update_profile(
    body: ProfileUpdate,
    current_user: Staff = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.name is not None:
        current_user.name = body.name
    if body.email is not None:
        current_user.email = body.email
    db.commit()
    db.refresh(current_user)
    return StaffProfile(
        id=str(current_user.id),
        name=current_user.name,
        role=current_user.role,
        department=current_user.department,
        email=current_user.email,
    )


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
def change_password(
    body: PasswordChange,
    current_user: Staff = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.hashed_password or not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="현재 비밀번호가 올바르지 않습니다.")
    current_user.hashed_password = hash_password(body.new_password)
    db.commit()
    return {"ok": True}
