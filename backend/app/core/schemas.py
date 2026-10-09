from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


class BulkDelete(BaseModel):
    ids: list[str | int] = Field(min_length=1)


class BulkDeleteResult(BaseModel):
    deleted: list[str | int]
    failed: list[dict]
