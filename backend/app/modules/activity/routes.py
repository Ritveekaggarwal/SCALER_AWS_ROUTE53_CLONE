from fastapi import APIRouter

from . import controller
from .schemas import ActivityOut

router = APIRouter(tags=["console"])

router.add_api_route("/activity", controller.list_activity, methods=["GET"], response_model=list[ActivityOut])
