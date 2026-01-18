'use client'

import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AppLayout } from '../../components/layout'
import SignalsPanel from '../../components/SignalsPanel'

export default function SignalsPage() {
  const tNav = useTranslations('nav')
  const { locale } = useParams()

  return (
    <AppLayout locale={locale as string} mode="paper">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">{tNav('signals')}</h1>
        <SignalsPanel />
      </div>
    </AppLayout>
  )
}
