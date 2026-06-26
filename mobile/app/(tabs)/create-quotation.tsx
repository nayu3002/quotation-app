import { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, StatusBar, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { formatCurrency } from '../../lib/utils';
import { API_BASE } from '../../lib/config';
import { supabase } from '../../lib/supabase';

interface Customer { id: string; name: string; phone: string | null }
interface ProductType { id: string; name: string; productSizes: Array<{ id: string; sizeLabel: string }> }
interface CustomCostField { id: string; name: string; type: string; isMultiplier: boolean; defaultValue: string; productTypeId: string | null; }
interface LineItem {
  id: string;
  productTypeId: string; productSizeId: string; quantity: string;
  fabricAvg: string; fabricRate: string; stitchingCost: string;
  matchingCost: string; labelCost: string; extraCost: string;
  profitMultiplier: string; roundOff: boolean;
  customValues: Record<string, string>;
}

function makeLineItem(): LineItem {
  return {
    id: Math.random().toString(36).slice(2),
    productTypeId: '', productSizeId: '', quantity: '1',
    fabricAvg: '0', fabricRate: '0', stitchingCost: '0', matchingCost: '0',
    labelCost: '0', extraCost: '0', profitMultiplier: '1.2', roundOff: true,
    customValues: {},
  };
}

function calcPrice(li: LineItem, customFields: CustomCostField[]): number {
  const fa = parseFloat(li.fabricAvg || '0');
  const fr = parseFloat(li.fabricRate || '0');
  const sc = parseFloat(li.stitchingCost || '0');
  const mc = parseFloat(li.matchingCost || '0');
  const lc = parseFloat(li.labelCost || '0');
  const ec = parseFloat(li.extraCost || '0');
  const pm = parseFloat(li.profitMultiplier || '1');
  
  const activeFields = customFields.filter(cf => !cf.productTypeId || cf.productTypeId === li.productTypeId);

  const additiveFields = activeFields.filter(f => !f.isMultiplier && f.type !== 'info');
  const additiveTotal = additiveFields.reduce((sum, f) => sum + (parseFloat(li.customValues[f.id] ?? f.defaultValue ?? '0') || 0), 0);
  const base = fa * fr + sc + mc + lc + ec + additiveTotal;
  
  const multiplierFields = activeFields.filter(f => f.isMultiplier && f.type !== 'info');
  let running = base;
  multiplierFields.forEach(f => {
    running *= (parseFloat(li.customValues[f.id] ?? f.defaultValue ?? '0') || 0);
  });

  const price = running * pm;
  return li.roundOff ? Math.round(price) : Math.round(price * 100) / 100;
}

export default function CreateQuotationScreen() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<ProductType[]>([]);
  const [customFields, setCustomFields] = useState<CustomCostField[]>([]);
  const [templateMap, setTemplateMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [gstPercentage, setGstPercentage] = useState('18');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('Terms: Payment due within 15 days.');
  const [lineItems, setLineItems] = useState<LineItem[]>([makeLineItem()]);
  const [step, setStep] = useState(0); // 0=customer, 1=items, 2=preview

  // Customer Modals Additions
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', company: '', address: '', gstin: '' });
  const [savingCustomer, setSavingCustomer] = useState(false);

  const getToken = async () => {
    const s = await supabase.auth.getSession();
    return s.data.session?.access_token;
  };

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const [cRes, pRes, tRes, cfRes] = await Promise.all([
        fetch(`${API_BASE}/api/customers`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/products`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/cost-templates`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/custom-cost-fields`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [cData, pData, tData, cfData] = await Promise.all([cRes.json(), pRes.json(), tRes.json(), cfRes.json()]);
      setCustomers(cData);
      setProducts(pData);
      setCustomFields(cfData);
      
      const map: Record<string, any> = {};
      if (Array.isArray(tData)) {
        for (const tmpl of tData) {
          map[tmpl.productSizeId] = tmpl;
        }
      }
      setTemplateMap(map);
      setLoading(false);
    })();
  }, []);

  function updateItem(id: string, field: string, value: string | boolean) {
    setLineItems(prev => prev.map(li => li.id === id ? { ...li, [field]: value } : li));
  }

  function autoFillFromTemplate(lineItemId: string, productSizeId: string) {
    const tmpl = templateMap[productSizeId];
    if (!tmpl) {
      updateItem(lineItemId, 'productSizeId', productSizeId);
      return;
    }
    const customVals: Record<string, string> = {};
    for (const cv of tmpl.customValues || []) {
      customVals[cv.customCostFieldId] = cv.customCostField?.type === 'info' ? (cv.textValue || '') : cv.value;
    }

    setLineItems(prev => prev.map(li => 
      li.id === lineItemId ? {
        ...li,
        productSizeId,
        fabricAvg: tmpl.fabricAvg?.toString() || '0',
        fabricRate: tmpl.fabricRate?.toString() || '0',
        stitchingCost: tmpl.stitchingCost?.toString() || '0',
        matchingCost: tmpl.matchingCost?.toString() || '0',
        labelCost: tmpl.labelCost?.toString() || '0',
        extraCost: tmpl.extraCost?.toString() || '0',
        profitMultiplier: tmpl.profitMultiplier?.toString() || '1.2',
        roundOff: tmpl.roundOff ?? true,
        customValues: customVals,
      } : li
    ));
  }

  function updateCustomValue(id: string, fieldId: string, value: string) {
    setLineItems(prev => prev.map(li => li.id === id ? { ...li, customValues: { ...li.customValues, [fieldId]: value } } : li));
  }

  const subtotal = lineItems.reduce((sum, li) => sum + calcPrice(li, customFields) * parseInt(li.quantity || '1'), 0);
  const gstAmt = subtotal * (parseFloat(gstPercentage || '0') / 100);
  const total = subtotal + gstAmt;
  const selectedCustomer = customers.find(c => c.id === customerId);

  async function handleSubmit() {
    if (!customerId) { Alert.alert('Customer required', 'Please select a customer.'); return; }
    const invalid = lineItems.some(li => !li.productTypeId || !li.productSizeId || parseInt(li.quantity) < 1);
    if (invalid) { Alert.alert('Incomplete', 'Please fill in all items (product, size, and quantity).'); return; }

    setSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/quotations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          gstPercentage: parseFloat(gstPercentage),
          notes: notes || undefined,
          terms: terms || undefined,
          lineItems: lineItems.map(li => ({
            productTypeId: li.productTypeId,
            productSizeId: li.productSizeId,
            quantity: parseInt(li.quantity),
            fabricAvg: parseFloat(li.fabricAvg),
            fabricRate: parseFloat(li.fabricRate),
            stitchingCost: parseFloat(li.stitchingCost),
            matchingCost: parseFloat(li.matchingCost),
            labelCost: parseFloat(li.labelCost),
            extraCost: parseFloat(li.extraCost),
            profitMultiplier: parseFloat(li.profitMultiplier),
            roundOff: li.roundOff,
            customValues: customFields
              .filter(cf => !cf.productTypeId || cf.productTypeId === li.productTypeId)
              .map(cf => ({
              customCostFieldId: cf.id,
              name: cf.name,
              type: cf.type,
              isMultiplier: cf.isMultiplier,
              value: cf.type === 'info' ? 0 : (parseFloat(li.customValues[cf.id] ?? cf.defaultValue ?? '0') || 0),
              textValue: cf.type === 'info' ? (li.customValues[cf.id] || '') : null,
            })),
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        Alert.alert('Error', err.error || 'Failed to create quotation');
        return;
      }
      const data = await res.json();
      Alert.alert('Done! 🎉', `Quotation ${data.quotationNumber} created!`, [
        { text: 'View', onPress: () => router.replace(`/quotations/${data.id}` as any) },
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Something went wrong. Is the web app running?');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddCustomer() {
    if (!newCustomer.name.trim()) {
      Alert.alert('Required', 'Name is required');
      return;
    }
    setSavingCustomer(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/customers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setCustomers(prev => [...prev, created]);
      setCustomerId(created.id);
      setShowNewCustomerModal(false);
      setShowCustomerModal(false);
      setNewCustomer({ name: '', phone: '', email: '', company: '', address: '', gstin: '' });
      Alert.alert('Success', 'Customer added!');
    } catch {
      Alert.alert('Error', 'Failed to add customer');
    } finally {
      setSavingCustomer(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fc' }}>
        <ActivityIndicator color="#4f46e5" />
        <Text style={{ color: '#6b7280', marginTop: 12 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fc' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {/* Header */}
      <View style={{ backgroundColor: 'white', paddingTop: 16, paddingBottom: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, backgroundColor: '#f3f4f6', borderRadius: 10 }}>
          <FontAwesome5 name="arrow-left" size={14} color="#374151" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '800', fontSize: 18, color: '#111827' }}>New Quotation</Text>
          <Text style={{ color: '#6b7280', fontSize: 12 }}>Add sizes and pricing</Text>
        </View>
      </View>

      {/* Steps indicator */}
      <View style={{ backgroundColor: 'white', flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
        {['Customer', 'Size Rows', 'Review'].map((s, i) => (
          <TouchableOpacity key={s} onPress={() => setStep(i)} style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: step === i ? '#4f46e5' : 'transparent' }}>
            <Text style={{ fontWeight: step === i ? '700' : '500', color: step === i ? '#4f46e5' : '#9ca3af', fontSize: 13 }}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* ─── Step 0: Customer ─── */}
        {step === 0 && (
          <View style={{ gap: 14 }}>
            <View style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#f3f4f6', padding: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 10 }}>Customer *</Text>
              
              <TouchableOpacity
                onPress={() => setShowCustomerModal(true)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }}
              >
                {selectedCustomer ? (
                  <View>
                    <Text style={{ fontWeight: '600', color: '#111827', fontSize: 15 }}>{selectedCustomer.name}</Text>
                    {selectedCustomer.phone && <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{selectedCustomer.phone}</Text>}
                  </View>
                ) : (
                  <Text style={{ color: '#9ca3af', fontSize: 15 }}>Select a customer...</Text>
                )}
                <FontAwesome5 name="chevron-down" size={12} color="#9ca3af" />
              </TouchableOpacity>
            </View>
            <View style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#f3f4f6', padding: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>GST %</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, fontSize: 15, color: '#111827' }}
                keyboardType="decimal-pad"
                value={gstPercentage}
                onChangeText={setGstPercentage}
                placeholder="18"
                placeholderTextColor="#9ca3af"
              />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 14, marginBottom: 8 }}>Notes (optional)</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827', minHeight: 72 }}
                multiline value={notes} onChangeText={setNotes}
                placeholder="Additional notes..." placeholderTextColor="#9ca3af"
              />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 14, marginBottom: 8 }}>Terms & Conditions</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827', minHeight: 72 }}
                multiline value={terms} onChangeText={setTerms} placeholderTextColor="#9ca3af"
              />
            </View>
            <TouchableOpacity onPress={() => setStep(1)} disabled={!customerId} style={{ backgroundColor: customerId ? '#4f46e5' : '#e5e7eb', padding: 16, borderRadius: 14, alignItems: 'center' }}>
              <Text style={{ color: customerId ? 'white' : '#9ca3af', fontWeight: '700', fontSize: 15 }}>Next: Add Item Rows →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Step 1: Size Rows ─── */}
        {step === 1 && (
          <View style={{ gap: 12 }}>
            {lineItems.map((li, idx) => {
              const product = products.find(p => p.id === li.productTypeId);
              const pricePerPiece = calcPrice(li, customFields);
              const rowTotal = pricePerPiece * parseInt(li.quantity || '1');
              return (
                <View key={li.id} style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#f3f4f6', overflow: 'hidden' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#f9fafb', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                    <Text style={{ fontWeight: '700', color: '#6b7280', fontSize: 12 }}>Row {idx + 1}</Text>
                    {li.productSizeId && <Text style={{ color: '#4f46e5', fontWeight: '700', fontSize: 13 }}>₹{pricePerPiece.toFixed(0)}/pc · Total: {formatCurrency(rowTotal)}</Text>}
                    {lineItems.length > 1 && (
                      <TouchableOpacity onPress={() => setLineItems(lineItems.filter(l => l.id !== li.id))} style={{ padding: 4 }}>
                        <FontAwesome5 name="trash" size={13} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={{ padding: 14, gap: 10 }}>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: '600', marginBottom: 5 }}>PRODUCT *</Text>
                        <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={{ flexDirection: 'row', padding: 4, gap: 6 }}>
                              {products.map(p => (
                                <TouchableOpacity
                                  key={p.id}
                                  onPress={() => { updateItem(li.id, 'productTypeId', p.id); updateItem(li.id, 'productSizeId', ''); }}
                                  style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: li.productTypeId === p.id ? '#4f46e5' : '#f3f4f6' }}
                                >
                                  <Text style={{ color: li.productTypeId === p.id ? 'white' : '#374151', fontWeight: '600', fontSize: 12 }}>{p.name}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </ScrollView>
                        </View>
                      </View>
                    </View>

                    {product && (
                      <View>
                        <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: '600', marginBottom: 5 }}>SIZE *</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          {product.productSizes.map(s => (
                            <TouchableOpacity
                              key={s.id}
                              onPress={() => autoFillFromTemplate(li.id, s.id)}
                              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: li.productSizeId === s.id ? '#4f46e5' : '#f3f4f6' }}
                            >
                              <Text style={{ color: li.productSizeId === s.id ? 'white' : '#374151', fontWeight: '600', fontSize: 12 }}>{s.sizeLabel}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: '600', marginBottom: 5 }}>QTY *</Text>
                        <TextInput style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, fontSize: 14, color: '#111827' }} keyboardType="number-pad" value={li.quantity} onChangeText={v => updateItem(li.id, 'quantity', v)} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: '600', marginBottom: 5 }}>FABRIC AVG (m)</Text>
                        <TextInput style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, fontSize: 14, color: '#111827' }} keyboardType="decimal-pad" value={li.fabricAvg} onChangeText={v => updateItem(li.id, 'fabricAvg', v)} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: '600', marginBottom: 5 }}>RATE (₹/m)</Text>
                        <TextInput style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, fontSize: 14, color: '#111827' }} keyboardType="decimal-pad" value={li.fabricRate} onChangeText={v => updateItem(li.id, 'fabricRate', v)} />
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {[{ label: 'STITCHING ₹', key: 'stitchingCost' }, { label: 'MATCHING ₹', key: 'matchingCost' }, { label: 'LABEL ₹', key: 'labelCost' }].map(f => (
                        <View key={f.key} style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: '600', marginBottom: 5 }}>{f.label}</Text>
                          <TextInput style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, fontSize: 14, color: '#111827' }} keyboardType="decimal-pad" value={(li as any)[f.key]} onChangeText={v => updateItem(li.id, f.key, v)} />
                        </View>
                      ))}
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {[{ label: 'EXTRA ₹', key: 'extraCost' }, { label: 'PROFIT ×', key: 'profitMultiplier' }].map(f => (
                        <View key={f.key} style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: '600', marginBottom: 5 }}>{f.label}</Text>
                          <TextInput style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, fontSize: 14, color: '#111827' }} keyboardType="decimal-pad" value={(li as any)[f.key]} onChangeText={v => updateItem(li.id, f.key, v)} />
                        </View>
                      ))}
                    </View>

                    {/* Custom Cost Fields */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 10 }}>
                      {customFields
                        .filter(cf => !cf.productTypeId || cf.productTypeId === li.productTypeId)
                        .map((cf) => (
                        <View key={cf.id} style={{ width: 120 }}>
                          <Text style={{ fontSize: 11, color: '#d97706', fontWeight: '600', marginBottom: 5 }}>{cf.name.toUpperCase()} {cf.type === 'info' ? '' : (cf.isMultiplier ? '×' : '₹')}</Text>
                          <TextInput
                            style={{ borderWidth: 1, borderColor: '#fde68a', borderRadius: 10, padding: 10, fontSize: 14, color: '#111827' }}
                            keyboardType={cf.type === 'info' ? 'default' : 'decimal-pad'}
                            value={li.customValues[cf.id] ?? (cf.type === 'info' ? '' : cf.defaultValue) ?? ''}
                            onChangeText={v => updateCustomValue(li.id, cf.id, v)}
                            placeholder={cf.type === 'info' ? 'Value...' : ''}
                          />
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              );
            })}

            <TouchableOpacity
              onPress={() => setLineItems([...lineItems, makeLineItem()])}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#a5b4fc', borderStyle: 'dashed' }}
            >
              <FontAwesome5 name="plus" size={13} color="#4f46e5" />
              <Text style={{ color: '#4f46e5', fontWeight: '700', fontSize: 14 }}>Add Size Row</Text>
            </TouchableOpacity>

            <View style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#f3f4f6', padding: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: '#6b7280', fontSize: 14 }}>Subtotal</Text>
                <Text style={{ fontWeight: '600', color: '#111827', fontSize: 14 }}>{formatCurrency(subtotal)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ color: '#6b7280', fontSize: 14 }}>GST ({gstPercentage}%)</Text>
                <Text style={{ fontWeight: '600', color: '#111827', fontSize: 14 }}>{formatCurrency(gstAmt)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
                <Text style={{ fontWeight: '800', color: '#312e81', fontSize: 16 }}>Total</Text>
                <Text style={{ fontWeight: '900', color: '#4338ca', fontSize: 20 }}>{formatCurrency(total)}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setStep(2)} style={{ backgroundColor: '#4f46e5', padding: 16, borderRadius: 14, alignItems: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Review & Create →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Step 2: Review ─── */}
        {step === 2 && (
          <View style={{ gap: 14 }}>
            <View style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#f3f4f6', padding: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Customer</Text>
              <Text style={{ fontWeight: '700', color: '#111827', fontSize: 16 }}>{selectedCustomer?.name}</Text>
              {selectedCustomer?.phone && <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>{selectedCustomer.phone}</Text>}
            </View>

            <View style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#f3f4f6', overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', backgroundColor: '#f9fafb', paddingHorizontal: 14, paddingVertical: 10 }}>
                <Text style={{ flex: 2, fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Item</Text>
                <Text style={{ width: 36, fontSize: 11, fontWeight: '700', color: '#6b7280', textAlign: 'right' }}>Qty</Text>
                <Text style={{ width: 80, fontSize: 11, fontWeight: '700', color: '#6b7280', textAlign: 'right' }}>Amount</Text>
              </View>
              {lineItems.map((li, i) => {
                const product = products.find(p => p.id === li.productTypeId);
                const size = product?.productSizes.find(s => s.id === li.productSizeId);
                const rowTotal = calcPrice(li, customFields) * parseInt(li.quantity || '1');
                return (
                  <View key={li.id} style={{ flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#f9fafb', alignItems: 'center' }}>
                    <View style={{ flex: 2 }}>
                      <Text style={{ fontWeight: '600', color: '#111827', fontSize: 13 }}>{product?.name || '–'}</Text>
                      <Text style={{ color: '#6b7280', fontSize: 12 }}>{size?.sizeLabel || '–'}</Text>
                    </View>
                    <Text style={{ width: 36, color: '#111827', fontWeight: '600', textAlign: 'right', fontSize: 13 }}>{li.quantity}</Text>
                    <Text style={{ width: 80, color: '#111827', fontWeight: '700', textAlign: 'right', fontSize: 13 }}>{formatCurrency(rowTotal)}</Text>
                  </View>
                );
              })}
            </View>

            <View style={{ backgroundColor: '#eef2ff', borderRadius: 16, borderWidth: 1, borderColor: '#c7d2fe', padding: 16, gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#6b7280', fontSize: 14 }}>Subtotal</Text>
                <Text style={{ fontWeight: '600', color: '#111827', fontSize: 14 }}>{formatCurrency(subtotal)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#6b7280', fontSize: 14 }}>GST ({gstPercentage}%)</Text>
                <Text style={{ fontWeight: '600', color: '#111827', fontSize: 14 }}>{formatCurrency(gstAmt)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#c7d2fe' }}>
                <Text style={{ fontWeight: '800', color: '#312e81', fontSize: 17 }}>Grand Total</Text>
                <Text style={{ fontWeight: '900', color: '#4338ca', fontSize: 22 }}>{formatCurrency(total)}</Text>
              </View>
            </View>

            <TouchableOpacity onPress={handleSubmit} disabled={submitting} style={{ backgroundColor: '#4f46e5', padding: 18, borderRadius: 14, alignItems: 'center', opacity: submitting ? 0.6 : 1 }}>
              {submitting ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>Create Quotation →</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep(1)} style={{ padding: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' }}>
              <Text style={{ color: '#6b7280', fontWeight: '600', fontSize: 14 }}>← Back to Edit</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Customer Selection Modal */}
      <Modal visible={showCustomerModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCustomerModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fc' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Select Customer</Text>
            <TouchableOpacity onPress={() => setShowCustomerModal(false)} style={{ padding: 4 }}>
              <FontAwesome5 name="times" size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <TouchableOpacity
              onPress={() => { setShowCustomerModal(false); setShowNewCustomerModal(true); }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, backgroundColor: '#eef2ff', borderWidth: 1, borderColor: '#c7d2fe', marginBottom: 16 }}
            >
              <FontAwesome5 name="plus" size={14} color="#4f46e5" style={{ marginRight: 8 }} />
              <Text style={{ color: '#4f46e5', fontWeight: '700', fontSize: 15 }}>Add New Customer</Text>
            </TouchableOpacity>
            
            {customers.map(c => (
              <TouchableOpacity
                key={c.id}
                onPress={() => { setCustomerId(c.id); setShowCustomerModal(false); }}
                style={{ padding: 14, borderRadius: 12, backgroundColor: 'white', marginBottom: 8, borderWidth: 1, borderColor: '#f3f4f6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <View>
                  <Text style={{ fontWeight: '600', color: '#111827', fontSize: 15 }}>{c.name}</Text>
                  {c.phone && <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{c.phone}</Text>}
                </View>
                {customerId === c.id && <FontAwesome5 name="check" size={14} color="#4f46e5" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* New Customer Modal */}
      <Modal visible={showNewCustomerModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowNewCustomerModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fc' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>New Customer</Text>
            <TouchableOpacity onPress={() => setShowNewCustomerModal(false)} style={{ padding: 4 }}>
              <FontAwesome5 name="times" size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6 }}>NAME *</Text>
              <TextInput style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 15, color: '#111827' }} placeholder="Business or personal name" value={newCustomer.name} onChangeText={v => setNewCustomer({ ...newCustomer, name: v })} />
            </View>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6 }}>PHONE</Text>
              <TextInput style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 15, color: '#111827' }} keyboardType="phone-pad" placeholder="+91 ..." value={newCustomer.phone} onChangeText={v => setNewCustomer({ ...newCustomer, phone: v })} />
            </View>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6 }}>COMPANY / GSTIN</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput style={{ flex: 1, backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 15, color: '#111827' }} placeholder="Company" value={newCustomer.company} onChangeText={v => setNewCustomer({ ...newCustomer, company: v })} />
                <TextInput style={{ flex: 1, backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 15, color: '#111827' }} placeholder="GSTIN" value={newCustomer.gstin} onChangeText={v => setNewCustomer({ ...newCustomer, gstin: v })} autoCapitalize="characters" />
              </View>
            </View>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6 }}>EMAIL</Text>
              <TextInput style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 15, color: '#111827' }} keyboardType="email-address" placeholder="email@..." value={newCustomer.email} onChangeText={v => setNewCustomer({ ...newCustomer, email: v })} />
            </View>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6 }}>ADDRESS</Text>
              <TextInput style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 15, color: '#111827' }} placeholder="City / Address" value={newCustomer.address} onChangeText={v => setNewCustomer({ ...newCustomer, address: v })} />
            </View>
            <TouchableOpacity onPress={handleAddCustomer} disabled={savingCustomer} style={{ backgroundColor: '#4f46e5', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 }}>
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>{savingCustomer ? 'Saving...' : 'Save & Select'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}
