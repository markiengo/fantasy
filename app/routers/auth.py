import re

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import get_db
from app.queries.user import check_username_taken, get_email_by_username

router = APIRouter()

username_regex = re.compile(r"^[a-zA-Z0-9_]{3,20}$")


@router.get("/check-username")
def check_username(username: str = Query(...), conn=Depends(get_db)):
    if not username_regex.match(username):
        return {"available": False, "reason": "invalid"}
    taken = check_username_taken(conn, username)
    return {"available": not taken, "reason": "taken" if taken else "ok"}


@router.get("/lookup-username")
def lookup_username(username: str = Query(...), conn=Depends(get_db)):
    email = get_email_by_username(conn, username)
    if not email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Username not found")
    return {"email": email}
