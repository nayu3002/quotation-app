import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { CatalogPage } from '@/components/catalog/catalog-page'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Product Catalog' }

export default async function CatalogRoute() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id, deletedAt: null },
    select: { organizationId: true },
  })
  if (!member) redirect('/onboarding')

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { organizationId: member.organizationId, deletedAt: null },
      include: { category: { select: { id: true, name: true } }, variants: { where: { deletedAt: null } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.catalogCategory.findMany({
      where: { organizationId: member.organizationId, deletedAt: null },
      orderBy: { name: 'asc' },
    }),
  ])

  return <CatalogPage products={products.map(p => ({ ...p, basePrice: Number(p.basePrice), costPrice: Number(p.costPrice) }))} categories={categories} />
}
