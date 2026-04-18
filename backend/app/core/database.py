from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings


def _ensure_sslmode(url: str) -> str:
    """Supabase / Neon 등 매니지드 Postgres는 SSL 필수.
    psycopg2 기본값이 'prefer'라 일부 환경에서 SSL 협상이 실패할 수 있어
    명시적으로 sslmode=require를 강제한다 (URL에 이미 있으면 건드리지 않음).
    localhost 연결은 SSL이 없으므로 제외."""
    if "sslmode=" in url:
        return url
    if "localhost" in url or "127.0.0.1" in url:
        return url
    sep = "&" if "?" in url else "?"
    return f"{url}{sep}sslmode=require"


# Vercel Serverless는 매 invocation 새 컨테이너 → 풀을 유지할 수 없으므로
# NullPool로 매번 새 커넥션 (Supabase Transaction Pooler가 실 풀링 담당).
engine = create_engine(
    _ensure_sslmode(settings.DATABASE_URL),
    echo=False,
    poolclass=NullPool,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(bind=engine, class_=Session, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
