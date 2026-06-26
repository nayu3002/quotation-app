import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { QuoteEditor } from '@/components/quotes/quote-editor'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'New Quote' }

export default async function NewQuotePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id, deletedAt: null },
    include: { organization: { select: { id: true, defaultCurrency: true, industry: true, primaryColor: true } } },
  })
  if (!member) redirect('/onboarding')

  const orgId = member.organizationId

  const [contacts, companies, products, templates] = await Promise.all([
    prisma.contact.findMany({
      where: { organizationId: orgId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, email: true, companyId: true },
      orderBy: { firstName: 'asc' },
      take: 200,
    }),
    prisma.company.findMany({
      where: { organizationId: orgId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: 200,
    }),
    prisma.product.findMany({
      where: { organizationId: orgId, deletedAt: null, isActive: true },
      select: { id: true, name: true, description: true, basePrice: true, costPrice: true, unitOfMeasure: true, currency: true },
      orderBy: { name: 'asc' },
      take: 500,
    }),
    prisma.quoteTemplate.findMany({
      where: { organizationId: orgId, deletedAt: null, isActive: true },
      select: { id: true, name: true, description: true, industry: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <QuoteEditor
      mode="create"
      org={member.organization}
      contacts={contacts.map(c => ({ ...c, basePrice: undefined }))}
      companies={companies}
      products={products.map(p => ({
        ...p,
        basePrice: Number(p.basePrice),
        costPrice: Number(p.costPrice),
      }))}
      templates={templates}
    />
  )
}
