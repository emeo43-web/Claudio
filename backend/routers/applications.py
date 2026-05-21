from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Application
from ..schemas import ApplicationOut, ApplicationStatusUpdate

router = APIRouter()


@router.get("", response_model=list[ApplicationOut])
def list_applications(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return (
        db.query(Application)
        .order_by(Application.applied_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{app_id}", response_model=ApplicationOut)
def get_application(app_id: int, db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


@router.patch("/{app_id}", response_model=ApplicationOut)
def update_application(app_id: int, body: ApplicationStatusUpdate, db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    valid = {"sent", "failed", "viewed", "interview", "rejected", "offer"}
    if body.status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid: {valid}")
    app.status = body.status
    if body.notes is not None:
        app.notes = body.notes
    db.commit()
    db.refresh(app)
    return app
