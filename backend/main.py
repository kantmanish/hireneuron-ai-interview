
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine

from app.models.interview import Interview
from app.models.question import InterviewQuestion
from app.models.session import InterviewSession
from app.models.answer import InterviewAnswer
from app.models.evaluation import AnswerEvaluation
from app.models.incident import ProctoringIncident

from app.routes.sessions import router as sessions_router
from app.routes.interviews import router as interviews_router
from app.routes.secondary_camera import router as secondary_camera_router


# Create database tables
Base.metadata.create_all(bind=engine)


# Create FastAPI application
app = FastAPI(
    title="HireNeuron API",
    description="AI-Powered Video Interview Agent",
    version="1.0.0",
)


# Allow the frontend to communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://192.168.126.139:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register API routes
app.include_router(interviews_router)
app.include_router(sessions_router)
app.include_router(secondary_camera_router)


# Home endpoint
@app.get("/")
def home():
    return {"message": "HireNeuron Backend is running!"}


# Health-check endpoint
@app.get("/health")
def health_check():
    return {"status": "healthy"}
