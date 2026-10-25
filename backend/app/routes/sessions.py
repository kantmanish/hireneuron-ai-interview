import os
import json

from groq import Groq
from app.models.evaluation import AnswerEvaluation
from app.models.answer import InterviewAnswer
from dotenv import load_dotenv

load_dotenv()
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.interview import Interview
from app.models.session import InterviewSession
from app.models.question import InterviewQuestion
from pydantic import BaseModel, Field
from app.models.answer import InterviewAnswer
from datetime import datetime, timezone
from app.models.incident import ProctoringIncident

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])
from pydantic import BaseModel, Field


class IncidentCreate(BaseModel):
    event_type: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=2000)

def evaluate_answer_with_ai(
    question_text: str,
    expected_answer: str,
    candidate_answer: str,
) -> dict:
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not configured")

    client = Groq(api_key=api_key)

    prompt = f"""
Evaluate the candidate's interview answer fairly.

Question:
{question_text}

Expected answer / key points:
{expected_answer or "No reference answer provided."}

Candidate answer:
{candidate_answer}

Give scores from 0 to 100 for:
- relevance_score
- correctness_score
- clarity_score

Calculate overall_score as:
(relevance_score + correctness_score + clarity_score) / 3

Return ONLY a valid JSON object in this format:
{{
  "relevance_score": 80,
  "correctness_score": 75,
  "clarity_score": 85,
  "overall_score": 80,
  "feedback": "Brief explanation of the assessment.",
  "improvement_suggestions": "Specific ways to improve the answer."
}}
"""

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a fair technical interview evaluator. "
                    "Evaluate evidence in the answer, not writing style alone. "
                    "Return valid JSON only."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        max_completion_tokens=1000,
    )

    content = response.choices[0].message.content

    if not content:
        raise ValueError("AI returned an empty evaluation")

    result = json.loads(content)

    score_fields = [
        "relevance_score",
        "correctness_score",
        "clarity_score",
        "overall_score",
    ]

    for field in score_fields:
        value = result.get(field)

        if (
            isinstance(value, bool)
            or not isinstance(value, (int, float))
            or not 0 <= value <= 100
        ):
            raise ValueError(f"AI returned an invalid {field}")

    result["overall_score"] = round(
        (
            result["relevance_score"]
            + result["correctness_score"]
            + result["clarity_score"]
        ) / 3,
        2,
    )

    if not isinstance(result.get("feedback"), str):
        raise ValueError("AI returned invalid feedback")

    if not isinstance(result.get("improvement_suggestions"), str):
        raise ValueError("AI returned invalid improvement suggestions")

    return result
class AnswerSubmit(BaseModel):
    question_id: int = Field(..., gt=0)
    transcript: str = Field(..., min_length=1, max_length=20000)




@router.post("/{interview_id}/start", status_code=201)
def start_interview_session(
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

    # Check whether interview questions exist
    question_count = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.interview_id == interview_id)
        .count()
    )

    if question_count == 0:
        raise HTTPException(
            status_code=400,
            detail="Generate interview questions before starting",
        )

    # Create a new interview session
    session = InterviewSession(
        interview_id=interview_id,
        status="in_progress",
        current_question_order=1,
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    return {
        "message": "Interview session started successfully",
        "session_id": session.id,
        "interview_id": session.interview_id,
        "status": session.status,
        "total_questions": question_count,
        "current_question_order": session.current_question_order,
        "started_at": session.started_at,
    }

@router.get("/{session_id}/next-question")
def get_next_question(
    session_id: int,
    db: Session = Depends(get_db),
):
    # Find the session
    session = (
        db.query(InterviewSession)
        .filter(InterviewSession.id == session_id)
        .first()
    )

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Interview session not found",
        )

    if session.status != "in_progress":
        raise HTTPException(
            status_code=400,
            detail="Interview session is not in progress",
        )

    # Get the next question
    question = (
        db.query(InterviewQuestion)
        .filter(
            InterviewQuestion.interview_id == session.interview_id,
            InterviewQuestion.order_number
            == session.current_question_order,
        )
        .first()
    )

    if question is None:
        return {
            "message": "All questions have been delivered",
            "session_id": session.id,
            "question": None,
        }

    return {
        "session_id": session.id,
        "question": {
            "id": question.id,
            "question_text": question.question_text,
            "question_type": question.question_type,
            "difficulty": question.difficulty,
            "order_number": question.order_number,
        },
    }

@router.post("/{session_id}/answers", status_code=201)
def submit_answer(
    session_id: int,
    payload: AnswerSubmit,
    db: Session = Depends(get_db),
):
    # 1. Find the session
    session = (
        db.query(InterviewSession)
        .filter(InterviewSession.id == session_id)
        .first()
    )

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Interview session not found",
        )

    if session.status != "in_progress":
        raise HTTPException(
            status_code=400,
            detail="Interview session is not in progress",
        )

    # 2. Find the question and verify it belongs to this interview
    question = (
        db.query(InterviewQuestion)
        .filter(
            InterviewQuestion.id == payload.question_id,
            InterviewQuestion.interview_id == session.interview_id,
        )
        .first()
    )

    if question is None:
        raise HTTPException(
            status_code=404,
            detail="Question not found for this interview",
        )

    # 3. Ensure the question is the current question
    if question.order_number != session.current_question_order:
        raise HTTPException(
            status_code=400,
            detail="This is not the current interview question",
        )

    # 4. Prevent duplicate answers for the same question/session
    existing_answer = (
        db.query(InterviewAnswer)
        .filter(
            InterviewAnswer.session_id == session_id,
            InterviewAnswer.question_id == payload.question_id,
        )
        .first()
    )

    if existing_answer is not None:
        raise HTTPException(
            status_code=409,
            detail="An answer for this question has already been submitted",
        )

    # 5. Save the candidate's answer
    answer = InterviewAnswer(
        session_id=session_id,
        question_id=payload.question_id,
        answer_text=payload.transcript.strip(),
    )

    db.add(answer)

    # Advance to the next question
    session.current_question_order += 1

    try:
        db.commit()
        db.refresh(answer)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not save the answer",
        )

    return {
        "message": "Answer submitted successfully",
        "session_id": session_id,
        "answer_id": answer.id,
        "question_id": answer.question_id,
        "next_question_order": session.current_question_order,
    }

@router.post("/{session_id}/finish")
def finish_interview_session(
    session_id: int,
    db: Session = Depends(get_db),
):
    # 1. Find the session
    session = (
        db.query(InterviewSession)
        .filter(InterviewSession.id == session_id)
        .first()
    )

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Interview session not found",
        )

    if session.status != "in_progress":
        raise HTTPException(
            status_code=400,
            detail="Interview session is not in progress",
        )

    # 2. Load all submitted answers in question order
    answers = (
        db.query(InterviewAnswer, InterviewQuestion)
        .join(
            InterviewQuestion,
            InterviewQuestion.id == InterviewAnswer.question_id,
        )
        .filter(InterviewAnswer.session_id == session_id)
        .order_by(InterviewQuestion.order_number.asc())
        .all()
    )

    if not answers:
        raise HTTPException(
            status_code=400,
            detail="Cannot finish an interview without answers",
        )

    # 3. Evaluate answers that have not been evaluated yet
    try:
        for answer, question in answers:
            existing_evaluation = (
                db.query(AnswerEvaluation)
                .filter(AnswerEvaluation.answer_id == answer.id)
                .first()
            )

            if existing_evaluation is not None:
                continue

            result = evaluate_answer_with_ai(
                question_text=question.question_text,
                expected_answer=question.expected_answer or "",
                candidate_answer=answer.answer_text,
            )

            evaluation = AnswerEvaluation(
                answer_id=answer.id,
                relevance_score=result["relevance_score"],
                correctness_score=result["correctness_score"],
                clarity_score=result["clarity_score"],
                overall_score=result["overall_score"],
                feedback=result["feedback"],
                improvement_suggestions=result["improvement_suggestions"],
            )

            db.add(evaluation)

        # Commit evaluations before marking session completed
        db.commit()

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=502,
            detail=(
                "AI evaluation failed. The session remains in progress; "
                "please retry."
            ),
        )

    # 4. Mark session as completed only after evaluation succeeds
    session.status = "completed"
    session.finished_at = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(session)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not finish the interview session",
        )

    return {
        "message": "Interview finished and answers evaluated successfully",
        "session_id": session.id,
        "status": session.status,
        "total_answered": len(answers),
        "evaluated_answers": (
            db.query(AnswerEvaluation)
            .join(
                InterviewAnswer,
                InterviewAnswer.id == AnswerEvaluation.answer_id,
            )
            .filter(InterviewAnswer.session_id == session_id)
            .count()
        ),
        "finished_at": session.finished_at,
    }

@router.get("/{session_id}/report")
def get_interview_report(
    session_id: int,
    db: Session = Depends(get_db),
):
    # 1. Find the session
    session = (
        db.query(InterviewSession)
        .filter(InterviewSession.id == session_id)
        .first()
    )

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Interview session not found",
        )

    # 2. Get all questions for this interview
    questions = (
        db.query(InterviewQuestion)
        .filter(
            InterviewQuestion.interview_id == session.interview_id
        )
        .order_by(InterviewQuestion.order_number.asc())
        .all()
    )

    # 3. Get the candidate's answers and their evaluations
    report_items = []

    for question in questions:
        answer = (
            db.query(InterviewAnswer)
            .filter(
                InterviewAnswer.session_id == session_id,
                InterviewAnswer.question_id == question.id,
            )
            .first()
        )

        evaluation = None

        if answer is not None:
            evaluation = (
                db.query(AnswerEvaluation)
                .filter(
                    AnswerEvaluation.answer_id == answer.id
                )
                .first()
            )

        report_items.append(
            {
                "question_id": question.id,
                "question_text": question.question_text,
                "question_type": question.question_type,
                "difficulty": question.difficulty,
                "answer_text": answer.answer_text if answer else None,
                "evaluation": (
                    {
                        "relevance_score": evaluation.relevance_score,
                        "correctness_score": evaluation.correctness_score,
                        "clarity_score": evaluation.clarity_score,
                        "overall_score": evaluation.overall_score,
                        "feedback": evaluation.feedback,
                        "improvement_suggestions": (
                            evaluation.improvement_suggestions
                        ),
                    }
                    if evaluation
                    else None
                ),
            }
        )

    # 4. Calculate average score for evaluated answers
    evaluated_scores = [
        item["evaluation"]["overall_score"]
        for item in report_items
        if item["evaluation"] is not None
    ]

    average_score = (
        round(sum(evaluated_scores) / len(evaluated_scores), 2)
        if evaluated_scores
        else None
    )
    # Fetch incidents belonging to this session
    incidents = (
        db.query(ProctoringIncident)
        .filter(ProctoringIncident.session_id == session_id)
        .order_by(ProctoringIncident.occurred_at.asc())
        .all()
    )

    incident_items = [
        {
            "id": incident.id,
            "event_type": incident.incident_type,
            "description": incident.description or "",
            "timestamp": incident.occurred_at,
        }
        for incident in incidents
    ]

    # 5. Return the report
    return {
        "session_id": session.id,
        "interview_id": session.interview_id,
        "status": session.status,
        "started_at": session.started_at,
        "finished_at": session.finished_at,
        "total_questions": len(questions),
        "answered_questions": sum(
            1 for item in report_items if item["answer_text"] is not None
        ),
        "evaluated_answers": len(evaluated_scores),
        "average_score": average_score,
        "questions": report_items,
        "incidents": incident_items,
        "score_note": (
            "Scores are AI-generated assessments intended to support "
            "human review, not automatic candidate rejection."
        ),
    }

@router.post("/{session_id}/incidents", status_code=201)
def create_proctoring_incident(
    session_id: int,
    payload: IncidentCreate,
    db: Session = Depends(get_db),
):
    # Check whether the session exists
    session = (
        db.query(InterviewSession)
        .filter(InterviewSession.id == session_id)
        .first()
    )

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Interview session not found",
        )

    # Accept incidents only while the session is active
    if session.status != "in_progress":
        raise HTTPException(
            status_code=400,
            detail="Cannot add incidents to an inactive session",
        )

    # Save the incident
    incident = ProctoringIncident(
        session_id=session_id,
        incident_type=payload.event_type.strip(),
        description=(
            payload.description.strip()
            if payload.description
            else None
        ),
    )

    if not incident.incident_type:
        raise HTTPException(
            status_code=422,
            detail="Incident type cannot be empty",
        )

    try:
        db.add(incident)
        db.commit()
        db.refresh(incident)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not save proctoring incident",
        )

    return {
        "message": "Proctoring incident recorded successfully",
        "incident_id": incident.id,
        "session_id": incident.session_id,
        "incident_type": incident.incident_type,
        "description": incident.description,
        "occurred_at": incident.occurred_at,
        "note": "An incident is an observation, not proof of cheating.",
    }