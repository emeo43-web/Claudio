from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Application, Job
from ..schemas import StatsOut

router = APIRouter()


@router.get("", response_model=StatsOut)
def get_stats(db: Session = Depends(get_db)):
    today = datetime.utcnow().date()
    today_start = datetime.combine(today, datetime.min.time())

    jobs_today = db.query(Job).filter(Job.scraped_at >= today_start).count()
    pending = db.query(Job).filter(Job.status == "pending").count()
    total_jobs = db.query(Job).count()
    applications_sent = db.query(Application).count()
    interviews = db.query(Application).filter(Application.status == "interview").count()
    offers = db.query(Application).filter(Application.status == "offer").count()

    # By source
    source_rows = db.query(Job.source, func.count(Job.id)).group_by(Job.source).all()
    by_source = {row[0]: row[1] for row in source_rows}

    # By job status
    status_rows = db.query(Job.status, func.count(Job.id)).group_by(Job.status).all()
    by_status = {row[0]: row[1] for row in status_rows}

    # By application status
    app_status_rows = (
        db.query(Application.status, func.count(Application.id))
        .group_by(Application.status)
        .all()
    )
    by_application_status = {row[0]: row[1] for row in app_status_rows}

    # Timeline: applications per day over last 14 days
    timeline = []
    for i in range(13, -1, -1):
        day = today - timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = day_start + timedelta(days=1)
        count = (
            db.query(Application)
            .filter(Application.applied_at >= day_start, Application.applied_at < day_end)
            .count()
        )
        timeline.append({"date": day.isoformat(), "applications": count})

    return StatsOut(
        jobs_today=jobs_today,
        pending_review=pending,
        applications_sent=applications_sent,
        interviews=interviews,
        offers=offers,
        total_jobs=total_jobs,
        by_source=by_source,
        by_status=by_status,
        by_application_status=by_application_status,
        timeline=timeline,
    )
