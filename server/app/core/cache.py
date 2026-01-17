"""Redis cache for real-time data snapshots."""
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
import redis

from app.core.settings import settings


class RealtimeCache:
    """Redis-based cache for real-time trading data."""

    POSITIONS_KEY = "rt:positions:{exchange_account_id}"
    ORDERS_KEY = "rt:orders:{exchange_account_id}"
    PNL_KEY = "rt:pnl:{exchange_account_id}"
    LATEST_SIGNAL_KEY = "rt:signals:latest"
    LATEST_DECISION_KEY = "rt:decisions:latest"
    EVENT_STREAM_KEY = "rt:events"

    TTL_SNAPSHOT = 60  # 1 minute TTL for snapshots
    TTL_EVENT = 300  # 5 minutes TTL for events
    MAX_EVENTS = 100  # Keep last 100 events

    def __init__(self):
        self._client: Optional[redis.Redis] = None

    @property
    def client(self) -> redis.Redis:
        if self._client is None:
            self._client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        return self._client

    def _now_iso(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    # --- Positions ---
    def set_positions(self, exchange_account_id: str, positions: List[Dict[str, Any]]) -> None:
        """Cache positions snapshot."""
        key = self.POSITIONS_KEY.format(exchange_account_id=exchange_account_id)
        data = {
            "ts": self._now_iso(),
            "positions": positions,
        }
        self.client.setex(key, self.TTL_SNAPSHOT, json.dumps(data))

    def get_positions(self, exchange_account_id: str) -> Optional[Dict[str, Any]]:
        """Get cached positions."""
        key = self.POSITIONS_KEY.format(exchange_account_id=exchange_account_id)
        data = self.client.get(key)
        return json.loads(data) if data else None

    # --- Orders ---
    def set_orders(self, exchange_account_id: str, orders: List[Dict[str, Any]]) -> None:
        """Cache open orders snapshot."""
        key = self.ORDERS_KEY.format(exchange_account_id=exchange_account_id)
        data = {
            "ts": self._now_iso(),
            "orders": orders,
        }
        self.client.setex(key, self.TTL_SNAPSHOT, json.dumps(data))

    def get_orders(self, exchange_account_id: str) -> Optional[Dict[str, Any]]:
        """Get cached orders."""
        key = self.ORDERS_KEY.format(exchange_account_id=exchange_account_id)
        data = self.client.get(key)
        return json.loads(data) if data else None

    # --- PnL ---
    def set_pnl(self, exchange_account_id: str, pnl_data: Dict[str, Any]) -> None:
        """Cache PnL snapshot."""
        key = self.PNL_KEY.format(exchange_account_id=exchange_account_id)
        data = {
            "ts": self._now_iso(),
            **pnl_data,
        }
        self.client.setex(key, self.TTL_SNAPSHOT, json.dumps(data))

    def get_pnl(self, exchange_account_id: str) -> Optional[Dict[str, Any]]:
        """Get cached PnL."""
        key = self.PNL_KEY.format(exchange_account_id=exchange_account_id)
        data = self.client.get(key)
        return json.loads(data) if data else None

    # --- Event Stream ---
    def push_event(self, event_type: str, data: Dict[str, Any], event_id: Optional[str] = None) -> str:
        """Push event to stream and return event ID."""
        if event_id is None:
            event_id = f"{int(datetime.now(timezone.utc).timestamp() * 1000)}"

        event = {
            "id": event_id,
            "type": event_type,
            "ts": self._now_iso(),
            "data": data,
        }
        # Use Redis list as event stream
        self.client.lpush(self.EVENT_STREAM_KEY, json.dumps(event))
        self.client.ltrim(self.EVENT_STREAM_KEY, 0, self.MAX_EVENTS - 1)
        return event_id

    def get_events_since(self, since_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Get events since given ID (for reconnection)."""
        raw_events = self.client.lrange(self.EVENT_STREAM_KEY, 0, limit - 1)
        events = [json.loads(e) for e in raw_events]

        if since_id:
            # Filter events after since_id
            filtered = []
            for e in reversed(events):
                if e["id"] == since_id:
                    break
                filtered.append(e)
            return list(reversed(filtered))

        return events

    # --- Latest items for quick access ---
    def set_latest_signal(self, signal: Dict[str, Any]) -> None:
        """Cache latest signal."""
        self.client.setex(self.LATEST_SIGNAL_KEY, self.TTL_EVENT, json.dumps(signal))
        self.push_event("signal", signal)

    def set_latest_decision(self, decision: Dict[str, Any]) -> None:
        """Cache latest decision."""
        self.client.setex(self.LATEST_DECISION_KEY, self.TTL_EVENT, json.dumps(decision))
        self.push_event("decision", decision)

    def push_execution_event(self, execution: Dict[str, Any]) -> None:
        """Push execution event."""
        self.push_event("execution", execution)


# Global instance
realtime_cache = RealtimeCache()
