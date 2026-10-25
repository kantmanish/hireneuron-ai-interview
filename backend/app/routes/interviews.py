import os
from groq import Groq
from app.models.question import InterviewQuestion
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.interview import Interview
from app.schemas.interview import InterviewCreate, InterviewResponse
from pathlib import Path

import pymupdf
from fastapi import UploadFile, File
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/interviews", tags=["Interviews"])


@router.post("", response_model=InterviewResponse, status_code=201)
def create_interview(
    payload: InterviewCreate,
    db: Session = Depends(get_db),
):
    interview = Interview(
        job_title=payload.job_title,
        job_description=payload.job_description,
        required_skills=json.dumps(payload.required_skills),
        question_limit=payload.question_limit,
        duration_minutes=payload.duration_minutes,
        status="created",
    )

    db.add(interview)
    db.commit()
    db.refresh(interview)

    return InterviewResponse(
        id=interview.id,
        job_title=interview.job_title,
        job_description=interview.job_description,
        required_skills=json.loads(interview.required_skills),
        question_limit=interview.question_limit,
        duration_minutes=interview.duration_minutes,
        status=interview.status,
    )


@router.get("/{interview_id}", response_model=InterviewResponse)
def get_interview(
    interview_id: int,
    db: Session = Depends(get_db),
):
    interview = (
        db.query(Interview)
        .filter(Interview.id == interview_id)
        .first()
    )

    if interview is None:
        raise HTTPException(
            status_code=404,
            detail="Interview not found",
        )

    return InterviewResponse(
        id=interview.id,
        job_title=interview.job_title,
        job_description=interview.job_description,
        required_skills=json.loads(interview.required_skills),
        question_limit=interview.question_limit,
        duration_minutes=interview.duration_minutes,
        status=interview.status,
    )

@router.post("/{interview_id}/resume")
async def upload_resume(
    interview_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    interview = (
        db.query(Interview)
        .filter(Interview.id == interview_id)
        .first()
    )

    if interview is None:
        raise HTTPException(
            status_code=404,
            detail="Interview not found",
        )

    if not file.filename or Path(file.filename).suffix.lower() != ".pdf":
        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF resume",
        )

    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="File must be a PDF",
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Uploaded PDF is empty",
        )

    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="PDF size must be 5 MB or less",
        )

    try:
        with pymupdf.open(stream=content, filetype="pdf") as document:
            resume_text = "\n".join(
                page.get_text() for page in document
            ).strip()
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Could not read PDF. Please upload a valid PDF",
        )

    if not resume_text:
        raise HTTPException(
            status_code=400,
            detail="No readable text found in PDF",
        )

    interview.resume_text = resume_text
    db.commit()

    return {
        "message": "Resume uploaded successfully",
        "interview_id": interview.id,
        "filename": file.filename,
        "extracted_characters": len(resume_text),
    }

@router.post("/{interview_id}/generate-questions")
def generate_questions(
    interview_id: int,
    db: Session = Depends(get_db),
):
    # 1. Find the interview
    interview = (
        db.query(Interview)
        .filter(Interview.id == interview_id)
        .first()
    )

    if interview is None:
        raise HTTPException(
            status_code=404,
            detail="Interview not found",
        )

    # 2. Get the Groq API key
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY is not configured",
        )

    # 3. Prepare interview details
    try:
        required_skills = json.loads(interview.required_skills)
    except (json.JSONDecodeError, TypeError):
        required_skills = []

    resume_text = interview.resume_text or "No resume provided."

    prompt = f"""
You are an expert technical interviewer.

Generate exactly {interview.question_limit} interview questions
for the following job.

Job title: {interview.job_title}

Job description:
{interview.job_description}

Required skills:
{", ".join(required_skills)}

Candidate resume:
{resume_text[:8000]}

Return ONLY a valid JSON array. Do not use markdown fences.

Each array item must have these fields:
- question_text: string
- question_type: string (technical, behavioral, or experience)
- difficulty: string (easy, medium, or hard)
- expected_answer: string

Questions must be relevant to the job and candidate's resume.
"""

    # 4. Call Groq
    try:
        client = Groq(api_key=api_key)

        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You generate relevant interview questions. "
                        "Return valid JSON only."
                    ),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            temperature=0.4,
            max_completion_tokens=6000,
        )

        content = response.choices[0].message.content

        if not content:
            raise ValueError("The AI returned an empty response")

        questions_data = json.loads(content)

        if not isinstance(questions_data, list):
            raise ValueError("The AI response must be a JSON array")

        if len(questions_data) != interview.question_limit:
            raise ValueError(
                f"Expected {interview.question_limit} questions, "
                f"but received {len(questions_data)}"
            )

        # Validate all questions before saving any
        for item in questions_data:
            if not isinstance(item, dict):
                raise ValueError("Invalid question format")

            if not isinstance(item.get("question_text"), str):
                raise ValueError("A question is missing question_text")

            if not item["question_text"].strip():
                raise ValueError("A question cannot be empty")

            if item.get("question_type") not in {
                "technical",
                "behavioral",
                "experience",
            }:
                item["question_type"] = "technical"

            if item.get("difficulty") not in {
                "easy",
                "medium",
                "hard",
            }:
                item["difficulty"] = "medium"

            if not isinstance(item.get("expected_answer"), str):
                item["expected_answer"] = ""

        # 5. Save questions to the database
        saved_questions = []

        for index, item in enumerate(questions_data, start=1):
            question = InterviewQuestion(
                interview_id=interview.id,
                question_text=item["question_text"].strip(),
                question_type=item["question_type"],
                difficulty=item["difficulty"],
                expected_answer=item["expected_answer"],
                order_number=index,
            )

            db.add(question)
            saved_questions.append(question)

        db.commit()

        for question in saved_questions:
            db.refresh(question)

        # 6. Return generated questions
        return {
            "message": "Interview questions generated successfully",
            "interview_id": interview.id,
            "total_questions": len(saved_questions),
            "questions": [
                {
                    "id": question.id,
                    "question_text": question.question_text,
                    "question_type": question.question_type,
                    "difficulty": question.difficulty,
                    "expected_answer": question.expected_answer,
                    "order_number": question.order_number,
                }
                for question in saved_questions
            ],
        }

    except json.JSONDecodeError:
        db.rollback()
        raise HTTPException(
            status_code=502,
            detail="AI returned invalid JSON. Please try again.",
        )

    except ValueError as exc:
        db.rollback()
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        )

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=502,
            detail="AI question generation failed. Please try again.",
        )

@router.get("/{interview_id}/questions")
def get_interview_questions(
    interview_id: int,
    db: Session = Depends(get_db),
):
    # Check whether the interview exists
    interview = (
        db.query(Interview)
        .filter(Interview.id == interview_id)
        .first()
    )

    if interview is None:
        raise HTTPException(
            status_code=404,
            detail="Interview not found",
        )

    # Fetch saved questions in the correct order
    questions = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.interview_id == interview_id)
        .order_by(InterviewQuestion.order_number.asc())
        .all()
    )

    return {
        "interview_id": interview_id,
        "total_questions": len(questions),
        "questions": [
            {
                "id": question.id,
                "question_text": question.question_text,
                "question_type": question.question_type,
                "difficulty": question.difficulty,
                "expected_answer": question.expected_answer,
                "order_number": question.order_number,
            }
            for question in questions
        ],
    }