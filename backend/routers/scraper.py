from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import SearchConfig, ScrapeLog
from ..schemas import ScrapeLogOut

router = APIRouter()


def _run_scrape(sources: list[str], keywords: list[str], location: str, remote_only: bool):
    from ..scrapers.adecco import AdeccoScraper
    from ..scrapers.linkedin import LinkedInScraper
    from ..scrapers.randstad import RandstadScraper
    from ..database import SessionLocal
    from ..models import Job, Profile
    from ..services.cv_generator import score_job_against_profile

    db = SessionLocal()
    try:
        profile = db.query(Profile).first()

        scraper_map = {
            "linkedin": LinkedInScraper,
            "adecco": AdeccoScraper,
            "randstad": RandstadScraper,
        }

        for source in sources:
            cls = scraper_map.get(source)
            if not cls:
                continue

            log = ScrapeLog(source=source, status="running")
            db.add(log)
            db.commit()
            db.refresh(log)

            try:
                scraper = cls()
                jobs_data = scraper.search(
                    keywords=" ".join(keywords) if keywords else "lavoro",
                    location=location,
                    remote_only=remote_only,
                )
                log.jobs_found = len(jobs_data)
                new_count = 0

                for jd in jobs_data:
                    exists = (
                        db.query(Job)
                        .filter(Job.source == source, Job.external_id == jd["external_id"])
                        .first()
                    )
                    if exists:
                        continue

                    job = Job(**jd)
                    db.add(job)
                    db.flush()

                    if profile:
                        try:
                            scored = score_job_against_profile(job, profile)
                            job.match_score = scored["match_score"]
                            job.match_reason = scored["match_reason"]
                        except Exception:
                            pass

                    new_count += 1

                db.commit()
                log.jobs_new = new_count
                log.status = "completed"

            except Exception as e:
                db.rollback()
                log.status = "failed"
                log.error = str(e)

            from datetime import datetime
            log.ended_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()


@router.post("/run")
def trigger_scrape(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    config = db.query(SearchConfig).first()
    sources = config.sources if config else ["adecco", "randstad"]
    keywords = config.keywords if config else []
    location = config.location if config else "Italia"
    remote_only = config.remote_only if config else False

    background_tasks.add_task(_run_scrape, sources, keywords, location, remote_only)
    return {"message": "Scraping started", "sources": sources}


@router.get("/logs", response_model=list[ScrapeLogOut])
def get_logs(limit: int = 50, db: Session = Depends(get_db)):
    return (
        db.query(ScrapeLog)
        .order_by(ScrapeLog.started_at.desc())
        .limit(limit)
        .all()
    )
