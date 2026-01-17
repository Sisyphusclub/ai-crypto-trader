# Claude Code Prompt (master)

You are Claude Code. Implement a self-hosted AI-driven crypto perpetual trading web platform for a single user.

## Hard requirements
1) Security: exchange & model API keys encrypted at rest; never returned by APIs; refuse to start with default/weak secrets.
2) Trading: Binance + Gate perp (USDT-margined first). Must place TP/SL after entry (native or conditional orders). Use idempotent clientOrderId.
3) Stack: Next.js (web) + FastAPI (server) + Worker (Redis queue) + Postgres + Redis; docker-compose for one-command local run.
4) AI: unified ModelRouter for OpenAI/Anthropic/Google; strict JSON outputs; do NOT store raw chain-of-thought—store reasoning summary + structured evidence.
5) Risk: hard-gate every AI plan; never allow AI to execute directly.

## Deliverables
- docker-compose up works
- Web pages: Exchanges / Models / Strategies / Traders / Dashboard / Logs
- OpenAPI docs + basic tests

## Implementation order
Follow TASKS.md milestones 0→5. After each milestone, update README and run tests.
