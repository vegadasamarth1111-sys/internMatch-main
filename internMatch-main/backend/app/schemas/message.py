from datetime import datetime
from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)


class MessageSender(BaseModel):
    id: int
    email: str

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: int
    application_id: int
    sender_id: int
    sender: MessageSender
    content: str
    created_at: datetime

    class Config:
        from_attributes = True