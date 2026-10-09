from fastapi import APIRouter, status

from ...core.schemas import BulkDeleteResult, Page
from . import controller
from .schemas import HostedZoneOut

router = APIRouter(prefix="/hostedzones", tags=["hosted zones"])

router.add_api_route("", controller.list_zones, methods=["GET"], response_model=Page[HostedZoneOut])
router.add_api_route("", controller.create, methods=["POST"], response_model=HostedZoneOut,
                     status_code=status.HTTP_201_CREATED)
router.add_api_route("/bulk-delete", controller.bulk_delete, methods=["POST"], response_model=BulkDeleteResult)
router.add_api_route("/{zone_id}", controller.get, methods=["GET"], response_model=HostedZoneOut)
router.add_api_route("/{zone_id}", controller.update, methods=["PATCH"], response_model=HostedZoneOut)
router.add_api_route("/{zone_id}", controller.delete, methods=["DELETE"], status_code=status.HTTP_204_NO_CONTENT)
router.add_api_route("/{zone_id}/export", controller.export, methods=["GET"])
