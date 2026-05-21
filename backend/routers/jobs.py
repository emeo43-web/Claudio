from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Job
from ..schemas import CVGenerateResponse, JobOut, JobStatusUpdate

router = APIRouter()


@router.get("", response_model=list[JobOut])
def list_jobs(
    status: Optional[str] = None,
    source: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    q = db.query(Job)
    if status:
        q = q.filter(Job.status == status)
    if source:
        q = q.filter(Job.source == source)
    if search:
        term = f"%{search}%"
        q = q.filter(Job.title.ilike(term) | Job.company.ilike(term))
    return q.order_by(Job.match_score.desc().nullslast(), Job.scraped_at.desc()).offset(skip).limit(limit).all()


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.patch("/{job_id}/status", response_model=JobOut)
def update_job_status(job_id: int, body: JobStatusUpdate, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    valid = {"pending", "approved", "rejected", "applied", "skipped"}
    if body.status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid: {valid}")
    job.status = body.status
    db.commit()
    db.refresh(job)
    return job


@router.post("/{job_id}/generate-cv", response_model=CVGenerateResponse)
def generate_cv(job_id: int, db: Session = Depends(get_db)):
    from ..models import Profile
    from ..services.cv_generator import generate_cv_and_letter

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    profile = db.query(Profile).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Profile not configured")

    result = generate_cv_and_letter(job, profile)

    job.match_score = result["match_score"]
    job.match_reason = result["match_reason"]
    db.commit()

    return CVGenerateResponse(**result)


@router.post("/{job_id}/apply")
def apply_to_job(job_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    from ..models import Application, Profile
    from ..services.applicator import submit_application

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status not in ("approved",):
        raise HTTPException(status_code=400, detail="Job must be approved before applying")
    if job.application:
        raise HTTPException(status_code=400, detail="Already applied to this job")

    profile = db.query(Profile).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Profile not configured")

    from ..services.cv_generator import generate_cv_and_letter
    cv_data = generate_cv_and_letter(job, profile)

    app = Application(
        job_id=job_id,
        cv_html=cv_data["cv_html"],
        cover_letter=cv_data["cover_letter"],
        status="sent",
    )
    db.add(app)
    job.status = "applied"
    job.match_score = cv_data["match_score"]
    job.match_reason = cv_data["match_reason"]
    db.commit()
    db.refresh(app)

    background_tasks.add_task(submit_application, job, profile, cv_data["cv_html"])

    return {"message": "Application queued", "application_id": app.id}


@router.delete("/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()
    return {"message": "Deleted"}
