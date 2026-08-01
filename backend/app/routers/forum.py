from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import get_current_profile, get_current_user, require_admin
from app.database import get_supabase
from app.models.schemas import ForumQueryCreate, ForumQueryStatusUpdate

router = APIRouter(prefix="/forum", tags=["Forum"])


@router.get("/queries")
async def list_queries(
    subject_id: str = Query(..., description="Filter by subject UUID"),
    _user=Depends(get_current_user),
):
    """Returns all queries for a given subject, newest first."""
    supabase = get_supabase()
    result = (
        supabase.table("student_queries")
        .select("*")
        .eq("subject_id", subject_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.post("/queries", status_code=status.HTTP_201_CREATED)
async def create_query(
    body: ForumQueryCreate,
    profile: dict = Depends(get_current_profile),
):
    """Creates a new forum query. Any authenticated user can post."""
    supabase = get_supabase()
    result = (
        supabase.table("student_queries")
        .insert({
            "student_id": profile["id"],
            "subject_id": body.subject_id,
            "title": body.title,
            "content": body.content,
        })
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create query.",
        )
    return result.data[0]


@router.patch("/queries/{query_id}/status")
async def update_query_status(
    query_id: str,
    body: ForumQueryStatusUpdate,
    _admin=Depends(require_admin),
):
    """Admin-only: close or reopen a forum query."""
    supabase = get_supabase()
    result = (
        supabase.table("student_queries")
        .update({"status": body.status})
        .eq("id", query_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Query not found.",
        )
    return result.data[0]


@router.patch("/queries/{query_id}/flag")
async def flag_query(
    query_id: str,
    _admin=Depends(require_admin),
):
    """Admin-only: toggles the is_flagged state of a query."""
    supabase = get_supabase()

    # Fetch current state
    current = (
        supabase.table("student_queries")
        .select("is_flagged")
        .eq("id", query_id)
        .single()
        .execute()
    )
    if not current.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Query not found.",
        )

    new_state = not current.data["is_flagged"]
    result = (
        supabase.table("student_queries")
        .update({"is_flagged": new_state})
        .eq("id", query_id)
        .execute()
    )
    return result.data[0]


@router.delete("/queries/{query_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_query(
    query_id: str,
    _admin=Depends(require_admin),
):
    """Admin-only: permanently deletes a forum query."""
    supabase = get_supabase()
    result = (
        supabase.table("student_queries")
        .delete()
        .eq("id", query_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Query not found.",
        )
