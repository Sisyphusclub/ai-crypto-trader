# AI Crypto Trader (MVP)

[中文文档](./README.zh-CN.md)

A self-hosted, AI-driven crypto perpetual trading platform for personal use.

## Prerequisites

- Docker & Docker Compose
- Node.js 20+
- Python 3.12+

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# 1. Copy and configure environment
cp .env.example .env

# 2. Generate strong secrets (REQUIRED)
# Replace JWT_SECRET and MASTER_KEY in .env with:
openssl rand -hex 32

# 3. Start all services
docker compose up -d

# 4. Run database migrations
docker compose exec server alembic upgrade head
```

### Option 2: Local Development

```bash
# 1. Copy and configure environment
cp .env.example .env
# Edit .env and set strong JWT_SECRET and MASTER_KEY

# 2. Start infrastructure
docker compose up -d postgres redis

# 3. Server (terminal 1)
cd server
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# 4. Worker (terminal 2)
cd worker
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m worker.main

# 5. Web (terminal 3)
cd web
npm install
npm run dev
```

## Access Points

| Service | URL |
|---------|-----|
| Web UI | http://localhost:3000 |
| API Docs (OpenAPI) | http://localhost:8000/docs |
| API Docs (ReDoc) | http://localhost:8000/redoc |
| Health Check | http://localhost:8000/health |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | **Yes** | JWT signing key (min 32 chars). Generate with `openssl rand -hex 32` |
| `MASTER_KEY` | **Yes** | Encryption key for secrets (min 32 chars). Generate with `openssl rand -hex 32` |
| `APP_ENV` | No | Environment name (default: `dev`) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `PAPER_TRADING` | No | Enable paper trading mode (default: `true`) |
| `NEXT_PUBLIC_API_URL` | No | Backend API URL for frontend (default: `http://localhost:8000`) |

## Security Requirements

### Secrets Management

- **Service refuses to start with weak/default secrets.** You must set strong values for `JWT_SECRET` and `MASTER_KEY`.
- **API keys are encrypted at rest** using AES-256-GCM.
- **API keys are never returned** by any API endpoint. Only masked values (e.g., `sk-a***xyz`) are shown.
- **Logs never contain sensitive data.** All secret fields are filtered before logging.

### Exchange API Keys

- Use exchange API keys **without withdrawal permissions**.
- Enable **IP whitelist** on exchange API keys when possible.
- Keys are stored encrypted and never exposed via API.

### Generate Strong Secrets

```bash
# Generate a 32-byte hex secret
openssl rand -hex 32

# Or using Python
python -c "import secrets; print(secrets.token_hex(32))"
```

## Database Migrations

```bash
# Run migrations
cd server
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "Description"

# Rollback
alembic downgrade -1
```

## API Endpoints

### Health & Status
- `GET /health` - System health check (DB, Redis status)

### Exchange Configuration
- `POST /api/v1/exchanges` - Create exchange account
- `GET /api/v1/exchanges` - List exchange accounts (secrets masked)
- `GET /api/v1/exchanges/{id}` - Get exchange account
- `PUT /api/v1/exchanges/{id}` - Update exchange account
- `DELETE /api/v1/exchanges/{id}` - Delete exchange account

### Model Configuration
- `POST /api/v1/models` - Create model config
- `GET /api/v1/models` - List model configs (secrets masked)
- `GET /api/v1/models/{id}` - Get model config
- `PUT /api/v1/models/{id}` - Update model config
- `DELETE /api/v1/models/{id}` - Delete model config

### Tasks
- `POST /api/v1/tasks/ping` - Enqueue demo ping task
- `GET /api/v1/tasks/{task_id}` - Get task status

### Trading
- `POST /api/v1/trade/preview` - Preview trade (margin, warnings)
- `POST /api/v1/trade/execute` - Execute trade plan
- `GET /api/v1/trade/positions` - Get open positions
- `GET /api/v1/trade/orders` - Get open orders
- `GET /api/v1/trade/plans` - List trade plans
- `GET /api/v1/trade/plans/{id}` - Get trade plan details

## Project Structure

```
ai-crypto-trader/
├── server/          # FastAPI backend
│   ├── app/
│   │   ├── adapters/  # Exchange adapters (Binance, Gate)
│   │   ├── api/       # API routers
│   │   ├── core/      # Settings, crypto, database
│   │   └── models/    # SQLAlchemy models
│   ├── migrations/    # Alembic migrations
│   └── tests/         # Unit tests
├── worker/          # RQ background worker
│   └── worker/
│       └── tasks/   # Task definitions
├── web/             # Next.js frontend
│   └── app/
│       └── components/
├── docs/            # Documentation
└── docker-compose.yml
```

## Current Status: Milestone 2 Complete

### Milestone 1 (Done)
- [x] Monorepo structure (web/server/worker)
- [x] Docker Compose with health checks
- [x] FastAPI with OpenAPI docs
- [x] AES-256-GCM encryption for secrets
- [x] Startup security checks (reject weak secrets)
- [x] Alembic database migrations
- [x] Exchange config CRUD (binance/gate)
- [x] Model config CRUD (openai/anthropic/google)
- [x] Worker with RQ and demo ping task
- [x] Next.js frontend with health status display

### Milestone 2 (Done)
- [x] ExchangeAdapter abstract base class
- [x] BinanceAdapter (USDT-M perpetual futures)
- [x] GateAdapter (USDT perpetual futures)
- [x] Trade API: preview, execute, positions, orders
- [x] State machine: entry → TP/SL → completed/failed
- [x] Paper trading mode with confirm safety
- [x] Idempotency via client_order_id
- [x] Precision handling for quantities/prices

## Next: Milestone 3 - Strategy Studio

See `docs/TASKS.md` for the complete roadmap.
