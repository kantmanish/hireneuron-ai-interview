from sqlalchemy import Column, Integer, String, Text
from app.database import Base


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    job_title = Column(String(200), nullable=False)
    job_description = Column(Text, nullable=False)
    required_skills = Column(Text, nullable=False)
    question_limit = Column(Integer, default=10, nullable=False)
    duration_minutes = Column(Integer, default=20, nullable=False)
    status = Column(String(50), default="created", nullable=False)
    resume_text = Column(Text, nullable=True)
