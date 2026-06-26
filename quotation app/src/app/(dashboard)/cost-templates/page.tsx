'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calculator, Plus, Trash2, X, Info, Save, Tags } from 'lucide-react'
import { toast } from 'sonner'
import { calculateLineItem } from '@/lib/calc'

interface CustomCostField {
  id: string
  name: string
  type: string
  isMultiplier: boolean
  defaultValue: string
  productTypeId: string | null
}

interface ProductSize {
  id: string
  sizeLabel: string
  productType: { name: string }
  sizeCostTemplates: Array<{
    id: string
    fabricAvg: string
    fabricRate: string
    stitchingCost: string
    matchingCost: string
    labelCost: string
    extraCost: string
    profitMultiplier: string
    roundOff: boolean
    customValues: Array<{ customCostFieldId: string; value: string; textValue: string | null; customCostField: { name: string; type: string } }>
  }>
}

interface ProductType {
  id: string
  name: string
  productSizes: ProductSize[]
}

export default function CostTemplatesPage() {
  const [products, setProducts] = useState<ProductType[]>([])
  const [customFields, setCustomFields] = useState<CustomCostField[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [showFieldModal, setShowFieldModal] = useState(false)
  const [fieldForm, setFieldForm] = useState({ name: '', type: 'numeric', isMultiplier: false, defaultValue: '0' })

  // Template values keyed by sizeId
  const [templates, setTemplates] = useState<Record<string, Record<string, string>>>({})

  const fetchData = useCallback(async () => {
    const [productsRes, fieldsRes] = await Promise.all([
      fetch('/api/products'),
      fetch('/api/custom-cost-fields'),
    ])
    const productsData = await productsRes.json()
    const fieldsData = await fieldsRes.json()

    setProducts(productsData)
    setCustomFields(fieldsData)

    // Pre-fill template state from existing DB values
    const templateState: Record<string, Record<string, string>> = {}
    for (const product of productsData) {
      for (const size of (product.productSizes as ProductSize[])) {
        const tmpl = size.sizeCostTemplates?.[0]
        if (tmpl) {
          templateState[size.id] = {
            fabricAvg: tmpl.fabricAvg,
            fabricRate: tmpl.fabricRate,
            stitchingCost: tmpl.stitchingCost,
            matchingCost: tmpl.matchingCost,
            labelCost: tmpl.labelCost,
            extraCost: tmpl.extraCost,
            profitMultiplier: tmpl.profitMultiplier,
            roundOff: tmpl.roundOff ? 'true' : 'false',
            ...Object.fromEntries(
              (tmpl.customValues || []).map((cv) => [`custom_${cv.customCostFieldId}`, cv.customCostField?.type === 'info' ? (cv.textValue || '') : cv.value])
            ),
          }
        } else {
          templateState[size.id] = {
            fabricAvg: '0',
            fabricRate: '0',
            stitchingCost: '0',
            matchingCost: '0',
            labelCost: '0',
            extraCost: '0',
            profitMultiplier: '1.2',
            roundOff: 'true',
          }
        }
      }
    }

    setTemplates(templateState)
    if (productsData.length > 0 && !selectedProductId) {
      setSelectedProductId(productsData[0].id)
    }
    setLoading(false)
  }, [selectedProductId])

  useEffect(() => { fetchData() }, [fetchData])

  function updateField(sizeId: string, field: string, value: string) {
    setTemplates((prev) => ({
      ...prev,
      [sizeId]: { ...(prev[sizeId] || {}), [field]: value },
    }))
  }

  function getCalcForSize(sizeId: string) {
    const t = templates[sizeId] || {}
    return calculateLineItem({
      fabricAvg: parseFloat(t.fabricAvg || '0'),
      fabricRate: parseFloat(t.fabricRate || '0'),
      stitchingCost: parseFloat(t.stitchingCost || '0'),
      matchingCost: parseFloat(t.matchingCost || '0'),
      labelCost: parseFloat(t.labelCost || '0'),
      extraCost: parseFloat(t.extraCost || '0'),
      profitMultiplier: parseFloat(t.profitMultiplier || '1.2'),
      roundOff: t.roundOff !== 'false',
      quantity: 1,
      customFields: customFields
        .filter(cf => !cf.productTypeId || cf.productTypeId === selectedProductId)
        .map((cf) => ({
        id: cf.id,
        name: cf.name,
        type: cf.type,
        isMultiplier: cf.isMultiplier,
        value: parseFloat(t[`custom_${cf.id}`] ?? cf.defaultValue ?? '0'),
        textValue: cf.type === 'info' ? (t[`custom_${cf.id}`] ?? '') : null,
      })),
    })
  }

  async function saveTemplate(sizeId: string) {
    setSaving(sizeId)
    try {
      const t = templates[sizeId] || {}
      const customValues = customFields
        .filter(cf => !cf.productTypeId || cf.productTypeId === selectedProductId)
        .map((cf) => ({
        customCostFieldId: cf.id,
        value: cf.type === 'info' ? 0 : parseFloat(t[`custom_${cf.id}`] ?? '0'),
        textValue: cf.type === 'info' ? (t[`custom_${cf.id}`] || '') : null,
      }))

      const res = await fetch('/api/cost-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productSizeId: sizeId,
          fabricAvg: parseFloat(t.fabricAvg || '0'),
          fabricRate: parseFloat(t.fabricRate || '0'),
          stitchingCost: parseFloat(t.stitchingCost || '0'),
          matchingCost: parseFloat(t.matchingCost || '0'),
          labelCost: parseFloat(t.labelCost || '0'),
          extraCost: parseFloat(t.extraCost || '0'),
          profitMultiplier: parseFloat(t.profitMultiplier || '1.2'),
          roundOff: t.roundOff !== 'false',
          customValues,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Template saved!')
    } catch {
      toast.error('Failed to save template')
    } finally {
      setSaving(null)
    }
  }

  async function handleAddCustomField(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/custom-cost-fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fieldForm.name,
        type: fieldForm.type,
        isMultiplier: fieldForm.isMultiplier,
        defaultValue: parseFloat(fieldForm.defaultValue) || 0,
        productTypeId: selectedProductId || null,
      }),
    })
    if (res.ok) {
      toast.success('Custom cost field added!')
      setShowFieldModal(false)
      setFieldForm({ name: '', type: 'numeric', isMultiplier: false, defaultValue: '0' })
      fetchData()
    } else {
      toast.error('Failed to add field')
    }
  }

  const selectedProduct = products.find((p) => p.id === selectedProductId)

  const fixedFields = [
    { key: 'fabricAvg', label: 'Fabric Avg (m)', hint: 'Meters per piece' },
    { key: 'fabricRate', label: 'Fabric Rate (₹/m)', hint: 'Price per meter' },
    { key: 'stitchingCost', label: 'Stitching (₹)', hint: 'Labour cost' },
    { key: 'matchingCost', label: 'Matching (₹)', hint: 'Add-ons/lining' },
    { key: 'labelCost', label: 'Label (₹)', hint: 'Branding cost' },
    { key: 'extraCost', label: 'Extra (₹)', hint: 'Misc costs' },
    { key: 'profitMultiplier', label: 'Profit ×', hint: '1.2 = 20% profit' },
  ]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cost Templates</h1>
          <p className="text-gray-500 text-sm mt-0.5">Excel-style pricing per size</p>
        </div>
        <button
          onClick={() => setShowFieldModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition shadow-md shadow-brand-600/25 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Custom Field
        </button>
      </div>

      {/* Product selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
        {products.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedProductId(p.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition ${
              selectedProductId === p.id
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Custom fields info */}
      {customFields.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {customFields
            .filter(cf => !cf.productTypeId || cf.productTypeId === selectedProductId)
            .map((cf) => (
            <div key={cf.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs">
              <Tags className="w-3 h-3 text-amber-600" />
              <span className="text-amber-700 font-medium">{cf.name}</span>
              <span className="text-amber-500">({cf.isMultiplier ? 'multiplier' : '₹ additive'})</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400">Loading...</div>
      ) : !selectedProduct || selectedProduct.productSizes.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <Calculator className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">No sizes found. Add sizes in Products first.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {selectedProduct.productSizes.map((size) => {
            const t = templates[size.id] || {}
            const calc = getCalcForSize(size.id)
            return (
              <div key={size.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="flex items-center px-5 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-brand-700 font-bold text-xs">{size.sizeLabel}</span>
                  </div>
                  <span className="font-semibold text-gray-900 flex-1">Size: {size.sizeLabel}</span>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-500">Base: <strong className="text-gray-900">₹{calc.baseCost.toFixed(2)}</strong></span>
                    <span className="text-gray-500">Sell: <strong className="text-brand-700">₹{calc.pricePerPiece.toFixed(2)}</strong></span>
                  </div>
                  <button
                    onClick={() => saveTemplate(size.id)}
                    disabled={saving === size.id}
                    className="ml-4 flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 font-medium rounded-lg transition text-xs"
                  >
                    <Save className="w-3 h-3" />
                    {saving === size.id ? 'Saving...' : 'Save'}
                  </button>
                </div>

                <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                  {fixedFields.map(({ key, label, hint }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={t[key] ?? ''}
                        onChange={(e) => updateField(size.id, key, e.target.value)}
                        placeholder="0"
                        title={hint}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition"
                      />
                    </div>
                  ))}

                  {/* Round off toggle */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Round Off</label>
                    <select
                      value={t.roundOff ?? 'true'}
                      onChange={(e) => updateField(size.id, 'roundOff', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition"
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>

                  {/* Custom fields */}
                  {customFields
                    .filter(cf => !cf.productTypeId || cf.productTypeId === selectedProductId)
                    .map((cf) => (
                    <div key={cf.id}>
                      <label className="block text-xs font-medium text-amber-600 mb-1">{cf.name} {cf.type === 'info' ? '' : (cf.isMultiplier ? '×' : '₹')}</label>
                      <input
                        type={cf.type === 'info' ? "text" : "number"}
                        step={cf.type === 'info' ? undefined : "0.01"}
                        value={t[`custom_${cf.id}`] ?? (cf.type === 'info' ? '' : cf.defaultValue) ?? ''}
                        onChange={(e) => updateField(size.id, `custom_${cf.id}`, e.target.value)}
                        placeholder={cf.type === 'info' ? 'Enter info...' : cf.defaultValue}
                        className="w-full px-2.5 py-1.5 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 transition"
                      />
                    </div>
                  ))}
                </div>

                {/* Calculation breakdown */}
                <div className="px-5 pb-4 flex flex-wrap gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Info className="w-3 h-3" />Fabric: <strong className="text-gray-600">₹{calc.fabricCost.toFixed(2)}</strong></span>
                  <span>Fixed Base: <strong className="text-gray-600">₹{calc.fixedBase.toFixed(2)}</strong></span>
                  {calc.customAdditiveTotal > 0 && <span>Custom Additive: <strong className="text-gray-600">₹{calc.customAdditiveTotal.toFixed(2)}</strong></span>}
                  <span>Base Cost: <strong className="text-gray-600">₹{calc.baseCost.toFixed(2)}</strong></span>
                  <span className="text-brand-600">→ Sell Price/pc: <strong>₹{calc.pricePerPiece.toFixed(2)}</strong></span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Custom Field Modal */}
      {showFieldModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Add Custom Cost Field</h2>
              <button onClick={() => setShowFieldModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <form onSubmit={handleAddCustomField} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Field Name *</label>
                <input type="text" value={fieldForm.name} onChange={(e) => setFieldForm({ ...fieldForm, name: e.target.value })} required placeholder="e.g. Embroidery, Packing, Commission" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setFieldForm({ ...fieldForm, type: 'numeric', isMultiplier: false })} className={`py-2.5 rounded-xl text-sm font-medium border transition ${fieldForm.type === 'numeric' && !fieldForm.isMultiplier ? 'bg-brand-50 border-brand-300 text-brand-700' : 'border-gray-200 text-gray-500'}`}>₹ Additive</button>
                  <button type="button" onClick={() => setFieldForm({ ...fieldForm, type: 'multiplier', isMultiplier: true })} className={`py-2.5 rounded-xl text-sm font-medium border transition ${fieldForm.type === 'multiplier' && fieldForm.isMultiplier ? 'bg-brand-50 border-brand-300 text-brand-700' : 'border-gray-200 text-gray-500'}`}>× Multiplier</button>
                  <button type="button" onClick={() => setFieldForm({ ...fieldForm, type: 'info', isMultiplier: false })} className={`py-2.5 rounded-xl text-sm font-medium border transition ${fieldForm.type === 'info' ? 'bg-brand-50 border-brand-300 text-brand-700' : 'border-gray-200 text-gray-500'}`}>Text/Info</button>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  {fieldForm.type === 'info' ? 'Descriptive text field (Length, Color) that does not affect pricing.' : (fieldForm.isMultiplier ? 'Applied as a multiplier on base cost (e.g. 1.1 = 10% extra)' : 'Flat ₹ amount added to base cost')}
                </p>
              </div>
              {fieldForm.type !== 'info' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Value</label>
                  <input type="number" step="0.01" value={fieldForm.defaultValue} onChange={(e) => setFieldForm({ ...fieldForm, defaultValue: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition" />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowFieldModal(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition text-sm">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition text-sm shadow-md shadow-brand-600/25">Add Field</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
