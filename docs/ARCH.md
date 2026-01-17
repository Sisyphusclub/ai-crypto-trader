# Architecture (v0.1)

## High-level (event-driven with hard risk boundary)
- Web UI: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- API Server: FastAPI (recommended for background tasks + OpenAPI)
- Worker: Redis queue (RQ/Celery) for market ingest, indicators, AI calls, execution, syncing
- DB: Postgres (recommended), SQLite only for quick local MVP
- Realtime: SSE/WebSocket for pushing positions/PnL/logs

## Core modules
1. Market Ingestor: ticks/klines/funding/positions/orders
2. Indicator Engine: RSI/EMA/ATR etc.
3. Signal Orchestrator: schedules strategy evaluation, cooldown/rate limit
4. Model Router: OpenAI/Anthropic/Google adapters with unified timeouts/retries
5. Risk Manager (hard gate): max leverage, max position, daily loss cap, max concurrent positions
6. Execution Engine: converts plan → exchange-specific order graph, handles rollback
7. Audit Log: append-only log for every decision/execution

## Security rules (non-negotiable)
- No admin mode without auth.
- Refuse to start with default JWT/ENCRYPTION secrets.
- Keys: write-only; never returned; store encrypted.
- Masked display only in UI.
