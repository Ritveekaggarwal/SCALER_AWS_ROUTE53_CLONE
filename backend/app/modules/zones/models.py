from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ...core.db import Base
from ...core.timeutil import utcnow


class HostedZone(Base):
    __tablename__ = "hosted_zones"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_private: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    comment: Mapped[str] = mapped_column(Text, nullable=False, default="")
    caller_reference: Mapped[str] = mapped_column(String(64), nullable=False)
    vpc_region: Mapped[str | None] = mapped_column(String(32))
    vpc_id: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    record_sets: Mapped[list["RecordSet"]] = relationship(
        back_populates="zone", cascade="all, delete-orphan", order_by="RecordSet.name"
    )

    __table_args__ = (Index("ix_hosted_zones_owner_name", "owner_id", "name"),)
