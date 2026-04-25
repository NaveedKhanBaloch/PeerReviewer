"""Authentication routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from core.database import get_db
from models.database import User, utcnow
from models.schemas import LoginRequest, PasswordChange, RefreshRequest, TokenResponse, UserOut, UserUpdate
from services.auth_service import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    revoke_refresh_token,
    verify_password,
)

router = APIRouter()


def _token_response(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.id, user.role.value),
        refresh_token=create_refresh_token(user.id),
        user=UserOut.model_validate(user),
    )


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
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Your account has been deactivated. Contact your administrator.")
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
