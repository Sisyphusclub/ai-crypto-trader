# Acceptance (v0.1)

## Trading correctness
- After entry order, TP/SL is placed successfully (or via conditional orders) and visible in UI.
- On restart, the system re-syncs from exchange: positions/orders consistent.

## Risk
- If AI suggests exceeding max leverage/position/daily loss cap, it is blocked and logged with reason.
- Duplicate prevention: same symbol+side within cooldown must not re-open.

## Security
- API never returns plaintext secrets.
- Startup refuses default secrets.
- README warns to restrict exchange API keys (no withdraw perms) and recommends IP whitelist.
