from fastapi import APIRouter, status

from . import controller
from .schemas import SessionOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

router.add_api_route("/config", controller.auth_config, methods=["GET"])
router.add_api_route("/login", controller.login, methods=["POST"], response_model=UserOut)
router.add_api_route("/register", controller.register, methods=["POST"], response_model=UserOut,
                     status_code=status.HTTP_201_CREATED)
router.add_api_route("/logout", controller.logout, methods=["POST"], status_code=status.HTTP_204_NO_CONTENT)
router.add_api_route("/me", controller.me, methods=["GET"], response_model=UserOut)
router.add_api_route("/me", controller.update_profile, methods=["PATCH"], response_model=UserOut)
router.add_api_route("/change-password", controller.change_password, methods=["POST"],
                     status_code=status.HTTP_204_NO_CONTENT)
router.add_api_route("/sessions", controller.sessions, methods=["GET"], response_model=list[SessionOut])
router.add_api_route("/sessions/{session_id}", controller.revoke_session, methods=["DELETE"],
                     status_code=status.HTTP_204_NO_CONTENT)
