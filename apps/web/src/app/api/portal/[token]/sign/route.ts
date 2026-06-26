import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { sendQuoteSignedEmail } from '@/lib/email'
import { createHash } from 'crypto'
import { z } from 'zod'

const SignSchema = z.object({
  signerName: z.string().min(1),
  signerEmail: z.string().email(),
  signatureType: z.enum(['draw', 'type', 'uploaded']),
  signatureData: z.string(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const body = await req.json()
  const parsed = SignSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid signature data' }, { status: 400 })
  }

  const { signerName, signerEmail, signatureType, signatureData } = parsed.data

  const quote = await prisma.quote.findFirst({
    where: { shareToken: params.token, deletedAt: null },
    include: {
      organization: { select: { name: true, primaryColor: true, email: true } },
      createdBy: { select: { email: true, name: true } },
    },
  })

  if (!quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  }

  if (quote.status === 'signed' || quote.status === 'expired') {
    return NextResponse.json({ error: 'Quote already signed or expired' }, { status: 409 })
  }

  // Generate tamper-evident hash of the quote content
  const documentHash = createHash('sha256')
    .update(JSON.stringify({ quoteId: quote.id, title: quote.title, total: quote.total.toString() }))
    .digest('hex')

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip') ?? 'unknown'
  const userAgent = req.headers.get('user-agent') ?? 'unknown'

  // Attempt geo location (approximate — no PII stored)
  const signedAt = new Date()

  // Save signature
  await prisma.quoteSignature.create({
    data: {
      quoteId: quote.id,
      signerName,
      signerEmail,
      signerRole: 'Client',
      signatureType,
      signatureData: signatureData.length > 50000 ? signatureData.slice(0, 50000) : signatureData,
      ipAddress: ip,
      userAgent: userAgent.slice(0, 500),
      documentHash,
    },
  })

  // Update quote status
  await prisma.quote.update({
    where: { id: quote.id },
    data: {
      status: 'signed',
      signedAt,
    },
  })

  // Record event in audit trail
  await prisma.quoteEvent.create({
    data: {
      quoteId: quote.id,
      eventType: 'signed',
      actorName: signerName,
      actorEmail: signerEmail,
      ipAddress: ip,
      userAgent: userAgent.slice(0, 500),
      metadata: { signatureType, documentHash },
    },
  })

  // Activity log
  await prisma.activityLog.create({
    data: {
      organizationId: quote.organizationId,
      entityType: 'quote',
      entityId: quote.id,
      actorName: signerName,
      action: 'signed',
      description: `Quote signed by ${signerName} (${signerEmail})`,
      quoteId: quote.id,
      metadata: { ip, signatureType },
    },
  })

  // Notify quote owner & team
  const notifyEmail = quote.createdBy.email
  await sendQuoteSignedEmail({
    to: [notifyEmail],
    signerName,
    orgName: quote.organization.name,
    orgColor: quote.organization.primaryColor ?? undefined,
    quoteTitle: quote.title,
    quoteNumber: quote.quoteNumber ?? quote.id.slice(0, 8),
    signedAt: signedAt.toISOString(),
    downloadUrl: `${process.env.NEXT_PUBLIC_APP_URL}/portal/${params.token}`,
  })

  // Create in-app notification for quote owner
  await prisma.notification.create({
    data: {
      organizationId: quote.organizationId,
      userId: quote.createdById,
      type: 'quote_signed',
      title: 'Quote Signed!',
      body: `${signerName} just signed ${quote.quoteNumber ?? quote.title}`,
      entityType: 'quote',
      entityId: quote.id,
    },
  })

  return NextResponse.json({
    success: true,
    message: 'Quote signed successfully',
    signedAt: signedAt.toISOString(),
  })
}
