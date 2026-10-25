from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)

    interview_id = Column(
        Integer,
        ForeignKey("interviews.id"),
        nullable=False,
        index=True,
    )

    status = Column(
        String(30),
        nullable=False,
        default="in_progress",
    )

    current_question_order = Column(
        Integer,
        nullable=False,
        default=1,
    )

    started_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    finished_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )