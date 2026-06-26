import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id, deletedAt: null },
    select: { organizationId: true },
  })
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const orgId = member.organizationId
  const { searchParams } = req.nextUrl
  const type = searchParams.get('type') ?? 'pipeline'
  const days = Number(searchParams.get('days') ?? 30)

  const since = new Date()
  since.setDate(since.getDate() - days)

  switch (type) {
    case 'pipeline': {
      const byStatus = await prisma.quote.groupBy({
        by: ['status'],
        where: { organizationId: orgId, deletedAt: null },
        _count: { id: true },
        _sum: { total: true },
      })
      const total = await prisma.quote.aggregate({
        where: { organizationId: orgId, deletedAt: null },
        _sum: { total: true },
        _count: { id: true },
      })
      const winRate = await (async () => {
        const [signed, all] = await Promise.all([
          prisma.quote.count({ where: { organizationId: orgId, status: 'signed', deletedAt: null } }),
          prisma.quote.count({ where: { organizationId: orgId, deletedAt: null } }),
        ])
        return all > 0 ? Math.round((signed / all) * 100) : 0
      })()
      return NextResponse.json({ data: { byStatus, total, winRate } })
    }

    case 'revenue': {
      const invoices = await prisma.invoice.aggregate({
        where: { organizationId: orgId, deletedAt: null },
        _sum: { total: true, amountPaid: true, amountDue: true },
      })
      const recentPayments = await prisma.payment.findMany({
        where: { organizationId: orgId, status: 'completed', paidAt: { gte: since } },
        orderBy: { paidAt: 'desc' },
        take: 50,
        select: { amount: true, paidAt: true, currency: true },
      })
      return NextResponse.json({ data: { invoices, recentPayments } })
    }

    case 'products': {
      const topProducts = await prisma.quoteLineItem.groupBy({
        by: ['productId', 'name'],
        where: { quote: { organizationId: orgId, deletedAt: null } },
        _count: { id: true },
        _sum: { total: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      })
      return NextResponse.json({ data: { topProducts } })
    }

    case 'team': {
      const byUser = await prisma.quote.groupBy({
        by: ['createdById'],
        where: { organizationId: orgId, deletedAt: null, createdAt: { gte: since } },
        _count: { id: true },
        _sum: { total: true },
      })
      return NextResponse.json({ data: { byUser } })
    }

    case 'clients': {
      const topClients = await prisma.quote.groupBy({
        by: ['companyId'],
        where: { organizationId: orgId, deletedAt: null },
        _count: { id: true },
        _sum: { total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 10,
      })
      return NextResponse.json({ data: { topClients } })
    }

    default:
      return NextResponse.json({ error: 'Unknown analytics type' }, { status: 400 })
  }
}
