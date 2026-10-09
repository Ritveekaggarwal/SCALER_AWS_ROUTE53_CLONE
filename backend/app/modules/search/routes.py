from fastapi import APIRouter

from . import controller
from .schemas import SearchHit

router = APIRouter(tags=["console"])

router.add_api_route("/search", controller.search, methods=["GET"], response_model=list[SearchHit])
