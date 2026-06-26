'use client'

import { useState, useRef, useCallback } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CheckCircle, Download, MessageSquare, Send, FileText, Clock,
  PenTool, Type, Upload, X, Star, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

interface PortalQuote {
  id: string
  title: string
  quoteNumber: string | null
  status: string
  currency: string
  total: number
  subtotal: number
  taxAmount: number
  discountPercent: number
  discountFixed: number
  introText: string | null
  termsText: string | null
  expiresAt: string | null
  sentAt: string | null
  createdAt: string
  pdfUrl: string | null
  signedPdfUrl: string | null
  organization: {
    name: string
    logoUrl: string | null
    primaryColor: string | null
    accentColor: string | null
    fontFamily: string | null
    defaultCurrency: string
    address: string | null
    email: string | null
    phone: string | null
  }
  contact: { firstName: string; lastName: string | null; email: string } | null
  company: { name: string } | null
  lineItems: {
    id: string
    name: string
    description: string | null
    quantity: number
    unitPrice: number
    total: number
    taxRate: number
    discountPercent: number
    discountFixed: number
    isOptional: boolean
    isSelected: boolean
    sectionLabel: string | null
  }[]
  sections: { id: string; type: string; title: string | null; contentJson: any }[]
  comments: { id: string; authorName: string; content: string; createdAt: string }[]
  signatures: { id: string; signerName: string; signedAt: string; signatureType: string }[]
}

interface QuotePortalProps {
  quote: PortalQuote
  shareToken: string
}

export function QuotePortal({ quote, shareToken }: QuotePortalProps) {
  const [commentText, setCommentText] = useState('')
  const [commentName, setCommentName] = useState('')
  const [commentEmail, setCommentEmail] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type' | 'upload'>('draw')
  const [showSignModal, setShowSignModal] = useState(false)
  const [typedSignature, setTypedSignature] = useState('')
  const [signerName, setSignerName] = useState(quote.contact?.firstName ?? '')
  const [signerEmail, setSignerEmail] = useState(quote.contact?.email ?? '')
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(quote.status === 'signed' || quote.signatures.length > 0)
  const [selectedOptionals, setSelectedOptionals] = useState<Record<string, boolean>>(
    Object.fromEntries(quote.lineItems.filter(li => li.isOptional).map(li => [li.id, li.isSelected]))
  )
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const color = quote.organization.primaryColor ?? '#7c5cfc'
  const isExpired = quote.expiresAt && new Date(quote.expiresAt) < new Date()
  const alreadySigned = signed || quote.status === 'signed'

  // Canvas drawing
  const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
    setIsDrawing(true)
  }, [])

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
  }, [isDrawing])

  const stopDraw = useCallback(() => setIsDrawing(false), [])

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const handleSign = async () => {
    setSigning(true)
    try {
      let signatureData = ''
      if (signatureMode === 'draw') {
        signatureData = canvasRef.current?.toDataURL('image/png') ?? ''
      } else if (signatureMode === 'type') {
        signatureData = typedSignature
      }

      const res = await fetch(`/api/portal/${shareToken}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signerName,
          signerEmail,
          signatureType: signatureMode,
          signatureData,
        }),
      })

      if (res.ok) {
        setSigned(true)
        setShowSignModal(false)
      }
    } finally {
      setSigning(false)
    }
  }

  const submitComment = async () => {
    if (!commentText.trim() || !commentName.trim()) return
    setSubmittingComment(true)
    try {
      await fetch(`/api/portal/${shareToken}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: commentText,
          authorName: commentName,
          authorEmail: commentEmail,
        }),
      })
      setCommentText('')
    } finally {
      setSubmittingComment(false)
    }
  }

  // Compute total with optional selections
  const includedItems = quote.lineItems.filter(li =>
    !li.isOptional || selectedOptionals[li.id] !== false
  )
  const computedTotal = includedItems.reduce((s, li) => s + li.total, 0)

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f', fontFamily: quote.organization.fontFamily ?? 'Inter, sans-serif' }}>
      {/* Expired Banner */}
      {isExpired && (
        <div className="sticky top-0 z-50 w-full bg-red-500/90 backdrop-blur text-white text-center py-3 text-sm font-medium">
          ⚠️ This quote expired on {formatDate(quote.expiresAt!)}. Please contact {quote.organization.name} for an updated quote.
        </div>
      )}

      {/* Signed Banner */}
      {alreadySigned && (
        <div className="sticky top-0 z-50 w-full text-white text-center py-3 text-sm font-medium flex items-center justify-center gap-2"
          style={{ background: `${color}dd` }}>
          <CheckCircle size={16} />
          This quote has been signed. {quote.signedPdfUrl && (
            <a href={quote.signedPdfUrl} target="_blank" className="underline ml-1">Download signed copy →</a>
          )}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {quote.organization.logoUrl ? (
              <img src={quote.organization.logoUrl} alt={quote.organization.name} className="h-9 w-auto" />
            ) : (
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ background: color }}>
                {quote.organization.name.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-white font-semibold">{quote.organization.name}</p>
              {quote.organization.email && (
                <p className="text-white/50 text-xs">{quote.organization.email}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {quote.pdfUrl && (
              <a href={quote.pdfUrl} target="_blank"
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/20 text-white/70 hover:text-white text-sm transition-colors">
                <Download size={14} />
                PDF
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        {/* Cover Section */}
        <div className="rounded-2xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${color}20, ${color}08)`, border: `1px solid ${color}30` }}>
          <div className="p-10">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-sm font-medium mb-2" style={{ color }}>
                  {quote.quoteNumber ?? 'Quote'}
                </p>
                <h1 className="text-3xl font-bold text-white mb-4">{quote.title}</h1>
                <div className="flex items-center gap-4 text-sm text-white/60">
                  {quote.sentAt && (
                    <span className="flex items-center gap-1.5">
                      <Clock size={13} />
                      Sent {formatDate(quote.sentAt)}
                    </span>
                  )}
                  {quote.expiresAt && !isExpired && (
                    <span className="flex items-center gap-1.5">
                      <Clock size={13} />
                      Valid until {formatDate(quote.expiresAt)}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm text-white/50">Total Amount</p>
                <p className="text-4xl font-bold text-white mt-1">
                  {formatCurrency(computedTotal || quote.total, quote.currency)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Intro Text */}
        {quote.introText && (
          <div className="glass-card p-8">
            <p className="text-white/80 leading-relaxed">{quote.introText}</p>
          </div>
        )}

        {/* Line Items */}
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-white font-semibold text-lg">Line Items</h2>
            {quote.lineItems.some(li => li.isOptional) && (
              <p className="text-white/50 text-sm mt-1">
                ✓ You can toggle optional items to customize your quote total.
              </p>
            )}
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['Item', 'Qty', 'Unit Price', 'Total'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-white/40 uppercase tracking-wider px-6 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {quote.lineItems.map(item => (
                <tr key={item.id}
                  className={`transition-opacity ${item.isOptional && selectedOptionals[item.id] === false ? 'opacity-40' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {item.isOptional && (
                        <input
                          type="checkbox"
                          checked={selectedOptionals[item.id] !== false}
                          onChange={e => setSelectedOptionals(prev => ({ ...prev, [item.id]: e.target.checked }))}
                          className="w-4 h-4 rounded accent-primary cursor-pointer"
                        />
                      )}
                      <div>
                        <p className="text-white text-sm font-medium">{item.name}</p>
                        {item.description && (
                          <p className="text-white/50 text-xs mt-0.5">{item.description}</p>
                        )}
                        {item.isOptional && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary mt-1 inline-block">
                            Optional
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-white/70 text-sm">{item.quantity}</td>
                  <td className="px-6 py-4 text-white/70 text-sm">{formatCurrency(item.unitPrice, quote.currency)}</td>
                  <td className="px-6 py-4 text-white font-semibold text-sm">{formatCurrency(item.total, quote.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Totals */}
          <div className="border-t border-white/10 p-6">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Subtotal</span>
                  <span className="text-white">{formatCurrency(quote.subtotal, quote.currency)}</span>
                </div>
                {quote.taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Tax</span>
                    <span className="text-white">{formatCurrency(quote.taxAmount, quote.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-2 border-t border-white/10">
                  <span className="text-white">Total</span>
                  <span style={{ color }}>{formatCurrency(computedTotal || quote.total, quote.currency)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Terms */}
        {quote.termsText && (
          <div className="glass-card p-8">
            <h2 className="text-white font-semibold mb-4">Terms & Conditions</h2>
            <p className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap">{quote.termsText}</p>
          </div>
        )}

        {/* Signature Block */}
        {!alreadySigned && !isExpired && (
          <div className="rounded-2xl p-8 text-center" style={{ border: `2px dashed ${color}50`, background: `${color}08` }}>
            <PenTool size={32} className="mx-auto mb-4" style={{ color }} />
            <h2 className="text-white text-xl font-semibold mb-2">Ready to accept?</h2>
            <p className="text-white/60 text-sm mb-6">
              Sign electronically to accept this quote. Your signature is legally binding.
            </p>
            <button
              onClick={() => setShowSignModal(true)}
              className="px-8 py-3.5 rounded-xl font-semibold text-white text-sm hover:-translate-y-0.5 transition-all"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
              Accept & Sign Quote →
            </button>
          </div>
        )}

        {/* Signed Confirmation */}
        {alreadySigned && (
          <div className="glass-card p-8 text-center">
            <CheckCircle size={48} className="mx-auto mb-4 text-emerald-400" />
            <h2 className="text-white text-xl font-semibold mb-2">Quote Accepted!</h2>
            <p className="text-white/60 text-sm">
              {quote.signatures[0]
                ? `Signed by ${quote.signatures[0].signerName} on ${formatDate(quote.signatures[0].signedAt)}`
                : 'This quote has been signed.'}
            </p>
            {quote.signedPdfUrl && (
              <a href={quote.signedPdfUrl} target="_blank"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: color + '20', color }}>
                <Download size={14} />
                Download Signed PDF
              </a>
            )}
          </div>
        )}

        {/* Comments */}
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-white/10 flex items-center gap-2">
            <MessageSquare size={18} className="text-white/60" />
            <h2 className="text-white font-semibold">Questions & Comments</h2>
            <span className="ml-auto text-xs text-white/40">{quote.comments.length} comments</span>
          </div>
          <div className="p-6 space-y-4">
            {quote.comments.map(comment => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: color + '30', color }}>
                  {comment.authorName.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white text-sm font-medium">{comment.authorName}</span>
                    <span className="text-white/30 text-xs">{formatDate(comment.createdAt)}</span>
                  </div>
                  <p className="text-white/70 text-sm">{comment.content}</p>
                </div>
              </div>
            ))}

            {/* New Comment Form */}
            <div className="border-t border-white/10 pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={commentName}
                  onChange={e => setCommentName(e.target.value)}
                  placeholder="Your name *"
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 text-sm"
                  style={{ '--tw-ring-color': color } as any}
                />
                <input
                  value={commentEmail}
                  onChange={e => setCommentEmail(e.target.value)}
                  placeholder="Your email (optional)"
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 text-sm"
                />
              </div>
              <div className="flex gap-3">
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Ask a question or leave a comment..."
                  rows={2}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 text-sm resize-none"
                />
                <button
                  onClick={submitComment}
                  disabled={submittingComment || !commentText.trim() || !commentName.trim()}
                  className="px-4 py-2.5 rounded-xl font-medium text-white text-sm disabled:opacity-40 flex-shrink-0"
                  style={{ background: color }}>
                  {submittingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Signature Modal */}
      {showSignModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#1a1f2e] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-white font-semibold">Sign Quote</h3>
              <button onClick={() => setShowSignModal(false)} className="text-white/50 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Full Name *</label>
                  <input value={signerName} onChange={e => setSignerName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': color } as any} />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Email *</label>
                  <input value={signerEmail} onChange={e => setSignerEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2" />
                </div>
              </div>

              {/* Signature Mode Tabs */}
              <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
                {[{ mode: 'draw' as const, icon: PenTool, label: 'Draw' }, { mode: 'type' as const, icon: Type, label: 'Type' }].map(({ mode, icon: Icon, label }) => (
                  <button key={mode} onClick={() => setSignatureMode(mode)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-colors ${signatureMode === mode ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}>
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>

              {/* Draw Canvas */}
              {signatureMode === 'draw' && (
                <div className="relative">
                  <canvas ref={canvasRef} width={460} height={120}
                    className="w-full rounded-xl border border-white/10 bg-white/5 cursor-crosshair"
                    onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                  />
                  <button onClick={clearCanvas} className="absolute top-2 right-2 text-xs text-white/40 hover:text-white px-2 py-1 rounded-lg bg-white/5">
                    Clear
                  </button>
                  <p className="text-xs text-white/30 mt-2 text-center">Draw your signature in the box above</p>
                </div>
              )}

              {/* Type Signature */}
              {signatureMode === 'type' && (
                <div>
                  <input value={typedSignature} onChange={e => setTypedSignature(e.target.value)}
                    placeholder="Type your name as signature"
                    className="w-full px-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white text-2xl focus:outline-none text-center"
                    style={{ fontFamily: 'cursive' }} />
                </div>
              )}

              <p className="text-xs text-white/30 text-center">
                By signing, you agree to the terms and conditions above. This signature is legally binding under applicable e-signature laws.
              </p>

              <button
                onClick={handleSign}
                disabled={signing || !signerName.trim() || !signerEmail.trim()}
                className="w-full py-3.5 rounded-xl font-semibold text-white text-sm disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
                {signing ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle size={16} /> Accept & Sign</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
