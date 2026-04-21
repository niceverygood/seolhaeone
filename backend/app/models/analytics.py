import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DailyStat(Base):
    __tablename__ = "daily_stats"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    stat_date: Mapped[date] = mapped_column(Date, nullable=False, unique=True, index=True)
    golf_revenue: Mapped[int] = mapped_column(Numeric(12, 0), default=0)
    room_revenue: Mapped[int] = mapped_column(Numeric(12, 0), default=0)
    fnb_revenue: Mapped[int] = mapped_column(Numeric(12, 0), default=0)
    oncheon_revenue: Mapped[int] = mapped_column(Numeric(12, 0), default=0)
    total_revenue: Mapped[int] = mapped_column(Numeric(12, 0), default=0)
    golf_rounds: Mapped[int] = mapped_column(Integer, default=0)
    room_occupancy_rate: Mapped[float] = mapped_column(Numeric(3, 2), default=0)
    avg_party_size: Mapped[float] = mapped_column(Numeric(3, 1), default=0)
    noshow_count: Mapped[int] = mapped_column(Integer, default=0)
    new_customers: Mapped[int] = mapped_column(Integer, default=0)
    returning_customers: Mapped[int] = mapped_column(Integer, default=0)
    ai_forecast: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AiActionLog(Base):
    __tablename__ = "ai_actions_log"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    action_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    target_customer_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"), index=True)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    result: Mapped[dict | None] = mapped_column(JSONB)
    created_by: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
