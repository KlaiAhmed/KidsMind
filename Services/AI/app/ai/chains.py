from .prompts import build_prompt
from core.llm import llm

def build_chain():
    """ Constructs the AI processing chain by combining the prompt and the language model."""
    prompt = build_prompt()

    chain = prompt | llm

    return chain