import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { generateShareToken, generateQuoteNumber } from '@/lib/utils'

const CreateQuoteSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  dealId: z.string().optional(),
  currency: z.string().default('USD'),
  editorMode: z.enum(['document', 'section', 'spreadsheet']).default('document'),
  expiresAt: z.string().datetime().optional(),
  templateId: z.string().optional(),
  introText: z.string().optional(),
  termsText: z.string().optional(),
  lineItems: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    costPrice: z.number().min(0).optional(),
    discountPercent: z.number().min(0).max(100).optional(),
    taxRate: z.number().min(0).optional(),
    taxName: z.string().optional(),
    isOptional: z.boolean().optional(),
    productId: z.string().optional(),
    sectionLabel: z.string().optional(),
  })).optional(),
})

// ─── GET /api/quotes ──────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id, deletedAt: null },
    select: { organizationId: true },
  })
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const page = Number(searchParams.get('page') ?? 1)
  const take = Number(searchParams.get('take') ?? 20)

  const where: any = { organizationId: member.organizationId, deletedAt: null }
  if (status) where.status = status
  if (search) where.OR = [
    { title: { contains: search, mode: 'insensitive' } },
    { quoteNumber: { contains: search, mode: 'insensitive' } },
  ]

  const [quotes, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * take,
      take,
      include: {
        contact: { select: { firstName: true, lastName: true } },
        company: { select: { name: true } },
      },
    }),
    prisma.quote.count({ where }),
  ])

  return NextResponse.json({ data: quotes, total, page, take })
}

// ─── POST /api/quotes ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id, deletedAt: null },
    include: { organization: true },
  })
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = CreateQuoteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const org = member.organization

  // Check plan limits
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const monthlyCount = await prisma.quote.count({
    where: { organizationId: org.id, createdAt: { gte: monthStart }, deletedAt: null },
  })

  // Get plan limits (hardcoded fallbacks — plan model handles this)
  const maxQuotes = 3 // Free tier default

  if (monthlyCount >= maxQuotes) {
    return NextResponse.json({
      error: 'Monthly quote limit reached. Upgrade your plan to create more quotes.',
    }, { status: 403 })
  }

  // Generate quote number
  const updatedOrg = await prisma.organization.update({
    where: { id: org.id },
    data: { quoteSeq: { increment: 1 } },
    select: { quoteSeq: true, quoteNumberFormat: true },
  })

  const quoteNumber = generateQuoteNumber(
    updatedOrg.quoteNumberFormat,
    updatedOrg.quoteSeq
  )

  const shareToken = generateShareToken()

  // Calculate totals
  const lineItems = parsed.data.lineItems ?? []
  let subtotal = 0
  const computedItems = lineItems.map((item, i) => {
    const gross = item.quantity * item.unitPrice
    const discount = item.discountPercent ? (gross * item.discountPercent) / 100 : 0
    const discounted = gross - discount
    const tax = item.taxRate ? (discounted * item.taxRate) / 100 : 0
    const total = discounted + tax
    subtotal += discounted
    return { ...item, total, sortOrder: i }
  })

  // Check approval rules
  const approvalRules = await prisma.approvalRule.findMany({
    where: { organizationId: org.id, isActive: true, deletedAt: null },
    orderBy: { sortOrder: 'asc' },
  })

  let approvalStatus = 'not_required'
  const triggeredRule = approvalRules.find(rule => {
    if (rule.triggerType === 'quote_total' && rule.triggerValue) {
      return subtotal > Number(rule.triggerValue)
    }
    if (rule.triggerType === 'always') return true
    return false
  })

  if (triggeredRule) approvalStatus = 'pending'

  const quote = await prisma.quote.create({
    data: {
      organizationId: org.id,
      quoteNumber,
      title: parsed.data.title,
      contactId: parsed.data.contactId,
      companyId: parsed.data.companyId,
      dealId: parsed.data.dealId,
      currency: parsed.data.currency,
      editorMode: parsed.data.editorMode,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
      templateId: parsed.data.templateId,
      introText: parsed.data.introText,
      termsText: parsed.data.termsText,
      createdById: user.id,
      shareToken,
      status: 'draft',
      approvalStatus,
      subtotal,
      total: subtotal,
      lineItems: {
        create: computedItems,
      },
    },
    include: { lineItems: true },
  })

  // Activity log
  await prisma.activityLog.create({
    data: {
      organizationId: org.id,
      entityType: 'quote',
      entityId: quote.id,
      userId: user.id,
      action: 'created',
      description: `Quote ${quoteNumber} created`,
      quoteId: quote.id,
    },
  })

  // Create approval request if needed
  if (triggeredRule && approvalStatus === 'pending') {
    await prisma.approvalRequest.create({
      data: {
        organizationId: org.id,
        quoteId: quote.id,
        ruleId: triggeredRule.id,
        requestedById: user.id,
        status: 'pending',
      },
    })
  }

  return NextResponse.json({ data: quote }, { status: 201 })
}
