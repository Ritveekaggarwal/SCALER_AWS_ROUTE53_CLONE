from fastapi import APIRouter, status

from . import controller

router = APIRouter(tags=["console"])

router.add_api_route("/feedback", controller.feedback, methods=["POST"], status_code=status.HTTP_204_NO_CONTENT)
