from datetime import datetime, date
from typing import Optional
from sqlmodel import SQLModel, Field

class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id", index=True)

    title: str
    description: Optional[str] = None
    is_done: bool = Field(default=False, index=True)
    due_date: Optional[date] = Field(default=None, index=True)
    priority: int = Field(default=2, ge=1, le=3, index=True)  # 1 high, 2 med, 3 low
    created_at: datetime = Field(default_factory=datetime.utcnow)
