from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.exc import OperationalError, ProgrammingError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import Base, engine, get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.staff import Staff
from app.schemas.auth import LoginRequest, StaffProfile, Token

router = APIRouter(prefix="/auth", tags=["auth"])

DEFAULT_ADMIN_EMAIL = "admin@seolhaeone.kr"
DEFAULT_ADMIN_PASSWORD = "seolhae1234"


def _ensure_default_admin(db: Session) -> Staff | None:
    """DB가 비어 있으면 기본 admin 계정을 자동 생성.
    이미 staff가 있으면 건드리지 않는다 (멱등).
    반환값: 막 생성된 admin 또는 None."""
    if db.query(Staff).count() > 0:
        return None
    admin = Staff(
        name="관리자",
        role="admin",
        department="management",
        email=DEFAULT_ADMIN_EMAIL,
        hashed_password=hash_password(DEFAULT_ADMIN_PASSWORD),
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


@router.post("/login", response_model=Token)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    # 1) 테이블이 없으면 생성 시도 (신규 DB 환경 복구)
    try:
        user = db.query(Staff).filter(Staff.email == body.email).first()
    except ProgrammingError:
        db.rollback()
        try:
            Base.metadata.create_all(bind=engine)
        except Exception as e:
            raise HTTPException(
                status_code=503,
                detail=f"DB 스키마 생성 실패: {type(e).__name__}: {e}",
            )
        user = db.query(Staff).filter(Staff.email == body.email).first()
    except OperationalError as e:
        raise HTTPException(
            status_code=503,
            detail=f"DB 연결 실패 — DATABASE_URL 환경변수 확인 필요: {str(e)[:200]}",
        )

    # 2) staff가 아예 없으면 기본 admin을 자동 생성 (최초 배포 자동 복구)
    if user is None and body.email == DEFAULT_ADMIN_EMAIL:
        _ensure_default_admin(db)
        user = db.query(Staff).filter(Staff.email == body.email).first()

    # 3) 일반 인증
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
