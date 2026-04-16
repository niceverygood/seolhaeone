import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Package(Base):
    __tablename__ = "packages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    components: Mapped[dict] = mapped_column(JSONB, nullable=False)
    base_price: Mapped[int | None] = mapped_column(Numeric(10, 0))
    ai_generated: Mapped[bool] = mapped_column(Boolean, default=False)
    target_segment: Mapped[str | None] = mapped_column(String(50))
    acceptance_rate: Mapped[float | None] = mapped_column(Numeric(3, 2))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
