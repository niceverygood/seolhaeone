from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

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


@app.post("/bootstrap")
def bootstrap():
    """
    최초 1회 호출 시 테이블 생성 + 기본 admin 계정 생성.
    이미 staff가 있으면 계정은 건드리지 않음 (멱등, 재호출 안전).
    """
    Base.metadata.create_all(bind=engine)
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
