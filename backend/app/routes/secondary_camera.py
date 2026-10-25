
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.session import InterviewSession


router = APIRouter(
    prefix="/api/sessions",
    tags=["Secondary Camera"],
)

# Temporary in-memory pairing store for local development.
# Pairings are lost when the backend restarts.
pairings: dict[int, dict] = {}


class PhoneConnectRequest(BaseModel):
    token: str


def get_active_session(session_id: int, db: Session):
    session = (
        db.query(InterviewSession)
        .filter(InterviewSession.id == session_id)
        .first()
    )

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    if session.status != "in_progress":
        raise HTTPException(
            status_code=400,
            detail="Interview session is not active",
        )

    return session


# 1. Create a pairing session and generate the QR-code URL.
@router.post("/{session_id}/secondary-camera/pair")
def create_pairing(
    session_id: int,
    db: Session = Depends(get_db),
):
    get_active_session(session_id, db)

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    pairings[session_id] = {
        "token": token,
        "expires_at": expires_at,
        "status": "waiting",
    }

    pairing_url = (
        f"https://armhole-sandbar-service.ngrok-free.dev/secondary-camera"
        f"?session_id={session_id}&token={token}"
    )

    return {
        "pairing_url": pairing_url,
        "token": token,
        "expires_at": expires_at.isoformat(),
    }


# 2. Check whether the phone has connected.
@router.get("/{session_id}/secondary-camera/status")
def get_pairing_status(
    session_id: int,
    db: Session = Depends(get_db),
):
    get_active_session(session_id, db)

    pairing = pairings.get(session_id)

    if pairing is None:
        return {"status": "idle"}

    if datetime.now(timezone.utc) >= pairing["expires_at"]:
        pairings.pop(session_id, None)
        return {"status": "error"}

    return {"status": pairing["status"]}


# 3. Connect the phone using the token from the QR code.
@router.post("/{session_id}/secondary-camera/connect")
def connect_phone(
    session_id: int,
    payload: PhoneConnectRequest,
    db: Session = Depends(get_db),
):
    get_active_session(session_id, db)

    pairing = pairings.get(session_id)

    if pairing is None:
        raise HTTPException(
            status_code=404,
            detail="Pairing session not found or expired",
        )

    if datetime.now(timezone.utc) >= pairing["expires_at"]:
        pairings.pop(session_id, None)
        raise HTTPException(
            status_code=410,
            detail="Pairing token has expired",
        )

    if not secrets.compare_digest(
        payload.token,
        pairing["token"],
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid pairing token",
        )

    pairing["status"] = "connected"

    return {
        "message": "Phone paired successfully",
        "session_id": session_id,
        "status": "connected",
    }


# 4. End the pairing session.
@router.delete("/{session_id}/secondary-camera/pair")
def delete_pairing(session_id: int):
    pairings.pop(session_id, None)

    return {
        "message": "Pairing ended",
        "status": "idle",
    }
