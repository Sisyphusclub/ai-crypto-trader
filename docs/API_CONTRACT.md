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
