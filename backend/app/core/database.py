from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings


def _normalize_db_url(url: str) -> str:
    """환경변수에서 올 수 있는 양끝 공백/탭/따옴표 제거.
    매니지드 Postgres는 SSL 필수이므로 sslmode=require도 자동 부여."""
    url = (url or "").strip().strip('"').strip("'")
    # postgres:// → postgresql:// (SQLAlchemy는 둘 다 인식하지만 명시적으로)
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if "sslmode=" in url:
        return url
    if "localhost" in url or "127.0.0.1" in url:
        return url
    sep = "&" if "?" in url else "?"
    return f"{url}{sep}sslmode=require"


class Base(DeclarativeBase):
    pass


# 엔진 생성 실패를 import 단계에서 노출되지 않도록 방어.
# 실패 시 ENGINE_INIT_ERROR에 원인이 담기고, engine은 None.
ENGINE_INIT_ERROR: str | None = None

try:
    engine = create_engine(
        _normalize_db_url(settings.DATABASE_URL),
        echo=False,
        poolclass=NullPool,  # Serverless: 풀 유지 불가, Pooler 측이 담당
        pool_pre_ping=True,
    )
except Exception as e:  # pragma: no cover
    engine = None  # type: ignore[assignment]
    ENGINE_INIT_ERROR = f"{type(e).__name__}: {e}"

SessionLocal = sessionmaker(bind=engine, class_=Session, expire_on_commit=False) if engine is not None else None  # type: ignore[arg-type]


def get_db() -> Generator[Session, None, None]:
    if SessionLocal is None:
        raise RuntimeError(f"DB engine not initialized: {ENGINE_INIT_ERROR}")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
