import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Analytics' }

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id, deletedAt: null },
    select: { organizationId: true, organization: { select: { defaultCurrency: true } } },
  })
  if (!member) redirect('/onboarding')

  const orgId = member.organizationId

  const [
    byStatus,
    monthlyRevenue,
    topProducts,
    teamPerformance,
    winLossRatio,
  ] = await Promise.all([
    // Pipeline by status
    prisma.quote.groupBy({
      by: ['status'],
      where: { organizationId: orgId, deletedAt: null },
      _count: { id: true },
      _sum: { total: true },
    }),
    // Monthly revenue (last 6 months)
    prisma.$queryRaw<{ month: string; revenue: number; quotes: number }[]>`
      SELECT
        TO_CHAR(created_at, 'Mon') as month,
        COALESCE(SUM(total::numeric), 0) as revenue,
        COUNT(*) as quotes
      FROM quotes
      WHERE organization_id = ${orgId}
        AND deleted_at IS NULL
        AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(created_at, 'Mon'), DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `,
    // Top products by revenue
    prisma.quoteLineItem.groupBy({
      by: ['name'],
      where: { quote: { organizationId: orgId, deletedAt: null } },
      _sum: { total: true },
      _count: { id: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 10,
    }),
    // Team performance
    prisma.quote.groupBy({
      by: ['createdById'],
      where: { organizationId: orgId, deletedAt: null },
      _count: { id: true },
      _sum: { total: true },
    }),
    // Win vs loss
    prisma.quote.groupBy({
      by: ['status'],
      where: { organizationId: orgId, deletedAt: null, status: { in: ['won', 'signed', 'lost', 'expired'] } },
      _count: { id: true },
    }),
  ])

  const won = winLossRatio.filter(s => ['won', 'signed'].includes(s.status)).reduce((s, i) => s + i._count.id, 0)
  const lost = winLossRatio.filter(s => ['lost', 'expired'].includes(s.status)).reduce((s, i) => s + i._count.id, 0)
  const winRate = (won + lost) > 0 ? Math.round((won / (won + lost)) * 100) : 0

  return (
    <AnalyticsDashboard
      currency={member.organization.defaultCurrency ?? 'USD'}
      pipelineByStatus={byStatus.map(s => ({
        status: s.status,
        count: s._count.id,
        total: Number(s._sum.total ?? 0),
      }))}
      monthlyRevenue={monthlyRevenue.map(m => ({
        month: m.month,
        revenue: Number(m.revenue),
        quotes: Number(m.quotes),
      }))}
      topProducts={topProducts.map(p => ({
        name: p.name,
        revenue: Number(p._sum.total ?? 0),
        count: p._count.id,
      }))}
      winRate={winRate}
      won={won}
      lost={lost}
    />
  )
}
