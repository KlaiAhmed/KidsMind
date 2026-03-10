from langchain_openai import ChatOpenAI
from core.config import settings

llm = ChatOpenAI(
    model= settings.MODEL_NAME,
    api_key= settings.API_KEY,
    base_url= settings.BASE_URL,
    temperature=0.5,
    max_tokens=400,
    timeout=30,
    max_retries=2
)