'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, ChevronDown, ChevronRight, Trash2, X, Package,
  Upload, Download, TableProperties, Check
} from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import ImportMapper, { SizeRow } from '@/components/import-mapper'

// ── Types ────────────────────────────────────────────────────────────────────

interface ProductSize {
  id: string
  sizeLabel: string
  sortOrder: number
}

interface ProductType {
  id: string
  name: string
  description: string | null
  productSizes: ProductSize[]
}

function makeRow(label = '', idx = 0): SizeRow {
  return {
    sizeLabel: label,
    sortOrder: idx,
    fabricAvg: '',
    fabricRate: '',
    stitchingCost: '',
    matchingCost: '',
    labelCost: '',
    extraCost: '',
    profitMultiplier: '1.2',
    roundOff: true,
  }
}

const COST_COLS = [
  { key: 'fabricAvg', label: 'Fabric Avg (m)', width: 'w-24 shrink-0' },
  { key: 'fabricRate', label: 'Rate (₹/m)', width: 'w-24 shrink-0' },
  { key: 'stitchingCost', label: 'Stitching ₹', width: 'w-24 shrink-0' },
  { key: 'matchingCost', label: 'Matching ₹', width: 'w-24 shrink-0' },
  { key: 'labelCost', label: 'Label ₹', width: 'w-20 shrink-0' },
  { key: 'extraCost', label: 'Extra ₹', width: 'w-20 shrink-0' },
  { key: 'profitMultiplier', label: 'Profit ×', width: 'w-20 shrink-0' },
]

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductType[]>([])
  const [customFields, setCustomFields] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Setup panel state
  const [setupProduct, setSetupProduct] = useState<ProductType | null>(null)
  const [rows, setRows] = useState<SizeRow[]>([makeRow('', 0)])
  const [saving, setSaving] = useState(false)

  // Custom field modal (inline)
  const [showCfModal, setShowCfModal] = useState(false)
  const [cfForm, setCfForm] = useState({ name: '', type: 'numeric', isMultiplier: false })
  const [creatingCf, setCreatingCf] = useState(false)

  // Create product modal
  const [showProductModal, setShowProductModal] = useState(false)
  const [productForm, setProductForm] = useState({ name: '', description: '' })
  const [creating, setCreating] = useState(false)

  // Import mapper
  const [importerFile, setImporterFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchProducts = useCallback(async () => {
    const res = await fetch('/api/products')
    const data = await res.json()
    setProducts(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  // Helper to re-fetch custom fields for current setup
  const fetchCustomFieldsForProduct = useCallback(async (productId: string) => {
    try {
      const res = await fetch(`/api/custom-cost-fields?productTypeId=${productId}`)
      if (res.ok) setCustomFields(await res.json())
    } catch {}
  }, [])

  // ── Create product then open setup ──────────────────────────────────────────
  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productForm),
      })
      if (!res.ok) throw new Error()
      const newProduct = await res.json()
      toast.success(`"${newProduct.name}" created!`)
      setShowProductModal(false)
      setProductForm({ name: '', description: '' })
      await fetchProducts()
      // Immediately open the setup panel
      openSetup(newProduct)
    } catch {
      toast.error('Failed to create product')
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteProduct(id: string, name: string) {
    if (!confirm(`Delete "${name}" and all its sizes?`)) return
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Deleted'); fetchProducts() }
    else toast.error('Failed to delete')
  }

  // ── Setup panel ─────────────────────────────────────────────────────────────
  function openSetup(product: ProductType) {
    setSetupProduct(product)
    if (product.productSizes?.length > 0) {
      setRows(product.productSizes.map((s, i) => makeRow(s.sizeLabel, i)))
    } else {
      setRows([makeRow('', 0)])
    }
    fetchCustomFieldsForProduct(product.id)
  }

  function updateRow(idx: number, field: keyof SizeRow, value: string | boolean) {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  function addRow() {
    setRows((prev) => [...prev, makeRow('', prev.length)])
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSaveSetup() {
    if (!setupProduct) return
    const valid = rows.filter((r) => r.sizeLabel.trim())
    if (valid.length === 0) { toast.error('Add at least one size'); return }

    setSaving(true)
    try {
      const res = await fetch(`/api/products/${setupProduct.id}/bulk-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sizes: valid.map((r, i) => ({
            sizeLabel: r.sizeLabel.trim(),
            sortOrder: i,
            fabricAvg: parseFloat(r.fabricAvg) || 0,
            fabricRate: parseFloat(r.fabricRate) || 0,
            stitchingCost: parseFloat(r.stitchingCost) || 0,
            matchingCost: parseFloat(r.matchingCost) || 0,
            labelCost: parseFloat(r.labelCost) || 0,
            extraCost: parseFloat(r.extraCost) || 0,
            profitMultiplier: parseFloat(r.profitMultiplier) || 1.2,
            roundOff: r.roundOff,
            customValues: customFields.map(cf => ({
              customCostFieldId: cf.id,
              name: cf.name,
              type: cf.type,
              isMultiplier: cf.isMultiplier,
              value: cf.type === 'info' ? 0 : (parseFloat(r.customValues?.[cf.id] ?? cf.defaultValue ?? '0') || 0),
              textValue: cf.type === 'info' ? (r.customValues?.[cf.id] || '') : null
            }))
          })),
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      toast.success(`${data.created} size${data.created !== 1 ? 's' : ''} saved!`)
      setSetupProduct(null)
      fetchProducts()
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // ── Inline Custom Field Mgmt ────────────────────────────────────────────────
  async function handleCreateCustomField(e: React.FormEvent) {
    e.preventDefault()
    if (!setupProduct) return
    setCreatingCf(true)
    try {
      const payload = {
        name: cfForm.name.trim(),
        type: cfForm.type,
        isMultiplier: cfForm.isMultiplier,
        productTypeId: setupProduct.id,
      }
      const res = await fetch('/api/custom-cost-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error()
      toast.success('Custom field added to product!')
      setShowCfModal(false)
      setCfForm({ name: '', type: 'numeric', isMultiplier: false })
      fetchCustomFieldsForProduct(setupProduct.id)
    } catch {
      toast.error('Failed to add custom field')
    } finally {
      setCreatingCf(false)
    }
  }

  async function handleDeleteCustomField(id: string, name: string) {
    if (!setupProduct || !confirm(`Remove custom field "${name}"?`)) return
    const res = await fetch(`/api/custom-cost-fields/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Custom field removed')
      fetchCustomFieldsForProduct(setupProduct.id)
    } else {
      toast.error('Failed to delete')
    }
  }

  // ── CSV / XLSX Template download ────────────────────────────────────────────
  function downloadTemplate() {
    const templateData = [
      ['Size Label', 'Sort Order', 'Fabric Avg (m)', 'Fabric Rate (₹/m)', 'Stitching (₹)', 'Matching (₹)', 'Label (₹)', 'Extra (₹)', 'Profit Multiplier', 'Round Off'],
      ['S', 0, 0.8, 120, 80, 20, 10, 5, 1.2, 'TRUE'],
      ['M', 1, 0.85, 120, 80, 20, 10, 5, 1.2, 'TRUE'],
      ['L', 2, 0.9, 120, 85, 20, 10, 5, 1.2, 'TRUE'],
      ['XL', 3, 0.95, 120, 90, 20, 10, 5, 1.2, 'TRUE'],
    ]
    const ws = XLSX.utils.aoa_to_sheet(templateData)
    ws['!cols'] = templateData[0].map(() => ({ wch: 18 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sizes & Rates')
    XLSX.writeFile(wb, 'sizes_rates_template.xlsx')
  }

  // ── CSV / XLSX Upload — open mapper ─────────────────────────────────────────
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporterFile(file)
    e.target.value = ''
  }

  function handleImporterResult(importedRows: SizeRow[]) {
    setRows(importedRows)
    setImporterFile(null)
    toast.success(`${importedRows.length} rows loaded from file`)
  }

  // ── Delete size ─────────────────────────────────────────────────────────────
  async function handleDeleteSize(id: string, label: string) {
    if (!confirm(`Remove size "${label}"?`)) return
    const res = await fetch(`/api/sizes/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Size removed'); fetchProducts() }
    else toast.error('Failed to delete')
  }

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products & Sizes</h1>
          <p className="text-gray-500 text-sm mt-0.5">Add products then set up sizes and their base rates</p>
        </div>
        <button
          onClick={() => setShowProductModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition shadow-md shadow-brand-600/25 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Products list */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-gray-400 text-sm">Loading...</div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No product types yet</p>
            <button onClick={() => setShowProductModal(true)} className="mt-3 text-sm text-brand-600 hover:underline">Create your first product →</button>
          </div>
        ) : (
          products.map((product) => (
            <div key={product.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div
                className="flex items-center px-5 py-4 cursor-pointer hover:bg-gray-50 transition"
                onClick={() => setExpandedId(expandedId === product.id ? null : product.id)}
              >
                <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center mr-3">
                  <Package className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{product.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {product.productSizes.length} size{product.productSizes.length !== 1 ? 's' : ''}
                    {product.description ? ` · ${product.description}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); openSetup(product) }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-brand-50 text-brand-600 hover:bg-brand-100 rounded-lg transition"
                  >
                    <TableProperties className="w-3 h-3" />
                    {product.productSizes.length > 0 ? 'Edit Sizes & Rates' : 'Set Up Sizes & Rates'}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id, product.name) }}
                    className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {expandedId === product.id
                    ? <ChevronDown className="w-4 h-4 text-gray-400" />
                    : <ChevronRight className="w-4 h-4 text-gray-400" />
                  }
                </div>
              </div>

              {expandedId === product.id && (
                <div className="border-t border-gray-100 px-5 py-3">
                  {product.productSizes.length === 0 ? (
                    <div className="flex items-center gap-2 py-2">
                      <p className="text-sm text-gray-400">No sizes yet.</p>
                      <button
                        onClick={() => openSetup(product)}
                        className="text-sm text-brand-600 hover:underline font-medium"
                      >
                        Set up sizes & rates →
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 py-1">
                      {product.productSizes.map((size) => (
                        <div key={size.id} className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-lg group">
                          <span className="text-sm font-medium text-gray-700">{size.sizeLabel}</span>
                          <button
                            onClick={() => handleDeleteSize(size.id, size.sizeLabel)}
                            className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Create Product Modal ─────────────────────────────────────────────── */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">New Product Type</h2>
              <button onClick={() => setShowProductModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreateProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  required
                  autoFocus
                  placeholder="e.g. Shirt, Pant, Full Shirt, Skirt"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Optional note"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition"
                />
              </div>
              <p className="text-xs text-brand-600 bg-brand-50 px-3 py-2 rounded-lg">
                💡 After creating, you'll be taken directly to set up sizes & rates.
              </p>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowProductModal(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition text-sm">Cancel</button>
                <button type="submit" disabled={creating} className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl transition text-sm shadow-md shadow-brand-600/25">
                  {creating ? 'Creating...' : 'Create & Set Up →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Setup Panel (full-screen slide-over) ─────────────────────────────── */}
      {setupProduct && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setSetupProduct(null)} />
          {/* Panel */}
          <div className="w-full max-w-5xl bg-gray-50 h-full overflow-y-auto flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-10">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">{setupProduct.name} — Sizes & Rates</h2>
                <p className="text-xs text-gray-400 mt-0.5">Enter size labels and their default cost rates</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Download template */}
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-xl text-xs transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Template
                </button>
                {/* Upload CSV/XLSX */}
                <label className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium rounded-xl text-xs transition cursor-pointer border border-amber-200">
                  <Upload className="w-3.5 h-3.5" />
                  Upload CSV/XLSX
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <button onClick={() => setSetupProduct(null)} className="p-2 hover:bg-gray-100 rounded-xl transition">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Instructions banner */}
            <div className="px-6 py-3 bg-brand-50 border-b border-brand-100 text-xs text-brand-700 flex items-center gap-2">
              <TableProperties className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                Fill in size labels (required) and cost rates (optional — can also be set from Cost Templates).
                Use <strong>Upload CSV/XLSX</strong> to import many sizes at once, or download the <strong>Template</strong> for the correct format.
              </span>
            </div>

            {/* Table */}
            <div className="flex-1 p-6">
              <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
                <div className="min-w-max w-full">
                {/* Table header */}
                <div className="bg-gray-50 border-b border-gray-100 px-4 py-2.5 flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  <div className="w-6">#</div>
                  <div className="w-28">Size Label *</div>
                  {COST_COLS.map((c) => (
                    <div key={c.key} className={`${c.width} text-right`}>{c.label}</div>
                  ))}
                  {customFields.map((cf) => (
                    <div key={cf.id} className="w-24 shrink-0 text-right text-amber-600 font-bold relative group flex items-center justify-end gap-1">
                      {cf.name} {cf.type === 'info' ? '' : (cf.isMultiplier ? '×' : '₹')}
                      <button
                        onClick={() => handleDeleteCustomField(cf.id, cf.name)}
                        className="w-4 h-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition absolute -top-1 -right-2 shrink-0"
                        title="Delete custom field"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                  <div className="w-20 shrink-0 text-center">Round Off</div>
                  <div className="w-20 shrink-0 flex justify-center">
                    <button onClick={() => setShowCfModal(true)} className="text-[10px] uppercase font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 px-2 py-1 rounded-md transition">+ Field</button>
                  </div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-gray-50">
                  {rows.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50/60 transition group">
                      <div className="w-6 text-xs text-gray-300 font-medium">{idx + 1}</div>
                      {/* Size label */}
                      <input
                        type="text"
                        value={row.sizeLabel}
                        onChange={(e) => updateRow(idx, 'sizeLabel', e.target.value)}
                        placeholder="e.g. S, M, L, 38"
                        className="w-28 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition font-medium"
                      />
                      {/* Cost fields */}
                      {COST_COLS.map((c) => (
                        <input
                          key={c.key}
                          type="number"
                          step="0.01"
                          min="0"
                          value={(row as unknown as Record<string, string>)[c.key] ?? ''}
                          onChange={(e) => updateRow(idx, c.key as keyof SizeRow, e.target.value)}
                          placeholder="0"
                          className={`${c.width} shrink-0 px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-right focus:outline-none focus:ring-2 focus:ring-brand-300 transition`}
                        />
                      ))}
                      {/* Custom fields */}
                      {customFields.map((cf) => (
                        <input
                          key={cf.id}
                          type={cf.type === 'info' ? 'text' : 'number'}
                          step={cf.type === 'info' ? undefined : '0.01'}
                          min={cf.type === 'info' ? undefined : '0'}
                          value={row.customValues?.[cf.id] ?? (cf.type === 'info' ? '' : cf.defaultValue) ?? ''}
                          onChange={(e) => {
                            const newVals = { ...(row.customValues || {}), [cf.id]: e.target.value }
                            updateRow(idx, 'customValues' as any, newVals as any)
                          }}
                          placeholder={cf.type === 'info' ? 'Info...' : '0'}
                          className="w-24 shrink-0 px-2 py-1.5 border border-amber-200 rounded-lg text-xs text-right focus:outline-none focus:ring-2 focus:ring-amber-300 transition"
                        />
                      ))}
                      {/* Round off */}
                      <div className="w-20 shrink-0 flex justify-center">
                        <button
                          type="button"
                          onClick={() => updateRow(idx, 'roundOff', !row.roundOff)}
                          className={`w-11 h-6 rounded-full relative flex items-center px-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 ${row.roundOff ? 'bg-brand-600' : 'bg-gray-300'}`}
                        >
                          <span className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${row.roundOff ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                      <div className="w-20 shrink-0" />
                      {/* Remove row */}
                      <button
                        onClick={() => removeRow(idx)}
                        className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add row */}
                <div className="px-4 py-3 border-t border-gray-100">
                  <button
                    onClick={addRow}
                    className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium transition"
                  >
                    <Plus className="w-4 h-4" />
                    Add another size
                  </button>
                </div>
                </div>
              </div>

              {/* Quick-add common sizes */}
              <div className="mt-4">
                <p className="text-xs text-gray-400 mb-2 font-medium">Quick add common size sets:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'S / M / L / XL / XXL', sizes: ['S', 'M', 'L', 'XL', 'XXL'] },
                    { label: '38–46 (Shirt)', sizes: ['38', '39', '40', '41', '42', '43', '44', '45', '46'] },
                    { label: '28–38 (Pant)', sizes: ['28', '30', '32', '34', '36', '38'] },
                    { label: 'Free Size', sizes: ['Free Size'] },
                  ].map(({ label, sizes }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setRows(sizes.map((s, i) => makeRow(s, i)))}
                      className="px-3 py-1.5 bg-white border border-gray-200 hover:border-brand-300 hover:bg-brand-50 text-xs text-gray-600 hover:text-brand-700 rounded-lg transition font-medium"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-white border-t border-gray-100 flex items-center justify-between sticky bottom-0">
              <p className="text-xs text-gray-400">
                {rows.filter((r) => r.sizeLabel.trim()).length} valid size{rows.filter((r) => r.sizeLabel.trim()).length !== 1 ? 's' : ''} ready to save
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSetupProduct(null)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSetup}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl transition text-sm shadow-md shadow-brand-600/25"
                >
                  <Check className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save All Sizes & Rates'}
                </button>
              </div>
            </div>
          </div>
          
          {/* ── Add Custom Field Modal (Nested) ── */}
          {showCfModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900">Add Custom Field</h2>
                  <button onClick={() => setShowCfModal(false)} className="p-1 hover:bg-gray-100 rounded-lg transition">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <form onSubmit={handleCreateCustomField} className="p-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Field Name *</label>
                    <input
                      type="text"
                      value={cfForm.name}
                      onChange={(e) => setCfForm({ ...cfForm, name: e.target.value })}
                      required
                      placeholder="e.g. Packing, Commission"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-300 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Field Type</label>
                    <div className="grid grid-cols-3 gap-2">
                       <button type="button" onClick={() => setCfForm({ ...cfForm, type: 'numeric', isMultiplier: false })} className={`py-2 text-xs font-medium rounded-lg border ${cfForm.type === 'numeric' && !cfForm.isMultiplier ? 'bg-brand-50 border-brand-300 text-brand-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>₹ Amount</button>
                       <button type="button" onClick={() => setCfForm({ ...cfForm, type: 'numeric', isMultiplier: true })} className={`py-2 text-xs font-medium rounded-lg border ${cfForm.type === 'numeric' && cfForm.isMultiplier ? 'bg-brand-50 border-brand-300 text-brand-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>% Multiplier</button>
                       <button type="button" onClick={() => setCfForm({ ...cfForm, type: 'info', isMultiplier: false })} className={`py-2 text-xs font-medium rounded-lg border ${cfForm.type === 'info' ? 'bg-brand-50 border-brand-300 text-brand-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>Text/Info</button>
                    </div>
                  </div>
                  <div className="pt-2 flex gap-2">
                    <button type="button" onClick={() => setShowCfModal(false)} className="flex-1 py-2 bg-gray-100 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-200 transition">Cancel</button>
                    <button type="submit" disabled={creatingCf} className="flex-1 py-2 bg-brand-600 text-sm font-semibold text-white rounded-xl shadow hover:bg-brand-700 transition">{creatingCf ? 'Saving...' : 'Save Field'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ImportMapper modal ──────────────────────────────────────────────── */}
      {importerFile && (
        <ImportMapper
          file={importerFile}
          onClose={() => setImporterFile(null)}
          onImport={handleImporterResult}
        />
      )}

      {/* Suppress number spinners */}
      <style jsx>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
      `}</style>
    </div>
  )
}
