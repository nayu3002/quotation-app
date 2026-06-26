'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { FileText, Plus, Search, Eye, Trash2, ArrowLeft, Phone, Mail, MapPin } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { useRouter, useParams } from 'next/navigation'

interface Quotation {
  id: string
  quotationNumber: string | null
  status: string
  total: string
  subtotal: string
  gstAmount: string
  createdAt: string
  lineItems: { id: string }[]
}

interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  sent: 'bg-blue-50 text-blue-600',
  accepted: 'bg-green-50 text-green-600',
  rejected: 'bg-red-50 text-red-600',
}

export default function CustomerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const customerId = params.id as string
  
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState('all')

  const fetchData = useCallback(async () => {
    try {
      // Fetch Customer
      const custRes = await fetch(`/api/customers/${customerId}`)
      if (!custRes.ok) {
        toast.error('Customer not found')
        router.push('/customers')
        return
      }
      const custData = await custRes.json()
      setCustomer(custData)

      // Fetch Quotations
      const qParams = new URLSearchParams()
      qParams.append('customerId', customerId)
      if (search) qParams.append('search', search)
      if (status && status !== 'all') qParams.append('status', status)
      if (startDate) qParams.append('startDate', new Date(startDate).toISOString())
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        qParams.append('endDate', end.toISOString())
      }

      const qRes = await fetch(`/api/quotations?${qParams.toString()}`)
      const qData = await qRes.json()
      setQuotations(qData)
    } catch {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [customerId, search, status, startDate, endDate, router])

  useEffect(() => {
    const timer = setTimeout(fetchData, 300)
    return () => clearTimeout(timer)
  }, [fetchData])

  async function handleDelete(id: string, num: string) {
    if (!confirm(`Delete quotation ${num}? This cannot be undone.`)) return
    const res = await fetch(`/api/quotations/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Quotation deleted'); fetchData() }
    else toast.error('Failed to delete')
  }

  if (loading && !customer) {
    return <div className="p-8 text-center text-gray-500">Loading profile...</div>
  }

  if (!customer) return null // Handled in fetch

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-6 animate-fade-in">
      {/* Header Profile Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-start gap-6 shadow-sm">
        <Link href="/customers" className="p-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition text-gray-500 mt-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 mt-1">
          <span className="text-brand-700 font-bold text-2xl">{customer.name[0].toUpperCase()}</span>
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
          <div className="flex flex-wrap items-center gap-4 mt-3">
            {customer.phone && <span className="flex items-center gap-1.5 text-sm text-gray-600"><Phone className="w-4 h-4 text-brand-500" />{customer.phone}</span>}
            {customer.email && <span className="flex items-center gap-1.5 text-sm text-gray-600"><Mail className="w-4 h-4 text-brand-500" />{customer.email}</span>}
            {customer.address && <span className="flex items-center gap-1.5 text-sm text-gray-600"><MapPin className="w-4 h-4 text-brand-500" />{customer.address}</span>}
          </div>
        </div>
        <Link
          href="/quotations/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition shadow-md shadow-brand-600/25 text-sm"
        >
          <Plus className="w-4 h-4" />
          Create Quote
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mt-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search quotation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">From</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-300 transition text-gray-700" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">To</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-300 transition text-gray-700" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-300 transition text-gray-700 font-medium pb-2 select-none h-[38px]">
            <option value="all">Any</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-16 text-center text-gray-400 text-sm">Loading history...</div>
        ) : quotations.length === 0 ? (
          <div className="p-16 text-center">
            <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No quotations found for this date range.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_0.8fr_1fr_0.8fr_auto] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wide">
              <span>Quotation #</span>
              <span>Items</span>
              <span>Total</span>
              <span>Status</span>
              <span></span>
            </div>
            {quotations.map((q) => (
              <div key={q.id} className="grid grid-cols-[1fr_0.8fr_1fr_0.8fr_auto] gap-4 items-center px-5 py-4 hover:bg-gray-50 transition border-b border-gray-50 last:border-0 group">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{q.quotationNumber || q.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(q.createdAt)}</p>
                </div>
                <span className="text-sm text-gray-500">{q.lineItems.length} sizes</span>
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
