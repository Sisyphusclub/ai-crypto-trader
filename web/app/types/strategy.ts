export interface Strategy {
  id: string;
  name: string;
  enabled: boolean;
  exchange_scope: string[];
  symbols: string[];
  timeframe: string;
  indicators_json: IndicatorsConfig;
  triggers_json: TriggersConfig;
  risk_json: RiskConfig;
  cooldown_seconds: number;
  created_at: string;
  updated_at?: string;
}

export interface IndicatorConfig {
  type: 'EMA' | 'RSI' | 'ATR';
  period: number;
  name?: string;
}

export interface IndicatorsConfig {
  indicators: IndicatorConfig[];
}

export interface TriggerCondition {
  indicator: string;
  operator: '<' | '>' | 'crosses_above' | 'crosses_below';
  value?: number;
  compare_to?: string;
}

export interface TriggerRule {
  side: 'long' | 'short';
  conditions: TriggerCondition[];
  logic: 'AND';
}

export interface TriggersConfig {
  rules: TriggerRule[];
}

export interface RiskConfig {
  max_leverage: number;
  max_position_notional?: number;
  cooldown_seconds: number;
  tp_atr_multiplier?: number;
  sl_atr_multiplier?: number;
}

export interface StrategyCreate {
  name: string;
  exchange_scope: string[];
  symbols: string[];
  timeframe: string;
  indicators: IndicatorsConfig;
  triggers: TriggersConfig;
  risk: RiskConfig;
}

export interface StrategyUpdate {
  name?: string;
  enabled?: boolean;
  exchange_scope?: string[];
  symbols?: string[];
  timeframe?: string;
  indicators?: IndicatorsConfig;
  triggers?: TriggersConfig;
  risk?: RiskConfig;
}

export interface StrategyValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface Signal {
  id: string;
  strategy_id: string;
  symbol: string;
  timeframe: string;
  side: string;
  score: string;
  reason_summary?: string;
  created_at: string;
}

export interface SignalDetail extends Signal {
  strategy_name?: string;
  indicators_at_signal?: Record<string, number | null>;
}
