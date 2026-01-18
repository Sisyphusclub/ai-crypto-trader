import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { locales, defaultLocale } from './i18n'

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
})

const publicPaths = ['/login', '/register']

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Extract locale from path
  const pathnameLocale = locales.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )
  const locale = pathnameLocale || defaultLocale
  const pathWithoutLocale = pathnameLocale
    ? pathname.replace(`/${pathnameLocale}`, '') || '/'
    : pathname

  // Check if public path (exact match or path boundary)
  const isPublic = publicPaths.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(`${p}/`)
  )

  // Check auth cookie
  const token = request.cookies.get('access_token')?.value

  // Redirect unauthenticated users to login (except public paths)
  if (!isPublic && !token) {
    const loginUrl = new URL(`/${locale}/login`, request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from login/register
  if (isPublic && token) {
    return NextResponse.redirect(new URL(`/${locale}`, request.url))
  }

  return intlMiddleware(request)
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
  unstable_allowDynamic: [
    '/node_modules/next-intl/**',
  ],
}
