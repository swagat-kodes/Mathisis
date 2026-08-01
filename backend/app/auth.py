from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import get_supabase

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    """
    Validates the Supabase JWT sent in the Authorization header.
    Returns the user dict on success, raises 401 on failure.
    """
    token = credentials.credentials
    supabase = get_supabase()
    try:
        response = supabase.auth.get_user(token)
        if response.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        return response.user
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(exc)}",
        )


async def get_current_profile(
    user=Depends(get_current_user),
):
    """Fetches the user's profile row (includes role)."""
    supabase = get_supabase()
    result = (
        supabase.table("profiles")
        .select("*")
        .eq("id", user.id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Please complete registration.",
        )
    return result.data


async def require_admin(profile: dict = Depends(get_current_profile)):
    """Dependency that raises 403 if the user is not an admin."""
    if profile.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required for this action.",
        )
    return profile
