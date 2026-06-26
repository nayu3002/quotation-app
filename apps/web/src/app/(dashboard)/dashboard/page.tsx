import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { DashboardHome } from '@/components/dashboard/home'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id, deletedAt: null },
    select: { organizationId: true, organization: { select: { id: true, name: true, industry: true, defaultCurrency: true, primaryColor: true } } },
  })

  if (!member) redirect('/onboarding')
  const orgId = member.organizationId

  // Parallel data fetch for KPIs
  const [
    totalQuotes,
    sentQuotes,
    signedQuotes,
    totalInvoiced,
    recentQuotes,
    pipelineByStatus,
  ] = await Promise.all([
    prisma.quote.count({ where: { organizationId: orgId, deletedAt: null } }),
    prisma.quote.count({ where: { organizationId: orgId, status: 'sent', deletedAt: null } }),
    prisma.quote.count({ where: { organizationId: orgId, status: 'signed', deletedAt: null } }),
    prisma.invoice.aggregate({
      where: { organizationId: orgId, deletedAt: null },
      _sum: { total: true },
    }),
    prisma.quote.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true, quoteNumber: true, title: true, status: true, total: true,
        currency: true, createdAt: true, contact: { select: { firstName: true, lastName: true } },
        company: { select: { name: true } },
      },
    }),
    prisma.quote.groupBy({
      by: ['status'],
      where: { organizationId: orgId, deletedAt: null },
      _count: { id: true },
      _sum: { total: true },
    }),
  ])

  const winRate = totalQuotes > 0
    ? Math.round((signedQuotes / totalQuotes) * 100)
    : 0

  return (
    <DashboardHome
      org={member.organization}
      kpis={{
        totalQuotes,
        sentQuotes,
        signedQuotes,
        winRate,
        totalInvoiced: Number(totalInvoiced._sum.total ?? 0),
        pipelineByStatus,
      }}
      recentQuotes={recentQuotes.map(q => ({
        ...q,
        total: Number(q.total),
        createdAt: q.createdAt.toISOString(),
      }))}
    />
  )
}
