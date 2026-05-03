from pydantic import BaseModel


class ArtworkCreate(BaseModel):
    title: str
    description: str | None = None
    tags: list[str] = []


class ArtworkOut(BaseModel):
    id: int
    title: str
    description: str | None
    image_url: str
    tags: list[str] = []
    user_id: int
    username: str
    avatar_url: str | None = None
    created_at: datetime