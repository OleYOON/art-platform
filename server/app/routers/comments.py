from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.artwork import Artwork
from app.models.comments import Comment
from app.schemas.comments import CommentCreate, CommentOut
from app.routers.auth import get_current_user

router = APIRouter(prefix="/artworks", tags=["comments"])


@router.post("/{artwork_id}/comments", response_model=CommentOut)
async def add_comment(
    artwork_id: int,
    data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    comment = Comment(
        user_id=current_user.id,
        artwork_id=artwork_id,
        body=data.body,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return CommentOut(
        id=comment.id,
        body=comment.body,
        username=current_user.username,
        created_at=comment.created_at,
    )


@router.get("/{artwork_id}/comments", response_model=list[CommentOut])
async def get_comments(artwork_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Comment, User.username)
        .join(User)
        .where(Comment.artwork_id == artwork_id)
        .order_by(Comment.created_at)
    )
    rows = result.all()
    return [
        CommentOut(id=c.id, body=c.body, username=username, created_at=c.created_at)
        for c, username in rows
    ]