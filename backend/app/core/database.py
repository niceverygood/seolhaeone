from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import QueuePool

from app.core.config import settings


def _normalize_db_url(url: str) -> str:
    """환경변수에서 올 수 있는 양끝 공백/탭/따옴표 제거.
    매니지드 Postgres는 SSL 필수이므로 sslmode=require도 자동 부여."""
    url = (url or "").strip().strip('"').strip("'")
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


ENGINE_INIT_ERROR: str | None = None

try:
    # Vercel Serverless: 컨테이너가 워밍된 동안 여러 요청을 처리하므로
    # 1~2개의 커넥션을 재사용하면 SSL 핸드셰이크 비용을 크게 절약할 수 있다.
    # Supabase Transaction Pooler가 상위에서 실제 커넥션을 관리하므로 안전.
    # pool_recycle: Supabase idle timeout(10분) 전에 재연결하여 broken pipe 방지.
    engine = create_engine(
        _normalize_db_url(settings.DATABASE_URL),
        echo=False,
        poolclass=QueuePool,
        pool_size=1,
        max_overflow=2,
        pool_recycle=540,
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
