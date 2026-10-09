from fastapi import APIRouter, status

from ...core.schemas import BulkDeleteResult, Page
from . import controller
from .schemas import HealthCheckOut, HealthCheckResultOut

router = APIRouter(prefix="/healthchecks", tags=["health checks"])

router.add_api_route("", controller.list_health_checks, methods=["GET"], response_model=Page[HealthCheckOut])
router.add_api_route("", controller.create, methods=["POST"], response_model=HealthCheckOut,
                     status_code=status.HTTP_201_CREATED)
router.add_api_route("/bulk-delete", controller.bulk_delete, methods=["POST"], response_model=BulkDeleteResult)
router.add_api_route("/{hc_id}", controller.get, methods=["GET"], response_model=HealthCheckOut)
router.add_api_route("/{hc_id}", controller.update, methods=["PATCH"], response_model=HealthCheckOut)
router.add_api_route("/{hc_id}", controller.delete, methods=["DELETE"], status_code=status.HTTP_204_NO_CONTENT)
router.add_api_route("/{hc_id}/check", controller.check_now, methods=["POST"], response_model=HealthCheckOut)
router.add_api_route("/{hc_id}/results", controller.results, methods=["GET"],
                     response_model=list[HealthCheckResultOut])
