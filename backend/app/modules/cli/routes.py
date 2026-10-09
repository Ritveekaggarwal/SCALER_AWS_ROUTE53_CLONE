from fastapi import APIRouter

from . import controller
from .schemas import CliResponse

router = APIRouter(tags=["cloudshell"])

router.add_api_route("/cli", controller.run_cli, methods=["POST"], response_model=CliResponse)
