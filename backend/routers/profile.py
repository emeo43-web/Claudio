from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Profile, SearchConfig
from ..schemas import ProfileIn, ProfileOut, SearchConfigIn, SearchConfigOut

router = APIRouter()


@router.get("", response_model=ProfileOut)
def get_profile(db: Session = Depends(get_db)):
    profile = db.query(Profile).first()
    if not profile:
        profile = Profile()
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.put("", response_model=ProfileOut)
def update_profile(body: ProfileIn, db: Session = Depends(get_db)):
    profile = db.query(Profile).first()
    if not profile:
        profile = Profile()
        db.add(profile)
    for field, value in body.model_dump().items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/search-config", response_model=SearchConfigOut)
def get_search_config(db: Session = Depends(get_db)):
    config = db.query(SearchConfig).first()
    if not config:
        config = SearchConfig()
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


@router.put("/search-config", response_model=SearchConfigOut)
def update_search_config(body: SearchConfigIn, db: Session = Depends(get_db)):
    config = db.query(SearchConfig).first()
    if not config:
        config = SearchConfig()
        db.add(config)
    for field, value in body.model_dump().items():
        setattr(config, field, value)
    db.commit()
    db.refresh(config)
    return config
