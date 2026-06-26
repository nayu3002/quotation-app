import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrgContext } from '@/lib/org-context'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const ext = file.name.split('.').pop() || 'jpg'
  const fileName = `${ctx.organizationId}/logo.${ext}`

  const supabaseAdmin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Ensure 'logos' bucket exists
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets()
    if (!buckets?.some((b) => b.name === 'logos')) {
      await supabaseAdmin.storage.createBucket('logos', { public: true })
    }
  } catch (err) {
    console.error('Error checking/creating logos bucket:', err)
  }

  const { error: uploadError } = await supabaseAdmin.storage
    .from('logos')
    .upload(fileName, buffer, { contentType: file.type, upsert: true })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseAdmin.storage.from('logos').getPublicUrl(fileName)

  const org = await prisma.organization.update({
    where: { id: ctx.organizationId },
    data: { logoUrl: publicUrl },
  })

  return NextResponse.json({ logoUrl: org.logoUrl })
}
