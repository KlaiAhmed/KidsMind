from pydantic import BaseModel
from typing import Optional

class TextChatRequest(BaseModel):
    text: str
    context: Optional[str] = ""