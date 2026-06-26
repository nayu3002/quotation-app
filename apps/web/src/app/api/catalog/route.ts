import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ─── GET /api/catalog ─────────────────────────────────────────────────────────
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
  const search = searchParams.get('search')
  const categoryId = searchParams.get('categoryId')
  const isActive = searchParams.get('isActive') !== 'false'

  const products = await prisma.product.findMany({
    where: {
      organizationId: member.organizationId,
      deletedAt: null,
      isActive,
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      ...(categoryId ? { categoryId } : {}),
    },
    include: {
      category: { select: { id: true, name: true } },
      variants: { where: { deletedAt: null, isActive: true } },
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json({ data: products })
}

const CreateProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  sku: z.string().optional(),
  categoryId: z.string().optional(),
  basePrice: z.number().min(0),
  costPrice: z.number().min(0).optional(),
  unitOfMeasure: z.string().default('unit'),
  currency: z.string().default('USD'),
  taxClass: z.string().optional(),
  imageUrl: z.string().url().optional(),
  isRecurring: z.boolean().default(false),
  recurrenceInterval: z.string().optional(),
  stockNotes: z.string().optional(),
  isBundle: z.boolean().default(false),
})

// ─── POST /api/catalog ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id, deletedAt: null },
    select: { organizationId: true },
  })
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = CreateProductSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const product = await prisma.product.create({
    data: { ...parsed.data, organizationId: member.organizationId },
  })

  return NextResponse.json({ data: product }, { status: 201 })
}
