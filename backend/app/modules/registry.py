from .activity import models as activity_models
from .auth import models as auth_models
from .feedback import models as feedback_models
from .healthchecks import models as healthcheck_models
from .records import models as record_models
from .zones import models as zone_models

MODEL_MODULES = (
    auth_models,
    zone_models,
    record_models,
    healthcheck_models,
    activity_models,
    feedback_models,
)
