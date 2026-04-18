import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.database import SessionLocal
from app.core.security import decode_token
from app.models.staff import Staff

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

EMERGENCY_ADMIN_SUB = "emergency-admin"


def _emergency_admin_staff() -> Staff:
    """DB 없이 get_current_user가 반환할 수 있는 가상 admin.
    uuid는 고정하지 않고 세션마다 새로 할당 (저장 안 되므로 무해)."""
    s = Staff()
    s.id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    s.name = "비상관리자"
    s.role = "admin"
    s.department = "management"
    s.email = "admin@seolhaeone.kr"
    s.hashed_password = None
    s.is_active = True
    return s


def get_current_user(token: str = Depends(oauth2_scheme)) -> Staff:
    staff_id = decode_token(token)
    if staff_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    # ── 비상 관리자 토큰: DB 조회 없이 통과
    if staff_id == EMERGENCY_ADMIN_SUB:
        return _emergency_admin_staff()

    # ── 일반 흐름: DB 조회
    if SessionLocal is None:
        raise HTTPException(status_code=503, detail="DB unavailable")
    db = SessionLocal()
    try:
        user = db.query(Staff).filter(Staff.id == staff_id, Staff.is_active.is_(True)).first()
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return user
    finally:
        db.close()
