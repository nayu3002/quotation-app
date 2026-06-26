'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, FileText, Printer } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

interface QuotationDetail {
  id: string
  quotationNumber: string | null
  status: string
  notes: string | null
  terms: string | null
  subtotal: string
  gstPercentage: string
  gstAmount: string
  total: string
  createdAt: string
  customer: { 
    name: string; 
    company: string | null; 
    gstin: string | null; 
    phone: string | null; 
    email: string | null; 
    address: string | null; 
  }
  organization?: {
    name: string
    address: string | null
    phone: string | null
    email: string | null
    gstNumber: string | null
    logoUrl: string | null
  }
  lineItems: Array<{
    id: string
    quantity: number
    pricePerPiece: string
    totalPrice: string
    productType: { name: string }
    productSize: { sizeLabel: string }
  }>
  pdfRecords: Array<{ id: string; fileUrl: string; fileName: string | null; createdAt: string }>
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-50 text-blue-600',
  accepted: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
}

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [quotation, setQuotation] = useState<QuotationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    fetch(`/api/quotations/${id}`)
      .then((r) => r.json())
      .then((d) => { setQuotation(d); setLoading(false) })
  }, [id])

  async function handleGeneratePdf() {
    setGeneratingPdf(true)
    try {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quotationId: id }),
      })
      
      if (!res.ok) throw new Error('Failed to generate preview')
      const data = await res.json()
      
      // Open in new tab for preview and printing
      const win = window.open('', '_blank')
      if (win) {
        win.document.write(data.html)
        win.document.close()
        win.focus()
      }
    } catch (e: any) {
      toast.error('Failed to open PDF preview')
      console.error(e)
    } finally {
      setGeneratingPdf(false)
    }
  }

  async function handleStatusChange(status: string) {
    setUpdatingStatus(true)
    try {
      await fetch(`/api/quotations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      setQuotation((prev) => prev ? { ...prev, status } : null)
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update')
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>
  if (!quotation) return <div className="p-8 text-center text-gray-400">Quotation not found</div>

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto print:p-0 print:m-0 print:max-w-none">
      
      {/* Top dashboard controls (Hidden in Print) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/quotations" className="p-2 hover:bg-gray-100 rounded-xl transition">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {quotation.quotationNumber || quotation.id.slice(0, 8).toUpperCase()}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-gray-500">{formatDate(quotation.createdAt)}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${STATUS_STYLES[quotation.status] || STATUS_STYLES.draft}`}>
                {quotation.status}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={quotation.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={updatingStatus}
            className="text-sm px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium text-gray-700 shadow-sm cursor-pointer"
          >
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>

          <button
            onClick={handleGeneratePdf}
            disabled={generatingPdf}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white font-medium rounded-xl transition text-sm shadow-sm"
          >
            <Printer className="w-4 h-4" />
            {generatingPdf ? 'Generating...' : 'View / Print PDF'}
          </button>
        </div>
      </div>

      {/* The Editable Premium Document Card */}
      <div id="quotation-print-area" className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden relative print:shadow-none print:border-none print:rounded-none">
        
        {/* Accent strip */}
        <div className="h-1.5 w-full bg-brand-500 absolute top-0 left-0 right-0 print:hidden"></div>
        
        <div className="p-8 sm:p-14 pt-12 sm:pt-16">
          
          {/* Header Grid: Logo & Org Details */}
          <div className="flex flex-col sm:flex-row justify-between items-start mb-12 gap-8">
            <div className="flex-shrink-0">
              {quotation.organization?.logoUrl ? (
                <img src={quotation.organization.logoUrl} alt="Logo" className="h-28 object-contain max-w-[320px]" />
              ) : (
                <div className="text-3xl font-bold text-gray-900 tracking-tight">{quotation.organization?.name || 'Your Company'}</div>
              )}
            </div>
            
            <div className="text-left sm:text-right flex flex-col sm:items-end">
              {quotation.organization?.logoUrl && (
                <div className="text-xl font-bold text-gray-900 mb-1 tracking-tight">{quotation.organization.name}</div>
              )}
              <div className="text-sm text-gray-500 space-y-0.5 max-w-[280px]">
                {quotation.organization?.address && <p>{quotation.organization.address}</p>}
                <div className="pt-1 flex flex-col sm:items-end gap-0.5">
                  {quotation.organization?.phone && <p>{quotation.organization.phone}</p>}
                  {quotation.organization?.email && <p>{quotation.organization.email}</p>}
                  {quotation.organization?.gstNumber && <p className="text-gray-400 mt-1 uppercase text-xs tracking-wider font-medium">GST: {quotation.organization.gstNumber}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-gray-100 mb-12"></div>

          {/* Quotation Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 mb-14">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Quotation To</p>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{quotation.customer.name}</h3>
              {quotation.customer.company && <p className="text-gray-700 font-medium text-sm mb-1">{quotation.customer.company}</p>}
              <div className="text-sm text-gray-500 space-y-0.5">
                {quotation.customer.phone && <p>{quotation.customer.phone}</p>}
                {quotation.customer.email && <p>{quotation.customer.email}</p>}
                {quotation.customer.address && <p>{quotation.customer.address}</p>}
                {quotation.customer.gstin && <p className="text-gray-400 mt-2 uppercase text-xs tracking-wider font-medium">GSTIN: {quotation.customer.gstin}</p>}
              </div>
            </div>
            <div className="sm:text-right">
               <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Details</p>
               <div className="space-y-3 sm:flex sm:flex-col sm:items-end">
                 <div className="flex justify-between sm:justify-end sm:gap-6 w-full sm:w-auto">
                   <span className="text-gray-500 text-sm">Quotation No</span> 
                   <span className="text-gray-900 font-semibold text-sm">{quotation.quotationNumber}</span>
                 </div>
                 <div className="flex justify-between sm:justify-end sm:gap-6 w-full sm:w-auto">
                   <span className="text-gray-500 text-sm">Date</span> 
                   <span className="text-gray-900 font-semibold text-sm">{formatDate(quotation.createdAt)}</span>
                 </div>
               </div>
            </div>
          </div>

          {/* SaaS Table */}
          <div className="mb-12 w-full overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="py-4 px-6 font-semibold text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">Garment</th>
                  <th className="py-4 px-6 font-semibold text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">Size</th>
                  <th className="py-4 px-6 font-semibold text-xs text-gray-500 uppercase tracking-wider text-right border-b border-gray-100">Qty</th>
                  <th className="py-4 px-6 font-semibold text-xs text-gray-500 uppercase tracking-wider text-right border-b border-gray-100">Rate</th>
                  <th className="py-4 px-6 font-semibold text-xs text-gray-500 uppercase tracking-wider text-right border-b border-gray-100">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {quotation.lineItems.map(item => (
                   <tr key={item.id} className="hover:bg-gray-50/40 transition-colors">
                     <td className="py-4 px-6 text-gray-900 font-medium">{item.productType.name}</td>
                     <td className="py-4 px-6 text-gray-600">{item.productSize.sizeLabel}</td>
                     <td className="py-4 px-6 text-right text-gray-900 font-medium">{item.quantity}</td>
                     <td className="py-4 px-6 text-right text-gray-600">{formatCurrency(Number(item.pricePerPiece))}</td>
                     <td className="py-4 px-6 text-right text-gray-900 font-semibold">{formatCurrency(Number(item.totalPrice))}</td>
                   </tr>
                 ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex justify-end mb-16">
             <div className="w-full sm:w-[340px] rounded-2xl border border-gray-100 p-6 space-y-4 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
               <div className="flex justify-between text-sm">
                 <span className="text-gray-500">Subtotal</span>
                 <span className="text-gray-900 font-semibold">{formatCurrency(Number(quotation.subtotal))}</span>
               </div>
               <div className="flex justify-between text-sm">
                 <span className="text-gray-500">GST ({quotation.gstPercentage}%)</span>
                 <span className="text-gray-900 font-semibold">{formatCurrency(Number(quotation.gstAmount))}</span>
               </div>
               
               <div className="pt-5 mt-3 flex justify-between items-center bg-brand-50/40 -mx-6 -mb-6 px-6 py-5 rounded-b-2xl border-t border-brand-100/50">
                 <span className="font-bold text-brand-900">Grand Total</span>
                 <span className="text-xl font-extrabold text-brand-700">{formatCurrency(Number(quotation.total))}</span>
               </div>
             </div>
          </div>

          {/* Optional Footer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm pt-8 border-t border-gray-100">
            {quotation.terms && (
              <div>
                 <h4 className="font-bold text-gray-400 mb-3 uppercase text-[11px] tracking-widest">Terms & Conditions</h4>
                 <div className="text-gray-600 bg-gray-50/80 rounded-xl p-5 whitespace-pre-wrap leading-relaxed border border-gray-100/50">{quotation.terms}</div>
              </div>
            )}
            {quotation.notes && (
              <div>
                 <h4 className="font-bold text-gray-400 mb-3 uppercase text-[11px] tracking-widest">Additional Notes</h4>
                 <div className="text-gray-600 bg-gray-50/80 rounded-xl p-5 whitespace-pre-wrap leading-relaxed border border-gray-100/50">{quotation.notes}</div>
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  )
}
