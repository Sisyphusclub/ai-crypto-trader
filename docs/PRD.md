# PRD (v0.1 MVP) — AI-driven Crypto Perp Trading (Self-hosted)

## One-liner
A self-hosted web platform for personal use: monitor perp-market opportunities → generate a trade plan with AI → hard risk checks → execute on Binance/Gate with TP/SL → real-time dashboard for positions, PnL and decision logs.

## Target user
Single user (you), self-hosted.

## MVP Scope (v0.1)
1. **AI monitors signals → places perp orders with TP/SL**
   - Exchanges: **Binance + Gate** (USDT-margined perpetuals first).
   - Order: market first, add TP/SL (native if supported or via conditional orders).
2. **Multi-model**
   - GPT / Claude / Gemini, switch per trader/strategy.
   - Unified interface: `analyze(market_snapshot, strategy_config) -> trade_plan`.
3. **Strategy Studio (visual builder)**
   - Configure universe (symbols), indicators, triggers, and risk parameters via Web UI (no JSON editing).
4. **Real-time dashboard**
   - Positions, PnL, orders, risk status.
   - Decision logs: input snapshot, output plan, execution result, *reasoning summary* (no raw chain-of-thought storage).
5. **Security (must-have)**
   - Exchange + model keys are encrypted at rest and never returned by APIs.
   - Startup refuses to run with default/weak secrets.
   - Disable withdrawal permissions; recommend exchange API IP whitelist.

## Non-goals (v0.1)
- Multi-tenant, social copy-trading.
- Full backtesting/optimization (provide basic replay/paper mode later).
- HFT/ultra-low-latency execution.

## Success Criteria (personal)
- Run 7 days without duplicate orders or unsafe actions.
- Any trade can be audited: why, with what evidence, what risk checks, and what was executed.
