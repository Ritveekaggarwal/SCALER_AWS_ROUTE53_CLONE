from typing import Literal

from pydantic import BaseModel, Field


class FeedbackIn(BaseModel):
    rating: Literal["", "positive", "negative"] = ""
    message: str = Field(min_length=1, max_length=5000)
    page: str = Field(default="", max_length=255)
