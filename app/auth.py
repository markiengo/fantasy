import json
import os
import time

import httpx
import jwt
from fastapi import Depends, Header, HTTPException, status
from jwt import InvalidTokenError
from jwt.algorithms import RSAAlgorithm, ECAlgorithm
from psycopg2.errors import UniqueViolation

from app.database import get_db
from app.queries.user import get_user_by_auth_id, create_user_from_auth

supabase_url = os.getenv("SUPABASE_URL")

if not supabase_url:
    raise RuntimeError("Missing SUPABASE_URL environment variable")

supabase_url = supabase_url.rstrip("/")

supabase_jwks_url = os.getenv(
    "SUPABASE_JWKS_URL",
    f"{supabase_url}/auth/v1/.well-known/jwks.json",
)

supabase_issuer = f"{supabase_url}/auth/v1"
supabase_audience = os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated")

jwks_cache_seconds = 60 * 10

_jwks_cache = {
    "keys": None,
    "expires_at": 0,
}


def get_bearer_token(authorization: str | None = Header(default=None)) -> str:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")

    prefix = "Bearer "
    if not authorization.startswith(prefix):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Authorization header")

    token = authorization[len(prefix):].strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    return token


def fetch_jwks():
    now = time.time()

    if _jwks_cache["keys"] and now < _jwks_cache["expires_at"]:
        return {"keys": _jwks_cache["keys"]}

    try:
        response = httpx.get(supabase_jwks_url, timeout=5, trust_env=False)
        response.raise_for_status()
        jwks = response.json()
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Could not fetch Supabase JWKS") from exc

    keys = jwks.get("keys")
    if not keys:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase JWKS contains no keys")

    _jwks_cache["keys"] = keys
    _jwks_cache["expires_at"] = now + jwks_cache_seconds

    return {"keys": keys}


def get_signing_key(token):
    try:
        unverified_header = jwt.get_unverified_header(token)
    except InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid JWT header") from exc

    kid = unverified_header.get("kid")
    if not kid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="JWT missing kid")

    jwks = fetch_jwks()

    for key in jwks["keys"]:
        if key.get("kid") == kid:
            return _key_from_jwk(key)

    # key may have rotated, clear cache and retry
    _jwks_cache["keys"] = None
    _jwks_cache["expires_at"] = 0

    jwks = fetch_jwks()

    for key in jwks["keys"]:
        if key.get("kid") == kid:
            return _key_from_jwk(key)

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No matching signing key found")


def _key_from_jwk(key):
    """Build a PyJWT signing key from a JWK, supporting RSA and EC keys."""
    kty = key.get("kty")
    if kty == "RSA":
        return RSAAlgorithm.from_jwk(json.dumps(key))
    if kty == "EC":
        return ECAlgorithm.from_jwk(json.dumps(key))
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=f"Unsupported JWT key type: {kty}",
    )


def decode_supabase_token(token):
    signing_key = get_signing_key(token)

    try:
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256", "ES256"],
            audience=supabase_audience,
            issuer=supabase_issuer,
            options={"require": ["exp", "sub"]},
            leeway=30,
        )
    except InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc

    return payload


DEMO_TOKEN = "demo-token"
DEMO_AUTH_USER_ID = "00000000-0000-0000-0000-000000000000"


def get_current_auth_payload(token: str = Depends(get_bearer_token)):
    if token == DEMO_TOKEN:
        return {"sub": DEMO_AUTH_USER_ID, "email": "demo@gaffer.com"}
    return decode_supabase_token(token)


def get_current_user(conn=Depends(get_db), payload: dict = Depends(get_current_auth_payload)):
    auth_user_id = payload["sub"]
    email = payload.get("email")

    user = get_user_by_auth_id(conn, auth_user_id)
    if not user:
        user_metadata = payload.get("user_metadata") or {}
        username = user_metadata.get("username") or email or f"user_{auth_user_id[:8]}"
        try:
            user = create_user_from_auth(conn, auth_user_id, username, username)
        except UniqueViolation:
            conn.rollback()
            user = get_user_by_auth_id(conn, auth_user_id)
            if not user:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create or find user")

    if not user["is_active"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")

    return user
