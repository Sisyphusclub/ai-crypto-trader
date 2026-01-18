'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '../../contexts/AuthContext'

interface StepConfig {
  key: string
  statusKey: keyof NonNullable<ReturnType<typeof useAuth>['onboarding']>
  createHref: string
  listEndpoint: string
  icon: React.ReactNode
}

const stepIcons = {
  exchange: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  ),
  model: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
    </svg>
  ),
  strategy: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  trader: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
    </svg>
  ),
}

const steps: StepConfig[] = [
  { key: 'step1', statusKey: 'has_exchange', createHref: '/settings/exchanges', listEndpoint: '/api/v1/exchanges', icon: stepIcons.exchange },
  { key: 'step2', statusKey: 'has_model', createHref: '/settings/models', listEndpoint: '/api/v1/models', icon: stepIcons.model },
  { key: 'step3', statusKey: 'has_strategy', createHref: '/strategies/new', listEndpoint: '/api/v1/strategies', icon: stepIcons.strategy },
  { key: 'step4', statusKey: 'has_trader', createHref: '/traders/new', listEndpoint: '/api/v1/traders', icon: stepIcons.trader },
]

export default function OnboardingPage() {
  const t = useTranslations('onboarding')
  const tCommon = useTranslations('common')
  const { locale } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { onboarding, refreshOnboarding } = useAuth()

  const stepParam = searchParams.get('step')
  const [currentStep, setCurrentStep] = useState(() => {
    if (!stepParam) return 0
    const parsed = parseInt(stepParam)
    if (isNaN(parsed) || parsed < 1 || parsed > steps.length) return 0
    return parsed - 1
  })

  useEffect(() => {
    refreshOnboarding()
  }, [])

  useEffect(() => {
    if (onboarding?.complete) {
      router.push(`/${locale}/dashboard`)
    }
  }, [onboarding?.complete])

  useEffect(() => {
    if (onboarding && !stepParam) {
      const firstIncomplete = steps.findIndex((s) => !onboarding[s.statusKey])
      if (firstIncomplete >= 0) setCurrentStep(firstIncomplete)
    }
  }, [onboarding])

  const handleStepClick = (index: number) => {
    setCurrentStep(index)
    router.push(`/${locale}/onboarding?step=${index + 1}`)
  }

  const goToCreatePage = () => {
    const step = steps[currentStep]
    router.push(`/${locale}${step.createHref}?from=onboarding&step=${currentStep + 1}`)
  }

  const step = steps[currentStep]
  const isComplete = onboarding?.[step.statusKey] ?? false
  const completedCount = steps.filter(s => onboarding?.[s.statusKey]).length

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-700 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="fixed top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 -right-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-3xl relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent mb-4 shadow-glow">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">{t('title')}</h1>
          <p className="text-white/50">{t('subtitle')}</p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-500/50 border border-white/5">
            <span className="text-primary font-bold">{completedCount}</span>
            <span className="text-white/40">/</span>
            <span className="text-white/60">{steps.length}</span>
            <span className="text-white/40 text-sm ml-1">completed</span>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-between mb-8 relative">
          {/* Progress Line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-surface-300" />
          <div
            className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-primary to-accent transition-all duration-500"
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />

          {steps.map((s, i) => {
            const done = onboarding?.[s.statusKey] ?? false
            const active = i === currentStep
            return (
              <button
                key={s.key}
                onClick={() => handleStepClick(i)}
                className="flex-1 flex flex-col items-center relative z-10 group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-sm transition-all duration-300 ${
                  done
                    ? 'bg-gradient-to-br from-success to-success/70 text-white shadow-glow'
                    : active
                    ? 'bg-gradient-to-br from-primary to-accent text-white shadow-glow'
                    : 'bg-surface-500 text-white/40 border border-white/10 group-hover:border-white/20'
                }`}>
                  {done ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span className={`mt-3 text-xs font-medium transition-colors ${active ? 'text-white' : 'text-white/40 group-hover:text-white/60'}`}>
                  {t(s.key)}
                </span>
              </button>
            )
          })}
        </div>

        {/* Current Step Card */}
        <div className="glass-card p-8">
          <div className="flex items-start gap-6">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              isComplete ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
            }`}>
              {step.icon}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-display font-bold text-white mb-2">{t(step.key)}</h2>
              <p className="text-white/50">{t(`${step.key}Desc`)}</p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5">
            {isComplete ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-success font-medium">{t('completed')}</span>
                </div>
                {currentStep < steps.length - 1 ? (
                  <button
                    onClick={() => handleStepClick(currentStep + 1)}
                    className="btn-primary flex items-center gap-2"
                  >
                    {tCommon('next')}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </button>
                ) : (
                  <Link
                    href={`/${locale}/dashboard`}
                    className="btn-primary flex items-center gap-2"
                  >
                    {t('goToDashboard')}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                {currentStep > 0 && (
                  <button
                    onClick={() => handleStepClick(currentStep - 1)}
                    className="btn-ghost flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                    {tCommon('back')}
                  </button>
                )}
                <button
                  onClick={goToCreatePage}
                  className="btn-primary flex items-center gap-2 ml-auto"
                >
                  {t(step.key)}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* All Done Banner */}
        {onboarding?.complete && (
          <div className="mt-6 glass-card p-6 border-success/30 bg-success/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-success font-display font-bold">{t('allDone')}</p>
                  <p className="text-white/40 text-sm">Your trading setup is complete</p>
                </div>
              </div>
              <Link
                href={`/${locale}/dashboard`}
                className="btn-primary"
              >
                {t('goToDashboard')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
