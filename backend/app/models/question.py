from sqlalchemy import Column, Integer, String, Text, ForeignKey
from app.database import Base


class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(Integer, primary_key=True, index=True)

    interview_id = Column(
        Integer,
        ForeignKey("interviews.id"),
        nullable=False,
        index=True,
    )

    question_text = Column(Text, nullable=False)

    question_type = Column(
        String(50),
        nullable=False,
        default="technical",
    )

    difficulty = Column(
        String(50),
        nullable=False,
        default="medium",
    )

    expected_answer = Column(Text, nullable=True)

    order_number = Column(Integer, nullable=False)