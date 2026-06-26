import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { userId, email, orgName, gstNumber, phone, address } = await req.json()

    if (!userId || !email || !orgName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create org + user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: orgName,
          gstNumber: gstNumber || null,
          phone: phone || null,
          address: address || null,
        },
      })

      const user = await tx.user.create({
        data: {
          id: userId,
          email,
          role: 'owner',
          organizationId: org.id,
        },
      })

      return { org, user }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('[auth/setup]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
