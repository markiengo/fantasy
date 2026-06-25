from fastapi import APIRouter, Depends
from app.auth import get_current_user

router = APIRouter()


@router.get("/me")
def get_me_route(current_user = Depends(get_current_user)):
    return {
        "user_id": current_user["user_id"],
        "username": current_user["username"],
        "display_name": current_user["display_name"],
        "role": current_user["role"],
    }
