import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { QuotePortal } from '@/components/portal/quote-portal'
import type { Metadata } from 'next'

interface Props { params: { token: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const quote = await prisma.quote.findFirst({
    where: { shareToken: params.token, deletedAt: null },
    include: { organization: { select: { name: true } } },
  })
  if (!quote) return { title: 'Quote Not Found' }
  return {
    title: `${quote.title} — ${quote.organization.name}`,
    description: `Review and sign your quote from ${quote.organization.name}`,
  }
}

export default async function PortalPage({ params }: Props) {
  const quote = await prisma.quote.findFirst({
    where: { shareToken: params.token, deletedAt: null },
    include: {
      organization: {
        select: {
          name: true,
          logoUrl: true,
          primaryColor: true,
          accentColor: true,
          fontFamily: true,
          defaultCurrency: true,
          address: true,
          email: true,
          phone: true,
        },
      },
      contact: { select: { firstName: true, lastName: true, email: true } },
      company: { select: { name: true } },
      lineItems: { orderBy: { sortOrder: 'asc' } },
      sections: { orderBy: { sortOrder: 'asc' } },
      comments: {
        where: { isInternal: false },
        orderBy: { createdAt: 'asc' },
      },
      signatures: { orderBy: { signedAt: 'asc' } },
      events: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!quote) notFound()

  // Track view event
  await prisma.quoteEvent.create({
    data: {
      quoteId: quote.id,
      eventType: 'opened',
      metadata: { token: params.token },
    },
  })

  // Update status to viewed if it was sent
  if (quote.status === 'sent') {
    await prisma.quote.update({
      where: { id: quote.id },
      data: { status: 'viewed', viewedAt: new Date() },
    })
  }

  return (
    <QuotePortal
      quote={{
        ...quote,
        total: Number(quote.total),
        subtotal: Number(quote.subtotal),
        taxAmount: Number(quote.taxAmount),
        discountPercent: Number(quote.discountPercent),
        discountFixed: Number(quote.discountFixed),
        createdAt: quote.createdAt.toISOString(),
        expiresAt: quote.expiresAt?.toISOString() ?? null,
        sentAt: quote.sentAt?.toISOString() ?? null,
        lineItems: quote.lineItems.map(li => ({
          ...li,
          quantity: Number(li.quantity),
          unitPrice: Number(li.unitPrice),
          total: Number(li.total),
          taxRate: Number(li.taxRate),
          discountPercent: Number(li.discountPercent),
          discountFixed: Number(li.discountFixed),
        })),
        comments: quote.comments.map(c => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
        })),
        signatures: quote.signatures.map(s => ({
          ...s,
          signedAt: s.signedAt.toISOString(),
        })),
      }}
      shareToken={params.token}
    />
  )
}
