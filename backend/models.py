from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship

from .database import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String, index=True)      # linkedin | adecco | randstad | custom
    external_id = Column(String, index=True)
    title = Column(String)
    company = Column(String)
    location = Column(String)
    description = Column(Text)
    url = Column(String)
    salary_range = Column(String, nullable=True)
    job_type = Column(String, nullable=True)
    remote = Column(Boolean, default=False)
    scraped_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="pending", index=True)
    # pending | approved | rejected | applied | skipped
    match_score = Column(Float, nullable=True)
    match_reason = Column(Text, nullable=True)

    application = relationship("Application", back_populates="job", uselist=False)


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), unique=True)
    applied_at = Column(DateTime, default=datetime.utcnow)
    cv_html = Column(Text, nullable=True)
    cover_letter = Column(Text, nullable=True)
    status = Column(String, default="sent", index=True)
    # sent | failed | viewed | interview | rejected | offer
    notes = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    job = relationship("Job", back_populates="application")


class Profile(Base):
    __tablename__ = "profile"

    id = Column(Integer, primary_key=True)
    name = Column(String, default="")
    email = Column(String, default="")
    phone = Column(String, nullable=True)
    location = Column(String, nullable=True)
    linkedin_url = Column(String, nullable=True)
    summary = Column(Text, nullable=True)
    skills = Column(JSON, default=list)
    experience = Column(JSON, default=list)
    education = Column(JSON, default=list)
    languages = Column(JSON, default=list)
    certifications = Column(JSON, default=list)


class SearchConfig(Base):
    __tablename__ = "search_config"

    id = Column(Integer, primary_key=True)
    keywords = Column(JSON, default=list)
    location = Column(String, default="Italia")
    remote_only = Column(Boolean, default=False)
    sources = Column(JSON, default=lambda: ["linkedin", "adecco", "randstad"])
    max_applications_per_day = Column(Integer, default=10)
    auto_apply = Column(Boolean, default=False)
    min_match_score = Column(Float, default=65.0)
    is_active = Column(Boolean, default=True)


class ScrapeLog(Base):
    __tablename__ = "scrape_logs"

    id = Column(Integer, primary_key=True)
    source = Column(String)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    jobs_found = Column(Integer, default=0)
    jobs_new = Column(Integer, default=0)
    status = Column(String, default="running")  # running | completed | failed
    error = Column(Text, nullable=True)
