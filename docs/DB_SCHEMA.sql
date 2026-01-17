-- DB schema (v0.1) — simplified
-- Use Alembic migrations for actual implementation.

-- users
-- id UUID PK
-- username TEXT UNIQUE
-- password_hash TEXT
-- created_at TIMESTAMPTZ

-- secrets (encrypted blobs)
-- id UUID PK
-- kind TEXT  -- 'exchange_key' | 'model_key'
-- cipher_text BYTEA
-- created_at TIMESTAMPTZ
-- rotated_at TIMESTAMPTZ NULL

-- exchange_accounts
-- id UUID PK
-- user_id UUID FK users(id)
-- exchange TEXT  -- 'binance' | 'gate'
-- label TEXT
-- api_key_secret_id UUID FK secrets(id)
-- status TEXT
-- created_at TIMESTAMPTZ
-- last_sync_at TIMESTAMPTZ

-- model_configs
-- id UUID PK
-- user_id UUID FK users(id)
-- provider TEXT -- 'openai' | 'anthropic' | 'google'
-- model_name TEXT
-- api_key_secret_id UUID FK secrets(id)
-- created_at TIMESTAMPTZ

-- strategies
-- id UUID PK
-- user_id UUID FK users(id)
-- name TEXT
-- schema_version INT
-- config_json JSONB
-- created_at TIMESTAMPTZ
-- updated_at TIMESTAMPTZ

-- traders
-- id UUID PK
-- user_id UUID FK users(id)
-- name TEXT
-- exchange_account_id UUID FK exchange_accounts(id)
-- model_config_id UUID FK model_configs(id)
-- strategy_id UUID FK strategies(id)
-- status TEXT
-- created_at TIMESTAMPTZ

-- market_snapshots
-- id UUID PK
-- exchange TEXT
-- symbol TEXT
-- timeframe TEXT
-- ohlcv_json JSONB
-- indicators_json JSONB
-- created_at TIMESTAMPTZ

-- trade_plans
-- id UUID PK
-- trader_id UUID FK traders(id)
-- symbol TEXT
-- side TEXT -- 'long'|'short'
-- qty NUMERIC
-- entry JSONB
-- tp JSONB
-- sl JSONB
-- rationale_summary TEXT
-- raw_ai_output_json JSONB
-- risk_report_json JSONB
-- created_at TIMESTAMPTZ

-- executions
-- id UUID PK
-- trade_plan_id UUID FK trade_plans(id)
-- exchange_order_ids_json JSONB
-- status TEXT
-- error TEXT NULL
-- created_at TIMESTAMPTZ
-- updated_at TIMESTAMPTZ

-- audit_logs (append-only)
-- id UUID PK
-- actor TEXT
-- action TEXT
-- entity TEXT
-- entity_id UUID
-- payload_json JSONB
-- created_at TIMESTAMPTZ
