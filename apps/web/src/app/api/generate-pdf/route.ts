import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrgContext, OrgContext } from '@/lib/org-context'
import type { Quotation } from '@prisma/client'

export async function POST(req: NextRequest) {
  try {
    const ctx = await getOrgContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { quotationId } = await req.json()
    if (!quotationId) return NextResponse.json({ error: 'quotationId is required' }, { status: 400 })

    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, organizationId: ctx.organizationId },
      include: {
        customer: true,
        lineItems: {
          include: {
            productType: true,
            productSize: true,
            customValues: { include: { customCostField: true } },
          },
          orderBy: { productSize: { sortOrder: 'asc' } },
        },
      },
    })

    if (!quotation) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })

    const html = generateQuotationHTML(quotation, ctx.org)

    // Return the HTML directly for the frontend to open in a new tab
    return NextResponse.json({ html })
  } catch (error: any) {
    console.error('PDF Generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function generateQuotationHTML(quotation: any, org: any) {
  const brandColor = '#4f46e5'
  const lightBg = '#f9fafb'
  const borderColor = '#e5e7eb'
  
  const fmt = (val: { toString(): string } | number) =>
    `₹${Number(val.toString()).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`

  const rowsHtml = quotation.lineItems.map((item: any) => `
    <tr>
      <td class="text-left font-medium text-gray-900" style="vertical-align: top;">${item.productType.name}</td>
      <td class="text-left text-gray-600" style="vertical-align: top;">
        ${item.productSize.sizeLabel}
        ${(item.customValues || [])
          .filter((cv: any) => cv.customCostField?.type === 'info' && cv.textValue)
          .map((cv: any) => `<div style="font-size: 10px; color: #9ca3af; margin-top: 4px; font-weight: 500;">${cv.customCostField.name}: <span style="color: #6b7280;">${cv.textValue}</span></div>`)
          .join('')}
      </td>
      <td class="text-right text-gray-900 font-medium" style="vertical-align: top;">${item.quantity}</td>
      <td class="text-right text-gray-600" style="vertical-align: top;">${fmt(item.pricePerPiece)}</td>
      <td class="text-right text-gray-900 font-bold" style="vertical-align: top;">${fmt(item.totalPrice)}</td>
    </tr>
  `).join('')

  const logoHtml = org.logoUrl
    ? `<img src="${org.logoUrl}" alt="${org.name} Logo" class="logo-img" />`
    : `<div class="org-name" style="font-size: 24px; color: ${brandColor};">${org.name}</div>`

  const orgAddress = org.address ? `<span>${org.address}</span>` : ''
  const orgPhone = org.phone ? `<span>${org.phone}</span>` : ''
  const orgEmail = org.email ? `<span>${org.email}</span>` : ''
  const orgGst = org.gstNumber ? `<span style="color: #9ca3af; margin-top: 4px; font-size: 10px; text-transform: uppercase;">GSTIN: ${org.gstNumber}</span>` : ''

  const custCompany = quotation.customer.company ? `<div class="font-medium" style="color: #4b5563; margin-bottom: 2px;">${quotation.customer.company}</div>` : ''
  const custPhone = quotation.customer.phone ? `<div>${quotation.customer.phone}</div>` : ''
  const custEmail = quotation.customer.email ? `<div>${quotation.customer.email}</div>` : ''
  const custAddress = quotation.customer.address ? `<div>${quotation.customer.address}</div>` : ''
  const custGstin = quotation.customer.gstin ? `<div style="color: #9ca3af; margin-top: 6px; font-size: 10px; font-weight: 600; text-transform: uppercase;">GSTIN: ${quotation.customer.gstin}</div>` : ''

  const termsHtml = quotation.terms ? `
  <div class="meta-section" style="margin-top: 20px;">
    <div class="meta-title">Terms & Conditions</div>
    <div style="font-size: 11px; color: #4b5563; line-height: 1.6; white-space: pre-wrap; background: ${lightBg}; padding: 16px; border-radius: 8px; border: 1px solid ${borderColor};">${quotation.terms}</div>
  </div>` : ''

  const notesHtml = quotation.notes ? `
  <div class="meta-section" style="margin-top: 20px;">
    <div class="meta-title">Additional Notes</div>
    <div style="font-size: 11px; color: #4b5563; line-height: 1.6; white-space: pre-wrap; background: ${lightBg}; padding: 16px; border-radius: 8px; border: 1px solid ${borderColor};">${quotation.notes}</div>
  </div>` : ''

  const dateStr = new Date(quotation.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  })

  // To prevent html2pdf from adding a blank page at the end, we make sure the content fits within the natural page flow 
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Quotation ${quotation.quotationNumber ?? quotation.id}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * { box-sizing: border-box; }
    body { 
      font-family: 'Inter', sans-serif; 
      margin: 0; 
      padding: 0; 
      background: #ffffff; 
      color: #374151; 
      -webkit-font-smoothing: antialiased;
    }
    
    .page { max-width: 800px; margin: 0 auto; padding: 40px; }
    
    @media print {
      .action-bar { display: none !important; }
      body { background: white; }
      .page { padding: 0; margin: 0; box-shadow: none; }
    }
    
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .logo-img { height: 112px; max-width: 320px; object-fit: contain; }
    .org-info { text-align: right; }
    .org-name { font-size: 18px; font-weight: 700; color: #111827; letter-spacing: -0.01em; }
    .org-details { font-size: 12px; color: #6b7280; margin-top: 6px; display: flex; flex-direction: column; gap: 2px; }

    .accent-line { height: 3px; background-color: ${brandColor}; width: 100%; border-radius: 2px; margin-bottom: 40px; opacity: 0.8; }

    .quotation-meta { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .meta-title { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em; margin-bottom: 12px; }
    
    .client-info { font-size: 12px; color: #4b5563; line-height: 1.5; }
    .client-name { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 4px; }
    
    .doc-details { text-align: right; }
    .doc-row { display: flex; justify-content: flex-end; gap: 24px; margin-bottom: 8px; font-size: 13px; }
    .doc-label { color: #6b7280; }
    .doc-value { color: #111827; font-weight: 600; }

    .table-container { 
      border-radius: 12px; 
      border: 1px solid ${borderColor}; 
      overflow: hidden;
      margin-bottom: 40px;
    }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { 
      background: ${lightBg}; 
      padding: 14px 20px; 
      font-size: 10px; 
      font-weight: 600; 
      text-transform: uppercase; 
      color: #6b7280; 
      letter-spacing: 0.05em; 
      border-bottom: 1px solid ${borderColor};
    }
    td { 
      padding: 16px 20px; 
      border-bottom: 1px solid #f3f4f6;
    }
    tr:last-child td { border-bottom: none; }
    
    .text-left { text-align: left; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }

    .summary-container { display: flex; justify-content: flex-end; margin-bottom: 40px; }
    .summary-card { 
      width: 320px; 
      background: #ffffff; 
      border-radius: 12px; 
      border: 1px solid ${borderColor}; 
      padding: 24px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
    }
    .summary-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 13px; }
    .summary-label { color: #6b7280; }
    .summary-value { color: #111827; font-weight: 500; }
    
    .grand-total { 
      display: flex; 
      justify-content: space-between; 
      align-items: center;
      margin-top: 16px; 
      padding-top: 16px; 
      border-top: 1px solid ${borderColor}; 
    }
    .grand-total-label { color: ${brandColor}; font-weight: 700; font-size: 14px; }
    .grand-total-value { color: ${brandColor}; font-weight: 800; font-size: 20px; }

    .footer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 20px; page-break-inside: avoid; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
</head>
<body style="background: #f3f4f6;">
  <div class="action-bar" style="background: #111827; color: white; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 50; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
    <div style="font-weight: 500; font-size: 14px;">Quotation Preview</div>
    <div style="display: flex; gap: 12px;">
      <button onclick="window.print()" style="background: transparent; color: white; border: 1px solid rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; font-family: inherit; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">Print</button>
      <button onclick="downloadPDF()" style="background: ${brandColor}; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; font-family: inherit; box-shadow: 0 1px 2px rgba(0,0,0,0.1); transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">Download PDF</button>
    </div>
  </div>

  <div class="page" id="invoice-content" style="background: white; margin-top: 24px; margin-bottom: 40px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
      
      <div class="header">
      <div class="logo">
        ${logoHtml}
      </div>
      <div class="org-info">
        <div class="org-name">${org.name}</div>
        <div class="org-details">
          ${orgAddress}
          ${orgPhone}
          ${orgEmail}
          ${orgGst}
        </div>
      </div>
    </div>

    <div class="accent-line"></div>

    <div class="quotation-meta">
      <div>
        <div class="meta-title">Quotation To</div>
        <div class="client-info">
          <div class="client-name">${quotation.customer.name}</div>
          ${custCompany}
          ${custPhone}
          ${custEmail}
          ${custAddress}
          ${custGstin}
        </div>
      </div>
      
      <div class="doc-details">
        <div class="meta-title">Details</div>
        <div class="doc-row">
          <span class="doc-label">Quotation No</span>
          <span class="doc-value">${quotation.quotationNumber ?? quotation.id.slice(0,8).toUpperCase()}</span>
        </div>
        <div class="doc-row">
          <span class="doc-label">Date</span>
          <span class="doc-value">${dateStr}</span>
        </div>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th class="text-left">Garment</th>
            <th class="text-left">Size</th>
            <th class="text-right">Qty</th>
            <th class="text-right">Rate</th>
            <th class="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>

    <div class="summary-container">
      <div class="summary-card">
        <div class="summary-row">
          <span class="summary-label">Subtotal</span>
          <span class="summary-value">${fmt(quotation.subtotal)}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">GST (${quotation.gstPercentage}%)</span>
          <span class="summary-value">${fmt(quotation.gstAmount)}</span>
        </div>
        <div class="grand-total">
          <span class="grand-total-label">Grand Total</span>
          <span class="grand-total-value">${fmt(quotation.total)}</span>
        </div>
      </div>
    </div>

    <div class="footer-grid">
      ${termsHtml}
      ${notesHtml}
    </div>

    </div>
  </div>

  <script>
    function downloadPDF() {
      const element = document.getElementById('invoice-content');
      
      const opt = {
        margin: [0, 0],
        filename: \`Quotation-\${Date.now()}.pdf\`,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          scrollX: 0,
          scrollY: 0
        },
        // We explicitly tell jsPDF to be EXACTLY 800px wide by 1131px high (A4 aspect ratio in pixels).
        // This guarantees that the 800px element perfectly fills the width of the PDF with precisely zero scaling offsets!
        jsPDF: { unit: 'px', format: [800, 1131], orientation: 'portrait' }
      };

      html2pdf().set(opt).from(element).save();
    }
  </script>
</body>
</html>
  `
}
