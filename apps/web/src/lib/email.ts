import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = `${process.env.RESEND_FROM_NAME ?? 'QuoteFlow'} <${process.env.RESEND_FROM_EMAIL ?? 'noreply@quoteflow.app'}>`

// ─── Types ────────────────────────────────────────────────────────────────────
interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
  attachments?: { filename: string; content: Buffer; contentType: string }[]
}

async function send(opts: EmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
      replyTo: opts.replyTo,
      attachments: opts.attachments?.map(a => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    })
    if (error) console.error('[Email] Send error:', error)
    return { success: !error, data }
  } catch (err) {
    console.error('[Email] Exception:', err)
    return { success: false, data: null }
  }
}

// ─── Email Templates ──────────────────────────────────────────────────────────

function baseTemplate(content: string, orgName: string, orgColor = '#7c5cfc') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0f1117; font-family: 'Inter', -apple-system, sans-serif; color: #e2e8f0; }
  .container { max-width: 600px; margin: 40px auto; background: #1a1f2e; border-radius: 16px; overflow: hidden; border: 1px solid #2d3748; }
  .header { background: linear-gradient(135deg, ${orgColor}, ${orgColor}99); padding: 32px; text-align: center; }
  .header h1 { color: #fff; font-size: 24px; font-weight: 700; }
  .body { padding: 32px; }
  .body p { margin-bottom: 16px; color: #94a3b8; line-height: 1.6; }
  .body h2 { color: #e2e8f0; font-size: 18px; margin-bottom: 8px; }
  .btn { display: inline-block; padding: 14px 28px; background: ${orgColor}; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 16px 0; }
  .info-box { background: #0f1117; border: 1px solid #2d3748; border-radius: 8px; padding: 20px; margin: 16px 0; }
  .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #2d3748; }
  .info-row:last-child { border-bottom: none; }
  .label { color: #64748b; font-size: 13px; }
  .value { color: #e2e8f0; font-weight: 500; }
  .footer { padding: 24px 32px; text-align: center; color: #475569; font-size: 13px; border-top: 1px solid #2d3748; }
  .amount { font-size: 28px; font-weight: 700; color: ${orgColor}; }
</style>
</head>
<body>
<div class="container">
  <div class="header"><h1>${orgName}</h1></div>
  <div class="body">${content}</div>
  <div class="footer">
    <p>Powered by QuoteFlow · <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color:#64748b">quoteflow.app</a></p>
    <p style="margin-top:8px">You received this email because a quote was shared with you.</p>
  </div>
</div>
</body>
</html>`
}

// Quote sent email
export async function sendQuoteEmail(opts: {
  to: string
  clientName: string
  orgName: string
  orgColor?: string
  quoteTitle: string
  quoteNumber: string
  total: string
  currency: string
  expiresAt?: string
  portalUrl: string
  message?: string
}) {
  const content = `
    <h2>Hello ${opts.clientName},</h2>
    <p>${opts.message ?? `${opts.orgName} has sent you a quote for your review.`}</p>
    <div class="info-box">
      <div class="info-row"><span class="label">Quote Number</span><span class="value">${opts.quoteNumber}</span></div>
      <div class="info-row"><span class="label">Quote Title</span><span class="value">${opts.quoteTitle}</span></div>
      <div class="info-row"><span class="label">Total Amount</span><span class="value amount">${opts.total}</span></div>
      ${opts.expiresAt ? `<div class="info-row"><span class="label">Valid Until</span><span class="value">${opts.expiresAt}</span></div>` : ''}
    </div>
    <p>Click the button below to review your quote, ask questions, and sign it digitally.</p>
    <center><a href="${opts.portalUrl}" class="btn">View Your Quote →</a></center>
    <p style="margin-top:16px;font-size:13px;color:#475569">Or copy this link: <a href="${opts.portalUrl}" style="color:#7c5cfc">${opts.portalUrl}</a></p>
  `
  return send({
    to: opts.to,
    subject: `${opts.orgName} sent you a quote: ${opts.quoteNumber}`,
    html: baseTemplate(content, opts.orgName, opts.orgColor),
  })
}

// Quote signed confirmation
export async function sendQuoteSignedEmail(opts: {
  to: string | string[]
  signerName: string
  orgName: string
  orgColor?: string
  quoteTitle: string
  quoteNumber: string
  signedAt: string
  downloadUrl: string
}) {
  const content = `
    <h2>Quote Signed! 🎉</h2>
    <p><strong>${opts.signerName}</strong> has signed the quote.</p>
    <div class="info-box">
      <div class="info-row"><span class="label">Quote</span><span class="value">${opts.quoteNumber} — ${opts.quoteTitle}</span></div>
      <div class="info-row"><span class="label">Signed At</span><span class="value">${opts.signedAt}</span></div>
    </div>
    <center><a href="${opts.downloadUrl}" class="btn">Download Signed PDF →</a></center>
  `
  return send({
    to: opts.to,
    subject: `✅ Quote Signed: ${opts.quoteNumber} — ${opts.quoteTitle}`,
    html: baseTemplate(content, opts.orgName, opts.orgColor),
  })
}

// Invoice email
export async function sendInvoiceEmail(opts: {
  to: string
  clientName: string
  orgName: string
  orgColor?: string
  invoiceNumber: string
  total: string
  dueDate: string
  paymentUrl: string
}) {
  const content = `
    <h2>Invoice from ${opts.orgName}</h2>
    <p>Hello ${opts.clientName}, please find your invoice details below.</p>
    <div class="info-box">
      <div class="info-row"><span class="label">Invoice #</span><span class="value">${opts.invoiceNumber}</span></div>
      <div class="info-row"><span class="label">Amount Due</span><span class="value amount">${opts.total}</span></div>
      <div class="info-row"><span class="label">Due Date</span><span class="value">${opts.dueDate}</span></div>
    </div>
    <center><a href="${opts.paymentUrl}" class="btn">Pay Now →</a></center>
  `
  return send({
    to: opts.to,
    subject: `Invoice ${opts.invoiceNumber} — ${opts.total} due ${opts.dueDate}`,
    html: baseTemplate(content, opts.orgName, opts.orgColor),
  })
}

// Quote expiry reminder
export async function sendQuoteExpiryReminder(opts: {
  to: string
  clientName: string
  orgName: string
  orgColor?: string
  quoteTitle: string
  quoteNumber: string
  expiresAt: string
  portalUrl: string
}) {
  const content = `
    <h2>Your quote expires soon ⏰</h2>
    <p>Hello ${opts.clientName}, your quote from <strong>${opts.orgName}</strong> is expiring soon.</p>
    <div class="info-box">
      <div class="info-row"><span class="label">Quote</span><span class="value">${opts.quoteNumber}</span></div>
      <div class="info-row"><span class="label">Expires</span><span class="value">${opts.expiresAt}</span></div>
    </div>
    <center><a href="${opts.portalUrl}" class="btn">Review & Sign Now →</a></center>
  `
  return send({
    to: opts.to,
    subject: `⚠️ Quote ${opts.quoteNumber} expires soon — ${opts.expiresAt}`,
    html: baseTemplate(content, opts.orgName, opts.orgColor),
  })
}

// Team invite email
export async function sendTeamInviteEmail(opts: {
  to: string
  inviterName: string
  orgName: string
  orgColor?: string
  role: string
  inviteUrl: string
}) {
  const content = `
    <h2>You're invited to join ${opts.orgName}</h2>
    <p><strong>${opts.inviterName}</strong> has invited you to join their QuoteFlow workspace as a <strong>${opts.role}</strong>.</p>
    <center><a href="${opts.inviteUrl}" class="btn">Accept Invitation →</a></center>
    <p style="font-size:13px;color:#475569;margin-top:16px">This invitation expires in 7 days.</p>
  `
  return send({
    to: opts.to,
    subject: `${opts.inviterName} invited you to ${opts.orgName} on QuoteFlow`,
    html: baseTemplate(content, opts.orgName, opts.orgColor),
  })
}

// Approval request email
export async function sendApprovalRequestEmail(opts: {
  to: string
  approverName: string
  requesterName: string
  orgName: string
  orgColor?: string
  quoteTitle: string
  quoteNumber: string
  reason: string
  approvalUrl: string
}) {
  const content = `
    <h2>Approval Required</h2>
    <p>Hello ${opts.approverName}, <strong>${opts.requesterName}</strong> is requesting your approval for a quote.</p>
    <div class="info-box">
      <div class="info-row"><span class="label">Quote</span><span class="value">${opts.quoteNumber} — ${opts.quoteTitle}</span></div>
      <div class="info-row"><span class="label">Reason</span><span class="value">${opts.reason}</span></div>
    </div>
    <center><a href="${opts.approvalUrl}" class="btn">Review & Approve →</a></center>
  `
  return send({
    to: opts.to,
    subject: `Approval needed: ${opts.quoteNumber} — ${opts.quoteTitle}`,
    html: baseTemplate(content, opts.orgName, opts.orgColor),
  })
}
