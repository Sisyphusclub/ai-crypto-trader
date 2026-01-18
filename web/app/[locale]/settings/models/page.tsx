'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AppLayout } from '../../../components/layout'
import { useAuth } from '../../../contexts/AuthContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface ModelConfig {
  id: string
  provider: string
  model_name: string
  label: string
  api_key_masked: string
  base_url?: string
  created_at: string
}

export default function ModelsPage() {
  const t = useTranslations('settings.models')
  const tCommon = useTranslations('common')
  const { locale } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshOnboarding } = useAuth()
  const fromOnboarding = searchParams.get('from') === 'onboarding'

  const [models, setModels] = useState<ModelConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [provider, setProvider] = useState('openai')
  const [modelName, setModelName] = useState('gpt-4o')
  const [label, setLabel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [saving, setSaving] = useState(false)

  const loadModels = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/models`, { credentials: 'include' })
      if (res.ok) setModels(await res.json())
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadModels()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const res = await fetch(`${API_URL}/api/v1/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model_name: modelName, label, api_key: apiKey, base_url: baseUrl || undefined }),
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Failed to create')
      }
      await loadModels()
      await refreshOnboarding()
      setShowForm(false)
      setLabel('')
      setApiKey('')
      setBaseUrl('')

      if (fromOnboarding) {
        const step = searchParams.get('step')
        router.push(`/${locale}/onboarding?step=${step ? parseInt(step) + 1 : 3}`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create')
    } finally {
      setSaving(false)
    }
  }

  const providerIcons: Record<string, React.ReactNode> = {
    openai: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
      </svg>
    ),
    anthropic: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.304 3h-3.072l5.696 18h3.072L17.304 3zm-7.536 0L4 21h3.072l1.232-4h5.392l1.232 4H18L12.232 3H9.768zm.144 11l1.92-6.222L13.76 14h-3.84z"/>
      </svg>
    ),
    google: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
  }

  return (
    <AppLayout locale={locale as string} mode="paper">
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-white tracking-wide">{t('title')}</h1>
            <p className="text-white/50 mt-1">{t('subtitle')}</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t('add')}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 glass-card border-danger/30 bg-danger/10 text-danger flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}

        {loading ? (
          <div className="glass-card p-8 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/50">{tCommon('loading')}</p>
          </div>
        ) : models.length === 0 && !showForm ? (
          <div className="glass-card p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No AI models configured</h3>
            <p className="text-white/40 mb-6">Add your first AI model to enable intelligent trading</p>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary"
            >
              {t('add')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {models.map((m) => (
              <div key={m.id} className="glass-card-hover p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    m.provider === 'openai' ? 'bg-emerald-500/10 text-emerald-400' :
                    m.provider === 'anthropic' ? 'bg-orange-500/10 text-orange-400' :
                    'bg-blue-500/10 text-blue-400'
                  }`}>
                    {providerIcons[m.provider] || (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{m.label}</span>
                      <span className="badge-primary">{m.provider.toUpperCase()}</span>
                    </div>
                    <p className="text-sm text-white/40 font-mono mt-1">{m.model_name}</p>
                    <p className="text-xs text-white/30 font-mono mt-0.5">{m.api_key_masked}</p>
                    {m.base_url && (
                      <p className="text-xs text-white/20 mt-0.5">{m.base_url}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="badge-success">Active</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Form Modal */}
        {showForm && (
          <div className="modal-overlay" onClick={() => setShowForm(false)}>
            <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-display font-bold text-white">{t('add')}</h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="label">Provider</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['openai', 'anthropic', 'google'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setProvider(p)}
                        className={`p-3 rounded-lg border transition-all duration-200 flex flex-col items-center gap-2 ${
                          provider === p
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-white/10 text-white/60 hover:border-white/20 hover:bg-white/5'
                        }`}
                      >
                        {providerIcons[p]}
                        <span className="text-xs font-medium uppercase">{p}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Model Name</label>
                  <input
                    type="text"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="gpt-4o"
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="label">Label</label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="My GPT-4 Model"
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="label">API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="input-field font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="label">Base URL (Optional)</label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                    className="input-field"
                  />
                  <p className="text-xs text-white/30 mt-1.5">Use for custom endpoints or proxy servers</p>
                </div>
                <div className="divider" />
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="btn-ghost"
                  >
                    {tCommon('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary min-w-[100px]"
                  >
                    {saving ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                        {tCommon('loading')}
                      </span>
                    ) : tCommon('save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
