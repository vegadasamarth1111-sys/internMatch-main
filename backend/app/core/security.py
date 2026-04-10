import time

import jwt
from jwt import InvalidTokenError
from passlib.context import CryptContext

from app.core.config import (
    JWT_ALGORITHM,
    JWT_EXPIRE_SECONDS,
    JWT_REFRESH_EXPIRE_SECONDS,
    JWT_PRIVATE_KEY,
    JWT_PUBLIC_KEY,
)

pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(user_id: int, role: str) -> str:
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": int(time.time()) + JWT_EXPIRE_SECONDS,
        "type": "access",
    }
    return jwt.encode(payload, JWT_PRIVATE_KEY, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: int, role: str) -> str:
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": int(time.time()) + JWT_REFRESH_EXPIRE_SECONDS,
        "type": "refresh",
    }
    return jwt.encode(payload, JWT_PRIVATE_KEY, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(
            token,
            JWT_PUBLIC_KEY,
            algorithms=[JWT_ALGORITHM],
        )
    except InvalidTokenError:
        raise
    
def decode_refresh_token(token: str) -> dict:
    payload = decode_token(token)
    if payload.get("type") != "refresh":
        raise InvalidTokenError("Invalid token type")
    return payload