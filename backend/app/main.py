import os
import traceback
from urllib.parse import urlparse

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.api.v1 import ai, auth, customers, dashboard, golf, public, resort
from app.core.config import settings
from app.core.database import Base, engine, get_db
from app.core.security import hash_password
from app.models.staff import Staff

app = FastAPI(title=settings.PROJECT_NAME, docs_url="/docs", openapi_url="/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
for r in (auth.router, dashboard.router, golf.router, resort.router, customers.router, ai.router, public.router):
    app.include_router(r, prefix=settings.API_V1_PREFIX)


@app.get("/health")
def health():
    return {"status": "ok", "service": settings.PROJECT_NAME}


def _safe_db_host() -> str:
    """DATABASE_URL에서 비밀번호를 제외한 host 정보만 노출."""
    try:
        u = urlparse(os.environ.get("DATABASE_URL") or settings.DATABASE_URL)
        return f"{u.hostname}:{u.port}/{u.path.lstrip('/')}"
    except Exception:
        return "<unparseable>"


@app.get("/diag")
def diag():
    """배포 환경 진단 — 어디서 깨졌는지 한 번에 본다."""
    result: dict = {
        "env": {
            "DATABASE_URL_set": bool(os.environ.get("DATABASE_URL")),
            "DATABASE_URL_host": _safe_db_host(),
            "SECRET_KEY_set": bool(os.environ.get("SECRET_KEY")),
        },
    }
    # 1) Can connect?
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        result["db_connect"] = "ok"
    except Exception as e:
        result["db_connect"] = "FAIL"
        result["db_connect_error"] = f"{type(e).__name__}: {str(e)[:300]}"
        return result

    # 2) Tables exist?
    try:
        insp = inspect(engine)
        tables = insp.get_table_names()
        result["tables"] = sorted(tables)
        result["staff_table_exists"] = "staff" in tables
    except Exception as e:
        result["inspect_error"] = f"{type(e).__name__}: {str(e)[:300]}"
        return result

    # 3) Staff/admin status
    try:
        session = next(get_db())
        try:
            count = session.query(Staff).count() if "staff" in tables else 0
            admin = (
                session.query(Staff).filter(Staff.email == "admin@seolhaeone.kr").first()
                if "staff" in tables else None
            )
            result["staff_count"] = count
            result["admin_exists"] = bool(admin)
            if admin:
                result["admin_has_password"] = bool(admin.hashed_password)
        finally:
            session.close()
    except Exception as e:
        result["staff_query_error"] = f"{type(e).__name__}: {str(e)[:300]}"
    return result


@app.post("/bootstrap")
def bootstrap():
    """
    최초 1회 호출 시 테이블 생성 + 기본 admin 계정 생성.
    멱등 — 이미 staff가 있으면 계정은 건드리지 않음.
    실패 시 500이 아니라 에러 내용을 JSON으로 돌려줌 (디버깅 용이).
    """
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        return {
            "bootstrapped": False,
            "stage": "create_all",
            "error": f"{type(e).__name__}: {str(e)[:500]}",
            "trace": traceback.format_exc()[-1000:],
        }
    try:
        session = next(get_db())
        try:
            count = session.query(Staff).count()
            if count == 0:
                session.add(Staff(
                    name="관리자",
                    role="admin",
                    department="management",
                    email="admin@seolhaeone.kr",
                    hashed_password=hash_password("seolhae1234"),
                ))
                session.commit()
                return {
                    "bootstrapped": True,
                    "admin_email": "admin@seolhaeone.kr",
                    "admin_password": "seolhae1234",
                }
            return {"bootstrapped": False, "reason": "staff already exists", "staff_count": count}
        finally:
            session.close()
    except Exception as e:
        return {
            "bootstrapped": False,
            "stage": "seed_admin",
            "error": f"{type(e).__name__}: {str(e)[:500]}",
            "trace": traceback.format_exc()[-1000:],
        }
