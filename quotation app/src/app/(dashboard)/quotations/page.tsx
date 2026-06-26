'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { FileText, Plus, Search, Eye, Trash2 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

interface Quotation {
  id: string
  quotationNumber: string | null
  status: string
  total: string
  subtotal: string
  gstAmount: string
  createdAt: string
  customer: { name: string; phone: string | null }
  lineItems: { id: string }[]
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  sent: 'bg-blue-50 text-blue-600',
  accepted: 'bg-green-50 text-green-600',
  rejected: 'bg-red-50 text-red-600',
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState('all')

  const fetchQuotations = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (status && status !== 'all') params.append('status', status)
    if (startDate) params.append('startDate', new Date(startDate).toISOString())
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      params.append('endDate', end.toISOString())
    }

    const res = await fetch(`/api/quotations?${params.toString()}`)
    const data = await res.json()
    setQuotations(data)
    setLoading(false)
  }, [search, status, startDate, endDate])

  useEffect(() => {
    const timer = setTimeout(fetchQuotations, 300)
    return () => clearTimeout(timer)
  }, [fetchQuotations])

  async function handleDelete(id: string, num: string) {
    if (!confirm(`Delete quotation ${num}? This cannot be undone.`)) return
    const res = await fetch(`/api/quotations/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Quotation deleted'); fetchQuotations() }
    else toast.error('Failed to delete')
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
          <p className="text-gray-500 text-sm mt-0.5">{quotations.length} quotation{quotations.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/quotations/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition shadow-md shadow-brand-600/25 text-sm"
        >
          <Plus className="w-4 h-4" />
          New Quotation
        </Link>
      </div>

      <div className="flex flex-wrap gap-4 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by quotation number or client name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition"
          />
        </div>
        
        <input 
          type="date" 
          value={startDate} 
          onChange={(e) => setStartDate(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition text-gray-700"
          title="From Date"
        />
        
        <input 
          type="date" 
          value={endDate} 
          onChange={(e) => setEndDate(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition text-gray-700"
          title="To Date"
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition text-gray-700 font-medium"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-gray-400 text-sm">Loading...</div>
        ) : quotations.length === 0 ? (
          <div className="p-16 text-center">
            <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">{search ? 'No quotations found' : 'No quotations yet'}</p>
            {!search && <Link href="/quotations/new" className="mt-3 inline-block text-sm text-brand-600 hover:underline">Create your first quotation →</Link>}
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[1fr_1.5fr_0.8fr_0.8fr_0.8fr_auto] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wide">
              <span>Quotation #</span>
              <span>Customer</span>
              <span>Items</span>
              <span>Total</span>
              <span>Status</span>
              <span></span>
            </div>
            {quotations.map((q) => (
              <div key={q.id} className="grid grid-cols-[1fr_1.5fr_0.8fr_0.8fr_0.8fr_auto] gap-4 items-center px-5 py-4 hover:bg-gray-50 transition border-b border-gray-50 last:border-0 group">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{q.quotationNumber || q.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(q.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-700 font-medium">{q.customer.name}</p>
                  {q.customer.phone && <p className="text-xs text-gray-400">{q.customer.phone}</p>}
                </div>
                <span className="text-sm text-gray-500">{q.lineItems.length} size{q.lineItems.length !== 1 ? 's' : ''}</span>
                <span className="text-sm font-semibold text-gray-900">{formatCurrency(Number(q.total))}</span>
                <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[q.status] || STATUS_STYLES.draft}`}>
                  {q.status.charAt(0).toUpperCase() + q.status.slice(1)}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <Link href={`/quotations/${q.id}`} className="p-2 rounded-lg hover:bg-brand-50 text-gray-400 hover:text-brand-600 transition">
                    <Eye className="w-4 h-4" />
                  </Link>
                  <button onClick={() => handleDelete(q.id, q.quotationNumber || q.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
