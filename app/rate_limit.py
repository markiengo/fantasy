import time
from collections import deque

from fastapi import HTTPException, status

_buckets = {}


def _client_id(request):
    if request is None:
        return "test-client"
    forwarded = request.headers.get("x-forwarded-for") if request.headers else None
    if forwarded:
        for part in forwarded.split(","):
            value = part.strip()
            if value:
                return value
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def enforce_rate_limit(request, action, limit, window_seconds):
    now = time.monotonic()
    key = (action, _client_id(request))
    bucket = _buckets.get(key)
    if bucket is None:
        bucket = deque()
        _buckets[key] = bucket

    cutoff = now - window_seconds
    while bucket and bucket[0] <= cutoff:
        bucket.popleft()

    if len(bucket) >= limit:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many attempts. Try again later.")

    bucket.append(now)


def clear_rate_limits():
    _buckets.clear()