from pydantic import BaseModel, Field


class InterviewCreate(BaseModel):
    job_title: str = Field(..., min_length=1, max_length=200)
    job_description: str = Field(..., min_length=1)
    required_skills: list[str] = Field(..., min_length=1)
    question_limit: int = Field(default=10, ge=1, le=20)
    duration_minutes: int = Field(default=20, ge=1, le=180)


class InterviewResponse(BaseModel):
    id: int
    job_title: str
    job_description: str
    required_skills: list[str]
    question_limit: int
    duration_minutes: int
    status: str

    model_config = {"from_attributes": True}