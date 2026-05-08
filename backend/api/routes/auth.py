"""Authentication routes."""

from __future__ import annotations

import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from core.config import settings
from core.database import get_db
from models.database import User, UserRole, utcnow
from models.schemas import (
    EmailVerificationResponse,
    GoogleAuthRequest,
    LoginRequest,
    PasswordChange,
    RefreshRequest,
    SignupResponse,
    TokenResponse,
    UserCreate,
    UserOut,
    UserUpdate,
)
from services.auth_service import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    revoke_refresh_token,
    verify_password,
)

router = APIRouter()


def _normalize_email(value: str) -> str:
    return value.strip().lower()


def _username_from_email(email: str) -> str:
    base = email.split("@", 1)[0]
    base = re.sub(r"[^A-Za-z0-9_]+", "_", base).strip("_").lower()
    return (base or f"user_{uuid.uuid4().hex[:8]}")[:40]


async def _ensure_unique_signup(payload: UserCreate, db: AsyncSession) -> None:
    email = _normalize_email(str(payload.email))
    username = payload.username.strip()
    result = await db.execute(
        select(User).where(
            (func.lower(User.email) == email)
            | (func.lower(User.username) == username.lower())
        )
    )
    for existing in result.scalars().all():
        if existing.email.lower() == email:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")
        if existing.username.lower() == username.lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This username is already taken.")


async def _unique_google_username(email: str, db: AsyncSession) -> str:
    base = _username_from_email(email)
    candidate = base
    suffix = 1
    while True:
        result = await db.execute(select(User.id).where(func.lower(User.username) == candidate.lower()))
        if result.scalar_one_or_none() is None:
            return candidate
        suffix += 1
        candidate = f"{base[:36]}_{suffix}"


def _verification_url(token: str) -> str:
    return f"{settings.FRONTEND_URL.rstrip('/')}/verify-email?token={token}"


def _token_response(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user=UserOut.model_validate(user),
    )


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> SignupResponse:
    """Create a public SaaS user account that can sign in immediately."""
    await _ensure_unique_signup(payload, db)
    user = User(
        email=_normalize_email(str(payload.email)),
        username=payload.username.strip(),
        full_name=payload.full_name,
        organisation=payload.organisation,
        hashed_password=hash_password(payload.password),
        role=UserRole.user,
        is_active=True,
        is_email_verified=True,
        email_verification_token=None,
        email_verification_sent_at=None,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return SignupResponse(
        message="Account created. You can sign in now.",
        email=user.email,
        verification_url=None,
    )


@router.get("/verify-email", response_model=EmailVerificationResponse)
async def verify_email(token: str, db: AsyncSession = Depends(get_db)) -> EmailVerificationResponse:
    """Verify a user's email address from the emailed token."""
    result = await db.execute(select(User).where(User.email_verification_token == token))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification link.")
    user.is_email_verified = True
    user.email_verification_token = None
    user.email_verification_sent_at = None
    await db.commit()
    return EmailVerificationResponse(message="Email verified. You can now sign in.")


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """Login with email and password."""
    identifier = payload.identifier.strip()
    lowered_identifier = identifier.lower()
    result = await db.execute(
        select(User).where(
            (func.lower(User.email) == lowered_identifier)
            | (func.lower(User.username) == lowered_identifier)
        )
    )
    user = result.scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Your account has been deactivated.")
    user.last_login = utcnow()
    await db.commit()
    await db.refresh(user)
    return _token_response(user)


@router.post("/google", response_model=TokenResponse)
async def google_auth(payload: GoogleAuthRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """Create or sign in a user from a verified Google ID token."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google sign-in is not configured.")
    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token
    except ImportError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google sign-in dependency is not installed.") from exc

    try:
        claims = id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google sign-in token.") from exc

    email = _normalize_email(str(claims.get("email") or ""))
    if not email or not claims.get("email_verified"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google account email is not verified.")

    user = (await db.execute(select(User).where(func.lower(User.email) == email))).scalar_one_or_none()
    if user is None:
        user = User(
            email=email,
            username=await _unique_google_username(email, db),
            full_name=claims.get("name"),
            avatar_url=claims.get("picture"),
            hashed_password=hash_password(uuid.uuid4().hex + "A1"),
            role=UserRole.user,
            is_active=True,
            is_email_verified=True,
        )
        db.add(user)
    elif not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Your account has been deactivated.")
    else:
        if not user.full_name and claims.get("name"):
            user.full_name = claims.get("name")
        if not user.avatar_url and claims.get("picture"):
            user.avatar_url = claims.get("picture")

    user.last_login = utcnow()
    await db.commit()
    await db.refresh(user)
    return _token_response(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """Refresh access token using a refresh token."""
    user_id = decode_refresh_token(payload.refresh_token)
    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User is inactive or not found.")
    return _token_response(user)


@router.post("/logout")
async def logout(payload: RefreshRequest) -> JSONResponse:
    """Invalidate refresh token in memory."""
    revoke_refresh_token(payload.refresh_token)
    return JSONResponse({"message": "logged out"})


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)) -> UserOut:
    """Return current user profile."""
    return UserOut.model_validate(current_user)


@router.put("/me", response_model=UserOut)
async def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    """Update current user profile."""
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    await db.commit()
    await db.refresh(current_user)
    return UserOut.model_validate(current_user)


@router.put("/me/password")
async def change_password(
    payload: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    """Change current user's password."""
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")
    current_user.hashed_password = hash_password(payload.new_password)
    await db.commit()
    return JSONResponse({"message": "password changed"})
