from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.project import Project
from app.routers.auth import get_current_user

router = APIRouter(prefix="/projects", tags=["projects"])


def get_owned_project(project_id: int, session: Session, user) -> Project:
    project = session.exec(
        select(Project).where(Project.id == project_id, Project.owner_id == user.id)
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project



@router.get("")
def list_projects(
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    return session.exec(select(Project).where(Project.owner_id == user.id)).all()


@router.post("")
def create_project(
    name: str,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    name = name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    p = Project(name=name, owner_id=user.id)  
    session.add(p)
    session.commit()
    session.refresh(p)
    return p


@router.delete("/{project_id}", status_code=204)
def delete_project(
    project_id: int,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    project = get_owned_project(project_id, session=session, user=user)
    session.delete(project)
    session.commit()
    return None

