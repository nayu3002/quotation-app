import { getOrgContext } from '@/lib/org-context'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import {
  Users,
  Package,
  FileText,
  TrendingUp,
  Plus,
  ArrowRight,
} from 'lucide-react'

export default async function DashboardPage() {
  const ctx = await getOrgContext()
  if (!ctx) return null

  const orgId = ctx.organizationId

  const [customerCount, productCount, quotationData] = await Promise.all([
    prisma.customer.count({ where: { organizationId: orgId } }),
    prisma.productType.count({ where: { organizationId: orgId } }),
    prisma.quotation.aggregate({
      where: { organizationId: orgId },
      _count: true,
      _sum: { total: true },
    }),
  ])

  const recentQuotations = await prisma.quotation.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { customer: true },
  })

  const stats = [
    {
      label: 'Total Customers',
      value: customerCount,
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
      iconBg: 'bg-blue-100',
      href: '/customers',
    },
    {
      label: 'Product Types',
      value: productCount,
      icon: Package,
      color: 'bg-purple-50 text-purple-600',
      iconBg: 'bg-purple-100',
      href: '/products',
    },
    {
      label: 'Quotations Generated',
      value: quotationData._count,
      icon: FileText,
      color: 'bg-green-50 text-green-600',
      iconBg: 'bg-green-100',
      href: '/quotations',
    },
    {
      label: 'Total Business Value',
      value: formatCurrency(Number(quotationData._sum.total ?? 0)),
      icon: TrendingUp,
      color: 'bg-brand-50 text-brand-600',
      iconBg: 'bg-brand-100',
      href: '/quotations',
    },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Good day! 👋
          </h1>
          <p className="text-gray-500 mt-0.5">{ctx.org.name} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <Link
          href="/quotations/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-md shadow-brand-600/25"
        >
          <Plus className="w-4 h-4" />
          New Quotation
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-brand-200 hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color.split(' ')[1]}`} />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 transition-colors" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-4">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Recent Quotations */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Quotations</h2>
          <Link href="/quotations" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
            View all →
          </Link>
        </div>

        {recentQuotations.length === 0 ? (
          <div className="p-10 text-center">
            <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No quotations yet</p>
            <p className="text-gray-300 text-sm mt-1">Create your first quotation to get started</p>
            <Link
              href="/quotations/new"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-brand-50 text-brand-600 hover:bg-brand-100 font-medium rounded-lg transition text-sm"
            >
              <Plus className="w-4 h-4" />
              Create Quotation
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentQuotations.map((q) => (
              <Link
                key={q.id}
                href={`/quotations/${q.id}`}
                className="flex items-center px-6 py-4 hover:bg-gray-50 transition group"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 group-hover:text-brand-700 transition text-sm">
                    {q.quotationNumber || `QT-${q.id.slice(0, 8).toUpperCase()}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{q.customer.name} · {new Date(q.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 text-sm">{formatCurrency(Number(q.total))}</p>
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 font-medium ${
                    q.status === 'accepted' ? 'bg-green-50 text-green-600' :
                    q.status === 'sent' ? 'bg-blue-50 text-blue-600' :
                    q.status === 'rejected' ? 'bg-red-50 text-red-600' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {q.status.charAt(0).toUpperCase() + q.status.slice(1)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
