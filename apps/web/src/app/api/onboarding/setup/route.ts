import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const supabase = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check if org already exists for this user
  const existing = await prisma.organizationMember.findFirst({
    where: { userId: user.id, deletedAt: null },
  })
  if (existing) return NextResponse.json({ error: 'Already onboarded' }, { status: 409 })

  const { orgName, industry, name } = await req.json()

  if (!orgName || !industry) {
    return NextResponse.json({ error: 'orgName and industry are required' }, { status: 400 })
  }

  // Get or create free plan
  let freePlan = await prisma.plan.findFirst({ where: { tier: 'free' } })
  if (!freePlan) {
    freePlan = await prisma.plan.create({
      data: {
        name: 'Free',
        tier: 'free',
        monthlyPrice: 0,
        yearlyPrice: 0,
        maxUsers: 1,
        maxQuotesPerMonth: 3,
        maxProducts: 50,
        maxTemplates: 2,
        maxStorageGb: 1,
        aiCreditsPerMonth: 5,
        features: ['pdf_export', 'e_signature', 'client_portal'],
        stripePriceIdMonthly: null,
        stripePriceIdYearly: null,
      },
    })
  }

  // Create user record
  await prisma.user.upsert({
    where: { id: user.id },
    create: { id: user.id, email: user.email!, name: name ?? null },
    update: { name: name ?? undefined },
  })

  // Create organization + owner role in transaction
  const org = await prisma.$transaction(async tx => {
    // Create default owner role
    const ownerRole = await tx.role.create({
      data: {
        name: 'Owner',
        isSystem: true,
        permissions: {
          quotes: ['create', 'read', 'update', 'delete', 'send', 'sign'],
          invoices: ['create', 'read', 'update', 'delete', 'send'],
          contacts: ['create', 'read', 'update', 'delete'],
          products: ['create', 'read', 'update', 'delete'],
          settings: ['read', 'update'],
          team: ['invite', 'remove', 'update_roles'],
          billing: ['read', 'update'],
          analytics: ['read'],
        },
      },
    })

    const organization = await tx.organization.create({
      data: {
        name: orgName,
        industry,
        planId: freePlan.id,
        status: 'active',
        defaultCurrency: 'USD',
        quoteNumberFormat: 'QF-{YEAR}-{SEQ}',
        primaryColor: '#7c5cfc',
      },
    })

    await tx.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        roleId: ownerRole.id,
        inviteStatus: 'accepted',
      },
    })

    // Create starter subscription
    await tx.subscription.create({
      data: {
        organizationId: organization.id,
        planId: freePlan.id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
        cancelAtPeriodEnd: false,
      },
    })

    return organization
  })

  return NextResponse.json({ success: true, orgId: org.id }, { status: 201 })
}
