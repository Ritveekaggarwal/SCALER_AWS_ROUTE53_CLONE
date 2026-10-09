from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ...core.db import Base
from ...core.timeutil import utcnow
from ..zones.models import HostedZone


class RecordSet(Base):
    __tablename__ = "record_sets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    zone_id: Mapped[str] = mapped_column(ForeignKey("hosted_zones.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(10), nullable=False)
    ttl: Mapped[int] = mapped_column(Integer, nullable=False, default=300)
    routing_policy: Mapped[str] = mapped_column(String(32), nullable=False, default="Simple")
    health_check_id: Mapped[str | None] = mapped_column(
        ForeignKey("health_checks.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    zone: Mapped[HostedZone] = relationship(back_populates="record_sets")
    values: Mapped[list["RecordValue"]] = relationship(
        back_populates="record_set", cascade="all, delete-orphan", order_by="RecordValue.position"
    )

    __table_args__ = (
        UniqueConstraint("zone_id", "name", "type", name="uq_record_sets_zone_name_type"),
        Index("ix_record_sets_zone_type", "zone_id", "type"),
    )


class RecordValue(Base):
    __tablename__ = "record_values"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    record_set_id: Mapped[int] = mapped_column(
        ForeignKey("record_sets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    value: Mapped[str] = mapped_column(Text, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    record_set: Mapped[RecordSet] = relationship(back_populates="values")
