from typing import Literal

from pydantic import BaseModel


class SearchHit(BaseModel):
    kind: Literal["hosted_zone", "record", "health_check", "page"]
    title: str
    subtitle: str
    href: str
