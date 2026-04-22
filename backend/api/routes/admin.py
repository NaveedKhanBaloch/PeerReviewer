"""Admin-only user and dashboard routes."""

from __future__ import annotations

import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import require_admin
from core.database import get_db
from models.database import Review, User, UserRole
from models.schemas import AdminPasswordReset, AdminStats, AdminUserUpdate, UserCreate, UserListItem, UserOut, UsersPage
from services.auth_service import hash_password, validate_password_strength

router = APIRouter()


def validate_new_password(password: str) -> None:
    """Min 8 chars, 1 uppercase, 1 digit."""
    if not validate_password_strength(password):
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters and include 1 uppercase letter and 1 number.")


def validate_username(username: str) -> None:
    """3-50 chars, alphanumeric + underscore only."""
    if not re.fullmatch(r"[A-Za-z0-9_]{3,50}", username):
        raise HTTPException(status_code=400, detail="Username must be 3-50 characters: letters, numbers, underscores only.")


async def _user_out_with_counts(db: AsyncSession, limit: int, offset: int) -> UsersPage:
    count_result = await db.execute(select(func.count()).select_from(User))
    total = int(count_result.scalar_one())
    result = await db.execute(select(User).order_by(User.created_at.desc()).offset(offset).limit(limit))
    users = result.scalars().all()
    items: list[UserListItem] = []
    for user in users:
        review_count = await db.execute(select(func.count()).select_from(Review).where(Review.created_by_user_id == user.id))
        items.append(
            UserListItem(
                id=user.id,
                email=user.email,
                username=user.username,
                full_name=user.full_name,
                role=user.role.value,
                is_active=user.is_active,
                organisation=user.organisation,
                created_at=user.created_at,
                last_login=user.last_login,
                total_reviews=int(review_count.scalar_one()),
            )
        )
    return UsersPage(users=items, total=total)


@router.get("/users", response_model=UsersPage)
async def list_users(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> UsersPage:
    """List users with review counts."""
    return await _user_out_with_counts(db, limit, offset)


@router.post("/users", response_model=UserOut)
async def create_user(payload: UserCreate, _admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)) -> UserOut:
    """Create a user account."""
    validate_username(payload.username)
    validate_new_password(payload.password)
    role = UserRole.admin if payload.role == "admin" else UserRole.user
    email = payload.email.lower()
    existing = await db.execute(select(User).where((User.email == email) | (User.username == payload.username)))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Email or username already exists.")
    user = User(
        email=email,
        username=payload.username,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=role,
        organisation=payload.organisation,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserOut.model_validate(user)


@router.get("/users/{user_id}", response_model=UserOut)
async def get_user(user_id: str, _admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)) -> UserOut:
    """Get user details."""
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    return UserOut.model_validate(user)


@router.put("/users/{user_id}", response_model=UserOut)
async def update_user(
    user_id: str,
    payload: AdminUserUpdate,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    """Update user details."""
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    data = payload.model_dump(exclude_unset=True)
    if "role" in data:
        data["role"] = UserRole.admin if data["role"] == "admin" else UserRole.user
    for field, value in data.items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return UserOut.model_validate(user)


@router.post("/users/{user_id}/reset-password")
async def reset_password(
    user_id: str,
    payload: AdminPasswordReset,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    """Reset a user's password."""
    validate_new_password(payload.new_password)
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    user.hashed_password = hash_password(payload.new_password)
    await db.commit()
    return JSONResponse({"message": "password reset"})


@router.delete("/users/{user_id}")
async def deactivate_user(user_id: str, _admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)) -> JSONResponse:
    """Deactivate a user account."""
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    user.is_active = False
    await db.commit()
    return JSONResponse({"message": "deactivated"})


@router.get("/stats", response_model=AdminStats)
async def get_stats(_admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)) -> AdminStats:
    """Return dashboard statistics."""
    total_users = int((await db.execute(select(func.count()).select_from(User))).scalar_one())
    active_users = int((await db.execute(select(func.count()).select_from(User).where(User.is_active.is_(True)))).scalar_one())
    total_reviews = int((await db.execute(select(func.count()).select_from(Review))).scalar_one())
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    reviews_this_month = int((await db.execute(select(func.count()).select_from(Review).where(Review.created_at >= month_start))).scalar_one())
    return AdminStats(
        total_users=total_users,
        active_users=active_users,
        total_reviews=total_reviews,
        reviews_this_month=reviews_this_month,
    )
