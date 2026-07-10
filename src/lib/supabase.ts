import { createBrowserClient } from '@supabase/ssr'

// Shares the app's auth session via the .marketifyall.com cookie (SSO).
// REACT_APP_AUTH_COOKIE_DOMAIN is unset in dev (localhost shares cookies
// across ports already).
const cookieDomain = process.env.REACT_APP_AUTH_COOKIE_DOMAIN

export const supabase = createBrowserClient(
  process.env.REACT_APP_SUPABASE_URL!,
  process.env.REACT_APP_SUPABASE_ANON_KEY!,
  cookieDomain ? { cookieOptions: { domain: cookieDomain } } : undefined
)

export const APP_URL = process.env.REACT_APP_APP_URL || 'http://localhost:3001'

export default supabase
