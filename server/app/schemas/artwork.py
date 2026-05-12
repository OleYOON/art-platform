from pydantic import BaseModel
from datetime import datetime

class ArtworkCreate(BaseModel):
    title: str
    description: str | None = None
    tags: list[str] = []


class ArtworkOut(BaseModel):
    id: int
    title: str
    description: str | None
    image_url: str
    created_at: datetime
    tags: list[str] = []
    user_id: int
    username: str
    avatar_url: str | None = None
    likes_count: int = 0
    liked: bool = False

ArtworkOut.model_rebuild()