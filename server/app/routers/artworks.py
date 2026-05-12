import os
import uuid
import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.database import get_db
from app.models.user import User
from app.models.artwork import Artwork, Tag, artwork_tag
from app.schemas.artwork import ArtworkOut
from app.routers.auth import get_current_user

router = APIRouter(prefix="/artworks", tags=["artworks"])

def build_artwork_out(a: Artwork, username: str, tags: list[str], avatar_url: str | None = None) -> ArtworkOut:
    return ArtworkOut(
        id=a.id,
        title=a.title,
        description=a.description,
        image_url=a.image_url,
        tags=tags,
        user_id=a.user_id,
        username=username,
        avatar_url=avatar_url,
        created_at=a.created_at,
    )


@router.post("/", response_model=ArtworkOut)
async def create_artwork(
    title: str = Form(...),
    description: str | None = Form(None),
    tags: str = Form(""),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cloudinary.config(
        cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
        api_key=os.environ.get("CLOUDINARY_API_KEY"),
        api_secret=os.environ.get("CLOUDINARY_API_SECRET"),   
    )
    contents = await file.read()
    result = cloudinary.uploader.upload(contents, folder="artworks")
    image_url = result["secure_url"]

    artwork = Artwork(
        title=title,
        description=description,
        image_url=image_url,
        user_id=current_user.id,
    )
    db.add(artwork)
    await db.commit()
    await db.refresh(artwork)

    tag_list = [t.strip().lower() for t in tags.split(",") if t.strip()]
    for tag_name in tag_list:
        result_tag = await db.execute(select(Tag).where(Tag.name == tag_name))
        tag = result_tag.scalar()
        if not tag:
            tag = Tag(name=tag_name)
            db.add(tag)
            await db.flush()
        await db.execute(artwork_tag.insert().values(artwork_id=artwork.id, tag_id=tag.id))

    await db.commit()
    return build_artwork_out(artwork, current_user.username, tag_list, current_user.avatar_url)


@router.get("/", response_model=list[ArtworkOut])
async def get_artworks(tag: str | None = None, search: str | None = None, db: AsyncSession = Depends(get_db)):
    query = select(Artwork, User.username, User.avatar_url).join(User)
    
    if tag:
        tag = tag.lower()
        query = query.join(artwork_tag).join(Tag).where(Tag.name == tag)
    
    if search:
        query = query.where(
            or_(Artwork.title.ilike(f"%{search}%"), Artwork.description.ilike(f"%{search}%"))
        )
    
    result = await db.execute(query.order_by(Artwork.id.desc()))
    rows = result.unique().all()
    out = []
    for a, username, avatar_url in rows:
        tag_result = await db.execute(
            select(Tag.name).join(artwork_tag).where(artwork_tag.c.artwork_id == a.id)
        )
        tags_list = [t for t in tag_result.scalars().all()]
        out.append(build_artwork_out(a, username, tags_list, avatar_url))
    return out


@router.get("/user/{user_id}", response_model=list[ArtworkOut])
async def get_user_artworks(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Artwork, User.username, User.avatar_url)
        .join(User)
        .where(Artwork.user_id == user_id)
        .order_by(Artwork.id.desc())
    )
    rows = result.all()
    out = []
    for a, username, avatar_url in rows:
        tag_result = await db.execute(
            select(Tag.name).join(artwork_tag).where(artwork_tag.c.artwork_id == a.id)
        )
        tags = [t for t in tag_result.scalars().all()]
        out.append(build_artwork_out(a, username, tags, avatar_url))
    return out


@router.delete("/{artwork_id}")
async def delete_artwork(
    artwork_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Artwork).where(Artwork.id == artwork_id))
    artwork = result.scalar()
    if not artwork:
        raise HTTPException(status_code=404, detail="Работа не найдена")
    if artwork.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Нельзя удалить чужую работу")
    
    await db.delete(artwork)
    await db.commit()
    return {"ok": True}


@router.patch("/{artwork_id}", response_model=ArtworkOut)
async def update_artwork(
    artwork_id: int,
    title: str | None = None,
    description: str | None = None,
    tags: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Artwork).where(Artwork.id == artwork_id))
    artwork = result.scalar()
    if not artwork:
        raise HTTPException(status_code=404, detail="Работа не найдена")
    if artwork.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Нельзя редактировать чужую работу")

    if title is not None:
        artwork.title = title
    if description is not None:
        artwork.description = description

    if tags is not None:
        await db.execute(
            artwork_tag.delete().where(artwork_tag.c.artwork_id == artwork.id)
        )
        tag_list = [t.strip().lower() for t in tags.split(",") if t.strip()]
        for tag_name in tag_list:
            result_tag = await db.execute(select(Tag).where(Tag.name == tag_name))
            tag = result_tag.scalar()
            if not tag:
                tag = Tag(name=tag_name)
                db.add(tag)
                await db.flush()
            await db.execute(
                artwork_tag.insert().values(artwork_id=artwork.id, tag_id=tag.id)
            )

    await db.commit()
    await db.refresh(artwork)

    tag_result = await db.execute(
        select(Tag.name).join(artwork_tag).where(artwork_tag.c.artwork_id == artwork.id)
    )
    tags_list = [t for t in tag_result.scalars().all()]

    return build_artwork_out(
        artwork, current_user.username, tags_list, current_user.avatar_url
    )