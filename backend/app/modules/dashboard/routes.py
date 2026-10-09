from fastapi import APIRouter

from . import controller
from .schemas import Dashboard

router = APIRouter(tags=["console"])

router.add_api_route("/dashboard", controller.dashboard, methods=["GET"], response_model=Dashboard)
