"""Tests for AI Model Router."""
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
import asyncio
import httpx

from app.ai.model_router import (
    ModelErrorType,
    ModelResponse,
    BaseModelAdapter,
    OpenAIAdapter,
    AnthropicAdapter,
    GoogleAdapter,
    ModelRouter,
)


class TestModelResponse:
    """Tests for ModelResponse dataclass."""

    def test_success_response(self):
        """ModelResponse can represent success."""
        resp = ModelResponse(success=True, content="Hello")
        assert resp.success is True
        assert resp.content == "Hello"

    def test_error_response(self):
        """ModelResponse can represent error."""
        resp = ModelResponse(
            success=False,
            error_type=ModelErrorType.AUTH,
            error_message="Invalid API key"
        )
        assert resp.success is False
        assert resp.error_type == ModelErrorType.AUTH


class TestBaseModelAdapter:
    """Tests for BaseModelAdapter."""

    def test_classify_error_401(self):
        """_classify_error returns AUTH for 401."""
        adapter = OpenAIAdapter(api_key="test", model="gpt-4")
        result = adapter._classify_error(401, "Unauthorized")
        assert result == ModelErrorType.AUTH

    def test_classify_error_429_rate_limit(self):
        """_classify_error returns RATE_LIMIT for 429."""
        adapter = OpenAIAdapter(api_key="test", model="gpt-4")
        result = adapter._classify_error(429, "Rate limit exceeded")
        assert result == ModelErrorType.RATE_LIMIT

    def test_classify_error_429_quota(self):
        """_classify_error returns QUOTA for 429 with quota message."""
        adapter = OpenAIAdapter(api_key="test", model="gpt-4")
        result = adapter._classify_error(429, "You have exceeded your quota")
        assert result == ModelErrorType.QUOTA

    def test_classify_error_408_timeout(self):
        """_classify_error returns TIMEOUT for 408."""
        adapter = OpenAIAdapter(api_key="test", model="gpt-4")
        result = adapter._classify_error(408, "Request timeout")
        assert result == ModelErrorType.TIMEOUT

    def test_classify_error_unknown(self):
        """_classify_error returns UNKNOWN for other errors."""
        adapter = OpenAIAdapter(api_key="test", model="gpt-4")
        result = adapter._classify_error(500, "Internal error")
        assert result == ModelErrorType.UNKNOWN


class TestOpenAIAdapter:
    """Tests for OpenAIAdapter."""

    @pytest.mark.asyncio
    async def test_generate_success(self):
        """generate returns success response."""
        adapter = OpenAIAdapter(api_key="test-key", model="gpt-4")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [{"message": {"content": '{"action": "buy"}'}}],
            "usage": {"prompt_tokens": 10, "completion_tokens": 5}
        }

        with patch.object(adapter, '_get_client') as mock_get_client:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_get_client.return_value = mock_client

            result = await adapter.generate(
                system_prompt="You are a trading bot",
                user_prompt="Analyze BTC"
            )

            assert result.success is True
            assert result.content == '{"action": "buy"}'
            assert result.usage["input_tokens"] == 10

    @pytest.mark.asyncio
    async def test_generate_with_json_schema(self):
        """generate includes json_schema in request."""
        adapter = OpenAIAdapter(api_key="test-key", model="gpt-4")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [{"message": {"content": '{"action": "buy"}'}}],
        }

        with patch.object(adapter, '_get_client') as mock_get_client:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_get_client.return_value = mock_client

            schema = {"type": "object", "properties": {"action": {"type": "string"}}}
            await adapter.generate("system", "user", json_schema=schema)

            call_args = mock_client.post.call_args
            body = call_args.kwargs["json"]
            assert body["response_format"]["type"] == "json_schema"

    @pytest.mark.asyncio
    async def test_generate_auth_error(self):
        """generate returns AUTH error for 401."""
        adapter = OpenAIAdapter(api_key="invalid", model="gpt-4")

        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.text = "Invalid API key"

        with patch.object(adapter, '_get_client') as mock_get_client:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_get_client.return_value = mock_client

            result = await adapter.generate("system", "user")

            assert result.success is False
            assert result.error_type == ModelErrorType.AUTH

    @pytest.mark.asyncio
    async def test_generate_timeout(self):
        """generate returns TIMEOUT error on timeout."""
        adapter = OpenAIAdapter(api_key="test", model="gpt-4", timeout=1.0)

        with patch.object(adapter, '_get_client') as mock_get_client:
            mock_client = AsyncMock()
            mock_client.post.side_effect = httpx.TimeoutException("Timeout")
            mock_get_client.return_value = mock_client

            result = await adapter.generate("system", "user")

            assert result.success is False
            assert result.error_type == ModelErrorType.TIMEOUT

    @pytest.mark.asyncio
    async def test_generate_network_error(self):
        """generate returns NETWORK error on exception."""
        adapter = OpenAIAdapter(api_key="test", model="gpt-4")

        with patch.object(adapter, '_get_client') as mock_get_client:
            mock_client = AsyncMock()
            mock_client.post.side_effect = Exception("Connection failed")
            mock_get_client.return_value = mock_client

            result = await adapter.generate("system", "user")

            assert result.success is False
            assert result.error_type == ModelErrorType.NETWORK


class TestAnthropicAdapter:
    """Tests for AnthropicAdapter."""

    @pytest.mark.asyncio
    async def test_generate_success(self):
        """generate returns success response."""
        adapter = AnthropicAdapter(api_key="test-key", model="claude-3")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "content": [{"text": '{"action": "sell"}'}],
            "usage": {"input_tokens": 15, "output_tokens": 8}
        }

        with patch.object(adapter, '_get_client') as mock_get_client:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_get_client.return_value = mock_client

            result = await adapter.generate(
                system_prompt="You are a trading bot",
                user_prompt="Analyze ETH"
            )

            assert result.success is True
            assert result.content == '{"action": "sell"}'
            assert result.usage["input_tokens"] == 15

    @pytest.mark.asyncio
    async def test_generate_uses_correct_headers(self):
        """generate uses correct Anthropic headers."""
        adapter = AnthropicAdapter(api_key="test-key", model="claude-3")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"content": [{"text": "{}"}]}

        with patch.object(adapter, '_get_client') as mock_get_client:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_get_client.return_value = mock_client

            await adapter.generate("system", "user")

            call_args = mock_client.post.call_args
            headers = call_args.kwargs["headers"]
            assert "x-api-key" in headers
            assert "anthropic-version" in headers


class TestGoogleAdapter:
    """Tests for GoogleAdapter."""

    @pytest.mark.asyncio
    async def test_generate_success(self):
        """generate returns success response."""
        adapter = GoogleAdapter(api_key="test-key", model="gemini-pro")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "candidates": [{"content": {"parts": [{"text": '{"action": "hold"}'}]}}],
            "usageMetadata": {"promptTokenCount": 20, "candidatesTokenCount": 10}
        }

        with patch.object(adapter, '_get_client') as mock_get_client:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_get_client.return_value = mock_client

            result = await adapter.generate(
                system_prompt="You are a trading bot",
                user_prompt="Analyze SOL"
            )

            assert result.success is True
            assert result.content == '{"action": "hold"}'
            assert result.usage["input_tokens"] == 20

    @pytest.mark.asyncio
    async def test_generate_uses_api_key_in_params(self):
        """generate uses API key in query params."""
        adapter = GoogleAdapter(api_key="google-key", model="gemini-pro")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "candidates": [{"content": {"parts": [{"text": "{}"}]}}]
        }

        with patch.object(adapter, '_get_client') as mock_get_client:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_get_client.return_value = mock_client

            await adapter.generate("system", "user")

            call_args = mock_client.post.call_args
            params = call_args.kwargs["params"]
            assert params["key"] == "google-key"


class TestGenerateWithRetry:
    """Tests for generate_with_retry method."""

    @pytest.mark.asyncio
    async def test_retry_on_transient_error(self):
        """generate_with_retry retries on transient errors."""
        adapter = OpenAIAdapter(api_key="test", model="gpt-4", max_retries=3)

        call_count = 0

        async def mock_generate(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                return ModelResponse(
                    success=False,
                    error_type=ModelErrorType.RATE_LIMIT,
                    error_message="Rate limited"
                )
            return ModelResponse(success=True, content="Success")

        with patch.object(adapter, 'generate', side_effect=mock_generate):
            with patch('asyncio.sleep', new_callable=AsyncMock):
                result = await adapter.generate_with_retry("system", "user")

                assert result.success is True
                assert call_count == 3

    @pytest.mark.asyncio
    async def test_no_retry_on_auth_error(self):
        """generate_with_retry does not retry on AUTH error."""
        adapter = OpenAIAdapter(api_key="invalid", model="gpt-4", max_retries=3)

        call_count = 0

        async def mock_generate(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            return ModelResponse(
                success=False,
                error_type=ModelErrorType.AUTH,
                error_message="Invalid key"
            )

        with patch.object(adapter, 'generate', side_effect=mock_generate):
            result = await adapter.generate_with_retry("system", "user")

            assert result.success is False
            assert result.error_type == ModelErrorType.AUTH
            assert call_count == 1

    @pytest.mark.asyncio
    async def test_no_retry_on_quota_error(self):
        """generate_with_retry does not retry on QUOTA error."""
        adapter = OpenAIAdapter(api_key="test", model="gpt-4", max_retries=3)

        call_count = 0

        async def mock_generate(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            return ModelResponse(
                success=False,
                error_type=ModelErrorType.QUOTA,
                error_message="Quota exceeded"
            )

        with patch.object(adapter, 'generate', side_effect=mock_generate):
            result = await adapter.generate_with_retry("system", "user")

            assert result.success is False
            assert result.error_type == ModelErrorType.QUOTA
            assert call_count == 1


class TestModelRouter:
    """Tests for ModelRouter."""

    def test_get_adapter_openai(self):
        """get_adapter returns OpenAIAdapter for openai."""
        router = ModelRouter()
        adapter = router.get_adapter("openai", "key", "gpt-4")
        assert isinstance(adapter, OpenAIAdapter)

    def test_get_adapter_anthropic(self):
        """get_adapter returns AnthropicAdapter for anthropic."""
        router = ModelRouter()
        adapter = router.get_adapter("anthropic", "key", "claude-3")
        assert isinstance(adapter, AnthropicAdapter)

    def test_get_adapter_google(self):
        """get_adapter returns GoogleAdapter for google."""
        router = ModelRouter()
        adapter = router.get_adapter("google", "key", "gemini-pro")
        assert isinstance(adapter, GoogleAdapter)

    def test_get_adapter_unknown_provider(self):
        """get_adapter raises ValueError for unknown provider."""
        router = ModelRouter()
        with pytest.raises(ValueError) as exc:
            router.get_adapter("unknown", "key", "model")
        assert "Unknown provider" in str(exc.value)

    def test_check_rate_limit_within_limit(self):
        """check_rate_limit returns True within limit."""
        router = ModelRouter()
        assert router.check_rate_limit("trader-1") is True

    def test_check_rate_limit_exceeded(self):
        """check_rate_limit returns False when limit exceeded."""
        router = ModelRouter()
        router._rate_limit_max = 2

        router.record_request("trader-1")
        router.record_request("trader-1")

        assert router.check_rate_limit("trader-1") is False

    def test_record_request_adds_timestamp(self):
        """record_request adds timestamp for trader."""
        router = ModelRouter()
        router.record_request("trader-1")
        assert len(router._rate_limits["trader-1"]) == 1

    @pytest.mark.asyncio
    async def test_generate_calls_adapter(self):
        """generate calls adapter with correct params."""
        router = ModelRouter()

        mock_adapter = AsyncMock()
        mock_adapter.generate_with_retry.return_value = ModelResponse(success=True, content="{}")
        mock_adapter.close = AsyncMock()

        with patch.object(router, 'get_adapter', return_value=mock_adapter):
            result = await router.generate(
                provider="openai",
                api_key="key",
                model="gpt-4",
                system_prompt="system",
                user_prompt="user",
            )

            mock_adapter.generate_with_retry.assert_called_once_with("system", "user", None)
            assert result.success is True

    @pytest.mark.asyncio
    async def test_generate_respects_rate_limit(self):
        """generate returns error when rate limit exceeded."""
        router = ModelRouter()
        router._rate_limit_max = 0

        result = await router.generate(
            provider="openai",
            api_key="key",
            model="gpt-4",
            system_prompt="system",
            user_prompt="user",
            trader_id="trader-1",
        )

        assert result.success is False
        assert result.error_type == ModelErrorType.RATE_LIMIT

    @pytest.mark.asyncio
    async def test_generate_records_request(self):
        """generate records request for rate limiting."""
        router = ModelRouter()

        mock_adapter = AsyncMock()
        mock_adapter.generate_with_retry.return_value = ModelResponse(success=True)
        mock_adapter.close = AsyncMock()

        with patch.object(router, 'get_adapter', return_value=mock_adapter):
            await router.generate(
                provider="openai",
                api_key="key",
                model="gpt-4",
                system_prompt="system",
                user_prompt="user",
                trader_id="trader-1",
            )

            assert len(router._rate_limits["trader-1"]) == 1

    @pytest.mark.asyncio
    async def test_generate_closes_adapter(self):
        """generate closes adapter after use."""
        router = ModelRouter()

        mock_adapter = AsyncMock()
        mock_adapter.generate_with_retry.return_value = ModelResponse(success=True)
        mock_adapter.close = AsyncMock()

        with patch.object(router, 'get_adapter', return_value=mock_adapter):
            await router.generate(
                provider="openai",
                api_key="key",
                model="gpt-4",
                system_prompt="system",
                user_prompt="user",
            )

            mock_adapter.close.assert_called_once()
