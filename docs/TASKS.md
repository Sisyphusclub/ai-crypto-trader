# Tasks (Claude Code friendly)

## Milestone 0 — Scaffold
- Monorepo: web/ server/ worker/
- docker-compose: postgres + redis
- basic CI scripts (lint/test placeholders)

## Milestone 1 — Secrets & Security (do first)
- encrypted secrets store (env master key)
- startup checks refuse default/weak secrets
- exchange/model config CRUD (write-only secrets)

## Milestone 2 — Exchanges (Binance + Gate)
- adapters: place order, list positions/orders, set TP/SL
- idempotency: clientOrderId
- retries + error normalization

## Milestone 3 — Strategy Studio (MVP)
- schema + visual form
- indicators: RSI/EMA/ATR
- triggers + cooldown

## Milestone 4 — AI + Risk loop
- model router (OpenAI/Anthropic/Google)
- strict JSON output (trade plan)
- hard risk checks gate execution
- decision logs with reasoning summary (no raw CoT)

## Milestone 5 — Dashboard
- realtime positions/PnL/orders via SSE/WS
- filterable decision/execution logs
