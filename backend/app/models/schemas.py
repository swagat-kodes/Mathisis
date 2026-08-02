from typing import Optional
from pydantic import BaseModel, Field


# ── Admin ──────────────────────────────────────────────────
class SubjectCreate(BaseModel):
    year: int = Field(..., ge=1, le=4)
    semester: int = Field(..., ge=1, le=8)
    subject_name: str


# ── Student ────────────────────────────────────────────────
class AskRequest(BaseModel):
    subject_id: str
    query: str = Field(..., min_length=3, max_length=1000)
    answer_style: Optional[str] = Field("concise", pattern="^(concise|detailed)$")


class Source(BaseModel):
    book_name: str
    page_number: Optional[int]
    similarity: Optional[float]


class AskResponse(BaseModel):
    answer: str
    sources: list[Source]


# ── Forum ──────────────────────────────────────────────────
class ForumQueryCreate(BaseModel):
    subject_id: str
    title: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=10)


class ForumQueryStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(open|closed)$")


class ForumQueryOut(BaseModel):
    id: str
    student_id: str
    subject_id: str
    title: str
    content: str
    status: str
    is_flagged: bool
    created_at: str
