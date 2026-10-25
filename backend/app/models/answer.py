from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class InterviewAnswer(Base):
    __tablename__ = "interview_answers"

    id = Column(Integer, primary_key=True, index=True)

    session_id = Column(
        Integer,
        ForeignKey("interview_sessions.id"),
        nullable=False,
        index=True,
    )

    question_id = Column(
        Integer,
        ForeignKey("interview_questions.id"),
        nullable=False,
        index=True,
    )

    answer_text = Column(Text, nullable=False)

    submitted_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )