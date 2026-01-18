'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AppLayout } from '../../components/layout'

export default function SettingsPage() {
  const t = useTranslations('settings')
  const tNav = useTranslations('nav')
  const { locale } = useParams()

  const sections = [
    { key: 'exchanges', href: '/settings/exchanges', icon: '🏦' },
    { key: 'models', href: '/settings/models', icon: '🤖' },
  ]

  return (
    <AppLayout locale={locale as string} mode="paper">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">{t('title')}</h1>

        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((s) => (
            <Link
              key={s.key}
              href={`/${locale}${s.href}`}
              className="bg-gray-900 rounded-lg p-6 hover:bg-gray-800 transition"
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{s.icon}</span>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {t(`${s.key}.title`)}
                  </h2>
                  <p className="text-gray-400 text-sm">
                    {t(`${s.key}.subtitle`)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
