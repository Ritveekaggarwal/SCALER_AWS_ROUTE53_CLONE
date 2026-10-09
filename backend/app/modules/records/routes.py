from fastapi import APIRouter, status

from ...core.schemas import BulkDeleteResult, Page
from . import controller
from .schemas import DnsTestResult, ImportResult, RecordOut

router = APIRouter(prefix="/hostedzones/{zone_id}/records", tags=["records"])
test_router = APIRouter(prefix="/hostedzones/{zone_id}", tags=["records"])

router.add_api_route("", controller.list_records, methods=["GET"], response_model=Page[RecordOut])
router.add_api_route("", controller.create, methods=["POST"], response_model=RecordOut,
                     status_code=status.HTTP_201_CREATED)
router.add_api_route("/bulk-delete", controller.bulk_delete, methods=["POST"], response_model=BulkDeleteResult)
router.add_api_route("/import", controller.import_zone_file, methods=["POST"], response_model=ImportResult)
router.add_api_route("/{record_id}", controller.get, methods=["GET"], response_model=RecordOut)
router.add_api_route("/{record_id}", controller.update, methods=["PATCH"], response_model=RecordOut)
router.add_api_route("/{record_id}", controller.delete, methods=["DELETE"], status_code=status.HTTP_204_NO_CONTENT)

test_router.add_api_route("/test-dns", controller.test_dns, methods=["GET"], response_model=DnsTestResult)
