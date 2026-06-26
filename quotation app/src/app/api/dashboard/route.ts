import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrgContext } from '@/lib/org-context'

export async function GET() {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = ctx.organizationId

  const [customerCount, productCount, quotationData, recentQuotations] = await Promise.all([
    prisma.customer.count({ where: { organizationId: orgId } }),
    prisma.productType.count({ where: { organizationId: orgId } }),
    prisma.quotation.aggregate({
      where: { organizationId: orgId },
      _count: true,
      _sum: { total: true },
    }),
    prisma.quotation.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { customer: { select: { name: true } } },
    }),
  ])

  return NextResponse.json({
    customerCount,
    productCount,
    quotationCount: quotationData._count,
    totalRevenue: Number(quotationData._sum.total ?? 0),
    recentQuotations,
  })
}
