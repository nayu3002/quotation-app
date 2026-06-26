'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ChevronDown, Calculator, FileText, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { calculateLineItem, calculateQuotationTotals } from '@/lib/calc'
import { formatCurrency } from '@/lib/utils'

interface Customer { id: string; name: string; phone: string | null }
interface ProductType { id: string; name: string; productSizes: Array<{ id: string; sizeLabel: string }> }
interface CustomCostField { id: string; name: string; type: string; isMultiplier: boolean; defaultValue: string; productTypeId: string | null }
interface SizeCostTemplate {
  fabricAvg: string; fabricRate: string; stitchingCost: string; matchingCost: string
  labelCost: string; extraCost: string; profitMultiplier: string; roundOff: boolean
  customValues: Array<{ customCostFieldId: string; value: string }>
}
interface SizeTemplateMap { [productSizeId: string]: SizeCostTemplate }

interface LineItemState {
  id: string // local UUID for key
  productTypeId: string
  productSizeId: string
  quantity: string
  fabricAvg: string; fabricRate: string; stitchingCost: string; matchingCost: string
  labelCost: string; extraCost: string; profitMultiplier: string; roundOff: boolean
  customValues: Record<string, string> // customCostFieldId -> value
}

function makeLineItem(fields?: Partial<LineItemState>): LineItemState {
  return {
    id: Math.random().toString(36).slice(2),
    productTypeId: '',
    productSizeId: '',
    quantity: '1',
    fabricAvg: '0', fabricRate: '0', stitchingCost: '0', matchingCost: '0',
    labelCost: '0', extraCost: '0', profitMultiplier: '1.2', roundOff: true,
    customValues: {},
    ...fields,
  }
}

export default function NewQuotationPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<ProductType[]>([])
  const [customFields, setCustomFields] = useState<CustomCostField[]>([])
  const [templateMap, setTemplateMap] = useState<SizeTemplateMap>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [customerId, setCustomerId] = useState('')
  const [gstPercentage, setGstPercentage] = useState('18')
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('Terms: Payment due within 15 days.')
  const [lineItems, setLineItems] = useState<LineItemState[]>([makeLineItem()])

  // Quick-add customer
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false)
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', company: '', gstin: '', phone: '', email: '', address: '' })
  const [savingCustomer, setSavingCustomer] = useState(false)

  const fetchData = useCallback(async () => {
    const [cRes, pRes, cfRes, tRes] = await Promise.all([
      fetch('/api/customers'),
      fetch('/api/products'),
      fetch('/api/custom-cost-fields'),
      fetch('/api/cost-templates'),
    ])
    const [cData, pData, cfData, tData] = await Promise.all([
      cRes.json(), pRes.json(), cfRes.json(), tRes.json(),
    ])

    setCustomers(cData)
    setProducts(pData)
    setCustomFields(cfData)

    // Build templateMap keyed by productSizeId
    const map: SizeTemplateMap = {}
    for (const tmpl of tData) {
      map[tmpl.productSizeId] = tmpl
    }
    setTemplateMap(map)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault()
    if (!newCustomerForm.name.trim()) return
    setSavingCustomer(true)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomerForm),
      })
      if (!res.ok) throw new Error()
      const created: Customer = await res.json()
      setCustomers((prev) => [...prev, created])
      setCustomerId(created.id)
      setShowNewCustomerModal(false)
      setNewCustomerForm({ name: '', company: '', gstin: '', phone: '', email: '', address: '' })
      toast.success(`Customer "${created.name}" added and selected!`)
    } catch {
      toast.error('Failed to add customer')
    } finally {
      setSavingCustomer(false)
    }
  }

  function autoFillFromTemplate(lineItemId: string, productSizeId: string) {
    const tmpl = templateMap[productSizeId]
    if (!tmpl) return
    const customVals: Record<string, string> = {}
    for (const cv of tmpl.customValues || []) {
      customVals[cv.customCostFieldId] = cv.value
    }
    setLineItems((prev) =>
      prev.map((li) =>
        li.id === lineItemId
          ? {
              ...li,
              productSizeId,
              fabricAvg: tmpl.fabricAvg,
              fabricRate: tmpl.fabricRate,
              stitchingCost: tmpl.stitchingCost,
              matchingCost: tmpl.matchingCost,
              labelCost: tmpl.labelCost,
              extraCost: tmpl.extraCost,
              profitMultiplier: tmpl.profitMultiplier,
              roundOff: tmpl.roundOff,
              customValues: customVals,
            }
          : li
      )
    )
  }

  function updateLineItem(id: string, field: string, value: string | boolean) {
    setLineItems((prev) => prev.map((li) => li.id === id ? { ...li, [field]: value } : li))
  }

  function updateCustomValue(lineItemId: string, fieldId: string, value: string) {
    setLineItems((prev) =>
      prev.map((li) =>
        li.id === lineItemId
          ? { ...li, customValues: { ...li.customValues, [fieldId]: value } }
          : li
      )
    )
  }

  function getCalc(li: LineItemState) {
    return calculateLineItem({
      fabricAvg: parseFloat(li.fabricAvg || '0'),
      fabricRate: parseFloat(li.fabricRate || '0'),
      stitchingCost: parseFloat(li.stitchingCost || '0'),
      matchingCost: parseFloat(li.matchingCost || '0'),
      labelCost: parseFloat(li.labelCost || '0'),
      extraCost: parseFloat(li.extraCost || '0'),
      profitMultiplier: parseFloat(li.profitMultiplier || '1.2'),
      roundOff: li.roundOff,
      quantity: parseInt(li.quantity || '1'),
      customFields: customFields
        .filter(cf => !cf.productTypeId || cf.productTypeId === li.productTypeId)
        .map((cf) => ({
        id: cf.id,
        name: cf.name,
        type: cf.type,
        isMultiplier: cf.isMultiplier,
        value: parseFloat(li.customValues[cf.id] ?? cf.defaultValue ?? '0'),
        textValue: cf.type === 'info' ? (li.customValues[cf.id] || '') : null,
      })),
    })
  }

  const calcs = lineItems.map((li) => ({ id: li.id, calc: getCalc(li) }))
  const totals = calculateQuotationTotals(
    calcs.map((c) => c.calc.totalPrice),
    parseFloat(gstPercentage || '0')
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerId) { toast.error('Please select a customer'); return }
    const invalid = lineItems.some((li) => !li.productTypeId || !li.productSizeId || parseInt(li.quantity) < 1)
    if (invalid) { toast.error('Please fill all size rows'); return }

    setSubmitting(true)
    try {
      const payload = {
        customerId,
        gstPercentage: parseFloat(gstPercentage),
        notes: notes || undefined,
        terms: terms || undefined,
        lineItems: lineItems.map((li) => ({
          productTypeId: li.productTypeId,
          productSizeId: li.productSizeId,
          quantity: parseInt(li.quantity),
          fabricAvg: parseFloat(li.fabricAvg || '0'),
          fabricRate: parseFloat(li.fabricRate || '0'),
          stitchingCost: parseFloat(li.stitchingCost || '0'),
          matchingCost: parseFloat(li.matchingCost || '0'),
          labelCost: parseFloat(li.labelCost || '0'),
          extraCost: parseFloat(li.extraCost || '0'),
          profitMultiplier: parseFloat(li.profitMultiplier || '1.2'),
          roundOff: li.roundOff,
          customValues: customFields
            .filter(cf => !cf.productTypeId || cf.productTypeId === li.productTypeId)
            .map((cf) => ({
            customCostFieldId: cf.id,
            name: cf.name,
            type: cf.type,
            isMultiplier: cf.isMultiplier,
            value: cf.type === 'info' ? 0 : (parseFloat(li.customValues[cf.id] ?? cf.defaultValue ?? '0') || 0),
            textValue: cf.type === 'info' ? (li.customValues[cf.id] || '') : null,
          })),
        })),
      }

      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create quotation')
      }

      const data = await res.json()
      toast.success(`Quotation ${data.quotationNumber} created!`)
      router.push(`/quotations/${data.id}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  return (
    <>
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Quotation</h1>
        <p className="text-gray-500 text-sm mt-0.5">Add sizes and auto-fill pricing from templates</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Customer + GST row */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer *</label>
              <div className="relative">
                <select
                  value={customerId}
                  onChange={(e) => {
                    if (e.target.value === '__add_new__') {
                      setShowNewCustomerModal(true)
                    } else {
                      setCustomerId(e.target.value)
                    }
                  }}
                  required
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition appearance-none bg-white"
                >
                  <option value="">Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.phone ? ` (${c.phone})` : ''}</option>
                  ))}
                  <option value="__add_new__" className="text-brand-600 font-semibold">＋ Add New Customer</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              {/* Quick-add shortcut button */}
              <button
                type="button"
                onClick={() => setShowNewCustomerModal(true)}
                className="mt-1.5 flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium transition"
              >
                <UserPlus className="w-3 h-3" />
                Add new customer
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">GST %</label>
              <input
                type="number"
                step="0.01"
                value={gstPercentage}
                onChange={(e) => setGstPercentage(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any additional notes for this quotation..."
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition resize-none"
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Terms & Conditions</label>
            <textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows={2}
              placeholder="Terms: Payment due within 15 days..."
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition resize-none"
            />
          </div>
        </div>

        {/* Line Items */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-600" />
              Size Rows
              <span className="text-xs font-normal text-gray-400 ml-1">({lineItems.length} size{lineItems.length !== 1 ? 's' : ''})</span>
            </h2>
            <button
              type="button"
              onClick={() => setLineItems([...lineItems, makeLineItem()])}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-600 hover:bg-brand-100 font-medium rounded-lg transition text-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add Size Row
            </button>
          </div>

          <div className="space-y-3">
            {lineItems.map((li, idx) => {
              const calc = calcs.find((c) => c.id === li.id)?.calc
              const selectedProduct = products.find((p) => p.id === li.productTypeId)

              return (
                <div key={li.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-400">Row {idx + 1}</span>
                    {calc && li.productSizeId && (
                      <>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-500">Price/pc: <strong className="text-brand-600">₹{calc.pricePerPiece.toFixed(2)}</strong></span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-500">Total: <strong className="text-gray-900">₹{calc.totalPrice.toFixed(2)}</strong></span>
                      </>
                    )}
                    <div className="flex-1" />
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setLineItems(lineItems.filter((l) => l.id !== li.id))}
                        className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="p-4">
                    {/* Product + Size + Qty */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Product *</label>
                        <select
                          value={li.productTypeId}
                          onChange={(e) => {
                            updateLineItem(li.id, 'productTypeId', e.target.value)
                            updateLineItem(li.id, 'productSizeId', '')
                          }}
                          required
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition"
                        >
                          <option value="">Product...</option>
                          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Size *</label>
                        <select
                          value={li.productSizeId}
                          onChange={(e) => autoFillFromTemplate(li.id, e.target.value)}
                          required
                          disabled={!li.productTypeId}
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition disabled:opacity-50"
                        >
                          <option value="">Size...</option>
                          {(selectedProduct?.productSizes || []).map((s) => (
                            <option key={s.id} value={s.id}>{s.sizeLabel}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Quantity *</label>
                        <input
                          type="number"
                          min="1"
                          value={li.quantity}
                          onChange={(e) => updateLineItem(li.id, 'quantity', e.target.value)}
                          required
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition"
                        />
                      </div>
                      <div className="flex items-end">
                        <div className="bg-brand-50 rounded-lg px-3 py-1.5 w-full text-center">
                          <p className="text-xs text-brand-500">Total</p>
                          <p className="text-sm font-bold text-brand-700">{formatCurrency(calc?.totalPrice ?? 0)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Cost fields */}
                    <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2">
                      {[
                        { key: 'fabricAvg', label: 'Fabric Avg (m)' },
                        { key: 'fabricRate', label: 'Rate (₹/m)' },
                        { key: 'stitchingCost', label: 'Stitching ₹' },
                        { key: 'matchingCost', label: 'Matching ₹' },
                        { key: 'labelCost', label: 'Label ₹' },
                        { key: 'extraCost', label: 'Extra ₹' },
                        { key: 'profitMultiplier', label: 'Profit ×' },
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <label className="block text-xs text-gray-400 mb-0.5">{label}</label>
                          <input
                            type="number"
                            step="0.01"
                            value={(li as unknown as Record<string, string>)[key] ?? ''}
                            onChange={(e) => updateLineItem(li.id, key, e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-300 transition"
                          />
                        </div>
                      ))}

                      {/* Custom fields */}
                      {customFields
                        .filter(cf => !cf.productTypeId || cf.productTypeId === li.productTypeId)
                        .map((cf) => (
                        <div key={cf.id}>
                          <label className="block text-xs text-amber-500 mb-0.5">{cf.name} {cf.type === 'info' ? '' : (cf.isMultiplier ? '×' : '₹')}</label>
                          <input
                            type={cf.type === 'info' ? 'text' : 'number'}
                            step={cf.type === 'info' ? undefined : '0.01'}
                            value={li.customValues[cf.id] ?? (cf.type === 'info' ? '' : cf.defaultValue) ?? ''}
                            onChange={(e) => updateCustomValue(li.id, cf.id, e.target.value)}
                            placeholder={cf.type === 'info' ? 'Enter info...' : ''}
                            className="w-full px-2 py-1.5 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-300 transition"
                          />
                        </div>
                      ))}

                      <div>
                        <label className="block text-xs text-gray-400 mb-0.5">Round Off</label>
                        <select
                          value={li.roundOff ? 'true' : 'false'}
                          onChange={(e) => updateLineItem(li.id, 'roundOff', e.target.value === 'true')}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-300 transition"
                        >
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      </div>
                    </div>

                    {calc && li.productSizeId && (
                      <div className="mt-2 flex gap-3 text-xs text-gray-400">
                        <Calculator className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>Fabric Cost: <strong className="text-gray-600">₹{calc.fabricCost.toFixed(2)}</strong></span>
                        <span>Base: <strong className="text-gray-600">₹{calc.baseCost.toFixed(2)}</strong></span>
                        <span>Sell Price/pc: <strong className="text-brand-600">₹{calc.pricePerPiece.toFixed(2)}</strong></span>
                        <span>× {li.quantity} pcs = <strong className="text-gray-900">₹{calc.totalPrice.toFixed(2)}</strong></span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Totals + Submit */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
          <div className="flex-1" />
          <div className="w-full md:w-72 bg-white rounded-2xl border border-gray-100 p-5">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span className="font-medium text-gray-900">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>GST ({gstPercentage}%)</span>
                <span className="font-medium text-gray-900">{formatCurrency(totals.gstAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-100">
                <span className="text-gray-900">Total</span>
                <span className="text-brand-700">{formatCurrency(totals.total)}</span>
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-4 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl transition shadow-md shadow-brand-600/25"
            >
              {submitting ? 'Creating...' : 'Create Quotation →'}
            </button>
          </div>
        </div>
      </form>
    </div>

      {/* ── Quick Add Customer Modal ─────────────────────────────────────── */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-brand-100 rounded-xl flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-brand-600" />
                </div>
                <h2 className="font-semibold text-gray-900">Add New Customer</h2>
              </div>
              <button onClick={() => setShowNewCustomerModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleAddCustomer} className="p-5 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={newCustomerForm.name}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                  required
                  autoFocus
                  placeholder="Customer / Business name"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <input
                    type="text"
                    value={newCustomerForm.company}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, company: e.target.value })}
                    placeholder="Company Name"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={newCustomerForm.gstin}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, gstin: e.target.value })}
                    placeholder="27AA..."
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition uppercase"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newCustomerForm.phone}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                    placeholder="+91 ..."
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newCustomerForm.email}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                    placeholder="email@..."
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={newCustomerForm.address}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                  placeholder="City / Address (optional)"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCustomer}
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl transition text-sm shadow-md shadow-brand-600/25"
                >
                  {savingCustomer ? 'Saving...' : 'Add & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
