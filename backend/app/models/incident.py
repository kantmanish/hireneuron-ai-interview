from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class ProctoringIncident(Base):
    __tablename__ = "proctoring_incidents"

    id = Column(Integer, primary_key=True, index=True)

    session_id = Column(
        Integer,
        ForeignKey("interview_sessions.id"),
        nullable=False,
        index=True,
    )

    incident_type = Column(
        String(100),
        nullable=False,
    )

    description = Column(
        Text,
        nullable=True,
    )

    occurred_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )