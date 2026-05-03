from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.comments import Comment
from app.schemas.comments import CommentCreate, CommentOut
from app.routers.auth import get_current_user

router = APIRouter(prefix="/artworks", tags=["comments"])


def build_comment_tree(comments_data):
    """Превращает плоский список в дерево (только верхний уровень содержит replies)."""
    comment_map = {}
    roots = []
    for c, username in comments_data:
        c.username = username
        comment_map[c.id] = CommentOut(
            id=c.id, body=c.body, username=username, created_at=c.created_at,
            parent_id=c.parent_id, replies=[], user_id=c.user_id
        )
    for obj in comment_map.values():
        if obj.parent_id and obj.parent_id in comment_map:
            comment_map[obj.parent_id].replies.append(obj)
        else:
            roots.append(obj)
    return roots


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
        parent_id=data.parent_id,
        body=data.body,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return CommentOut(
        id=comment.id, body=comment.body, username=current_user.username,
        created_at=comment.created_at, parent_id=comment.parent_id, replies=[],
        user_id=current_user.id
    )


@router.get("/{artwork_id}/comments", response_model=list[CommentOut])
async def get_comments(artwork_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Comment, User.username)
        .join(User)
        .where(Comment.artwork_id == artwork_id)
        .order_by(Comment.created_at)
    )
    return build_comment_tree(result.all())

@router.delete("/{artwork_id}/comments/{comment_id}")
async def delete_comment(
    artwork_id: int,
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar()
    if not comment:
        raise HTTPException(status_code=404)
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403)
    await db.delete(comment)
    await db.commit()
    return {"ok": True}