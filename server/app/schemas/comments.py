from pydantic import BaseModel
from datetime import datetime

class CommentCreate(BaseModel):
    body: str
    parent_id: int | None = None

class CommentOut(BaseModel):
    id: int
    body: str
    username: str
    created_at: datetime
    parent_id: int | None = None
    replies: list["CommentOut"] = []