from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Like(Base):
    __tablename__ = "likes"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    artwork_id: Mapped[int] = mapped_column(ForeignKey("artworks.id", ondelete="CASCADE"), primary_key=True)