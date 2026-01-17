"""Gate.io USDT-M Futures adapter."""
import hashlib
import hmac
import json
import time
from decimal import Decimal
from typing import Optional

import httpx

from app.adapters.base import (
    ExchangeAdapter,
    OrderResult,
    OrderSide,
    OrderStatus,
    PositionInfo,
    SymbolInfo,
)


class GateAdapter(ExchangeAdapter):
    """Gate.io USDT Perpetual Futures adapter."""

    MAINNET_BASE = "https://api.gateio.ws"
    TESTNET_BASE = "https://fx-api-testnet.gateio.ws"

    STATUS_MAP = {
        "open": OrderStatus.NEW,
        "finished": OrderStatus.FILLED,
        "cancelled": OrderStatus.CANCELED,
        "liquidated": OrderStatus.CANCELED,
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
                timeout=30.0,
            )
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    def _sign(self, method: str, path: str, query: str = "", body: str = "") -> dict:
        """Generate Gate.io API v4 signature headers."""
        timestamp = str(int(time.time()))
        body_hash = hashlib.sha512(body.encode("utf-8")).hexdigest()
        sign_string = f"{method}\n{path}\n{query}\n{body_hash}\n{timestamp}"
        signature = hmac.new(
            self.api_secret.encode("utf-8"),
            sign_string.encode("utf-8"),
            hashlib.sha512,
        ).hexdigest()
        return {
            "KEY": self.api_key,
            "Timestamp": timestamp,
            "SIGN": signature,
            "Content-Type": "application/json",
        }

    async def _request(
        self,
        method: str,
        path: str,
        params: Optional[dict] = None,
        body: Optional[dict] = None,
        signed: bool = True,
    ) -> dict | list:
        client = await self._get_client()
        query = ""
        body_str = ""

        if params:
            query = "&".join(f"{k}={v}" for k, v in params.items())
        if body:
            body_str = json.dumps(body)

        headers = self._sign(method, path, query, body_str) if signed else {}
        url = f"{path}?{query}" if query else path

        if method == "GET":
            resp = await client.get(url, headers=headers)
        elif method == "POST":
            resp = await client.post(url, headers=headers, content=body_str)
        elif method == "DELETE":
            resp = await client.delete(url, headers=headers)
        else:
            raise ValueError(f"Unsupported method: {method}")

        resp.raise_for_status()
        return resp.json()

    def _convert_symbol(self, symbol: str) -> str:
        """Convert BTCUSDT format to BTC_USDT format."""
        if "_" in symbol:
            return symbol
        if symbol.endswith("USDT"):
            return symbol[:-4] + "_USDT"
        return symbol

    async def get_symbol_info(self, symbol: str) -> SymbolInfo:
        gate_symbol = self._convert_symbol(symbol)
        if gate_symbol in self._symbol_cache:
            return self._symbol_cache[gate_symbol]

        data = await self._request("GET", "/api/v4/futures/usdt/contracts", signed=False)
        for c in data:
            if c["name"] == gate_symbol:
                quanto_multiplier = Decimal(c.get("quanto_multiplier", "1"))
                order_size_min = int(c.get("order_size_min", 1))
                order_size_max = int(c.get("order_size_max", 1000000))

                info = SymbolInfo(
                    symbol=gate_symbol,
                    price_precision=int(c.get("mark_price_round", "0.01").count("0") + 1) if "." in str(c.get("mark_price_round", "0.01")) else 2,
                    quantity_precision=0,
                    min_quantity=Decimal(order_size_min) * quanto_multiplier,
                    max_quantity=Decimal(order_size_max) * quanto_multiplier,
                    min_notional=Decimal("1"),
                )
                self._symbol_cache[gate_symbol] = info
                return info

        raise ValueError(f"Symbol {gate_symbol} not found")

    async def get_balance(self, asset: str = "USDT") -> Decimal:
        data = await self._request("GET", "/api/v4/futures/usdt/accounts")
        return Decimal(str(data.get("available", "0")))

    async def get_position(self, symbol: str) -> Optional[PositionInfo]:
        gate_symbol = self._convert_symbol(symbol)
        try:
            data = await self._request("GET", f"/api/v4/futures/usdt/positions/{gate_symbol}")
            size = int(data.get("size", 0))
            if size != 0:
                return PositionInfo(
                    symbol=gate_symbol,
                    side="LONG" if size > 0 else "SHORT",
                    quantity=Decimal(abs(size)),
                    entry_price=Decimal(str(data.get("entry_price", "0"))),
                    unrealized_pnl=Decimal(str(data.get("unrealised_pnl", "0"))),
                    leverage=int(data.get("leverage", 1)),
                    margin_type="CROSS" if data.get("mode") == "single" else "ISOLATED",
                )
        except httpx.HTTPStatusError:
            pass
        return None

    async def get_positions(self) -> list[PositionInfo]:
        data = await self._request("GET", "/api/v4/futures/usdt/positions")
        positions = []
        for p in data:
            size = int(p.get("size", 0))
            if size != 0:
                positions.append(PositionInfo(
                    symbol=p["contract"],
                    side="LONG" if size > 0 else "SHORT",
                    quantity=Decimal(abs(size)),
                    entry_price=Decimal(str(p.get("entry_price", "0"))),
                    unrealized_pnl=Decimal(str(p.get("unrealised_pnl", "0"))),
                    leverage=int(p.get("leverage", 1)),
                    margin_type="CROSS" if p.get("mode") == "single" else "ISOLATED",
                ))
        return positions

    async def set_leverage(self, symbol: str, leverage: int) -> bool:
        gate_symbol = self._convert_symbol(symbol)
        try:
            await self._request("POST", f"/api/v4/futures/usdt/positions/{gate_symbol}/leverage", body={
                "leverage": str(leverage),
            })
            return True
        except httpx.HTTPStatusError:
            return False

    def _parse_order_result(self, data: dict, success: bool = True) -> OrderResult:
        status_str = data.get("status", "open")
        filled_size = int(data.get("size", 0)) - int(data.get("left", 0))
        return OrderResult(
            success=success,
            order_id=str(data.get("id", "")),
            client_order_id=data.get("text"),
            status=self.STATUS_MAP.get(status_str, OrderStatus.NEW),
            filled_qty=Decimal(filled_size) if filled_size else None,
            filled_price=Decimal(str(data["fill_price"])) if data.get("fill_price") and data["fill_price"] != "0" else None,
            raw_response=data,
        )

    async def place_market_order(
        self,
        symbol: str,
        side: OrderSide,
        quantity: Decimal,
        client_order_id: str,
    ) -> OrderResult:
        gate_symbol = self._convert_symbol(symbol)
        size = int(quantity) if side == OrderSide.BUY else -int(quantity)
        try:
            data = await self._request("POST", "/api/v4/futures/usdt/orders", body={
                "contract": gate_symbol,
                "size": size,
                "price": "0",
                "tif": "ioc",
                "text": client_order_id,
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
        gate_symbol = self._convert_symbol(symbol)
        size = int(quantity) if side == OrderSide.BUY else -int(quantity)
        try:
            data = await self._request("POST", "/api/v4/futures/usdt/price_orders", body={
                "initial": {
                    "contract": gate_symbol,
                    "size": size,
                    "price": "0",
                    "tif": "ioc",
                    "text": client_order_id,
                },
                "trigger": {
                    "strategy_type": 0,
                    "price_type": 0,
                    "price": str(stop_price),
                    "rule": 1 if side == OrderSide.SELL else 2,
                },
            })
            return OrderResult(
                success=True,
                order_id=str(data.get("id", "")),
                client_order_id=client_order_id,
                status=OrderStatus.NEW,
                raw_response=data,
            )
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
        gate_symbol = self._convert_symbol(symbol)
        size = int(quantity) if side == OrderSide.BUY else -int(quantity)
        try:
            data = await self._request("POST", "/api/v4/futures/usdt/price_orders", body={
                "initial": {
                    "contract": gate_symbol,
                    "size": size,
                    "price": "0",
                    "tif": "ioc",
                    "text": client_order_id,
                },
                "trigger": {
                    "strategy_type": 0,
                    "price_type": 0,
                    "price": str(stop_price),
                    "rule": 2 if side == OrderSide.SELL else 1,
                },
            })
            return OrderResult(
                success=True,
                order_id=str(data.get("id", "")),
                client_order_id=client_order_id,
                status=OrderStatus.NEW,
                raw_response=data,
            )
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
        if not order_id:
            return False
        try:
            await self._request("DELETE", f"/api/v4/futures/usdt/orders/{order_id}")
            return True
        except httpx.HTTPStatusError:
            return False

    async def get_order(
        self,
        symbol: str,
        order_id: Optional[str] = None,
        client_order_id: Optional[str] = None,
    ) -> Optional[OrderResult]:
        if not order_id:
            return None
        try:
            data = await self._request("GET", f"/api/v4/futures/usdt/orders/{order_id}")
            return self._parse_order_result(data)
        except httpx.HTTPStatusError:
            return None

    async def get_open_orders(self, symbol: Optional[str] = None) -> list[OrderResult]:
        params = {"status": "open"}
        if symbol:
            params["contract"] = self._convert_symbol(symbol)
        try:
            data = await self._request("GET", "/api/v4/futures/usdt/orders", params=params)
            return [self._parse_order_result(o) for o in data]
        except httpx.HTTPStatusError:
            return []
