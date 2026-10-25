# HireNeuron — AI-Powered Video Interview Agent

HireNeuron is a web-based interview platform designed to simplify interview preparation and management. It brings interview configuration, AI-assisted question generation, candidate interview sessions, answer evaluation, and proctoring-related workflows into a single application.

The project uses a React frontend and a Python FastAPI backend, with Groq providing AI capabilities where configured.

## Live Application

| Component                     | Link                                                           |
| ----------------------------- | -------------------------------------------------------------- |
| Web Application               | https://hireneuron-ai-interview-frontend-ry68wa9ax.vercel.app/ |
| Backend API                   | https://hireneuron-ai-interview.onrender.com                   |
| Interactive API Documentation | https://hireneuron-ai-interview.onrender.com/docs              |
| Source Code                   | https://github.com/kantmanish/hireneuron-ai-interview          |

## Overview

Preparing and managing interviews can involve repetitive work, inconsistent question selection, and information spread across different tools. HireNeuron aims to bring these activities together in one place.

Recruiters can configure interviews around a job role and its required skills. The backend supports AI-assisted question generation and manages the data associated with interviews and candidate sessions. Candidate answers and evaluation results can be stored for subsequent review.

The project also includes secondary-camera pairing and proctoring-related functionality. The exact capabilities available in the deployed application depend on the current implementation.

## Features

### Interview Management

* Create interview configurations using job details and required skills.
* Configure the number of questions and interview duration.
* Retrieve interview information through the backend API.

### AI-Assisted Question Generation

* Generate interview questions using the configured Groq API integration.
* Organize questions by type and difficulty.
* Store generated questions for retrieval during an interview.

### Resume Processing

* Upload PDF resumes associated with an interview.
* Extract readable text from supported PDFs.
* Make extracted resume text available to backend processing.

The current PDF extraction implementation supports text-based PDFs. Scanned image-only documents may require additional OCR support.

### Interview Sessions

* Start an interview session associated with an interview configuration.
* Retrieve questions in sequence.
* Submit candidate answers through the backend.
* Track session progress and completion.

### Answer Evaluation and Reporting

* Store candidate answers.
* Generate AI-assisted answer evaluations where configured.
* Maintain relevance, correctness, and clarity scores.
* Store feedback and improvement suggestions.
* Retrieve interview information and evaluation results through the report API.

AI-generated evaluations are intended to support human review. They should not be treated as definitive measures of a candidate's ability or used as the sole basis for rejecting a candidate.

### Proctoring-Related Workflows

* Record proctoring incidents associated with an active interview session.
* Store event details and timestamps.
* Support secondary-camera pairing functionality.

A recorded incident is an observation, not proof of cheating. Secondary-camera pairing alone does not establish that complete live-video analysis or automated proctoring is available.

## Technology Stack

| Technology     | Purpose                                        |
| -------------- | ---------------------------------------------- |
| React          | Frontend user interface                        |
| Vite           | Frontend development and build tooling         |
| Python         | Backend application logic                      |
| FastAPI        | REST API development                           |
| SQLAlchemy     | Database access and ORM                        |
| SQLite         | Local development database                     |
| Groq API       | AI-assisted question generation and evaluation |
| PyMuPDF        | PDF text extraction                            |
| Pydantic       | Request validation and data schemas            |
| Uvicorn        | ASGI application server                        |
| Git and GitHub | Version control and source code management     |
| Vercel         | Frontend hosting                               |
| Render         | Backend hosting                                |

## System Architecture

HireNeuron separates the frontend, backend, database access, and AI integration into distinct components.

```text
                 Recruiter / Candidate
                          |
                          v
                   React + Vite
                     Frontend
                          |
                       HTTPS
                          |
                          v
                    FastAPI API
                    (Python)
                          |
             +------------+------------+
             |            |            |
             v            v            v
         SQLAlchemy     Groq API    PDF Processing
             |
             v
       Configured Database
```

The frontend handles user interaction and communicates with the backend through HTTP requests. FastAPI processes those requests, SQLAlchemy manages database operations, and the backend calls the AI provider when an AI-powered operation is requested.

The frontend and backend are deployed independently, allowing each component to be developed and maintained separately.

## Backend API

The backend exposes endpoints for interview configuration, question generation, session management, answer submission, evaluation, reporting, and proctoring incidents.

The interactive Swagger documentation provides the available routes, request schemas, and response formats.

### Interview Endpoints

| Method | Endpoint                                            | Purpose                      |
| ------ | --------------------------------------------------- | ---------------------------- |
| POST   | `/api/interviews`                                   | Create an interview          |
| GET    | `/api/interviews/{interview_id}`                    | Retrieve an interview        |
| POST   | `/api/interviews/{interview_id}/resume`             | Upload a PDF resume          |
| POST   | `/api/interviews/{interview_id}/generate-questions` | Generate interview questions |
| GET    | `/api/interviews/{interview_id}/questions`          | Retrieve interview questions |

### Interview Session Endpoints

| Method | Endpoint                                   | Purpose                                  |
| ------ | ------------------------------------------ | ---------------------------------------- |
| POST   | `/api/sessions/{interview_id}/start`       | Start an interview session               |
| GET    | `/api/sessions/{session_id}/next-question` | Retrieve the next question               |
| POST   | `/api/sessions/{session_id}/answers`       | Submit a candidate answer                |
| POST   | `/api/sessions/{session_id}/incidents`     | Record a proctoring incident             |
| POST   | `/api/sessions/{session_id}/finish`        | Finish a session and process evaluations |
| GET    | `/api/sessions/{session_id}/report`        | Retrieve the interview report            |

**Note:** The exact route paths and request fields should be checked against the current API contract or Swagger documentation before integration. The session-start endpoint takes an interview ID, while subsequent session operations use a session ID.

## Database Design

SQLAlchemy models define the application's data structures.

The core database entities are:

| Entity               | Responsibility                                                                 |
| -------------------- | ------------------------------------------------------------------------------ |
| `Interview`          | Stores job details, interview configuration, status, and extracted resume text |
| `InterviewQuestion`  | Stores generated questions, their categories, difficulty, and ordering         |
| `InterviewSession`   | Tracks a candidate's interview attempt and session status                      |
| `InterviewAnswer`    | Stores submitted answers associated with sessions and questions                |
| `AnswerEvaluation`   | Stores AI evaluation scores, feedback, and improvement suggestions             |
| `ProctoringIncident` | Stores recorded proctoring events                                              |

SQLite is used for local development in the current backend configuration. The production database configuration and persistence requirements should be verified separately before relying on the application for long-term storage.

## Getting Started

### Prerequisites

Install the following before running the project locally:

* Python 3.12 or a compatible Python version.
* Node.js and npm for the frontend.
* Git.
* A Groq API key for AI-powered operations.

### 1. Clone the Repository

```bash
git clone https://github.com/kantmanish/hireneuron-ai-interview.git
cd hireneuron-ai-interview
```

### 2. Set Up the Backend

Open a terminal in the project directory and navigate to the backend:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

On macOS or Linux:

```bash
source venv/bin/activate
```

Install the Python dependencies:

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a `.env` file inside the `backend` directory.

Add the following variable:

```env
GROQ_API_KEY=your_groq_api_key
```

Replace the placeholder with your own API key.

**Keep the API key private. Do not commit `.env` to Git or expose the key in frontend code.**

### 4. Start the Backend

From the `backend` directory, run:

```bash
python -m uvicorn main:app --reload
```

The backend should be available at:

* API: http://127.0.0.1:8000
* Swagger documentation: http://127.0.0.1:8000/docs

The database is created or accessed according to the configured SQLAlchemy database URL and model initialization.

### 5. Set Up the Frontend

Open a separate terminal at the project root:

```bash
cd frontend
npm install
```

Configure the frontend environment variables using the convention supported by the current frontend implementation.

For the deployed setup, the documented values are:

```env
VITE_API_BASE_URL=https://hireneuron-ai-interview.onrender.com/api
VITE_USE_MOCK=false
```

For local development, configure the API base URL to match the local backend and the URL convention used by the frontend code.

Start the Vite development server:

```bash
npm run dev
```

Use the local URL printed by Vite to open the frontend.

**Important:** The frontend and backend must be configured to communicate with each other. Cross-origin requests may require an appropriate CORS configuration in FastAPI.

## Typical Interview Workflow

1. A recruiter creates an interview configuration.
2. A resume can be uploaded if required.
3. The backend generates interview questions using the configured AI integration.
4. A candidate interview session is started.
5. The frontend retrieves and displays questions.
6. Candidate answers are submitted to the backend.
7. Proctoring events can be recorded during an active session.
8. The session is finished and submitted answers are evaluated where configured.
9. The report endpoint provides the stored interview and evaluation information.

The complete sequence should be tested against the current deployment before being treated as a fully verified end-to-end workflow.

## Configuration and Security

* Store API keys in server-side environment variables.
* Keep `.env` files out of version control.
* Do not expose provider credentials in frontend code.
* Validate uploaded files and incoming request data.
* Review access controls before storing real candidate information.
* Confirm database persistence settings for the production environment.
* Treat AI-generated evaluations as decision-support information.
* Treat proctoring incidents as observations requiring context and review.

## Current Scope and Limitations

HireNeuron provides the core structure for an AI-assisted interview workflow. The following points should be considered when running or extending the project:

* PDF text extraction may not work for scanned image-only resumes.
* AI operations depend on a valid provider key and API availability.
* AI-generated scores and feedback may be imperfect.
* Secondary-camera pairing does not necessarily imply live-video transmission or automated video analysis.
* Production database persistence must be verified for the deployed environment.
* Authentication, authorization, and protection of candidate information should be reviewed before real-world use.
* Frontend-to-backend communication and the full interview flow should be tested in the deployed application.

## Contributing

Contributions should follow the existing separation between frontend and backend responsibilities.

1. Review the API contract before changing endpoint behavior.
2. Keep request and response fields consistent across components.
3. Test changes locally before integrating them.
4. Keep credentials and other secrets out of source control.
5. Update the documentation when endpoints, configuration, or workflows change.

## License

No license information has been specified in this README. Add an appropriate license file if the project is intended for reuse or redistribution.

## Acknowledgements

Built as a collaborative project exploring AI-assisted interview management, backend API development, and proctoring-related workflows.
