export interface Position {
  symbol: string
  side: string
  quantity: string
  entry_price: string
  unrealized_pnl: string
  leverage: number
  margin_type: string
}

export interface Order {
  order_id: string
  client_order_id: string
  symbol: string
  status: string
  filled_qty: string | null
  filled_price: string | null
}

export interface AccountSnapshot {
  id: string
  exchange: string
  label: string
  is_testnet: boolean
  positions: Position[]
  orders: Order[]
  pnl: {
    total_unrealized_pnl: string
    position_count: number
    estimated: boolean
  }
}

export interface StreamSnapshot {
  mode: 'paper' | 'live'
  ts: string
  accounts: AccountSnapshot[]
  signals: StreamSignal[]
  decisions: StreamDecision[]
  executions: StreamExecution[]
}

export interface StreamSignal {
  id: string
  strategy_id: string
  symbol: string
  timeframe: string
  side: string
  score: string
  reason_summary: string | null
  created_at: string | null
}

export interface StreamDecision {
  id: string
  trader_id: string
  signal_id: string | null
  client_order_id: string
  status: string
  confidence: string | null
  reason_summary: string | null
  risk_allowed: boolean
  risk_reasons: string[] | null
  model_provider: string
  model_name: string
  is_paper: boolean
  created_at: string | null
}

export interface StreamExecution {
  id: string
  client_order_id: string
  symbol: string
  side: string
  quantity: string
  entry_price: string | null
  tp_price: string | null
  sl_price: string | null
  leverage: string
  status: string
  is_paper: boolean
  error_message: string | null
  created_at: string | null
}

export interface PnlToday {
  date: string
  total_pnl: string
  total_trades: number
  executed: number
  failed: number
  estimated: boolean
  mode: 'paper' | 'live'
}
