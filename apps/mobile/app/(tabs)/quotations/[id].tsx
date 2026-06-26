import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FontAwesome5 } from '@expo/vector-icons';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { API_BASE } from '../../../lib/config';
import { supabase } from '../../../lib/supabase';
import { useState } from 'react';

interface QuotationDetail {
  id: string;
  quotationNumber: string | null;
  status: string;
  notes: string | null;
  terms: string | null;
  subtotal: string;
  gstPercentage: string;
  gstAmount: string;
  total: string;
  createdAt: string;
  customer: { name: string; company: string | null; phone: string | null; email: string | null; address: string | null; gstin: string | null };
  organization?: { name: string; logoUrl: string | null; gstNumber: string | null; phone: string | null; address: string | null };
  lineItems: Array<{ id: string; quantity: number; pricePerPiece: string; totalPrice: string; productType: { name: string }; productSize: { sizeLabel: string } }>;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#f3f4f6', text: '#6b7280' },
  sent: { bg: '#eff6ff', text: '#2563eb' },
  accepted: { bg: '#f0fdf4', text: '#16a34a' },
  rejected: { bg: '#fef2f2', text: '#dc2626' },
};

function buildPdfHtml(q: QuotationDetail): string {
  const org = q.organization || { name: 'Your Company', address: null, phone: null, gstNumber: null, logoUrl: null };
  const brandColor = '#4f46e5';
  const lightBg = '#f9fafb';
  const borderColor = '#e5e7eb';
  
  const fmt = (val: string | number) =>
    `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

  const rowsHtml = q.lineItems.map((item) => `
    <tr>
      <td class="text-left" style="font-weight: 500; color: #111827; vertical-align: top;">${item.productType.name}</td>
      <td class="text-left" style="color: #4b5563; vertical-align: top;">
        ${item.productSize.sizeLabel}
        ${((item as any).customValues || [])
          .filter((cv: any) => cv.customCostField?.type === 'info' && cv.textValue)
          .map((cv: any) => `<div style="font-size: 10px; color: #9ca3af; margin-top: 4px; font-weight: 500;">${cv.customCostField.name}: <span style="color: #6b7280;">${cv.textValue}</span></div>`)
          .join('')}
      </td>
      <td class="text-right" style="font-weight: 500; color: #111827; vertical-align: top;">${item.quantity}</td>
      <td class="text-right" style="color: #4b5563; vertical-align: top;">${fmt(item.pricePerPiece)}</td>
      <td class="text-right" style="font-weight: 700; color: #111827; vertical-align: top;">${fmt(item.totalPrice)}</td>
    </tr>
  `).join('');

  const logoHtml = org?.logoUrl
    ? `<img src="${org.logoUrl}" alt="${org.name} Logo" class="logo-img" />`
    : `<div class="org-name" style="font-size: 24px; color: ${brandColor};">${org.name || 'Your Company'}</div>`;

  const orgAddress = org?.address ? `<span>${org.address}</span>` : '';
  const orgPhone = org?.phone ? `<span>${org.phone}</span>` : '';
  const orgGst = org?.gstNumber ? `<span style="color: #9ca3af; margin-top: 4px; font-size: 10px; text-transform: uppercase;">GSTIN: ${org.gstNumber}</span>` : '';

  const custCompany = q.customer.company ? `<div style="font-weight: 500; color: #4b5563; margin-bottom: 2px;">${q.customer.company}</div>` : '';
  const custPhone = q.customer.phone ? `<div>${q.customer.phone}</div>` : '';
  const custEmail = q.customer.email ? `<div>${q.customer.email}</div>` : '';
  const custAddress = q.customer.address ? `<div>${q.customer.address}</div>` : '';
  const custGstin = q.customer.gstin ? `<div style="color: #9ca3af; margin-top: 6px; font-size: 10px; font-weight: 600; text-transform: uppercase;">GSTIN: ${q.customer.gstin}</div>` : '';

  const termsHtml = q.terms ? `
  <div class="meta-section" style="margin-top: 20px;">
    <div class="meta-title">Terms & Conditions</div>
    <div style="font-size: 11px; color: #4b5563; line-height: 1.6; white-space: pre-wrap; background: ${lightBg}; padding: 16px; border-radius: 8px; border: 1px solid ${borderColor};">${q.terms}</div>
  </div>` : '';

  const notesHtml = q.notes ? `
  <div class="meta-section" style="margin-top: 20px;">
    <div class="meta-title">Additional Notes</div>
    <div style="font-size: 11px; color: #4b5563; line-height: 1.6; white-space: pre-wrap; background: ${lightBg}; padding: 16px; border-radius: 8px; border: 1px solid ${borderColor};">${q.notes}</div>
  </div>` : '';

  const dateStr = formatDate(q.createdAt);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Quotation ${q.quotationNumber ?? q.id}</title>
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
    
    .page { max-width: 800px; margin: 0 auto; padding: 24px; }
    
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
</head>
<body style="background: white;">
  <div class="page" id="invoice-content" style="background: white; padding-top: 20px;">
    
    <div class="header">
      <div class="logo">
        ${logoHtml}
      </div>
      <div class="org-info">
        <div class="org-name">${org?.name || 'Your Company'}</div>
        <div class="org-details">
          ${orgAddress}
          ${orgPhone}
          ${orgGst}
        </div>
      </div>
    </div>

    <div class="accent-line"></div>

    <div class="quotation-meta">
      <div>
        <div class="meta-title">Quotation To</div>
        <div class="client-info">
          <div class="client-name">${q.customer.name}</div>
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
          <span class="doc-value">${q.quotationNumber ?? q.id.slice(0,8).toUpperCase()}</span>
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
          <span class="summary-value">${fmt(q.subtotal)}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">GST (${q.gstPercentage}%)</span>
          <span class="summary-value">${fmt(q.gstAmount)}</span>
        </div>
        <div class="grand-total">
          <span class="grand-total-label">Grand Total</span>
          <span class="grand-total-value">${fmt(q.total)}</span>
        </div>
      </div>
    </div>

    <div class="footer-grid">
      ${termsHtml}
      ${notesHtml}
    </div>

  </div>
</body>
</html>`;
}

export default function QuotationDetailsScreen() {
  const { id, from, customerId } = useLocalSearchParams<{ id: string; from?: string; customerId?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const { data: quotation, isLoading } = useQuery<QuotationDetail>({
    queryKey: ['quotation', id],
    queryFn: async () => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch(`${API_BASE}/api/quotations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
  });

  async function updateStatus(newStatus: string) {
    if (updatingStatus) return;
    setUpdatingStatus(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      await fetch(`${API_BASE}/api/quotations/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    } finally {
      setUpdatingStatus(false);
    }
  }

  function showStatusPicker() {
    const options = ['draft', 'sent', 'accepted', 'rejected'];
    Alert.alert('Update Status', 'Choose a new status for this quotation', [
      ...options.map(s => ({ text: s.charAt(0).toUpperCase() + s.slice(1), onPress: () => updateStatus(s) })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handleGeneratePdf() {
    if (!quotation) return;
    setGeneratingPdf(true);
    try {
      const Print = require('expo-print');
      const Sharing = require('expo-sharing');
      const html = buildPdfHtml(quotation);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share Quotation ${quotation.quotationNumber || quotation.id.slice(0, 8)}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF Saved', `PDF saved to:\n${uri}`);
      }
    } catch {
      Alert.alert('Error', 'Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  }

  if (isLoading) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fc' }}><ActivityIndicator color="#4f46e5" /></View>;
  }

  if (!quotation) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#6b7280' }}>Quotation not found.</Text></View>;
  }

  const statusStyle = STATUS_COLORS[quotation.status] || STATUS_COLORS.draft;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fc' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={{ backgroundColor: 'white', paddingTop: 16, paddingBottom: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TouchableOpacity 
          onPress={() => {
            if (from === 'customer' && customerId) {
              router.push(`/customers/${customerId}`);
            } else {
              router.push('/quotations');
            }
          }} 
          style={{ padding: 8, backgroundColor: '#f3f4f6', borderRadius: 10 }}
        >
          <FontAwesome5 name="arrow-left" size={14} color="#374151" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '800', fontSize: 17, color: '#111827' }}>
            {quotation.quotationNumber || quotation.id.slice(0, 8).toUpperCase()}
          </Text>
          <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 1 }}>{formatDate(quotation.createdAt)}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Status badge – tap to change */}
          <TouchableOpacity
            onPress={showStatusPicker}
            style={{ backgroundColor: statusStyle.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Text style={{ color: statusStyle.text, fontWeight: '700', fontSize: 12, textTransform: 'capitalize' }}>
              {updatingStatus ? '...' : quotation.status}
            </Text>
            <FontAwesome5 name="pencil-alt" size={9} color={statusStyle.text} />
          </TouchableOpacity>

          {/* PDF Button */}
          <TouchableOpacity
            onPress={handleGeneratePdf}
            disabled={generatingPdf}
            style={{ backgroundColor: '#fef2f2', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 5 }}
          >
            {generatingPdf
              ? <ActivityIndicator size="small" color="#dc2626" />
              : <FontAwesome5 name="file-pdf" size={13} color="#dc2626" />}
            <Text style={{ color: '#dc2626', fontWeight: '700', fontSize: 12 }}>PDF</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={{ backgroundColor: 'white', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#f3f4f6' }}>
          <View style={{ height: 4, backgroundColor: '#6366f1' }} />
          <View style={{ padding: 20 }}>

            {/* Customer + Details Grid */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Quotation To</Text>
                <Text style={{ fontWeight: '700', fontSize: 16, color: '#111827' }}>{quotation.customer.name}</Text>
                {quotation.customer.company && <Text style={{ color: '#374151', fontSize: 13, marginTop: 2 }}>{quotation.customer.company}</Text>}
                {quotation.customer.phone && <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>{quotation.customer.phone}</Text>}
                {quotation.customer.email && <Text style={{ color: '#6b7280', fontSize: 12 }}>{quotation.customer.email}</Text>}
                {quotation.customer.gstin && <Text style={{ color: '#9ca3af', fontSize: 11, marginTop: 4, fontWeight: '600', textTransform: 'uppercase' }}>GSTIN: {quotation.customer.gstin}</Text>}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Details</Text>
                <Text style={{ color: '#6b7280', fontSize: 12 }}>Quotation No</Text>
                <Text style={{ fontWeight: '700', fontSize: 13, color: '#111827' }}>{quotation.quotationNumber}</Text>
                <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 8 }}>Date</Text>
                <Text style={{ fontWeight: '700', fontSize: 13, color: '#111827' }}>{formatDate(quotation.createdAt)}</Text>
              </View>
            </View>

            <View style={{ height: 1, backgroundColor: '#f3f4f6', marginVertical: 16 }} />

            {/* Items Table */}
            <View style={{ borderWidth: 1, borderColor: '#f3f4f6', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', backgroundColor: '#f9fafb', paddingHorizontal: 12, paddingVertical: 10 }}>
                <Text style={{ flex: 2, fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Product / Size</Text>
                <Text style={{ width: 40, fontSize: 11, fontWeight: '700', color: '#6b7280', textAlign: 'right' }}>Qty</Text>
                <Text style={{ width: 60, fontSize: 11, fontWeight: '700', color: '#6b7280', textAlign: 'right' }}>Rate</Text>
                <Text style={{ width: 72, fontSize: 11, fontWeight: '700', color: '#6b7280', textAlign: 'right' }}>Amount</Text>
              </View>
              {quotation.lineItems.map((item, i) => (
                <View key={item.id} style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#f9fafb', alignItems: 'center' }}>
                  <View style={{ flex: 2 }}>
                    <Text style={{ fontWeight: '600', color: '#111827', fontSize: 13 }}>{item.productType.name}</Text>
                    <Text style={{ color: '#6b7280', fontSize: 12 }}>{item.productSize.sizeLabel}</Text>
                  </View>
                  <Text style={{ width: 40, color: '#111827', fontWeight: '600', textAlign: 'right', fontSize: 13 }}>{item.quantity}</Text>
                  <Text style={{ width: 60, color: '#6b7280', textAlign: 'right', fontSize: 12 }}>{formatCurrency(Number(item.pricePerPiece))}</Text>
                  <Text style={{ width: 72, color: '#111827', fontWeight: '700', textAlign: 'right', fontSize: 13 }}>{formatCurrency(Number(item.totalPrice))}</Text>
                </View>
              ))}
            </View>

            {/* Totals */}
            <View style={{ borderWidth: 1, borderColor: '#f3f4f6', borderRadius: 16, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f9fafb' }}>
                <Text style={{ color: '#6b7280', fontSize: 14 }}>Subtotal</Text>
                <Text style={{ fontWeight: '600', color: '#111827', fontSize: 14 }}>{formatCurrency(Number(quotation.subtotal))}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f9fafb' }}>
                <Text style={{ color: '#6b7280', fontSize: 14 }}>GST ({quotation.gstPercentage}%)</Text>
                <Text style={{ fontWeight: '600', color: '#111827', fontSize: 14 }}>{formatCurrency(Number(quotation.gstAmount))}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#eef2ff' }}>
                <Text style={{ fontWeight: '800', color: '#312e81', fontSize: 16 }}>Grand Total</Text>
                <Text style={{ fontWeight: '900', color: '#4338ca', fontSize: 20 }}>{formatCurrency(Number(quotation.total))}</Text>
              </View>
            </View>

            {/* Notes / Terms */}
            {(quotation.notes || quotation.terms) && (
              <View style={{ marginTop: 20, gap: 12 }}>
                {quotation.terms && (
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Terms & Conditions</Text>
                    <View style={{ backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#f3f4f6' }}>
                      <Text style={{ color: '#6b7280', fontSize: 13, lineHeight: 20 }}>{quotation.terms}</Text>
                    </View>
                  </View>
                )}
                {quotation.notes && (
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Additional Notes</Text>
                    <View style={{ backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#f3f4f6' }}>
                      <Text style={{ color: '#6b7280', fontSize: 13, lineHeight: 20 }}>{quotation.notes}</Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Bottom PDF Button */}
        <TouchableOpacity
          onPress={handleGeneratePdf}
          disabled={generatingPdf}
          style={{ marginTop: 16, backgroundColor: '#dc2626', padding: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: generatingPdf ? 0.6 : 1 }}
        >
          {generatingPdf
            ? <ActivityIndicator color="white" />
            : <FontAwesome5 name="file-pdf" size={16} color="white" />}
          <Text style={{ color: 'white', fontWeight: '800', fontSize: 15 }}>
            {generatingPdf ? 'Generating PDF...' : 'Download / Share PDF'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
