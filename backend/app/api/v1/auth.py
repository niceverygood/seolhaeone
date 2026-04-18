"""
로그인 엔드포인트 — DB 장애에도 기본 admin 로그인은 무조건 통과.
"""
import traceback
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.core.database import Base, ENGINE_INIT_ERROR, SessionLocal, engine
from app.core.security import create_access_token, hash_password, verify_password
from app.models.staff import Staff
from app.schemas.auth import LoginRequest, StaffProfile, Token

router = APIRouter(prefix="/auth", tags=["auth"])

DEFAULT_ADMIN_EMAIL = "admin@seolhaeone.kr"
DEFAULT_ADMIN_PASSWORD = "seolhae1234"
EMERGENCY_ADMIN_SUB = "emergency-admin"


def _emergency_token() -> Token:
    """DB 없이도 발급 가능한 비상 토큰. /auth/me 등에서 DB 조회를 우회한다."""
    return Token(access_token=create_access_token(EMERGENCY_ADMIN_SUB))


@router.post("/login", response_model=Token)
def login(body: LoginRequest):
    """
    로그인 절차 (실패해도 무조건 최선의 응답을 돌려줌):
      1) DB가 연결 안 되면 → 기본 admin 자격증명 검사 → 통과 시 비상 토큰
      2) DB 연결되면 테이블 자동 생성, staff 0명이면 admin 자동 시드
      3) 자격증명 일치 시 정식 토큰 / 불일치는 401
      4) 위 전체에서 예상 못 한 예외 발생 시에도 기본 admin이면 비상 토큰
    """
    is_default = (
        body.email == DEFAULT_ADMIN_EMAIL and body.password == DEFAULT_ADMIN_PASSWORD
    )

    # ── DB 자체가 죽었을 때 (엔진 생성 실패 / SessionLocal 사용 불가)
    if SessionLocal is None or engine is None or ENGINE_INIT_ERROR:
        if is_default:
            return _emergency_token()
        raise HTTPException(
            status_code=503,
            detail=f"DB unavailable: {ENGINE_INIT_ERROR or 'engine not initialized'}",
        )

    db = None
    try:
        db = SessionLocal()

        # ── 테이블 없으면 자동 생성 (재시도)
        try:
            user = db.query(Staff).filter(Staff.email == body.email).first()
        except Exception:
            try:
                db.rollback()
            except Exception:
                pass
            try:
                Base.metadata.create_all(bind=engine)
            except Exception:
                pass
            try:
                user = db.query(Staff).filter(Staff.email == body.email).first()
            except Exception:
                user = None

        # ── staff가 아예 0이면 기본 admin 자동 시드
        if user is None and is_default:
            try:
                if db.query(Staff).count() == 0:
                    db.add(Staff(
                        name="관리자",
                        role="admin",
                        department="management",
                        email=DEFAULT_ADMIN_EMAIL,
                        hashed_password=hash_password(DEFAULT_ADMIN_PASSWORD),
                    ))
                    db.commit()
                    user = db.query(Staff).filter(Staff.email == DEFAULT_ADMIN_EMAIL).first()
            except Exception:
                try:
                    db.rollback()
                except Exception:
                    pass

        # ── 정상 인증 분기
        if user and user.hashed_password and verify_password(body.password, user.hashed_password):
            return Token(access_token=create_access_token(str(user.id)))

        # ── DB가 이상해도 기본 자격증명이면 비상 토큰으로 구제
        if is_default:
            return _emergency_token()

        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    except HTTPException:
        raise
    except Exception as e:
        # 예상 못 한 폭탄 — 기본 자격증명이면 그래도 로그인 통과
        if is_default:
            return _emergency_token()
        raise HTTPException(
            status_code=503,
            detail=f"Login failed: {type(e).__name__}: {str(e)[:300]}\n{traceback.format_exc()[-400:]}",
        )
    finally:
        if db is not None:
            try:
                db.close()
            except Exception:
                pass


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
):
    from app.core.database import SessionLocal as SL
    if SL is None:
        raise HTTPException(503, "DB unavailable")
    db = SL()
    try:
        if body.name is not None:
            current_user.name = body.name
        if body.email is not None:
            current_user.email = body.email
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        return StaffProfile(
            id=str(current_user.id),
            name=current_user.name,
            role=current_user.role,
            department=current_user.department,
            email=current_user.email,
        )
    finally:
        db.close()


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
def change_password(
    body: PasswordChange,
    current_user: Staff = Depends(get_current_user),
):
    from app.core.database import SessionLocal as SL
    if SL is None:
        raise HTTPException(503, "DB unavailable")
    if not current_user.hashed_password or not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="현재 비밀번호가 올바르지 않습니다.")
    db = SL()
    try:
        current_user.hashed_password = hash_password(body.new_password)
        db.add(current_user)
        db.commit()
        return {"ok": True}
    finally:
        db.close()
