"""Tests for exchange adapters."""
import pytest
from decimal import Decimal
from unittest.mock import AsyncMock, patch, MagicMock

from app.adapters.base import OrderSide, OrderStatus, SymbolInfo, OrderResult
from app.adapters.binance import BinanceAdapter
from app.adapters.gate import GateAdapter


class TestBinanceAdapter:
    """Tests for Binance adapter."""

    @pytest.fixture
    def adapter(self):
        return BinanceAdapter("test_key", "test_secret", testnet=True)

    def test_init(self, adapter):
        assert adapter.api_key == "test_key"
        assert adapter.api_secret == "test_secret"
        assert adapter.base_url == BinanceAdapter.TESTNET_BASE

    def test_sign_adds_timestamp_and_signature(self, adapter):
        params = {"symbol": "BTCUSDT"}
        signed = adapter._sign(params.copy())
        assert "timestamp" in signed
        assert "signature" in signed
        assert len(signed["signature"]) == 64  # SHA256 hex

    @pytest.mark.asyncio
    async def test_get_symbol_info(self, adapter):
        mock_data = {
            "symbols": [{
                "symbol": "BTCUSDT",
                "pricePrecision": 2,
                "quantityPrecision": 3,
                "filters": [
                    {"filterType": "LOT_SIZE", "minQty": "0.001", "maxQty": "1000"},
                    {"filterType": "MIN_NOTIONAL", "notional": "5"},
                ]
            }]
        }
        with patch.object(adapter, "_request", new_callable=AsyncMock) as mock_req:
            mock_req.return_value = mock_data
            info = await adapter.get_symbol_info("BTCUSDT")
            assert info.symbol == "BTCUSDT"
            assert info.price_precision == 2
            assert info.quantity_precision == 3
            assert info.min_quantity == Decimal("0.001")

    @pytest.mark.asyncio
    async def test_place_market_order_success(self, adapter):
        mock_response = {
            "orderId": 12345,
            "clientOrderId": "ACT_test123",
            "status": "FILLED",
            "executedQty": "0.1",
            "avgPrice": "50000.00",
        }
        with patch.object(adapter, "_request", new_callable=AsyncMock) as mock_req:
            mock_req.return_value = mock_response
            result = await adapter.place_market_order(
                symbol="BTCUSDT",
                side=OrderSide.BUY,
                quantity=Decimal("0.1"),
                client_order_id="ACT_test123",
            )
            assert result.success is True
            assert result.order_id == "12345"
            assert result.status == OrderStatus.FILLED

    @pytest.mark.asyncio
    async def test_round_precision(self, adapter):
        price = Decimal("50000.123456")
        rounded = adapter.round_price(price, 2)
        assert rounded == Decimal("50000.12")

        qty = Decimal("0.12345")
        rounded_qty = adapter.round_quantity(qty, 3)
        assert rounded_qty == Decimal("0.123")


class TestGateAdapter:
    """Tests for Gate adapter."""

    @pytest.fixture
    def adapter(self):
        return GateAdapter("test_key", "test_secret", testnet=True)

    def test_init(self, adapter):
        assert adapter.api_key == "test_key"
        assert adapter.api_secret == "test_secret"
        assert adapter.base_url == GateAdapter.TESTNET_BASE

    def test_convert_symbol(self, adapter):
        assert adapter._convert_symbol("BTCUSDT") == "BTC_USDT"
        assert adapter._convert_symbol("BTC_USDT") == "BTC_USDT"
        assert adapter._convert_symbol("ETHUSDT") == "ETH_USDT"

    def test_sign_generates_headers(self, adapter):
        headers = adapter._sign("GET", "/api/v4/futures/usdt/accounts", "", "")
        assert "KEY" in headers
        assert "Timestamp" in headers
        assert "SIGN" in headers
        assert headers["KEY"] == "test_key"


class TestIdempotency:
    """Test client_order_id idempotency."""

    @pytest.mark.asyncio
    async def test_duplicate_order_id_rejected(self):
        """Verify exchange rejects duplicate client_order_id."""
        adapter = BinanceAdapter("key", "secret", testnet=True)

        # First order succeeds
        mock_success = {
            "orderId": 1,
            "clientOrderId": "ACT_same_id",
            "status": "FILLED",
            "executedQty": "0.1",
            "avgPrice": "50000",
        }

        with patch.object(adapter, "_request", new_callable=AsyncMock) as mock_req:
            mock_req.return_value = mock_success
            result1 = await adapter.place_market_order(
                "BTCUSDT", OrderSide.BUY, Decimal("0.1"), "ACT_same_id"
            )
            assert result1.success is True

        # Second order with same ID should fail (mocked)
        import httpx
        mock_error = MagicMock()
        mock_error.status_code = 400
        mock_error.text = '{"code": -2022, "msg": "Duplicate clientOrderId"}'

        with patch.object(adapter, "_request", new_callable=AsyncMock) as mock_req:
            mock_req.side_effect = httpx.HTTPStatusError(
                "400", request=MagicMock(), response=mock_error
            )
            result2 = await adapter.place_market_order(
                "BTCUSDT", OrderSide.BUY, Decimal("0.1"), "ACT_same_id"
            )
            assert result2.success is False
            assert "Duplicate" in (result2.error_message or "")


class TestPrecision:
    """Test precision handling."""

    def test_quantity_precision(self):
        adapter = BinanceAdapter("key", "secret")

        # Test various precision levels
        assert adapter.round_quantity(Decimal("0.123456789"), 3) == Decimal("0.123")
        assert adapter.round_quantity(Decimal("0.999"), 2) == Decimal("1.0")
        assert adapter.round_quantity(Decimal("100.5"), 0) == Decimal("100")

    def test_price_precision(self):
        adapter = BinanceAdapter("key", "secret")

        assert adapter.round_price(Decimal("50000.12345"), 2) == Decimal("50000.12")
        assert adapter.round_price(Decimal("0.00001234"), 8) == Decimal("0.00001234")
