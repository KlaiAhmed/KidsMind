"""Chain Builder Service

Responsibility: Builds LCEL (LangChain Expression Language) chains for AI interactions.
Layer: Service
Domain: AI/LLM

ARCHITECTURAL NOTE: History vs Memory
---------------------------------------
This module uses a clear separation of concerns:

- **HISTORY** = Persisted conversation data in the database (ChatHistory model).
  Inactive, archived, or stored for long-term retrieval. NOT passed directly to LLM.
  Managed by: services/chat_history.py

- **MEMORY** = Active conversation context loaded into the LLM's context window.
  This is what the LLM "remembers" during the current interaction.
  Managed by: services/session_memory.py (RedisChatMessageHistory)

The transformation layer (this module):
  - Fetches HISTORY from Postgres (persisted)
  - Loads MEMORY into Redis (active context)
  - LangChain's RunnableWithMessageHistory handles injecting MEMORY into prompts
  - The trimmer ensures MEMORY fits within token limits

Never pass HISTORY directly to the LLM - always go through the memory transformation.
"""

from operator import itemgetter

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import trim_messages
from langchain_core.runnables import RunnablePassthrough
from langchain_core.runnables.history import RunnableWithMessageHistory

from services.prompts import CHAT_SYSTEM_PROMPT, QUIZ_SYSTEM_PROMPT
from services.session_memory import session_memory_service
from core.config import settings
from utils.token_count import get_sum_token_count


class ChainBuilder:

    def _build_chat_prompt(self) -> ChatPromptTemplate:
        return ChatPromptTemplate.from_messages([
            ("system", CHAT_SYSTEM_PROMPT),
            MessagesPlaceholder(variable_name="session_memory"),
            ("human", "{input}")
        ])

    def _build_quiz_prompt(self) -> ChatPromptTemplate:
        return ChatPromptTemplate.from_messages([
            ("system", QUIZ_SYSTEM_PROMPT),
            ("human", "Generate a quiz as specified above.")
        ])

    def _build_trimmer(self, llm_client):
        """
        Build a message trimmer to keep active MEMORY within token limits.

        The trimmer operates on MEMORY (active LLM context), not HISTORY (persisted data).
        It ensures we don't exceed the LLM's context window by keeping only the
        most recent messages that fit within MAX_SESSION_MEMORY_TOKENS.
        """
        return trim_messages(
            max_tokens=settings.MAX_SESSION_MEMORY_TOKENS,
            strategy="last",
            token_counter=llm_client if settings.IS_PROD else get_sum_token_count,
            include_system=True,
            allow_partial=False,
            start_on="human",
        )

    def build_chat_chain(self, llm_client):
        """
        Build a chain for free-form chat responses.

        Flow:
        1. Input payload contains child profile + current message (input)
        2. MEMORY is fetched from Redis via session_memory_service
        3. MEMORY is trimmed to fit within token limits
        4. System prompt + MEMORY + current message are sent to LLM
        5. LLM generates a streaming text response (no JSON structure)
        """
        prompt = self._build_chat_prompt()
        trimmer = self._build_trimmer(llm_client)

        # Trim MEMORY to fit within token limits before sending to LLM
        trim = RunnablePassthrough.assign(
            session_memory=itemgetter("session_memory") | trimmer
        )

        # RunnableWithMessageHistory automatically injects MEMORY into the prompt
        # Note: get_session_history is a LangChain parameter name, but our function
        # returns MEMORY (active context), not HISTORY (persisted data)
        return RunnableWithMessageHistory(
            trim | prompt | llm_client,
            get_session_history=session_memory_service.get_session_memory,
            input_messages_key="input",
            history_messages_key="session_memory",
        )

    def build_quiz_chain(self, llm_client):
        prompt = self._build_quiz_prompt()
        return prompt | llm_client


chain_builder = ChainBuilder()
