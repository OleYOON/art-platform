from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(nullable=False)
    bio: Mapped[str | None] = mapped_column(default=None)
    avatar_url: Mapped[str | None] = mapped_column(String(500), default=None)
    role: Mapped[str] = mapped_column(String(20), default="artist")