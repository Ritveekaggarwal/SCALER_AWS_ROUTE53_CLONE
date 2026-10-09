from pydantic import BaseModel, Field


class CliRequest(BaseModel):
    command: str = Field(min_length=1, max_length=20000)


class CliResponse(BaseModel):
    output: str
    exit_code: int
