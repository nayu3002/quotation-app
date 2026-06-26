import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { sendQuoteEmail } from '@/lib/email'
import { z } from 'zod'

const SendSchema = z.object({
  recipientEmail: z.string().email().optional(),
  recipientName: z.string().optional(),
  message: z.string().optional(),
})

// ─── GET /api/quotes/[id] ─────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id, deletedAt: null },
    select: { organizationId: true },
  })
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const quote = await prisma.quote.findFirst({
    where: { id: params.id, organizationId: member.organizationId, deletedAt: null },
    include: {
      lineItems: { orderBy: { sortOrder: 'asc' } },
      sections: { orderBy: { sortOrder: 'asc' } },
      contact: true,
      company: true,
      deal: true,
      createdBy: { select: { name: true, email: true } },
      signatures: true,
      events: { orderBy: { createdAt: 'desc' }, take: 20 },
      comments: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
      invoice: { select: { id: true, invoiceNumber: true, status: true } },
    },
  })

  if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })

  return NextResponse.json({ data: quote })
}

// ─── PATCH /api/quotes/[id] ───────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id, deletedAt: null },
    include: { organization: { select: { name: true, primaryColor: true, defaultCurrency: true } } },
  })
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const quote = await prisma.quote.findFirst({
    where: { id: params.id, organizationId: member.organizationId, deletedAt: null },
    include: { contact: true, company: true },
  })
  if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })

  const body = await req.json()
  const { action, lineItems, ...updateData } = body

  // Build totals
  let subtotal = 0
  if (lineItems) {
    for (const li of lineItems) {
      const gross = (li.quantity || 1) * (li.unitPrice || 0)
      const discount = li.discountPercent ? (gross * li.discountPercent) / 100 : 0
      subtotal += gross - discount
    }
  }

  // Handle "send" action
  if (action === 'send') {
    const clientEmail = updateData.recipientEmail
      ?? quote.contact?.email
      ?? body.recipientEmail

    if (!clientEmail) {
      return NextResponse.json({ error: 'No recipient email. Add a contact with an email address.' }, { status: 400 })
    }

    const clientName = quote.contact?.firstName ?? updateData.recipientName ?? 'there'
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${quote.shareToken}`

    await sendQuoteEmail({
      to: clientEmail,
      clientName,
      orgName: member.organization.name,
      orgColor: member.organization.primaryColor ?? undefined,
      quoteTitle: updateData.title ?? quote.title,
      quoteNumber: quote.quoteNumber ?? quote.id.slice(0, 8),
      total: `${subtotal || Number(quote.total)}`,
      currency: updateData.currency ?? quote.currency,
      expiresAt: updateData.expiresAt,
      portalUrl,
      message: body.message,
    })

    await prisma.quoteEvent.create({
      data: {
        quoteId: quote.id,
        eventType: 'sent',
        actorName: user.id,
        metadata: { to: clientEmail },
      },
    })

    updateData.status = 'sent'
    updateData.sentAt = new Date()
  }

  // Update quote
  const updated = await prisma.quote.update({
    where: { id: params.id },
    data: {
      ...updateData,
      subtotal: lineItems ? subtotal : undefined,
      total: lineItems ? subtotal : undefined,
      ...(lineItems ? {
        lineItems: {
          deleteMany: {},
          create: lineItems.map((li: any, i: number) => ({
            ...li,
            total: (li.quantity || 1) * (li.unitPrice || 0),
            sortOrder: i,
          })),
        },
      } : {}),
    },
    include: { lineItems: true },
  })

  await prisma.activityLog.create({
    data: {
      organizationId: member.organizationId,
      entityType: 'quote',
      entityId: quote.id,
      userId: user.id,
      action: action ?? 'updated',
      description: `Quote ${action === 'send' ? 'sent' : 'updated'}`,
      quoteId: quote.id,
    },
  })

  return NextResponse.json({ data: updated })
}

// ─── DELETE /api/quotes/[id] ──────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id, deletedAt: null },
    select: { organizationId: true },
  })
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.quote.update({
    where: { id: params.id, organizationId: member.organizationId },
    data: { deletedAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
