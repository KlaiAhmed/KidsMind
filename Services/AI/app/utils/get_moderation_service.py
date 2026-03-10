from core.config import settings
from services.moderation import check_moderation
from services.dev_moderation import dev_check_moderation

def get_moderation_service():
    """
    Returns the appropriate moderation service based on the production environment.
    IN PRODUCTION: 
        Uses the real moderation service: OpenAI text moderation API.
    IN DEVELOPMENT: 
        Uses free Tier moderation service: Sightengine text moderation API.
    """
    return check_moderation if settings.IS_PROD else dev_check_moderation