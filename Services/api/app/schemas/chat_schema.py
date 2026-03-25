from pydantic import BaseModel
from typing import Optional, Literal

class TextChatRequest(BaseModel):
    text: str
    context: Optional[str] = ""
    age_group: Optional[Literal["3-6", "7-11", "12-15", "3-15"]] = "3-15"
    stream: bool = False