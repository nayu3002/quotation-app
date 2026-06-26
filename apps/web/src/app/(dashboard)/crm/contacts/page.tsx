import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { CRMContactsPage } from '@/components/crm/contacts-page'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Contacts' }

export default async function ContactsRoute({
  searchParams,
}: {
  searchParams: { search?: string; page?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id, deletedAt: null },
    select: { organizationId: true },
  })
  if (!member) redirect('/onboarding')

  const orgId = member.organizationId
  const page = Number(searchParams.page ?? 1)
  const take = 25
  const skip = (page - 1) * take

  const where: any = { organizationId: orgId, deletedAt: null }
  if (searchParams.search) {
    where.OR = [
      { firstName: { contains: searchParams.search, mode: 'insensitive' } },
      { lastName: { contains: searchParams.search, mode: 'insensitive' } },
      { email: { contains: searchParams.search, mode: 'insensitive' } },
    ]
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { quotes: true } },
      },
    }),
    prisma.contact.count({ where }),
  ])

  return (
    <CRMContactsPage
      contacts={contacts.map(c => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        quoteCount: c._count.quotes,
      }))}
      total={total}
      page={page}
      take={take}
    />
  )
}
