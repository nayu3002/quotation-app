/**
 * QuoteFlow V2 — Calculation Engine
 * Handles all pricing, tax, discount, and margin calculations
 */

export interface LineItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  costPrice?: number
  discountPercent?: number
  discountFixed?: number
  taxRate?: number
  taxName?: string
  isOptional?: boolean
  isSelected?: boolean
  isAlternative?: boolean
  alternativeGroupId?: string
  formulaExpression?: string
  sectionLabel?: string
}

export interface QuoteCalculationInput {
  lineItems: LineItem[]
  quoteDiscountPercent?: number
  quoteDiscountFixed?: number
  taxMode?: 'exclusive' | 'inclusive' // exclusive = tax added on top, inclusive = tax within price
  roundingMode?: 'none' | 'nearest' | 'up' | 'down'
  roundingDecimalPlaces?: number
  currency?: string
  exchangeRate?: number
  variables?: Record<string, number> // for formula expressions
}

export interface LineItemResult {
  id: string
  name: string
  quantity: number
  unitPrice: number
  costPrice: number
  discountAmount: number
  discountedPrice: number
  taxAmount: number
  lineTotal: number
  margin: number          // gross margin %
  marginAmount: number
  isIncluded: boolean     // false for unselected optional items
}

export interface SectionResult {
  label: string
  subtotal: number
  items: LineItemResult[]
}

export interface QuoteCalculationResult {
  lineItems: LineItemResult[]
  sections: SectionResult[]
  subtotal: number              // before quote-level discount + tax
  quoteDiscountAmount: number
  taxableAmount: number
  taxAmount: number
  total: number
  totalCost: number
  grossMargin: number           // %
  grossMarginAmount: number
  currency: string
}

// ─── Formula Evaluator ───────────────────────────────────────────────────────
// Safe subset of math expressions: +, -, *, /, parentheses, named variables
export function evaluateFormula(
  expression: string,
  variables: Record<string, number>
): number {
  if (!expression) return 0

  try {
    // Replace variable names with their values
    let expr = expression
    for (const [key, value] of Object.entries(variables)) {
      expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), String(value))
    }

    // Only allow safe math chars
    if (!/^[0-9+\-*/().\s]+$/.test(expr)) {
      throw new Error('Invalid formula characters')
    }

    // eslint-disable-next-line no-new-func
    return Number(new Function(`"use strict"; return (${expr})`)())
  } catch {
    return 0
  }
}

// ─── Line Item Calculator ─────────────────────────────────────────────────────
function calculateLineItem(
  item: LineItem,
  taxMode: 'exclusive' | 'inclusive',
  variables: Record<string, number>
): LineItemResult {
  const isIncluded = item.isOptional ? (item.isSelected ?? true) : true

  let unitPrice = item.unitPrice

  // Apply formula if present
  if (item.formulaExpression) {
    unitPrice = evaluateFormula(item.formulaExpression, {
      ...variables,
      base_price: item.unitPrice,
      quantity: item.quantity,
      cost_price: item.costPrice ?? 0,
    })
  }

  const quantity = item.quantity || 1
  const grossAmount = unitPrice * quantity
  const costPrice = (item.costPrice ?? 0) * quantity

  // Discount: fixed takes precedence over percent
  let discountAmount = 0
  if (item.discountFixed && item.discountFixed > 0) {
    discountAmount = Math.min(item.discountFixed, grossAmount)
  } else if (item.discountPercent && item.discountPercent > 0) {
    discountAmount = (grossAmount * item.discountPercent) / 100
  }

  const discountedPrice = grossAmount - discountAmount
  const taxRate = item.taxRate ?? 0

  let taxAmount = 0
  let lineTotal = 0

  if (taxMode === 'exclusive') {
    taxAmount = isIncluded ? (discountedPrice * taxRate) / 100 : 0
    lineTotal = isIncluded ? discountedPrice + taxAmount : 0
  } else {
    // Inclusive: tax is embedded in the price
    taxAmount = isIncluded ? discountedPrice - discountedPrice / (1 + taxRate / 100) : 0
    lineTotal = isIncluded ? discountedPrice : 0
  }

  const marginAmount = isIncluded ? discountedPrice - costPrice : 0
  const margin = discountedPrice > 0 ? (marginAmount / discountedPrice) * 100 : 0

  return {
    id: item.id,
    name: item.name,
    quantity,
    unitPrice,
    costPrice,
    discountAmount,
    discountedPrice,
    taxAmount,
    lineTotal,
    margin,
    marginAmount,
    isIncluded,
  }
}

// ─── Rounding ──────────────────────────────────────────────────────────────────
function applyRounding(
  value: number,
  mode: 'none' | 'nearest' | 'up' | 'down',
  decimals: number
): number {
  if (mode === 'none') return value
  const factor = Math.pow(10, decimals)
  if (mode === 'nearest') return Math.round(value * factor) / factor
  if (mode === 'up') return Math.ceil(value * factor) / factor
  if (mode === 'down') return Math.floor(value * factor) / factor
  return value
}

// ─── Main Calculator ──────────────────────────────────────────────────────────
export function calculateQuote(input: QuoteCalculationInput): QuoteCalculationResult {
  const {
    lineItems,
    quoteDiscountPercent = 0,
    quoteDiscountFixed = 0,
    taxMode = 'exclusive',
    roundingMode = 'nearest',
    roundingDecimalPlaces = 2,
    currency = 'USD',
    exchangeRate = 1,
    variables = {},
  } = input

  // Resolve alternatives — only the first selected alternative per group shows
  const resolvedItems = lineItems.filter(item => {
    if (!item.isAlternative || !item.alternativeGroupId) return true
    const groupItems = lineItems.filter(
      i => i.isAlternative && i.alternativeGroupId === item.alternativeGroupId
    )
    const selectedInGroup = groupItems.find(i => i.isSelected)
    if (selectedInGroup) return item.id === selectedInGroup.id
    return item.id === groupItems[0]?.id // default to first
  })

  // Calculate each line item
  const calculatedItems = resolvedItems.map(item =>
    calculateLineItem(item, taxMode, variables)
  )

  // Group into sections
  const sectionMap = new Map<string, LineItemResult[]>()
  for (const item of calculatedItems) {
    const label = (lineItems.find(li => li.id === item.id))?.sectionLabel ?? 'Items'
    if (!sectionMap.has(label)) sectionMap.set(label, [])
    sectionMap.get(label)!.push(item)
  }

  const sections: SectionResult[] = Array.from(sectionMap.entries()).map(([label, items]) => ({
    label,
    subtotal: items.filter(i => i.isIncluded).reduce((s, i) => s + i.discountedPrice, 0),
    items,
  }))

  // Subtotal (before quote-level discount, after line-item discounts)
  const subtotalBeforeDiscount = calculatedItems
    .filter(i => i.isIncluded)
    .reduce((s, i) => s + i.discountedPrice, 0)

  // Quote-level discount
  let quoteDiscountAmount = 0
  if (quoteDiscountFixed > 0) {
    quoteDiscountAmount = Math.min(quoteDiscountFixed, subtotalBeforeDiscount)
  } else if (quoteDiscountPercent > 0) {
    quoteDiscountAmount = (subtotalBeforeDiscount * quoteDiscountPercent) / 100
  }

  const taxableAmount = subtotalBeforeDiscount - quoteDiscountAmount

  // Tax on remaining amount (if exclusive mode and no per-item tax)
  const perItemTaxTotal = calculatedItems
    .filter(i => i.isIncluded)
    .reduce((s, i) => s + i.taxAmount, 0)

  const totalCost = calculatedItems
    .filter(i => i.isIncluded)
    .reduce((s, i) => s + i.costPrice, 0)

  const grossMarginAmount = taxableAmount - totalCost
  const grossMargin = taxableAmount > 0 ? (grossMarginAmount / taxableAmount) * 100 : 0

  const rawTotal = taxableAmount + perItemTaxTotal
  const total = applyRounding(rawTotal * exchangeRate, roundingMode, roundingDecimalPlaces)
  const subtotal = applyRounding(subtotalBeforeDiscount * exchangeRate, roundingMode, roundingDecimalPlaces)

  return {
    lineItems: calculatedItems,
    sections,
    subtotal,
    quoteDiscountAmount: applyRounding(quoteDiscountAmount * exchangeRate, roundingMode, roundingDecimalPlaces),
    taxableAmount: applyRounding(taxableAmount * exchangeRate, roundingMode, roundingDecimalPlaces),
    taxAmount: applyRounding(perItemTaxTotal * exchangeRate, roundingMode, roundingDecimalPlaces),
    total,
    totalCost: applyRounding(totalCost * exchangeRate, roundingMode, roundingDecimalPlaces),
    grossMargin,
    grossMarginAmount: applyRounding(grossMarginAmount * exchangeRate, roundingMode, roundingDecimalPlaces),
    currency,
  }
}

// ─── Currency Formatting ──────────────────────────────────────────────────────
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// ─── Margin Color Helper ──────────────────────────────────────────────────────
export function getMarginColor(margin: number): string {
  if (margin >= 40) return 'text-emerald-400'
  if (margin >= 20) return 'text-yellow-400'
  if (margin >= 0) return 'text-orange-400'
  return 'text-red-400'
}
