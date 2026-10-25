from sqlalchemy import Column, Integer, Float, Text, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class AnswerEvaluation(Base):
    __tablename__ = "answer_evaluations"

    id = Column(Integer, primary_key=True, index=True)

    answer_id = Column(
        Integer,
        ForeignKey("interview_answers.id"),
        nullable=False,
        unique=True,
        index=True,
    )

    relevance_score = Column(Float, nullable=False)
    correctness_score = Column(Float, nullable=False)
    clarity_score = Column(Float, nullable=False)
    overall_score = Column(Float, nullable=False)

    feedback = Column(Text, nullable=False)
    improvement_suggestions = Column(Text, nullable=False)

    evaluated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )