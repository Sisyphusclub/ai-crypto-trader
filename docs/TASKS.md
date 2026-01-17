# Tasks (Claude Code friendly)

## Milestone 0 — Scaffold ✅
- [x] Monorepo: web/ server/ worker/
- [x] docker-compose: postgres + redis
- [x] basic CI scripts (lint/test placeholders)

## Milestone 1 — Secrets & Security ✅
- [x] encrypted secrets store (env master key)
- [x] startup checks refuse default/weak secrets
- [x] exchange/model config CRUD (write-only secrets)

## Milestone 2 — Exchanges (Binance + Gate) ✅
- [x] DB migration: trade_plans + executions tables
- [x] ExchangeAdapter abstract base class
- [x] BinanceAdapter: USDT-M perpetual (market + TP/SL)
- [x] GateAdapter: USDT perpetual (market + TP/SL)
- [x] Trade API: /trade/preview, /trade/execute, /positions, /orders
- [x] State machine: entry → TP/SL placed → completed/failed
- [x] Paper trading mode + confirm safety
- [x] idempotency: client_order_id unique constraint
- [x] Precision handling tests

## Milestone 3 — Strategy Studio (MVP) ✅
- [x] DB: strategies + market_snapshots + signals tables
- [x] Strategy CRUD API with validate/toggle endpoints
- [x] Indicators engine: EMA/RSI/ATR (pure Python)
- [x] Triggers engine: thresholds + crossovers + AND logic
- [x] Worker tasks: collect_market_data + evaluate_strategy
- [x] Cooldown mechanism to prevent duplicate signals
- [x] Frontend: /strategies page (list/create/edit/delete)
- [x] Frontend: Dashboard Signals panel with filters
- [x] Frontend: /signals page with detail view
- [x] Unit tests: indicators + triggers (26 tests)

## Milestone 4 — AI + Risk loop
- [ ] model router (OpenAI/Anthropic/Google)
- [ ] strict JSON output (trade plan)
- [ ] hard risk checks gate execution
- [ ] decision logs with reasoning summary (no raw CoT)

## Milestone 5 — Dashboard
- [ ] realtime positions/PnL/orders via SSE/WS
- [ ] filterable decision/execution logs
