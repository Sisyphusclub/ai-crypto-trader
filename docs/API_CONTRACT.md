# API Contract (v0.1)

All /api/* require Bearer token.

## Auth
- POST /api/auth/login
- POST /api/auth/logout

## Exchanges
- POST /api/exchanges
- GET /api/exchanges             (never returns secrets)
- POST /api/exchanges/{id}/test
- POST /api/exchanges/{id}/rotate-key

## Models
- POST /api/models
- GET /api/models                (never returns secrets)
- POST /api/models/{id}/test

## Strategy Studio
- POST /api/strategies
- GET /api/strategies
- GET /api/strategies/{id}
- POST /api/strategies/{id}/validate

## Traders (bot instances)
- POST /api/traders
- POST /api/traders/{id}/start
- POST /api/traders/{id}/stop
- GET  /api/traders/{id}/status

## Trading
- POST /api/trade/preview         (AI → risk → plan, no execution)
- POST /api/trade/execute         (execute plan)
- GET  /api/positions
- GET  /api/orders

## Logs
- GET /api/logs/decisions?traderId=&from=&to=
- GET /api/logs/executions?traderId=&from=&to=

## Real-time Stream (SSE)
- GET /api/v1/stream?types=positions,orders,pnl,signals,decisions,executions
  - Event format: `{ "type": "...", "ts": "...", "data": {...} }`
  - Reconnection: uses Last-Event-ID header
- GET /api/v1/stream/snapshot  (non-streaming, for initial load)

## PnL
- GET /api/v1/pnl/summary?from_date=&to_date=&exchange_account_id=&symbol=
- GET /api/v1/pnl/timeseries?bucket=1h&from_date=&to_date=
- GET /api/v1/pnl/today?exchange_account_id=

## Replay / Audit
- GET /api/v1/replay/decision/{id}    (full chain: signal → snapshot → decision → risk → trade → executions)
- GET /api/v1/replay/trade/{id}       (trace back from trade plan)
- GET /api/v1/replay/signal/{id}      (all decisions triggered by signal)
- GET /api/v1/replay/decision/{id}/export  (JSON download)
- GET /api/v1/replay/trade/{id}/export     (JSON download)
