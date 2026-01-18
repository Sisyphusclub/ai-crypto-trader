"""Authentication and onboarding endpoints."""
import uuid
from collections import deque
from datetime import datetime, timedelta, timezone
from threading import Lock
from typing import Deque, Dict

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.settings import settings
from app.models import ExchangeAccount, ModelConfig, Strategy, Trader, User

router = APIRouter(prefix="/auth", tags=["auth"])

AUTH_COOKIE_NAME = "access_token"
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_TTL_MINUTES = 60 * 24 * 7
BCRYPT_ROUNDS = 12

_rate_lock = Lock()
_rate_buckets: Dict[str, Deque[float]] = {}
_RATE_BUCKET_MAX_KEYS = 10000


def _cleanup_stale_buckets(now: float, window: int):
    """Remove buckets that haven't been accessed within 2x window."""
    if len(_rate_buckets) < _RATE_BUCKET_MAX_KEYS:
        return
    cutoff = now - (window * 2)
    stale = [k for k, v in _rate_buckets.items() if not v or v[-1] < cutoff]
    for k in stale:
        del _rate_buckets[k]


def _is_secure_cookie() -> bool:
    return settings.APP_ENV.lower() not in ("dev", "local", "test")


def _client_key(request: Request) -> str:
    # Only trust X-Forwarded-For when behind a trusted reverse proxy
    if settings.TRUSTED_PROXY:
        forwarded = request.headers.get("x-forwarded-for", "")
        ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
    else:
        ip = request.client.host if request.client else "unknown"
    return f"{ip}:{request.url.path}"


def rate_limit(limit: int, window: int):
    def dep(request: Request):
        now = datetime.now(timezone.utc).timestamp()
        key = _client_key(request)
        with _rate_lock:
            _cleanup_stale_buckets(now, window)
            bucket = _rate_buckets.setdefault(key, deque())
            cutoff = now - window
            while bucket and bucket[0] < cutoff:
                bucket.popleft()
            if len(bucket) >= limit:
                retry_after = int(bucket[0] + window - now) + 1
                raise HTTPException(
                    status.HTTP_429_TOO_MANY_REQUESTS,
                    "Too many requests",
                    headers={"Retry-After": str(retry_after)},
                )
            bucket.append(now)
    return dep


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1, max_length=128)


class UserResponse(BaseModel):
    id: uuid.UUID
    username: str
    created_at: datetime


class OnboardingStatus(BaseModel):
    has_exchange: bool
    has_model: bool
    has_strategy: bool
    has_trader: bool
    complete: bool


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode()


def _verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def _create_token(user_id: uuid.UUID) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": str(user_id), "iat": int(now.timestamp()), "exp": int((now + timedelta(minutes=ACCESS_TOKEN_TTL_MINUTES)).timestamp())},
        settings.JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


def _decode_token(token: str) -> uuid.UUID:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return uuid.UUID(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError) as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token") from e


def _set_cookie(response: Response, token: str):
    response.set_cookie(
        AUTH_COOKIE_NAME, token,
        httponly=True, secure=_is_secure_cookie(), samesite="lax",
        max_age=ACCESS_TOKEN_TTL_MINUTES * 60, path="/",
    )


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(AUTH_COOKIE_NAME)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    user = db.query(User).filter(User.id == _decode_token(token)).first()
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    return user


def get_current_user_optional(request: Request, db: Session = Depends(get_db)) -> User | None:
    token = request.cookies.get(AUTH_COOKIE_NAME)
    if not token:
        return None
    try:
        user_id = _decode_token(token)
        return db.query(User).filter(User.id == user_id).first()
    except HTTPException:
        return None


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(rate_limit(5, 60))])
def register(payload: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    username = payload.username.strip()
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Username already exists")
    user = User(username=username, password_hash=_hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    _set_cookie(response, _create_token(user.id))
    return UserResponse(id=user.id, username=user.username, created_at=user.created_at)


@router.post("/login", response_model=UserResponse, dependencies=[Depends(rate_limit(10, 60))])
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not _verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    _set_cookie(response, _create_token(user.id))
    return UserResponse(id=user.id, username=user.username, created_at=user.created_at)


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(AUTH_COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/me", response_model=UserResponse, dependencies=[Depends(rate_limit(60, 60))])
def me(user: User = Depends(get_current_user)):
    return UserResponse(id=user.id, username=user.username, created_at=user.created_at)


@router.get("/onboarding-status", response_model=OnboardingStatus, dependencies=[Depends(rate_limit(60, 60))])
def onboarding_status(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    has_exchange = db.query(ExchangeAccount.id).filter(ExchangeAccount.user_id == user.id).first() is not None
    has_model = db.query(ModelConfig.id).filter(ModelConfig.user_id == user.id).first() is not None
    has_strategy = db.query(Strategy.id).filter(Strategy.user_id == user.id).first() is not None
    has_trader = db.query(Trader.id).filter(Trader.user_id == user.id).first() is not None
    return OnboardingStatus(
        has_exchange=has_exchange, has_model=has_model,
        has_strategy=has_strategy, has_trader=has_trader,
        complete=has_exchange and has_model and has_strategy and has_trader,
    )
