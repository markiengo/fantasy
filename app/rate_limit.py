import time
from collections import deque

from fastapi import HTTPException, status

_buckets = {}
_max_buckets = 10000


def _client_id(request):
    if request is None:
        return "test-client"
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def enforce_rate_limit(request, action, limit, window_seconds):
    now = time.monotonic()
    if len(_buckets) >= _max_buckets:
        for bucket_key, bucket in list(_buckets.items()):
            while bucket and bucket[0] <= now - window_seconds:
                bucket.popleft()
            if not bucket:
                del _buckets[bucket_key]
        if len(_buckets) >= _max_buckets:
            _buckets.pop(next(iter(_buckets)))

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