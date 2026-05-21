from apscheduler.schedulers.background import BackgroundScheduler

from ..config import settings

_scheduler: BackgroundScheduler | None = None


def _scheduled_scrape():
    from ..database import SessionLocal
    from ..models import SearchConfig
    from ..routers.scraper import _run_scrape

    db = SessionLocal()
    try:
        config = db.query(SearchConfig).filter(SearchConfig.is_active == True).first()
        if not config:
            return
        _run_scrape(
            sources=config.sources or [],
            keywords=config.keywords or [],
            location=config.location or "Italia",
            remote_only=config.remote_only or False,
        )
    finally:
        db.close()


def start_scheduler():
    global _scheduler
    _scheduler = BackgroundScheduler()
    _scheduler.add_job(
        _scheduled_scrape,
        "interval",
        hours=settings.scrape_interval_hours,
        id="scheduled_scrape",
        replace_existing=True,
    )
    _scheduler.start()


def stop_scheduler():
    if _scheduler:
        _scheduler.shutdown()
