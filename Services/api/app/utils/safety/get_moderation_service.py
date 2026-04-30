from core.config import settings
from services.safety.moderation import check_moderation
from services.safety.dev_moderation import dev_check_moderation

def get_moderation_service():
    return check_moderation if settings.IS_PROD else dev_check_moderation
