import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { InvoicesPage } from '@/components/invoices/invoices-page'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Invoices' }

export default async function InvoicesRoute({
  searchParams,
}: {
  searchParams: { status?: string; page?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id, deletedAt: null },
    select: { organizationId: true, organization: { select: { defaultCurrency: true } } },
  })
  if (!member) redirect('/onboarding')

  const orgId = member.organizationId
  const page = Number(searchParams.page ?? 1)
  const take = 20
  const skip = (page - 1) * take

  const where: any = { organizationId: orgId, deletedAt: null }
  if (searchParams.status) where.status = searchParams.status

  const [invoices, total, summary] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        contact: { select: { firstName: true, lastName: true } },
        company: { select: { name: true } },
        quote: { select: { quoteNumber: true } },
        payments: { select: { amount: true, status: true } },
      },
    }),
    prisma.invoice.count({ where }),
    prisma.invoice.aggregate({
      where: { organizationId: orgId, deletedAt: null },
      _sum: { total: true, amountPaid: true, amountDue: true },
    }),
  ])

  return (
    <InvoicesPage
      invoices={invoices.map(inv => ({
        ...inv,
        total: Number(inv.total),
        amountPaid: Number(inv.amountPaid),
        amountDue: Number(inv.amountDue),
        createdAt: inv.createdAt.toISOString(),
        dueDate: inv.dueDate?.toISOString() ?? null,
        paidAt: inv.paidAt?.toISOString() ?? null,
      }))}
      total={total}
      page={page}
      take={take}
      summary={{
        total: Number(summary._sum.total ?? 0),
        paid: Number(summary._sum.amountPaid ?? 0),
        outstanding: Number(summary._sum.amountDue ?? 0),
      }}
      currency={member.organization.defaultCurrency ?? 'USD'}
    />
  )
}
