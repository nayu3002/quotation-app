import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { QuoteList } from '@/components/quotes/quote-list'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Quotes' }

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: { status?: string; search?: string; page?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id, deletedAt: null },
    select: { organizationId: true, role: { select: { name: true } } },
  })
  if (!member) redirect('/onboarding')

  const orgId = member.organizationId
  const page = Number(searchParams.page ?? 1)
  const take = 20
  const skip = (page - 1) * take

  const where: any = { organizationId: orgId, deletedAt: null }
  if (searchParams.status) where.status = searchParams.status
  if (searchParams.search) {
    where.OR = [
      { title: { contains: searchParams.search, mode: 'insensitive' } },
      { quoteNumber: { contains: searchParams.search, mode: 'insensitive' } },
    ]
  }

  const [quotes, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        contact: { select: { firstName: true, lastName: true } },
        company: { select: { name: true } },
        createdBy: { select: { name: true, email: true } },
      },
    }),
    prisma.quote.count({ where }),
  ])

  return (
    <QuoteList
      quotes={quotes.map(q => ({
        ...q,
        total: Number(q.total),
        createdAt: q.createdAt.toISOString(),
        updatedAt: q.updatedAt.toISOString(),
        expiresAt: q.expiresAt?.toISOString() ?? null,
      }))}
      total={total}
      page={page}
      take={take}
    />
  )
}
