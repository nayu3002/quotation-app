'use client'

import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { X, ChevronDown, TableProperties, AlertCircle, Check, ArrowRight } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

export interface SizeRow {
  sizeLabel: string
  sortOrder: number
  fabricAvg: string
  fabricRate: string
  stitchingCost: string
  matchingCost: string
  labelCost: string
  extraCost: string
  profitMultiplier: string
  roundOff: boolean
  customValues?: Record<string, string>
}

interface ImportMapperProps {
  onImport: (rows: SizeRow[], sheetName: string) => void
  onClose: () => void
  file: File
}

// ── Target fields the user maps TO ──────────────────────────────────────────

const TARGET_FIELDS: { key: keyof SizeRow; label: string; required?: boolean }[] = [
  { key: 'sizeLabel', label: 'Size Label', required: true },
  { key: 'fabricAvg', label: 'Fabric Avg (m)' },
  { key: 'fabricRate', label: 'Fabric Rate (₹/m)' },
  { key: 'stitchingCost', label: 'Stitching Cost (₹)' },
  { key: 'matchingCost', label: 'Matching Cost (₹)' },
  { key: 'labelCost', label: 'Label Cost (₹)' },
  { key: 'extraCost', label: 'Extra Cost (₹)' },
  { key: 'profitMultiplier', label: 'Profit Multiplier ×' },
  { key: 'roundOff', label: 'Round Off (TRUE/FALSE)' },
]

// Smart auto-mapper: tries to guess based on column name
function guessMapping(headers: string[]): Record<string, string> {
  const guess: Record<string, string> = {}
  const patterns: Array<{ key: keyof SizeRow; words: string[] }> = [
    { key: 'sizeLabel', words: ['size', 'label', 'name'] },
    { key: 'fabricAvg', words: ['fabricavg', 'fabavg', 'avg', 'meter', 'consumption'] },
    { key: 'fabricRate', words: ['fabricrate', 'rate', 'fabric_rate', 'price'] },
    { key: 'stitchingCost', words: ['stitching', 'stitch', 'labour', 'labor'] },
    { key: 'matchingCost', words: ['matching', 'match', 'addon', 'lining'] },
    { key: 'labelCost', words: ['label', 'branding', 'brand'] },
    { key: 'extraCost', words: ['extra', 'misc', 'other'] },
    { key: 'profitMultiplier', words: ['profit', 'margin', 'multiplier'] },
    { key: 'roundOff', words: ['round', 'roundoff', 'rounding'] },
  ]

  for (const { key, words } of patterns) {
    const match = headers.find((h) =>
      words.some((w) => h.toLowerCase().replace(/[\s_\-()₹×/]/g, '').includes(w))
    )
    if (match && !Object.values(guess).includes(match)) {
      guess[key] = match
    }
  }
  return guess
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ImportMapper({ onImport, onClose, file }: ImportMapperProps) {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [selectedSheet, setSelectedSheet] = useState<string>('')
  const [headers, setHeaders] = useState<string[]>([])
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({}) // targetKey -> sourceHeader
  const [step, setStep] = useState<'loading' | 'sheet' | 'map' | 'preview'>('loading')
  const [error, setError] = useState('')

  // ── Parse file on mount ──────────────────────────────────────────────────
  const parseFile = useCallback(() => {
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        setWorkbook(wb)
        setSheetNames(wb.SheetNames)

        if (wb.SheetNames.length === 1) {
          // Skip sheet selection, go straight to mapping
          loadSheet(wb, wb.SheetNames[0])
        } else {
          setStep('sheet')
        }
      } catch {
        setError('Could not read the file. Make sure it is a valid CSV, XLSX, or XLS file.')
        setStep('sheet') // show error state
      }
    }
    reader.readAsArrayBuffer(file)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  // Parse on first render
  useState(() => { parseFile() })

  function loadSheet(wb: XLSX.WorkBook, sheetName: string) {
    const sheet = wb.Sheets[sheetName]
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,
    })
    if (json.length === 0) {
      setError(`Sheet "${sheetName}" appears to be empty.`)
      setSelectedSheet(sheetName)
      setStep('sheet')
      return
    }
    const hdrs = Object.keys(json[0])
    const preview = json.slice(0, 5).map((r) =>
      Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v)]))
    )
    const autoMap = guessMapping(hdrs)

    setSelectedSheet(sheetName)
    setHeaders(hdrs)
    setPreviewRows(preview)
    setMapping(autoMap)
    setError('')
    setStep('map')
  }

  function selectSheet(name: string) {
    if (!workbook) return
    loadSheet(workbook, name)
  }

  function applyImport() {
    const rows: SizeRow[] = previewRows.length > 0
      ? getFullRows()
      : []

    onImport(rows, selectedSheet)
  }

  function getFullRows(): SizeRow[] {
    if (!workbook || !selectedSheet) return []
    const sheet = workbook.Sheets[selectedSheet]
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false })

    return json.map((row, i) => {
      const get = (key: keyof SizeRow): string => {
        const col = mapping[key as string]
        if (!col) return ''
        return String(row[col] ?? '')
      }
      return {
        sizeLabel: get('sizeLabel'),
        sortOrder: i,
        fabricAvg: get('fabricAvg'),
        fabricRate: get('fabricRate'),
        stitchingCost: get('stitchingCost'),
        matchingCost: get('matchingCost'),
        labelCost: get('labelCost'),
        extraCost: get('extraCost'),
        profitMultiplier: get('profitMultiplier') || '1.2',
        roundOff: get('roundOff').toLowerCase() !== 'false',
      }
    }).filter((r) => r.sizeLabel.trim())
  }

  const mappedSizeLabel = !!mapping['sizeLabel']
  const fullRows = step === 'preview' ? getFullRows() : []

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-100 rounded-xl flex items-center justify-center">
              <TableProperties className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Import Sizes & Rates</h2>
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{file.name}</p>
            </div>
          </div>
          {/* Steps indicator */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mr-6">
            {['Sheet', 'Map Columns', 'Preview'].map((label, i) => {
              const stepMap = { 0: 'sheet', 1: 'map', 2: 'preview' }
              const currentIdx = ['sheet', 'map', 'preview'].indexOf(step)
              const isActive = i === currentIdx
              const isDone = i < currentIdx
              return (
                <div key={label} className="flex items-center gap-1.5">
                  {i > 0 && <ArrowRight className="w-3 h-3 text-gray-200" />}
                  <span className={`px-2 py-0.5 rounded-full font-medium transition ${isActive ? 'bg-brand-600 text-white' : isDone ? 'bg-green-100 text-green-600' : 'text-gray-400'}`}>
                    {isDone ? <Check className="w-3 h-3 inline" /> : null} {label}
                  </span>
                </div>
              )
            })}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── STEP: Sheet Selection ─────────────────────────────────────── */}
          {(step === 'sheet' || step === 'loading') && (
            <div className="p-6">
              {step === 'loading' && (
                <div className="text-center py-12 text-gray-400 text-sm">Reading file...</div>
              )}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-4">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {error}
                </div>
              )}
              {sheetNames.length > 1 && (
                <>
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    This workbook has <strong>{sheetNames.length} sheets</strong>. Select which sheet to import:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {sheetNames.map((name) => (
                      <button
                        key={name}
                        onClick={() => selectSheet(name)}
                        className="flex flex-col items-start p-4 border-2 border-gray-200 hover:border-brand-400 hover:bg-brand-50 rounded-xl transition text-left group"
                      >
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mb-2 group-hover:bg-brand-100">
                          <TableProperties className="w-4 h-4 text-green-600 group-hover:text-brand-600" />
                        </div>
                        <p className="font-semibold text-gray-900 text-sm truncate w-full">{name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Click to map columns →</p>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── STEP: Column Mapping ──────────────────────────────────────── */}
          {step === 'map' && (
            <div className="p-6">
              {/* Sheet indicator + switch */}
              {sheetNames.length > 1 && (
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-xs text-gray-400">Sheet:</span>
                  {sheetNames.map((name) => (
                    <button
                      key={name}
                      onClick={() => selectSheet(name)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition ${selectedSheet === name ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Mapping controls */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">Map your columns →</p>
                  <div className="space-y-2.5">
                    {TARGET_FIELDS.map(({ key, label, required }) => (
                      <div key={String(key)} className="flex items-center gap-3">
                        <div className="w-44 flex-shrink-0">
                          <span className="text-sm text-gray-600 font-medium">{label}</span>
                          {required && <span className="text-red-500 ml-1">*</span>}
                        </div>
                        <div className="relative flex-1">
                          <select
                            value={mapping[key as string] ?? ''}
                            onChange={(e) => setMapping({ ...mapping, [key as string]: e.target.value || '' })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition appearance-none bg-white pr-8"
                          >
                            <option value="">— Skip this field —</option>
                            {headers.map((h) => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        </div>
                        {mapping[key as string] ? (
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <div className="w-4" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Data preview */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    Preview <span className="font-normal text-gray-400">(first 5 rows)</span>
                  </p>
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="text-xs w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {headers.map((h) => (
                            <th
                              key={h}
                              className={`px-3 py-2 text-left font-semibold whitespace-nowrap truncate max-w-[120px] ${Object.values(mapping).includes(h) ? 'text-brand-600 bg-brand-50' : 'text-gray-400'}`}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {previewRows.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            {headers.map((h) => (
                              <td
                                key={h}
                                className={`px-3 py-2 whitespace-nowrap truncate max-w-[120px] ${Object.values(mapping).includes(h) ? 'text-gray-700 font-medium' : 'text-gray-300'}`}
                              >
                                {row[h] || '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">Highlighted columns = mapped fields</p>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP: Preview result ─────────────────────────────────────── */}
          {step === 'preview' && (
            <div className="p-6">
              {sheetNames.length > 1 && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-gray-400">Sheet:</span>
                  <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">{selectedSheet}</span>
                  <button onClick={() => setStep('map')} className="text-xs text-gray-400 hover:text-brand-600 ml-1 underline">← Back to mapping</button>
                </div>
              )}
              <p className="text-sm font-semibold text-gray-700 mb-3">
                Ready to import <strong className="text-brand-700">{fullRows.length} sizes</strong>
              </p>
              <div className="overflow-hidden border border-gray-200 rounded-xl">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wide font-semibold">
                      <th className="px-3 py-2 text-left">Size</th>
                      <th className="px-3 py-2 text-right">Fabric Avg</th>
                      <th className="px-3 py-2 text-right">Rate ₹</th>
                      <th className="px-3 py-2 text-right">Stitching</th>
                      <th className="px-3 py-2 text-right">Matching</th>
                      <th className="px-3 py-2 text-right">Label</th>
                      <th className="px-3 py-2 text-right">Extra</th>
                      <th className="px-3 py-2 text-right">Profit ×</th>
                      <th className="px-3 py-2 text-center">Round</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {fullRows.map((r, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="px-3 py-2 font-semibold text-brand-700">{r.sizeLabel}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{r.fabricAvg || '—'}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{r.fabricRate || '—'}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{r.stitchingCost || '—'}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{r.matchingCost || '—'}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{r.labelCost || '—'}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{r.extraCost || '—'}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{r.profitMultiplier}</td>
                        <td className="px-3 py-2 text-center">{r.roundOff ? '✓' : '✗'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {fullRows.length === 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 mt-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  No rows with a valid Size Label were found. Make sure "Size Label" is mapped to the correct column.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-xl transition text-sm">Cancel</button>
          <div className="flex gap-3">
            {step === 'map' && (
              <>
                {!mappedSizeLabel && (
                  <span className="text-xs text-red-500 self-center">Map "Size Label" first</span>
                )}
                <button
                  onClick={() => setStep('preview')}
                  disabled={!mappedSizeLabel}
                  className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-semibold rounded-xl transition text-sm"
                >
                  Preview →
                </button>
              </>
            )}
            {step === 'preview' && (
              <>
                <button onClick={() => setStep('map')} className="px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition text-sm">
                  ← Back
                </button>
                <button
                  onClick={applyImport}
                  disabled={fullRows.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-semibold rounded-xl transition text-sm"
                >
                  <Check className="w-4 h-4" />
                  Import {fullRows.length} Size{fullRows.length !== 1 ? 's' : ''}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
