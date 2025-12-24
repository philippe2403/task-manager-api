from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import Optional
from app.db.session import get_session
from app.models.task import Task
from app.models.project import Project
from app.models.user import User
from app.routers.auth import get_current_user
from app.routers.projects import get_owned_project

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.task import Task
from app.models.project import Project
from app.routers.auth import get_current_user


router = APIRouter(prefix="/tasks", tags=["tasks"])

def get_owned_task(task_id: int, session: Session, user) -> Task:
    # IMPORTANT: If your Project model uses owner_id (like your screenshot),
    # keep Project.owner_id. If yours uses user_id, change owner_id -> user_id.
    task = session.exec(
        select(Task)
        .join(Project, Task.project_id == Project.id)
        .where(Task.id == task_id, Project.owner_id == user.id)
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.post("", response_model=Task, status_code=201)
def create_task(
    project_id: int,
    title: str,
    description: str | None = None,
    due_date: date | None = None,
    priority: int = 2,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    get_owned_project(project_id=project_id, session=session, user=user)

    task = Task(
        project_id=project_id,
        title=title,
        description=description,
        due_date=due_date,
        priority=priority,
    )
    session.add(task)
    session.commit()
    session.refresh(task)
    return task

@router.get("", response_model=list[Task])
def list_tasks(
    project_id: int | None = None,
    is_done: bool | None = None,
    q: str | None = None,
    due_before: date | None = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    project_ids = session.exec(select(Project.id).where(Project.owner_id == user.id)).all()
    if not project_ids:
        return []

    stmt = select(Task).where(Task.project_id.in_(project_ids))

    if project_id is not None:
        if project_id not in project_ids:
            return []
        stmt = stmt.where(Task.project_id == project_id)

    if is_done is not None:
        stmt = stmt.where(Task.is_done == is_done)

    if q:
        stmt = stmt.where(Task.title.contains(q))

    if due_before:
        stmt = stmt.where(Task.due_date != None).where(Task.due_date <= due_before)  # noqa: E711

    stmt = stmt.order_by(Task.created_at.desc()).offset(offset).limit(limit)
    return session.exec(stmt).all()

@router.patch("/{task_id}", response_model=Task)
def update_task(
    task_id: int,
    title: str | None = None,
    is_done: bool | None = None,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    project = session.get(Project, task.project_id)
    if not project or project.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Task not found")

    if title is not None:
        task.title = title
    if is_done is not None:
        task.is_done = is_done

    session.add(task)
    session.commit()
    session.refresh(task)
    return task

@router.delete("/{task_id}", status_code=204)
def delete_task(
    task_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    task = session.get(Task, task_id)
    if not task:
        return

    project = session.get(Project, task.project_id)
    if not project or project.owner_id != user.id:
        return

    session.delete(task)
    session.commit()
    return
