const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchStrategies() {
  const res = await fetch(`${API_URL}/api/v1/strategies`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchStrategy(id: string) {
  const res = await fetch(`${API_URL}/api/v1/strategies/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function createStrategy(data: unknown) {
  const res = await fetch(`${API_URL}/api/v1/strategies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function updateStrategy(id: string, data: unknown) {
  const res = await fetch(`${API_URL}/api/v1/strategies/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function deleteStrategy(id: string) {
  const res = await fetch(`${API_URL}/api/v1/strategies/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function toggleStrategy(id: string) {
  const res = await fetch(`${API_URL}/api/v1/strategies/${id}/toggle`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function validateStrategy(id: string) {
  const res = await fetch(`${API_URL}/api/v1/strategies/${id}/validate`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchSignals(params?: {
  strategy_id?: string;
  symbol?: string;
  side?: string;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.strategy_id) searchParams.set('strategy_id', params.strategy_id);
  if (params?.symbol) searchParams.set('symbol', params.symbol);
  if (params?.side) searchParams.set('side', params.side);
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const url = `${API_URL}/api/v1/signals?${searchParams}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchSignal(id: string) {
  const res = await fetch(`${API_URL}/api/v1/signals/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Traders API
export async function fetchTraders(enabled?: boolean) {
  const params = new URLSearchParams();
  if (enabled !== undefined) params.set('enabled', String(enabled));
  const url = `${API_URL}/api/v1/traders?${params}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchTrader(id: string) {
  const res = await fetch(`${API_URL}/api/v1/traders/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function createTrader(data: unknown) {
  const res = await fetch(`${API_URL}/api/v1/traders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function updateTrader(id: string, data: unknown) {
  const res = await fetch(`${API_URL}/api/v1/traders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function deleteTrader(id: string) {
  const res = await fetch(`${API_URL}/api/v1/traders/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function startTrader(id: string, confirm: boolean = false) {
  const res = await fetch(`${API_URL}/api/v1/traders/${id}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function stopTrader(id: string) {
  const res = await fetch(`${API_URL}/api/v1/traders/${id}/stop`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Logs API
export async function fetchDecisions(params?: {
  trader_id?: string;
  status?: string;
  is_paper?: boolean;
  limit?: number;
  offset?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.trader_id) searchParams.set('trader_id', params.trader_id);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.is_paper !== undefined) searchParams.set('is_paper', String(params.is_paper));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));

  const url = `${API_URL}/api/v1/logs/decisions?${searchParams}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchDecision(id: string) {
  const res = await fetch(`${API_URL}/api/v1/logs/decisions/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchExecutions(params?: {
  trader_id?: string;
  status?: string;
  is_paper?: boolean;
  limit?: number;
  offset?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.trader_id) searchParams.set('trader_id', params.trader_id);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.is_paper !== undefined) searchParams.set('is_paper', String(params.is_paper));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));

  const url = `${API_URL}/api/v1/logs/executions?${searchParams}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchLogStats(trader_id?: string) {
  const params = new URLSearchParams();
  if (trader_id) params.set('trader_id', trader_id);
  const url = `${API_URL}/api/v1/logs/stats?${params}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Resources for Trader creation
export async function fetchExchangeAccounts() {
  const res = await fetch(`${API_URL}/api/v1/exchanges`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchModelConfigs() {
  const res = await fetch(`${API_URL}/api/v1/models`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Stream API
export function getStreamUrl(types: string = 'positions,orders,pnl') {
  return `${API_URL}/api/v1/stream?types=${types}`;
}

export async function fetchStreamSnapshot(exchangeAccountId?: string) {
  const params = new URLSearchParams();
  if (exchangeAccountId) params.set('exchange_account_id', exchangeAccountId);
  const url = `${API_URL}/api/v1/stream/snapshot?${params}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// PnL API
export async function fetchPnlSummary(params?: {
  from_date?: string;
  to_date?: string;
  exchange_account_id?: string;
  symbol?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.from_date) searchParams.set('from_date', params.from_date);
  if (params?.to_date) searchParams.set('to_date', params.to_date);
  if (params?.exchange_account_id) searchParams.set('exchange_account_id', params.exchange_account_id);
  if (params?.symbol) searchParams.set('symbol', params.symbol);
  const url = `${API_URL}/api/v1/pnl/summary?${searchParams}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchPnlToday(exchangeAccountId?: string) {
  const params = new URLSearchParams();
  if (exchangeAccountId) params.set('exchange_account_id', exchangeAccountId);
  const url = `${API_URL}/api/v1/pnl/today?${params}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Replay API
export async function fetchReplayDecision(decisionId: string) {
  const res = await fetch(`${API_URL}/api/v1/replay/decision/${decisionId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchReplayTrade(tradePlanId: string) {
  const res = await fetch(`${API_URL}/api/v1/replay/trade/${tradePlanId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function getReplayExportUrl(type: 'decision' | 'trade', id: string) {
  return `${API_URL}/api/v1/replay/${type}/${id}/export`;
}
