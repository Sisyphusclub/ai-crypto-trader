export interface Trader {
  id: string;
  name: string;
  exchange_account_id: string;
  exchange_label?: string;
  model_config_id: string;
  model_label?: string;
  strategy_id: string;
  strategy_name?: string;
  enabled: boolean;
  mode: 'paper' | 'live';
  max_concurrent_positions: number;
  daily_loss_cap?: string;
  created_at: string;
  updated_at?: string;
}

export interface TraderCreate {
  name: string;
  exchange_account_id: string;
  model_config_id: string;
  strategy_id: string;
  mode: 'paper' | 'live';
  max_concurrent_positions: number;
  daily_loss_cap?: number;
}

export interface DecisionLog {
  id: string;
  trader_id: string;
  trader_name?: string;
  signal_id?: string;
  client_order_id: string;
  status: 'pending' | 'allowed' | 'blocked' | 'executed' | 'failed';
  confidence?: string;
  reason_summary?: string;
  risk_allowed?: boolean;
  risk_reasons?: string[];
  trade_plan_id?: string;
  execution_error?: string;
  model_provider?: string;
  model_name?: string;
  tokens_used?: number;
  is_paper: boolean;
  created_at: string;
}

export interface DecisionLogDetail extends DecisionLog {
  input_snapshot?: Record<string, unknown>;
  trade_plan?: Record<string, unknown>;
  evidence?: Record<string, unknown>;
  normalized_plan?: Record<string, unknown>;
}

export interface LogStats {
  total: number;
  executed: number;
  blocked: number;
  failed: number;
  paper: number;
  live: number;
}

export interface ExchangeAccount {
  id: string;
  exchange: string;
  label: string;
  api_key_masked: string;
  is_testnet: boolean;
  status: string;
  created_at: string;
}

export interface ModelConfig {
  id: string;
  provider: string;
  model_name: string;
  label: string;
  api_key_masked: string;
  created_at: string;
}
