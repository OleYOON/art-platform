from pydantic import BaseModel
from datetime import datetime

class CommentCreate(BaseModel):
    body: str

class CommentOut(BaseModel):
    id: int
    body: str
    username: str
    created_at: datetime