import { NextRequest, NextResponse } from 'next/server'
import { draftQuoteFromDescription, getProductRecommendations, generateTermsAndConditions } from '@/lib/ai'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const DraftSchema = z.object({
  description: z.string().min(10, 'Description must be at least 10 characters'),
  currency: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: { params: { action: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id, deletedAt: null },
    include: { organization: true },
  })
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const org = member.organization

  // Check AI credits
  const plan = org.planId ? await prisma.plan.findUnique({ where: { id: org.planId } }) : null
  const maxCredits = plan?.aiCreditsPerMonth ?? 0
  if (org.aiCreditsUsed >= maxCredits) {
    return NextResponse.json({ error: 'AI credit limit reached. Upgrade your plan.' }, { status: 403 })
  }

  const body = await req.json()

  switch (params.action) {
    case 'draft': {
      const parsed = DraftSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

      const catalogItems = await prisma.product.findMany({
        where: { organizationId: org.id, isActive: true, deletedAt: null },
        select: { name: true, basePrice: true, unitOfMeasure: true },
        take: 50,
      })

      const draft = await draftQuoteFromDescription({
        description: parsed.data.description,
        orgName: org.name,
        industry: org.industry,
        catalogItems: catalogItems.map(p => ({
          name: p.name,
          price: Number(p.basePrice),
          unit: p.unitOfMeasure,
        })),
        currency: parsed.data.currency ?? org.defaultCurrency,
      })

      // Deduct credit
      await prisma.organization.update({
        where: { id: org.id },
        data: { aiCreditsUsed: { increment: 1 } },
      })

      return NextResponse.json({ data: draft })
    }

    case 'recommend': {
      const { currentItems, catalogItems } = body
      const recommendations = await getProductRecommendations({
        currentItems,
        industry: org.industry,
        catalogItems,
      })
      await prisma.organization.update({
        where: { id: org.id },
        data: { aiCreditsUsed: { increment: 1 } },
      })
      return NextResponse.json({ data: recommendations })
    }

    case 'terms': {
      const { quoteItems } = body
      const terms = await generateTermsAndConditions({
        industry: org.industry,
        orgName: org.name,
        country: 'US',
        quoteItems,
      })
      await prisma.organization.update({
        where: { id: org.id },
        data: { aiCreditsUsed: { increment: 1 } },
      })
      return NextResponse.json({ data: { terms } })
    }

    default:
      return NextResponse.json({ error: 'Unknown AI action' }, { status: 400 })
  }
}
