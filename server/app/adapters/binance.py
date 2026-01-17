"""Binance USDT-M Futures adapter."""
import hashlib
import hmac
import time
from decimal import Decimal
from typing import Optional
from urllib.parse import urlencode

import httpx

from app.adapters.base import (
    ExchangeAdapter,
    OrderResult,
    OrderSide,
    OrderStatus,
    PositionInfo,
    SymbolInfo,
)


class BinanceAdapter(ExchangeAdapter):
    """Binance USDT-M Perpetual Futures adapter."""

    MAINNET_BASE = "https://fapi.binance.com"
    TESTNET_BASE = "https://testnet.binancefuture.com"

    STATUS_MAP = {
        "NEW": OrderStatus.NEW,
        "PARTIALLY_FILLED": OrderStatus.PARTIALLY_FILLED,
        "FILLED": OrderStatus.FILLED,
        "CANCELED": OrderStatus.CANCELED,
        "REJECTED": OrderStatus.REJECTED,
        "EXPIRED": OrderStatus.EXPIRED,
    }

    def __init__(self, api_key: str, api_secret: str, testnet: bool = False):
        self.api_key = api_key
        self.api_secret = api_secret
        self.base_url = self.TESTNET_BASE if testnet else self.MAINNET_BASE
        self._client: Optional[httpx.AsyncClient] = None
        self._symbol_cache: dict[str, SymbolInfo] = {}

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers={"X-MBX-APIKEY": self.api_key},
                timeout=30.0,
            )
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    def _sign(self, params: dict) -> dict:
        """Add timestamp and HMAC-SHA256 signature."""
        params["timestamp"] = int(time.time() * 1000)
        query = urlencode(params)
        signature = hmac.new(
            self.api_secret.encode("utf-8"),
            query.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        params["signature"] = signature
        return params

    async def _request(
        self,
        method: str,
        path: str,
        params: Optional[dict] = None,
        signed: bool = True,
    ) -> dict:
        client = await self._get_client()
        params = params or {}
        if signed:
            params = self._sign(params)
        if method == "GET":
            resp = await client.get(path, params=params)
        else:
            resp = await client.post(path, params=params)
        resp.raise_for_status()
        return resp.json()

    async def get_symbol_info(self, symbol: str) -> SymbolInfo:
        if symbol in self._symbol_cache:
            return self._symbol_cache[symbol]

        data = await self._request("GET", "/fapi/v1/exchangeInfo", signed=False)
        for s in data.get("symbols", []):
            if s["symbol"] == symbol:
                price_prec = s.get("pricePrecision", 2)
                qty_prec = s.get("quantityPrecision", 3)
                min_qty = Decimal("0.001")
                max_qty = Decimal("1000000")
                min_notional = Decimal("5")

                for f in s.get("filters", []):
                    if f["filterType"] == "LOT_SIZE":
                        min_qty = Decimal(f["minQty"])
                        max_qty = Decimal(f["maxQty"])
                    elif f["filterType"] == "MIN_NOTIONAL":
                        min_notional = Decimal(f.get("notional", "5"))

                info = SymbolInfo(
                    symbol=symbol,
                    price_precision=price_prec,
                    quantity_precision=qty_prec,
                    min_quantity=min_qty,
                    max_quantity=max_qty,
                    min_notional=min_notional,
                )
                self._symbol_cache[symbol] = info
                return info

        raise ValueError(f"Symbol {symbol} not found")

    async def get_balance(self, asset: str = "USDT") -> Decimal:
        data = await self._request("GET", "/fapi/v2/balance")
        for b in data:
            if b["asset"] == asset:
                return Decimal(b["availableBalance"])
        return Decimal("0")

    async def get_position(self, symbol: str) -> Optional[PositionInfo]:
        data = await self._request("GET", "/fapi/v2/positionRisk", {"symbol": symbol})
        for p in data:
            amt = Decimal(p["positionAmt"])
            if amt != 0:
                return PositionInfo(
                    symbol=p["symbol"],
                    side="LONG" if amt > 0 else "SHORT",
                    quantity=abs(amt),
                    entry_price=Decimal(p["entryPrice"]),
                    unrealized_pnl=Decimal(p["unRealizedProfit"]),
                    leverage=int(p["leverage"]),
                    margin_type=p["marginType"].upper(),
                )
        return None

    async def get_positions(self) -> list[PositionInfo]:
        data = await self._request("GET", "/fapi/v2/positionRisk")
        positions = []
        for p in data:
            amt = Decimal(p["positionAmt"])
            if amt != 0:
                positions.append(PositionInfo(
                    symbol=p["symbol"],
                    side="LONG" if amt > 0 else "SHORT",
                    quantity=abs(amt),
                    entry_price=Decimal(p["entryPrice"]),
                    unrealized_pnl=Decimal(p["unRealizedProfit"]),
                    leverage=int(p["leverage"]),
                    margin_type=p["marginType"].upper(),
                ))
        return positions

    async def set_leverage(self, symbol: str, leverage: int) -> bool:
        try:
            await self._request("POST", "/fapi/v1/leverage", {
                "symbol": symbol,
                "leverage": leverage,
            })
            return True
        except httpx.HTTPStatusError:
            return False

    def _parse_order_result(self, data: dict, success: bool = True) -> OrderResult:
        return OrderResult(
            success=success,
            order_id=str(data.get("orderId", "")),
            client_order_id=data.get("clientOrderId"),
            status=self.STATUS_MAP.get(data.get("status", ""), OrderStatus.NEW),
            filled_qty=Decimal(data["executedQty"]) if data.get("executedQty") else None,
            filled_price=Decimal(data["avgPrice"]) if data.get("avgPrice") and data["avgPrice"] != "0" else None,
            raw_response=data,
        )

    async def place_market_order(
        self,
        symbol: str,
        side: OrderSide,
        quantity: Decimal,
        client_order_id: str,
    ) -> OrderResult:
        try:
            data = await self._request("POST", "/fapi/v1/order", {
                "symbol": symbol,
                "side": side.value,
                "type": "MARKET",
                "quantity": str(quantity),
                "newClientOrderId": client_order_id,
            })
            return self._parse_order_result(data)
        except httpx.HTTPStatusError as e:
            return OrderResult(
                success=False,
                error_code=str(e.response.status_code),
                error_message=e.response.text,
            )

    async def place_take_profit(
        self,
        symbol: str,
        side: OrderSide,
        quantity: Decimal,
        stop_price: Decimal,
        client_order_id: str,
    ) -> OrderResult:
        try:
            data = await self._request("POST", "/fapi/v1/order", {
                "symbol": symbol,
                "side": side.value,
                "type": "TAKE_PROFIT_MARKET",
                "stopPrice": str(stop_price),
                "quantity": str(quantity),
                "newClientOrderId": client_order_id,
                "closePosition": "false",
            })
            return self._parse_order_result(data)
        except httpx.HTTPStatusError as e:
            return OrderResult(
                success=False,
                error_code=str(e.response.status_code),
                error_message=e.response.text,
            )

    async def place_stop_loss(
        self,
        symbol: str,
        side: OrderSide,
        quantity: Decimal,
        stop_price: Decimal,
        client_order_id: str,
    ) -> OrderResult:
        try:
            data = await self._request("POST", "/fapi/v1/order", {
                "symbol": symbol,
                "side": side.value,
                "type": "STOP_MARKET",
                "stopPrice": str(stop_price),
                "quantity": str(quantity),
                "newClientOrderId": client_order_id,
                "closePosition": "false",
            })
            return self._parse_order_result(data)
        except httpx.HTTPStatusError as e:
            return OrderResult(
                success=False,
                error_code=str(e.response.status_code),
                error_message=e.response.text,
            )

    async def cancel_order(
        self,
        symbol: str,
        order_id: Optional[str] = None,
        client_order_id: Optional[str] = None,
    ) -> bool:
        params = {"symbol": symbol}
        if order_id:
            params["orderId"] = order_id
        elif client_order_id:
            params["origClientOrderId"] = client_order_id
        else:
            return False

        try:
            await self._request("DELETE", "/fapi/v1/order", params)
            return True
        except httpx.HTTPStatusError:
            return False

    async def get_order(
        self,
        symbol: str,
        order_id: Optional[str] = None,
        client_order_id: Optional[str] = None,
    ) -> Optional[OrderResult]:
        params = {"symbol": symbol}
        if order_id:
            params["orderId"] = order_id
        elif client_order_id:
            params["origClientOrderId"] = client_order_id
        else:
            return None

        try:
            data = await self._request("GET", "/fapi/v1/order", params)
            return self._parse_order_result(data)
        except httpx.HTTPStatusError:
            return None

    async def get_open_orders(self, symbol: Optional[str] = None) -> list[OrderResult]:
        params = {}
        if symbol:
            params["symbol"] = symbol
        try:
            data = await self._request("GET", "/fapi/v1/openOrders", params)
            return [self._parse_order_result(o) for o in data]
        except httpx.HTTPStatusError:
            return []
