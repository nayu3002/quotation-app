'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Plus, Trash2, Bot, Save, Send, Eye, ChevronDown, ChevronUp,
  GripVertical, Loader2, Sparkles, Package, X, Calculator,
  Copy, Tag, AlertCircle, Check
} from 'lucide-react'
import { formatCurrency, getTerminology } from '@/lib/utils'
import { calculateQuote } from '@/lib/calculation-engine'

// ─── Schema ───────────────────────────────────────────────────────────────────
const LineItemSchema = z.object({
  name: z.string().min(1, 'Item name required'),
  description: z.string().optional(),
  quantity: z.number().positive().default(1),
  unitPrice: z.number().min(0).default(0),
  costPrice: z.number().min(0).default(0),
  discountPercent: z.number().min(0).max(100).default(0),
  taxRate: z.number().min(0).default(0),
  taxName: z.string().optional(),
  isOptional: z.boolean().default(false),
  sectionLabel: z.string().optional(),
  productId: z.string().optional(),
})

const QuoteFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  currency: z.string().default('USD'),
  expiresAt: z.string().optional(),
  introText: z.string().optional(),
  termsText: z.string().optional(),
  quoteDiscountPercent: z.number().min(0).max(100).default(0),
  taxMode: z.enum(['exclusive', 'inclusive']).default('exclusive'),
  lineItems: z.array(LineItemSchema).min(1, 'Add at least one line item'),
})

type QuoteFormData = z.infer<typeof QuoteFormSchema>

// ─── Props ────────────────────────────────────────────────────────────────────
interface QuoteEditorProps {
  mode: 'create' | 'edit'
  org: { id: string; defaultCurrency: string; industry: string; primaryColor: string | null }
  contacts: { id: string; firstName: string; lastName: string | null; email: string | null; companyId: string | null }[]
  companies: { id: string; name: string }[]
  products: { id: string; name: string; description: string | null; basePrice: number; costPrice: number; unitOfMeasure: string; currency: string }[]
  templates: { id: string; name: string; description: string | null; industry: string }[]
  initialData?: Partial<QuoteFormData>
  quoteId?: string
}

export function QuoteEditor({ mode, org, contacts, companies, products, templates, initialData, quoteId }: QuoteEditorProps) {
  const router = useRouter()
  const terminology = getTerminology(org.industry)
  const color = org.primaryColor ?? '#7c5cfc'

  const [showCatalog, setShowCatalog] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState('')
  const [draftingAI, setDraftingAI] = useState(false)
  const [aiDescription, setAiDescription] = useState('')
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<QuoteFormData>({
    resolver: zodResolver(QuoteFormSchema),
    defaultValues: {
      currency: org.defaultCurrency,
      taxMode: 'exclusive',
      quoteDiscountPercent: 0,
      lineItems: [{ name: '', description: '', quantity: 1, unitPrice: 0, costPrice: 0, discountPercent: 0, taxRate: 0, isOptional: false }],
      ...initialData,
    },
  })

  const { fields, append, remove, move } = useFieldArray({ control, name: 'lineItems' })
  const watchedItems = watch('lineItems')
  const watchedDiscount = watch('quoteDiscountPercent')
  const watchedCurrency = watch('currency')
  const watchedTaxMode = watch('taxMode')

  // Live calculation
  const calc = calculateQuote({
    lineItems: watchedItems.map((item, i) => ({
      id: String(i),
      name: item.name,
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
      costPrice: item.costPrice || 0,
      discountPercent: item.discountPercent || 0,
      taxRate: item.taxRate || 0,
      isOptional: item.isOptional,
      isSelected: true,
      sectionLabel: item.sectionLabel,
    })),
    quoteDiscountPercent: watchedDiscount || 0,
    taxMode: watchedTaxMode,
    currency: watchedCurrency,
  })

  const addFromCatalog = (product: typeof products[0]) => {
    append({
      name: product.name,
      description: product.description ?? '',
      quantity: 1,
      unitPrice: product.basePrice,
      costPrice: product.costPrice,
      discountPercent: 0,
      taxRate: 0,
      isOptional: false,
      productId: product.id,
    })
    setShowCatalog(false)
  }

  const draftWithAI = async () => {
    if (!aiDescription.trim()) return
    setDraftingAI(true)
    try {
      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: aiDescription, currency: watchedCurrency }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'AI draft failed')
        return
      }
      const { data } = await res.json()
      if (data.title) setValue('title', data.title)
      if (data.introText) setValue('introText', data.introText)
      if (data.termsText) setValue('termsText', data.termsText)
      if (data.lineItems?.length) {
        const newItems = data.lineItems.map((li: any) => ({
          name: li.name,
          description: li.description ?? '',
          quantity: li.quantity || 1,
          unitPrice: li.unitPrice || 0,
          costPrice: 0,
          discountPercent: 0,
          taxRate: 0,
          isOptional: false,
        }))
        setValue('lineItems', newItems)
      }
      setShowAIPanel(false)
      toast.success('AI draft applied! Review and adjust as needed.')
    } finally {
      setDraftingAI(false)
    }
  }

  const onSubmit = async (data: QuoteFormData, action: 'save' | 'send') => {
    action === 'save' ? setSaving(true) : setSending(true)
    try {
      const res = await fetch(mode === 'create' ? '/api/quotes' : `/api/quotes/${quoteId}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, action }),
      })
      const result = await res.json()
      if (!res.ok) {
        toast.error(result.error?.message ?? result.error ?? 'Failed to save quote')
        return
      }
      toast.success(action === 'send' ? 'Quote sent to client!' : 'Quote saved!')
      router.push(`/quotes/${result.data.id}`)
    } finally {
      setSaving(false)
      setSending(false)
    }
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(catalogSearch.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {mode === 'create' ? `New ${terminology.quote}` : `Edit ${terminology.quote}`}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Fill in the details below</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAIPanel(!showAIPanel)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            <Sparkles size={15} />
            AI Draft
          </button>
          <button
            onClick={handleSubmit(d => onSubmit(d, 'save'))}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-card border border-border text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Draft
          </button>
          <button
            onClick={handleSubmit(d => onSubmit(d, 'send'))}
            disabled={sending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Send to Client
          </button>
        </div>
      </div>

      {/* AI Draft Panel */}
      {showAIPanel && (
        <div className="glass-card p-6 border-l-4 animate-fade-in" style={{ borderLeftColor: color }}>
          <div className="flex items-center gap-2 mb-3">
            <Bot size={18} style={{ color }} />
            <h3 className="font-semibold text-foreground">AI Quote Drafter</h3>
            <button onClick={() => setShowAIPanel(false)} className="ml-auto text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          </div>
          <p className="text-sm text-muted-foreground mb-3">Describe what you're quoting for. The AI will generate a complete quote with line items, intro, and terms.</p>
          <textarea
            value={aiDescription}
            onChange={e => setAiDescription(e.target.value)}
            placeholder={`e.g. "Website redesign for a local restaurant including design, development, and 3 months of maintenance"`}
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none mb-3"
          />
          <button
            onClick={draftWithAI}
            disabled={draftingAI || !aiDescription.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all hover:-translate-y-0.5"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
          >
            {draftingAI ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {draftingAI ? 'Generating...' : 'Generate Quote'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Main Editor — Left 2 columns */}
        <div className="col-span-2 space-y-4">
          {/* Basic Info */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Basic Information</h2>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Quote Title *</label>
              <input
                {...register('title')}
                placeholder={`e.g. "Website Redesign for Acme Corp"`}
                className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
              {errors.title && <p className="text-xs text-red-400">{errors.title.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Contact</label>
                <select
                  {...register('contactId')}
                  className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground focus:outline-none text-sm"
                >
                  <option value="">Select contact...</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName ?? ''}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Company</label>
                <select
                  {...register('companyId')}
                  className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground focus:outline-none text-sm"
                >
                  <option value="">Select company...</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Currency</label>
                <select
                  {...register('currency')}
                  className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground focus:outline-none text-sm"
                >
                  {['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'INR', 'AED', 'SGD'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Valid Until</label>
                <input
                  {...register('expiresAt')}
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground focus:outline-none text-sm"
                />
              </div>
            </div>
          </div>

          {/* Intro Text */}
          <div className="glass-card p-6 space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Introduction / Cover Letter</label>
            <textarea
              {...register('introText')}
              placeholder="Write a personal intro or overview for the client..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
            />
          </div>

          {/* Line Items */}
          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Line Items</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCatalog(!showCatalog)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Package size={13} />
                  From Catalog
                </button>
                <button
                  type="button"
                  onClick={() => append({ name: '', description: '', quantity: 1, unitPrice: 0, costPrice: 0, discountPercent: 0, taxRate: 0, isOptional: false })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                  style={{ background: color }}
                >
                  <Plus size={13} />
                  Add Item
                </button>
              </div>
            </div>

            {/* Catalog Search Dropdown */}
            {showCatalog && (
              <div className="p-4 bg-muted/50 border-b border-border">
                <input
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  placeholder="Search catalog..."
                  className="w-full px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder-muted-foreground focus:outline-none mb-3"
                />
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {filteredProducts.slice(0, 20).map(product => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addFromCatalog(product)}
                      className="flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-left"
                    >
                      <div>
                        <p className="text-xs font-medium text-foreground">{product.name}</p>
                        <p className="text-[11px] text-muted-foreground">per {product.unitOfMeasure}</p>
                      </div>
                      <span className="text-xs font-semibold text-foreground ml-2 flex-shrink-0">
                        {formatCurrency(product.basePrice, product.currency)}
                      </span>
                    </button>
                  ))}
                  {filteredProducts.length === 0 && (
                    <p className="text-xs text-muted-foreground col-span-2 py-4 text-center">No products found</p>
                  )}
                </div>
              </div>
            )}

            {/* Line Item Rows */}
            <div className="divide-y divide-border">
              {/* Header row */}
              <div className="grid grid-cols-12 gap-2 px-6 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="col-span-4">Item</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Unit Price</div>
                <div className="col-span-2">Discount %</div>
                <div className="col-span-1">Total</div>
                <div className="col-span-1"></div>
              </div>

              {fields.map((field, index) => {
                const itemCalc = calc.lineItems[index]
                return (
                  <div key={field.id} className="px-6 py-3 hover:bg-accent/10 transition-colors">
                    <div className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-4 space-y-1">
                        <input
                          {...register(`lineItems.${index}.name`)}
                          placeholder="Item name *"
                          className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                        <input
                          {...register(`lineItems.${index}.description`)}
                          placeholder="Description (optional)"
                          className="w-full px-3 py-2 rounded-lg bg-transparent border border-transparent text-xs text-muted-foreground placeholder-muted-foreground/50 focus:outline-none focus:bg-muted focus:border-border"
                        />
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                            <input
                              type="checkbox"
                              {...register(`lineItems.${index}.isOptional`)}
                              className="w-3 h-3 rounded accent-primary"
                            />
                            Optional
                          </label>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <input
                          {...register(`lineItems.${index}.quantity`, { valueAsNumber: true })}
                          type="number" min="0" step="0.01"
                          className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          {...register(`lineItems.${index}.unitPrice`, { valueAsNumber: true })}
                          type="number" min="0" step="0.01"
                          className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          {...register(`lineItems.${index}.discountPercent`, { valueAsNumber: true })}
                          type="number" min="0" max="100" step="0.1"
                          className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      </div>
                      <div className="col-span-1 pt-2">
                        <p className="text-sm font-semibold text-foreground">
                          {formatCurrency(itemCalc?.lineTotal ?? 0, watchedCurrency)}
                        </p>
                        {(itemCalc?.margin ?? 0) > 0 && (
                          <p className="text-[11px] text-muted-foreground">{itemCalc?.margin.toFixed(0)}% margin</p>
                        )}
                      </div>
                      <div className="col-span-1 pt-1.5 flex gap-1">
                        <button type="button" onClick={() => append({ ...field })} title="Duplicate"
                          className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                          <Copy size={12} />
                        </button>
                        <button type="button" onClick={() => remove(index)} title="Remove"
                          className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {fields.length === 0 && (
                <div className="px-6 py-8 text-center">
                  <p className="text-sm text-muted-foreground">No items yet. Add from catalog or manually.</p>
                </div>
              )}
            </div>

            {/* Tax mode + quote discount */}
            <div className="flex items-center gap-4 px-6 py-3 bg-muted/30 border-t border-border">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Tax mode:</label>
                <select {...register('taxMode')}
                  className="text-xs bg-card border border-border rounded-lg px-2 py-1 text-foreground focus:outline-none">
                  <option value="exclusive">Tax exclusive (added on top)</option>
                  <option value="inclusive">Tax inclusive (within price)</option>
                </select>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <label className="text-xs text-muted-foreground">Quote discount:</label>
                <div className="relative">
                  <input
                    {...register('quoteDiscountPercent', { valueAsNumber: true })}
                    type="number" min="0" max="100" step="0.1"
                    className="w-20 px-3 py-1.5 pr-6 rounded-lg bg-card border border-border text-foreground text-xs focus:outline-none"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="glass-card p-6 space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Terms & Conditions</label>
            <textarea
              {...register('termsText')}
              placeholder="Payment terms, delivery conditions, warranty..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
            />
          </div>
        </div>

        {/* Right Sidebar — Summary */}
        <div className="space-y-4">
          <div className="glass-card p-5 space-y-3 sticky top-20">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calculator size={15} />
              Quote Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{formatCurrency(calc.subtotal, watchedCurrency)}</span>
              </div>
              {calc.quoteDiscountAmount > 0 && (
                <div className="flex justify-between text-red-400">
                  <span>Discount ({watchedDiscount}%)</span>
                  <span>-{formatCurrency(calc.quoteDiscountAmount, watchedCurrency)}</span>
                </div>
              )}
              {calc.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="text-foreground">{formatCurrency(calc.taxAmount, watchedCurrency)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
                <span className="text-foreground">Total</span>
                <span style={{ color }}>{formatCurrency(calc.total, watchedCurrency)}</span>
              </div>
            </div>

            {/* Margin Indicator */}
            <div className="pt-3 border-t border-border">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-muted-foreground">Gross Margin</span>
                <span className={`text-xs font-semibold ${calc.grossMargin >= 40 ? 'text-emerald-400' : calc.grossMargin >= 20 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {calc.grossMargin.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${calc.grossMargin >= 40 ? 'bg-emerald-400' : calc.grossMargin >= 20 ? 'bg-yellow-400' : 'bg-red-400'}`}
                  style={{ width: `${Math.min(calc.grossMargin, 100)}%` }}
                />
              </div>
            </div>

            {/* Item count */}
            <p className="text-xs text-muted-foreground">{fields.length} line item{fields.length !== 1 ? 's' : ''}</p>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                onClick={handleSubmit(d => onSubmit(d, 'send'))}
                disabled={sending}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Send to Client
              </button>
              <button
                onClick={handleSubmit(d => onSubmit(d, 'save'))}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-muted border border-border text-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save as Draft
              </button>
            </div>
          </div>

          {/* Template picker */}
          {templates.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Templates</h3>
              <div className="space-y-2">
                {templates.slice(0, 5).map(template => (
                  <button
                    key={template.id}
                    type="button"
                    className="w-full text-left p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  >
                    <p className="text-xs font-medium text-foreground">{template.name}</p>
                    {template.description && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{template.description}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
