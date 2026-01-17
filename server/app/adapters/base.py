"""Abstract base class for exchange adapters."""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from enum import Enum
from typing import Optional


class OrderSide(str, Enum):
    BUY = "BUY"
    SELL = "SELL"


class OrderStatus(str, Enum):
    NEW = "NEW"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    FILLED = "FILLED"
    CANCELED = "CANCELED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"


@dataclass
class SymbolInfo:
    """Trading pair precision and limits."""
    symbol: str
    price_precision: int      # decimal places for price
    quantity_precision: int   # decimal places for quantity
    min_quantity: Decimal
    max_quantity: Decimal
    min_notional: Decimal     # minimum order value


@dataclass
class OrderResult:
    """Result of an order placement."""
    success: bool
    order_id: Optional[str] = None
    client_order_id: Optional[str] = None
    status: Optional[OrderStatus] = None
    filled_qty: Optional[Decimal] = None
    filled_price: Optional[Decimal] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    raw_response: Optional[dict] = None


@dataclass
class PositionInfo:
    """Current position information."""
    symbol: str
    side: str                 # LONG/SHORT
    quantity: Decimal
    entry_price: Decimal
    unrealized_pnl: Decimal
    leverage: int
    margin_type: str          # CROSS/ISOLATED


class ExchangeAdapter(ABC):
    """Abstract base class for exchange API adapters."""

    @abstractmethod
    async def get_symbol_info(self, symbol: str) -> SymbolInfo:
        """Get trading pair information including precision and limits."""
        pass

    @abstractmethod
    async def get_balance(self, asset: str = "USDT") -> Decimal:
        """Get available balance for an asset."""
        pass

    @abstractmethod
    async def get_position(self, symbol: str) -> Optional[PositionInfo]:
        """Get current position for a symbol, None if no position."""
        pass

    @abstractmethod
    async def get_positions(self) -> list[PositionInfo]:
        """Get all open positions."""
        pass

    @abstractmethod
    async def set_leverage(self, symbol: str, leverage: int) -> bool:
        """Set leverage for a symbol. Returns True on success."""
        pass

    @abstractmethod
    async def place_market_order(
        self,
        symbol: str,
        side: OrderSide,
        quantity: Decimal,
        client_order_id: str,
    ) -> OrderResult:
        """Place a market order."""
        pass

    @abstractmethod
    async def place_take_profit(
        self,
        symbol: str,
        side: OrderSide,
        quantity: Decimal,
        stop_price: Decimal,
        client_order_id: str,
    ) -> OrderResult:
        """Place a take-profit market order (TAKE_PROFIT_MARKET)."""
        pass

    @abstractmethod
    async def place_stop_loss(
        self,
        symbol: str,
        side: OrderSide,
        quantity: Decimal,
        stop_price: Decimal,
        client_order_id: str,
    ) -> OrderResult:
        """Place a stop-loss market order (STOP_MARKET)."""
        pass

    @abstractmethod
    async def cancel_order(
        self,
        symbol: str,
        order_id: Optional[str] = None,
        client_order_id: Optional[str] = None,
    ) -> bool:
        """Cancel an order by order_id or client_order_id."""
        pass

    @abstractmethod
    async def get_order(
        self,
        symbol: str,
        order_id: Optional[str] = None,
        client_order_id: Optional[str] = None,
    ) -> Optional[OrderResult]:
        """Get order status by order_id or client_order_id."""
        pass

    @abstractmethod
    async def get_open_orders(self, symbol: Optional[str] = None) -> list[OrderResult]:
        """Get all open orders, optionally filtered by symbol."""
        pass

    @abstractmethod
    async def get_ticker(self, symbol: str) -> dict:
        """Get current ticker price for a symbol.

        Returns:
            Dict with 'price' key containing current mark price
        """
        pass

    def round_price(self, price: Decimal, precision: int) -> Decimal:
        """Round price to exchange precision."""
        return Decimal(str(round(float(price), precision)))

    def round_quantity(self, quantity: Decimal, precision: int) -> Decimal:
        """Round quantity to exchange precision."""
        return Decimal(str(round(float(quantity), precision)))
