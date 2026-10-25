
# HireNeuron API Contract

Base URL: http://localhost:8000

## 1. Create Interview
POST /api/interviews

Request:
{
  "job_title": "Python Developer",
  "job_description": "Develop APIs using Python",
  "required_skills": ["Python", "FastAPI"],
  "question_limit": 10,
  "duration_minutes": 20
}

## 2. Upload Resume
POST /api/interviews/{id}/resume
Content-Type: multipart/form-data
Field: file

## 3. Generate Questions
POST /api/interviews/{id}/generate-questions

## 4. Get Interview
GET /api/interviews/{id}

## 5. Start Session
POST /api/sessions/{id}/start

## 6. Get Next Question
GET /api/sessions/{id}/next-question

## 7. Submit Answer
POST /api/sessions/{id}/answers

Request:
{
  "question_id": 1,
  "transcript": "I used FastAPI to build REST APIs."
}

## 8. Log Proctoring Incident
POST /api/sessions/{id}/incidents

Request:
{
  "event_type": "camera_disconnected",
  "description": "Camera stream interrupted"
}

## 9. Finish Session
POST /api/sessions/{id}/finish

## 10. Get Report
GET /api/sessions/{id}/report

## Rules
- Backend owns database storage and AI API calls.
- Frontend never contains API provider secrets.
- Use consistent field names across modules.
- Proctoring incidents are observations, not proof of cheating.
- AI scores support human review; they do not automatically reject candidates.
