import secrets
import hashlib
from datetime import datetime
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, select
from database import get_session
from models import APIToken

bearer_scheme = HTTPBearer()


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def generate_token() -> str:
    """Generate a secure random token."""
    return secrets.token_urlsafe(32)


def create_api_token(name: str, role: str, session: Session) -> str:
    """Create and store a new API token. Returns the raw token (shown once)."""
    raw = generate_token()
    db_token = APIToken(name=name, hashed_token=hash_token(raw), role=role)
    session.add(db_token)
    session.commit()
    return raw


def get_token_record(raw_token: str, session: Session) -> Optional[APIToken]:
    hashed = hash_token(raw_token)
    stmt = select(APIToken).where(APIToken.hashed_token == hashed, APIToken.revoked == False)
    return session.exec(stmt).first()


# ─── FastAPI Dependencies ───────────────────────────────────────────────────

def get_current_token(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    session: Session = Depends(get_session),
) -> APIToken:
    token = get_token_record(credentials.credentials, session)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or revoked token")
    # Update last_used_at
    token.last_used_at = datetime.utcnow()
    session.add(token)
    session.commit()
    return token


def require_admin(token: APIToken = Depends(get_current_token)) -> APIToken:
    if token.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return token


def require_operator(token: APIToken = Depends(get_current_token)) -> APIToken:
    if token.role not in ("admin", "operator"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operator role required")
    return token
