/**
 * CALCULATION ENGINE
 *
 * Supports both fixed cost fields (fabric, stitching, etc.)
 * and user-defined custom cost fields (additive or multiplier).
 *
 * Formula:
 *  fabric_cost      = fabric_avg × fabric_rate
 *  fixed_base       = fabric_cost + stitching + matching + label + extra
 *  custom_additive  = sum of all custom fields where is_multiplier=false
 *  base_cost        = fixed_base + custom_additive
 *  running_price    = base_cost
 *  (for each custom multiplier field) running_price = running_price × field.value
 *  selling_price    = running_price × profit_multiplier
 *  price_per_piece  = round_off ? Math.round(selling_price) : selling_price
 *  total_per_size   = price_per_piece × quantity
 */

export interface CustomFieldInput {
  id: string
  name: string
  type?: string
  isMultiplier: boolean
  value: number // the actual value to use (from template or user override)
  textValue?: string | null
}

export interface LineItemInput {
  fabricAvg: number
  fabricRate: number
  stitchingCost: number
  matchingCost: number
  labelCost: number
  extraCost: number
  profitMultiplier: number
  roundOff: boolean
  quantity: number
  customFields?: CustomFieldInput[]
}

export interface LineItemCalculation {
  fabricCost: number
  fixedBase: number
  customAdditiveTotal: number
  baseCost: number
  priceAfterMultipliers: number
  sellingPrice: number
  pricePerPiece: number
  totalPrice: number
  // Breakdown for display
  customFieldBreakdown: Array<{
    id: string
    name: string
    type?: string
    isMultiplier: boolean
    value: number
    textValue?: string | null
    applied: number // actual amount added/multiplied
  }>
}

export function calculateLineItem(input: LineItemInput): LineItemCalculation {
  const {
    fabricAvg,
    fabricRate,
    stitchingCost,
    matchingCost,
    labelCost,
    extraCost,
    profitMultiplier,
    roundOff,
    quantity,
    customFields = [],
  } = input

  // Step 1: Fabric cost
  const fabricCost = toNum(fabricAvg) * toNum(fabricRate)

  // Step 2: Fixed base
  const fixedBase =
    fabricCost +
    toNum(stitchingCost) +
    toNum(matchingCost) +
    toNum(labelCost) +
    toNum(extraCost)

  // Step 3: Custom additive fields (flat ₹ amounts)
  const additiveFields = customFields.filter((f) => !f.isMultiplier && f.type !== 'info')
  const customAdditiveTotal = additiveFields.reduce((sum, f) => sum + toNum(f.value), 0)

  // Step 4: Base cost = fixed + all additives
  const baseCost = fixedBase + customAdditiveTotal

  // Step 5: Apply custom multiplier fields sequentially
  const multiplierFields = customFields.filter((f) => f.isMultiplier && f.type !== 'info')
  let runningPrice = baseCost
  const customFieldBreakdown: LineItemCalculation['customFieldBreakdown'] = []

  // Add info fields first so they show up
  const infoFields = customFields.filter((f) => f.type === 'info')
  infoFields.forEach((f) => {
    customFieldBreakdown.push({ ...f, applied: 0 })
  })

  // Track additive fields in breakdown
  additiveFields.forEach((f) => {
    customFieldBreakdown.push({ ...f, applied: toNum(f.value) })
  })

  // Apply multipliers and track their impact
  multiplierFields.forEach((f) => {
    const before = runningPrice
    runningPrice = runningPrice * toNum(f.value)
    customFieldBreakdown.push({ ...f, applied: runningPrice - before })
  })

  const priceAfterMultipliers = runningPrice

  // Step 6: Apply profit multiplier
  const sellingPrice = priceAfterMultipliers * toNum(profitMultiplier)

  // Step 7: Round off
  const pricePerPiece = roundOff ? Math.round(sellingPrice) : round2(sellingPrice)

  // Step 8: Total for this size
  const totalPrice = pricePerPiece * toNum(quantity)

  return {
    fabricCost: round2(fabricCost),
    fixedBase: round2(fixedBase),
    customAdditiveTotal: round2(customAdditiveTotal),
    baseCost: round2(baseCost),
    priceAfterMultipliers: round2(priceAfterMultipliers),
    sellingPrice: round2(sellingPrice),
    pricePerPiece: round2(pricePerPiece),
    totalPrice: round2(totalPrice),
    customFieldBreakdown,
  }
}

export interface QuotationTotals {
  subtotal: number
  gstAmount: number
  total: number
}

export function calculateQuotationTotals(
  lineItemTotals: number[],
  gstPercentage: number
): QuotationTotals {
  const subtotal = round2(lineItemTotals.reduce((sum, t) => sum + t, 0))
  const gstAmount = round2(subtotal * (toNum(gstPercentage) / 100))
  const total = round2(subtotal + gstAmount)

  return { subtotal, gstAmount, total }
}

// Helpers
function toNum(val: unknown): number {
  if (val === undefined || val === null || val === '') return 0
  const n = typeof val === 'string' ? parseFloat(val) : Number(val)
  return isNaN(n) ? 0 : n
}

function round2(val: number): number {
  return Math.round(val * 100) / 100
}
