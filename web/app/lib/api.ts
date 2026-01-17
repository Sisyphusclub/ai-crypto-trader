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
