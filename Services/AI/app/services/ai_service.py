from services.build_chain import build_chain
from utils.age_guidelines import age_guidelines
from utils.llm_json_parsing import parse_llm_response


class AIService:
    def __init__(self, chain=None):
        self.chain= chain or build_chain()
    
    async def get_response(self, payload) -> dict:
        guidelines = age_guidelines(payload.age_group)

        response = await self.chain.ainvoke({
            "age_group": payload.age_group,
            "age_guidelines": guidelines,
            "context": payload.context or "",
            "input": payload.text,
            "history": [] #TODO
        })


        return parse_llm_response(response)
    
ai_service = AIService()