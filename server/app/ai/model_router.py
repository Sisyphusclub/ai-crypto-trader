"""AI Model Router - Unified interface for multiple LLM providers."""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Dict, Any, List
import asyncio
import time
import httpx


class ModelErrorType(str, Enum):
    AUTH = "auth"
    QUOTA = "quota"
    RATE_LIMIT = "rate_limit"
    INVALID_OUTPUT = "invalid_output"
    TIMEOUT = "timeout"
    NETWORK = "network"
    UNKNOWN = "unknown"


@dataclass
class ModelResponse:
    success: bool
    content: Optional[str] = None
    error_type: Optional[ModelErrorType] = None
    error_message: Optional[str] = None
    usage: Optional[Dict[str, int]] = None
    raw_response: Optional[Dict] = field(default=None, repr=False)


class BaseModelAdapter(ABC):
    """Base adapter for AI model providers."""

    def __init__(
        self,
        api_key: str,
        model: str,
        timeout: float = 60.0,
        max_retries: int = 3,
    ):
        self.api_key = api_key
        self.model = model
        self.timeout = timeout
        self.max_retries = max_retries
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=self.timeout)
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    @abstractmethod
    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        json_schema: Optional[Dict] = None,
    ) -> ModelResponse:
        """Generate a response from the model."""
        pass

    async def generate_with_retry(
        self,
        system_prompt: str,
        user_prompt: str,
        json_schema: Optional[Dict] = None,
    ) -> ModelResponse:
        """Generate with exponential backoff retry."""
        last_error = None
        for attempt in range(self.max_retries):
            try:
                response = await self.generate(system_prompt, user_prompt, json_schema)
                if response.success:
                    return response
                if response.error_type in (ModelErrorType.AUTH, ModelErrorType.QUOTA):
                    return response
                last_error = response
            except Exception as e:
                last_error = ModelResponse(
                    success=False,
                    error_type=ModelErrorType.NETWORK,
                    error_message=str(e)[:200],
                )

            if attempt < self.max_retries - 1:
                wait_time = (2 ** attempt) + (0.1 * attempt)
                await asyncio.sleep(wait_time)

        return last_error or ModelResponse(
            success=False,
            error_type=ModelErrorType.UNKNOWN,
            error_message="Max retries exceeded",
        )

    def _classify_error(self, status_code: int, response_text: str) -> ModelErrorType:
        if status_code == 401:
            return ModelErrorType.AUTH
        elif status_code == 429:
            if "quota" in response_text.lower():
                return ModelErrorType.QUOTA
            return ModelErrorType.RATE_LIMIT
        elif status_code == 408 or "timeout" in response_text.lower():
            return ModelErrorType.TIMEOUT
        return ModelErrorType.UNKNOWN


class OpenAIAdapter(BaseModelAdapter):
    """OpenAI API adapter (GPT models)."""

    BASE_URL = "https://api.openai.com/v1"

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        json_schema: Optional[Dict] = None,
    ) -> ModelResponse:
        client = await self._get_client()

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        body: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.1,
        }

        if json_schema:
            body["response_format"] = {
                "type": "json_schema",
                "json_schema": {
                    "name": "trade_plan",
                    "strict": True,
                    "schema": json_schema,
                },
            }
        else:
            body["response_format"] = {"type": "json_object"}

        try:
            resp = await client.post(
                f"{self.BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=body,
            )

            if resp.status_code != 200:
                return ModelResponse(
                    success=False,
                    error_type=self._classify_error(resp.status_code, resp.text),
                    error_message=resp.text[:200],
                )

            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            usage = data.get("usage")

            return ModelResponse(
                success=True,
                content=content,
                usage={
                    "input_tokens": usage.get("prompt_tokens", 0),
                    "output_tokens": usage.get("completion_tokens", 0),
                } if usage else None,
                raw_response=data,
            )
        except httpx.TimeoutException:
            return ModelResponse(
                success=False,
                error_type=ModelErrorType.TIMEOUT,
                error_message="Request timed out",
            )
        except Exception as e:
            return ModelResponse(
                success=False,
                error_type=ModelErrorType.NETWORK,
                error_message=str(e)[:200],
            )


class AnthropicAdapter(BaseModelAdapter):
    """Anthropic API adapter (Claude models)."""

    BASE_URL = "https://api.anthropic.com/v1"

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        json_schema: Optional[Dict] = None,
    ) -> ModelResponse:
        client = await self._get_client()

        json_instruction = ""
        if json_schema:
            json_instruction = "\n\nYou MUST respond with valid JSON matching this schema. No other text allowed."

        try:
            resp = await client.post(
                f"{self.BASE_URL}/messages",
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "max_tokens": 4096,
                    "system": system_prompt + json_instruction,
                    "messages": [{"role": "user", "content": user_prompt}],
                },
            )

            if resp.status_code != 200:
                return ModelResponse(
                    success=False,
                    error_type=self._classify_error(resp.status_code, resp.text),
                    error_message=resp.text[:200],
                )

            data = resp.json()
            content = data["content"][0]["text"]
            usage = data.get("usage")

            return ModelResponse(
                success=True,
                content=content,
                usage={
                    "input_tokens": usage.get("input_tokens", 0),
                    "output_tokens": usage.get("output_tokens", 0),
                } if usage else None,
                raw_response=data,
            )
        except httpx.TimeoutException:
            return ModelResponse(
                success=False,
                error_type=ModelErrorType.TIMEOUT,
                error_message="Request timed out",
            )
        except Exception as e:
            return ModelResponse(
                success=False,
                error_type=ModelErrorType.NETWORK,
                error_message=str(e)[:200],
            )


class GoogleAdapter(BaseModelAdapter):
    """Google Gemini API adapter."""

    BASE_URL = "https://generativelanguage.googleapis.com/v1beta"

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        json_schema: Optional[Dict] = None,
    ) -> ModelResponse:
        client = await self._get_client()

        body: Dict[str, Any] = {
            "contents": [
                {"role": "user", "parts": [{"text": user_prompt}]},
            ],
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json",
            },
        }

        if json_schema:
            body["generationConfig"]["responseSchema"] = json_schema

        try:
            resp = await client.post(
                f"{self.BASE_URL}/models/{self.model}:generateContent",
                params={"key": self.api_key},
                headers={"Content-Type": "application/json"},
                json=body,
            )

            if resp.status_code != 200:
                return ModelResponse(
                    success=False,
                    error_type=self._classify_error(resp.status_code, resp.text),
                    error_message=resp.text[:200],
                )

            data = resp.json()
            content = data["candidates"][0]["content"]["parts"][0]["text"]
            usage = data.get("usageMetadata")

            return ModelResponse(
                success=True,
                content=content,
                usage={
                    "input_tokens": usage.get("promptTokenCount", 0),
                    "output_tokens": usage.get("candidatesTokenCount", 0),
                } if usage else None,
                raw_response=data,
            )
        except httpx.TimeoutException:
            return ModelResponse(
                success=False,
                error_type=ModelErrorType.TIMEOUT,
                error_message="Request timed out",
            )
        except Exception as e:
            return ModelResponse(
                success=False,
                error_type=ModelErrorType.NETWORK,
                error_message=str(e)[:200],
            )


class ModelRouter:
    """Routes requests to appropriate model provider."""

    PROVIDER_MAP = {
        "openai": OpenAIAdapter,
        "anthropic": AnthropicAdapter,
        "google": GoogleAdapter,
    }

    def __init__(self):
        self._adapters: Dict[str, BaseModelAdapter] = {}
        self._rate_limits: Dict[str, List[float]] = {}
        self._rate_limit_window = 60.0
        self._rate_limit_max = 10

    def get_adapter(
        self,
        provider: str,
        api_key: str,
        model: str,
        timeout: float = 60.0,
    ) -> BaseModelAdapter:
        """Get or create an adapter for the provider."""
        adapter_class = self.PROVIDER_MAP.get(provider.lower())
        if not adapter_class:
            raise ValueError(f"Unknown provider: {provider}")

        return adapter_class(
            api_key=api_key,
            model=model,
            timeout=timeout,
        )

    def check_rate_limit(self, trader_id: str) -> bool:
        """Check if trader is within rate limits."""
        now = time.time()
        if trader_id not in self._rate_limits:
            self._rate_limits[trader_id] = []

        self._rate_limits[trader_id] = [
            t for t in self._rate_limits[trader_id]
            if now - t < self._rate_limit_window
        ]

        return len(self._rate_limits[trader_id]) < self._rate_limit_max

    def record_request(self, trader_id: str) -> None:
        """Record a request for rate limiting."""
        if trader_id not in self._rate_limits:
            self._rate_limits[trader_id] = []
        self._rate_limits[trader_id].append(time.time())

    async def generate(
        self,
        provider: str,
        api_key: str,
        model: str,
        system_prompt: str,
        user_prompt: str,
        json_schema: Optional[Dict] = None,
        trader_id: Optional[str] = None,
    ) -> ModelResponse:
        """Generate a response using the specified provider."""
        if trader_id and not self.check_rate_limit(trader_id):
            return ModelResponse(
                success=False,
                error_type=ModelErrorType.RATE_LIMIT,
                error_message="Trader rate limit exceeded",
            )

        adapter = self.get_adapter(provider, api_key, model)
        try:
            if trader_id:
                self.record_request(trader_id)
            return await adapter.generate_with_retry(
                system_prompt, user_prompt, json_schema
            )
        finally:
            await adapter.close()


model_router = ModelRouter()
