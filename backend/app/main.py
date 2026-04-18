import os
import re
import sys
import traceback
from urllib.parse import urlparse

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings

app = FastAPI(title=settings.PROJECT_NAME, docs_url="/docs", openapi_url="/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── 전역 예외 핸들러 ─────────────────────────────────────────────────
# 어떤 예외가 터지더라도 JSON + CORS 헤더 포함 응답을 돌려준다.
# (Serverless 크래시 시 Vercel이 자기 500 페이지를 내면 CORS가 빠져 브라우저가
#  원인조차 못 읽으므로 FastAPI 레벨에서 반드시 가로챈다)
_ORIGIN_REGEX = re.compile(settings.CORS_ORIGIN_REGEX) if settings.CORS_ORIGIN_REGEX else None


def _cors_headers_for(request: Request) -> dict:
    origin = request.headers.get("origin", "")
    allowed = False
    if origin in settings.CORS_ORIGINS:
        allowed = True
    elif _ORIGIN_REGEX and _ORIGIN_REGEX.match(origin):
        allowed = True
    if not allowed:
        return {}
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Vary": "Origin",
    }


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "detail": f"{type(exc).__name__}: {str(exc)[:400]}",
            "trace": traceback.format_exc()[-800:],
        },
        headers=_cors_headers_for(request),
    )


# ─── 최소 진단: DB 안 건드림 ──────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": settings.PROJECT_NAME}


def _safe_db_host() -> str:
    try:
        u = urlparse(os.environ.get("DATABASE_URL") or settings.DATABASE_URL)
        host = u.hostname or "?"
        port = u.port or "?"
        path = (u.path or "").lstrip("/")
        return f"{host}:{port}/{path}"
    except Exception as e:
        return f"<unparseable: {e}>"


@app.get("/debug-env")
def debug_env():
    """DB/라우터 import 전에 실행 가능한 최소 진단."""
    return {
        "python": sys.version.split()[0],
        "cwd": os.getcwd(),
        "DATABASE_URL_set": bool(os.environ.get("DATABASE_URL")),
        "DATABASE_URL_host": _safe_db_host(),
        "SECRET_KEY_set": bool(os.environ.get("SECRET_KEY")),
    }


# ─── DB 및 라우터 import는 try로 감싸 실패 원인을 API로 노출 ──────────
_IMPORT_ERROR: str | None = None
try:
    from sqlalchemy import inspect, text

    from app.api.v1 import ai, auth, customers, dashboard, golf, public, resort
    from app.core.database import (
        ENGINE_INIT_ERROR,
        Base,
        engine,
        get_db,
    )
    from app.core.security import hash_password
    from app.models.staff import Staff

    # Mount routers (DB import 성공 시에만)
    for r in (auth.router, dashboard.router, golf.router, resort.router, customers.router, ai.router, public.router):
        app.include_router(r, prefix=settings.API_V1_PREFIX)

except Exception as e:
    _IMPORT_ERROR = f"{type(e).__name__}: {e}\n{traceback.format_exc()[-1500:]}"


@app.get("/diag")
def diag():
    """import 단계 실패 / DB 연결 실패 / 테이블 미존재 / admin 미존재 — 한 번에 식별."""
    result: dict = {
        "env": debug_env(),
        "import_error": _IMPORT_ERROR,
    }
    if _IMPORT_ERROR:
        return result
    # 여기서부터는 import가 성공한 상태
    result["engine_init_error"] = ENGINE_INIT_ERROR
    if ENGINE_INIT_ERROR or engine is None:
        return result

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        result["db_connect"] = "ok"
    except Exception as e:
        result["db_connect"] = "FAIL"
        result["db_connect_error"] = f"{type(e).__name__}: {str(e)[:400]}"
        return result

    try:
        insp = inspect(engine)
        tables = insp.get_table_names()
        result["tables"] = sorted(tables)
        result["staff_table_exists"] = "staff" in tables
    except Exception as e:
        result["inspect_error"] = f"{type(e).__name__}: {str(e)[:400]}"
        return result

    try:
        session = next(get_db())
        try:
            if "staff" in tables:
                result["staff_count"] = session.query(Staff).count()
                admin = session.query(Staff).filter(Staff.email == "admin@seolhaeone.kr").first()
                result["admin_exists"] = bool(admin)
                if admin:
                    result["admin_has_password"] = bool(admin.hashed_password)
        finally:
            session.close()
    except Exception as e:
        result["staff_query_error"] = f"{type(e).__name__}: {str(e)[:400]}"
    return result


@app.post("/bootstrap")
def bootstrap():
    """최초 1회: 테이블 생성 + 기본 admin 계정. 멱등."""
    if _IMPORT_ERROR:
        return {"bootstrapped": False, "stage": "import", "error": _IMPORT_ERROR}
    if ENGINE_INIT_ERROR or engine is None:
        return {"bootstrapped": False, "stage": "engine_init", "error": ENGINE_INIT_ERROR}
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


@app.get("/seed-demo")
@app.post("/seed-demo")
def seed_demo():
    """Vercel 타임아웃(60s) 안에서 돌아가는 경량 데모 시드.
    이미 데이터가 있으면 아무 일도 하지 않음 (멱등)."""
    if _IMPORT_ERROR:
        return {"seeded": False, "stage": "import", "error": _IMPORT_ERROR}
    if ENGINE_INIT_ERROR or engine is None:
        return {"seeded": False, "stage": "engine_init", "error": ENGINE_INIT_ERROR}
    try:
        from app.core.seed_demo import run_demo_seed
        Base.metadata.create_all(bind=engine)
        session = next(get_db())
        try:
            summary = run_demo_seed(session)
        finally:
            session.close()
        return {"seeded": True, "summary": summary}
    except Exception as e:
        return {
            "seeded": False,
            "stage": "run",
            "error": f"{type(e).__name__}: {str(e)[:500]}",
            "trace": traceback.format_exc()[-1200:],
        }
