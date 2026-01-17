export interface ReplayChainStep {
  step: number
  type: 'signal' | 'market_snapshot' | 'ai_decision' | 'risk_report' | 'trade_plan' | 'execution'
  data: Record<string, unknown>
}

export interface ReplayChain {
  generated_at: string
  chain: ReplayChainStep[]
}
