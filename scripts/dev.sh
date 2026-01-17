#!/usr/bin/env bash
set -euo pipefail

echo "Starting infra (postgres, redis)..."
docker compose up -d postgres redis

echo "In separate terminals run:"
echo "  cd server && python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000"
echo "  cd worker && python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt && python -m worker.main"
echo "  cd web && npm install && npm run dev"
