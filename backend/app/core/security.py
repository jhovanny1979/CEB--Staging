from __future__ import annotations

import hashlib
import os
from datetime import UTC, datetime, timedelta
from typing import Any

from jose import jwt
from passlib.context import CryptContext

from app.core.config import get_settings

pwd_context = CryptContext(schemes=['pbkdf2_sha256'], deprecated='auto')


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str, role: str) -> str:
    settings = get_settings()
    expire = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    payload: dict[str, Any] = {'sub': subject, 'role': role, 'typ': 'access', 'exp': expire}
    return jwt.encode(payload, settings.secret_key, algorithm='HS256')


def create_refresh_token(subject: str, role: str) -> str:
    settings = get_settings()
    expire = datetime.now(UTC) + timedelta(minutes=settings.refresh_token_expire_minutes)
    payload: dict[str, Any] = {'sub': subject, 'role': role, 'typ': 'refresh', 'exp': expire}
    return jwt.encode(payload, settings.secret_key, algorithm='HS256')


def decode_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    return jwt.decode(token, settings.secret_key, algorithms=['HS256'])


def create_random_token() -> str:
    return hashlib.sha256(os.urandom(64)).hexdigest()


def slugify(value: str) -> str:
    raw = value.lower().strip()
    repl = ''.join(ch if ch.isalnum() or ch in (' ', '-') else ' ' for ch in raw)
    slug = '-'.join(repl.split())
    return slug[:120]

