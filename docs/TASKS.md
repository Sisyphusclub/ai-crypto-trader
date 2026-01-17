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

## Milestone 4 — AI + Risk loop ✅
- [x] ModelRouter (OpenAI/Anthropic/Google) with adapters
- [x] Strict JSON Schema validation for trade plans
- [x] AI input/output contracts (TradePlanOutput, Evidence)
- [x] RiskManager hard gate (leverage, notional, positions, cooldown, margin)
- [x] Deterministic client_order_id for idempotency
- [x] Trader table: binds exchange + model + strategy
- [x] DecisionLog table: stores plans, risk reports, execution results
- [x] Worker task: run_trader_cycle with full execution loop
- [x] Traders API: CRUD + start/stop endpoints
- [x] Logs API: decisions/executions listing with filters
- [x] Frontend: /traders page (list/create/start/stop)
- [x] Frontend: /logs page with stats and filters
- [x] Decision logs sanitized (no raw CoT, only reason_summary + evidence)
- [x] Unit tests: contracts validation, risk manager (22 tests)

## Milestone 5 — Real-time Dashboard ✅
- [x] SSE real-time data channel (/api/v1/stream)
- [x] Redis cache for positions/orders/PnL snapshots
- [x] Event format: { type, ts, data } with reconnection support
- [x] Dashboard page: positions/orders/signals/decisions/executions
- [x] Replay/Audit view: complete trade chain visualization
- [x] JSON export for decision and trade replay
- [x] PnL API: summary/timeseries/today endpoints
- [x] PnL worker task for background calculation
- [x] Sanitized outputs (no secrets, no raw CoT)
- [x] Frontend SSE hook with auto-reconnect
- [x] Unit tests: dashboard APIs, chain builder, event format

## Milestone 6 — Production Hardening
- [ ] Authentication layer (JWT/API keys)
- [ ] Rate limiting on APIs
- [ ] WebSocket upgrade for lower latency
- [ ] Alerting on execution failures
- [ ] Comprehensive integration tests
