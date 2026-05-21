from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


# ── Job ───────────────────────────────────────────────────────────────────────

class JobBase(BaseModel):
    title: str
    company: str
    location: str
    description: str
    url: str
    source: str
    salary_range: Optional[str] = None
    job_type: Optional[str] = None
    remote: bool = False


class JobOut(JobBase):
    id: int
    external_id: str
    scraped_at: datetime
    status: str
    match_score: Optional[float] = None
    match_reason: Optional[str] = None
    application: Optional["ApplicationOut"] = None

    class Config:
        from_attributes = True


class JobStatusUpdate(BaseModel):
    status: str  # approved | rejected | skipped


# ── Application ───────────────────────────────────────────────────────────────

class ApplicationBase(BaseModel):
    job_id: int
    cv_html: Optional[str] = None
    cover_letter: Optional[str] = None
    notes: Optional[str] = None


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationOut(ApplicationBase):
    id: int
    applied_at: datetime
    status: str
    updated_at: datetime
    job: Optional["JobOut"] = None

    class Config:
        from_attributes = True


class ApplicationStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


# ── Profile ───────────────────────────────────────────────────────────────────

class ProfileIn(BaseModel):
    name: str = ""
    email: str = ""
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    summary: Optional[str] = None
    skills: list[str] = []
    experience: list[dict[str, Any]] = []
    education: list[dict[str, Any]] = []
    languages: list[dict[str, Any]] = []
    certifications: list[dict[str, Any]] = []


class ProfileOut(ProfileIn):
    id: int

    class Config:
        from_attributes = True


# ── SearchConfig ──────────────────────────────────────────────────────────────

class SearchConfigIn(BaseModel):
    keywords: list[str] = []
    location: str = "Italia"
    remote_only: bool = False
    sources: list[str] = ["linkedin", "adecco", "randstad"]
    max_applications_per_day: int = 10
    auto_apply: bool = False
    min_match_score: float = 65.0
    is_active: bool = True


class SearchConfigOut(SearchConfigIn):
    id: int

    class Config:
        from_attributes = True


# ── Stats ─────────────────────────────────────────────────────────────────────

class StatsOut(BaseModel):
    jobs_today: int
    pending_review: int
    applications_sent: int
    interviews: int
    offers: int
    total_jobs: int
    by_source: dict[str, int]
    by_status: dict[str, int]
    by_application_status: dict[str, int]
    timeline: list[dict[str, Any]]


# ── ScrapeLog ─────────────────────────────────────────────────────────────────

class ScrapeLogOut(BaseModel):
    id: int
    source: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    jobs_found: int
    jobs_new: int
    status: str
    error: Optional[str] = None

    class Config:
        from_attributes = True


# ── CV Generation ─────────────────────────────────────────────────────────────

class CVGenerateRequest(BaseModel):
    job_id: int


class CVGenerateResponse(BaseModel):
    cv_html: str
    cover_letter: str
    match_score: float
    match_reason: str


# Resolve forward references
JobOut.model_rebuild()
ApplicationOut.model_rebuild()
