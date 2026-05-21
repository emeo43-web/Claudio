from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import init_db
from .routers import applications, jobs, profile, scraper, stats


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    from .services.scheduler import start_scheduler
    start_scheduler()
    yield


app = FastAPI(title="Claudio – Job Application Automator", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(applications.router, prefix="/api/applications", tags=["applications"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(stats.router, prefix="/api/stats", tags=["stats"])
app.include_router(scraper.router, prefix="/api/scraper", tags=["scraper"])

# Serve generated CVs as static files
import os
os.makedirs("generated_cvs", exist_ok=True)
app.mount("/cvs", StaticFiles(directory="generated_cvs"), name="cvs")
