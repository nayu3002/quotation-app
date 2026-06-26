import { createServerClient } from '@supabase/ssr'
import { createClient as createBrowserClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { cache } from 'react'

/**
 * Get the current authenticated user + their organization from the DB.
 * Supports both SSR cookie-based auth (web) and Bearer token auth (mobile).
 */
export const getOrgContext = cache(async () => {
  let userId: string | null = null

  // Try Bearer token first (mobile app)
  const headerStore = await headers()
  const authorization = headerStore.get('authorization')
  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.slice(7)
    const supabaseAdmin = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (!error && user) {
      userId = user.id
    }
  }

  // Fall back to cookie-based auth (web)
  if (!userId) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2]))
            } catch { /* ignore in Server Components */ }
          },
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (user) userId = user.id
  }

  if (!userId) return null

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { organization: true },
  })

  if (!dbUser) return null

  return {
    user: dbUser,
    org: dbUser.organization,
    organizationId: dbUser.organizationId,
  }
})

export type OrgContext = NonNullable<Awaited<ReturnType<typeof getOrgContext>>>
