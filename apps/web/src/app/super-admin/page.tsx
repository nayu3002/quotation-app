import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SuperAdminDashboard } from '@/components/admin/super-admin-dashboard'
import prisma from '@/lib/prisma'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Super Admin — QuoteFlow' }

async function verifyAdminSession() {
  const cookieStore = await cookies()
  const session = cookieStore.get('qf_admin_session')?.value
  return session === process.env.SUPER_ADMIN_SECRET
}

export default async function SuperAdminPage() {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) redirect('/super-admin/login')

  // Platform-wide stats
  const [
    totalOrgs,
    activeOrgs,
    totalUsers,
    totalQuotes,
    recentOrgs,
    planDistribution,
  ] = await Promise.all([
    prisma.organization.count({ where: { deletedAt: null } }),
    prisma.organization.count({ where: { status: 'active', deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.quote.count({ where: { deletedAt: null } }),
    prisma.organization.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { plan: { select: { name: true, tier: true } }, _count: { select: { members: true, quotes: true } } },
    }),
    prisma.organization.groupBy({
      by: ['planId'],
      where: { deletedAt: null },
      _count: { id: true },
    }),
  ])

  return (
    <SuperAdminDashboard
      stats={{ totalOrgs, activeOrgs, totalUsers, totalQuotes }}
      recentOrgs={recentOrgs.map(o => ({
        id: o.id,
        name: o.name,
        status: o.status,
        industry: o.industry,
        createdAt: o.createdAt.toISOString(),
        plan: o.plan?.name ?? 'Free',
        memberCount: o._count.members,
        quoteCount: o._count.quotes,
      }))}
    />
  )
}
