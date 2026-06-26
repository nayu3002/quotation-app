import { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, StatusBar, Switch,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { FontAwesome5 } from '@expo/vector-icons';
import { API_BASE } from '../../lib/config';
import { supabase } from '../../lib/supabase';

interface ProductSize {
  id: string;
  sizeLabel: string;
  sizeCostTemplates: Array<{
    fabricAvg: string; fabricRate: string; stitchingCost: string;
    matchingCost: string; labelCost: string; extraCost: string;
    profitMultiplier: string; roundOff: boolean;
  }>;
}

interface ProductType {
  id: string;
  name: string;
  productSizes: ProductSize[];
}

const FIXED_FIELDS = [
  { key: 'fabricAvg', label: 'Fabric Avg (m)' },
  { key: 'fabricRate', label: 'Rate (₹/m)' },
  { key: 'stitchingCost', label: 'Stitching ₹' },
  { key: 'matchingCost', label: 'Matching ₹' },
  { key: 'labelCost', label: 'Label ₹' },
  { key: 'extraCost', label: 'Extra ₹' },
  { key: 'profitMultiplier', label: 'Profit ×' },
];

function calcPrice(t: Record<string, string | boolean>) {
  const fa = parseFloat(String(t.fabricAvg || '0'));
  const fr = parseFloat(String(t.fabricRate || '0'));
  const sc = parseFloat(String(t.stitchingCost || '0'));
  const mc = parseFloat(String(t.matchingCost || '0'));
  const lc = parseFloat(String(t.labelCost || '0'));
  const ec = parseFloat(String(t.extraCost || '0'));
  const pm = parseFloat(String(t.profitMultiplier || '1.2'));
  const base = fa * fr + sc + mc + lc + ec;
  const price = base * pm;
  const ro = t.roundOff !== false && t.roundOff !== 'false';
  return { base: base.toFixed(2), sell: ro ? Math.round(price).toString() : price.toFixed(2) };
}

const getToken = async () => {
  const s = await supabase.auth.getSession();
  return s.data.session?.access_token;
};

export default function CostTemplatesScreen() {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [templates, setTemplates] = useState<Record<string, Record<string, string | boolean>>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const { data: products = [], isLoading } = useQuery<ProductType[]>({
    queryKey: ['products-with-templates'],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
  });

  // Initialize template state when products load
  useEffect(() => {
    if (products.length > 0) {
      const state: Record<string, Record<string, string | boolean>> = {};
      for (const product of products) {
        for (const size of product.productSizes) {
          const tmpl = size.sizeCostTemplates?.[0];
          if (tmpl) {
            state[size.id] = {
              fabricAvg: tmpl.fabricAvg,
              fabricRate: tmpl.fabricRate,
              stitchingCost: tmpl.stitchingCost,
              matchingCost: tmpl.matchingCost,
              labelCost: tmpl.labelCost,
              extraCost: tmpl.extraCost,
              profitMultiplier: tmpl.profitMultiplier,
              roundOff: tmpl.roundOff,
            };
          } else {
            state[size.id] = {
              fabricAvg: '0', fabricRate: '0', stitchingCost: '0',
              matchingCost: '0', labelCost: '0', extraCost: '0',
              profitMultiplier: '1.2', roundOff: true,
            };
          }
        }
      }
      setTemplates(state);
      if (!selectedProductId && products[0]) {
        setSelectedProductId(products[0].id);
      }
    }
  }, [products]);

  function updateField(sizeId: string, field: string, value: string | boolean) {
    setTemplates(prev => ({
      ...prev,
      [sizeId]: { ...(prev[sizeId] || {}), [field]: value },
    }));
  }

  async function saveTemplate(sizeId: string) {
    setSaving(sizeId);
    try {
      const token = await getToken();
      const t = templates[sizeId] || {};
      const res = await fetch(`${API_BASE}/api/cost-templates`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productSizeId: sizeId,
          fabricAvg: parseFloat(String(t.fabricAvg || '0')),
          fabricRate: parseFloat(String(t.fabricRate || '0')),
          stitchingCost: parseFloat(String(t.stitchingCost || '0')),
          matchingCost: parseFloat(String(t.matchingCost || '0')),
          labelCost: parseFloat(String(t.labelCost || '0')),
          extraCost: parseFloat(String(t.extraCost || '0')),
          profitMultiplier: parseFloat(String(t.profitMultiplier || '1.2')),
          roundOff: t.roundOff !== false && t.roundOff !== 'false',
          customValues: [],
        }),
      });
      if (!res.ok) throw new Error();
      Alert.alert('Saved!', 'Template saved successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save template');
    } finally {
      setSaving(null);
    }
  }

  const selectedProduct = products.find(p => p.id === selectedProductId);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fc' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={{ backgroundColor: 'white', paddingTop: 16, paddingBottom: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827' }}>Cost Templates</Text>
        <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>Set pricing per product size</Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : products.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <FontAwesome5 name="calculator" size={40} color="#e5e7eb" />
          <Text style={{ color: '#9ca3af', fontWeight: '600', marginTop: 16, fontSize: 16, textAlign: 'center' }}>
            No products found. Add products and sizes first.
          </Text>
        </View>
      ) : (
        <>
          {/* Product Selector */}
          <View style={{ backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingVertical: 10 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              {products.map(p => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setSelectedProductId(p.id)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                    backgroundColor: selectedProductId === p.id ? '#4f46e5' : 'white',
                    borderWidth: 1,
                    borderColor: selectedProductId === p.id ? '#4f46e5' : '#e5e7eb',
                  }}
                >
                  <Text style={{ fontWeight: '700', fontSize: 13, color: selectedProductId === p.id ? 'white' : '#374151' }}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Sizes List */}
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            {!selectedProduct || selectedProduct.productSizes.length === 0 ? (
              <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#f3f4f6' }}>
                <Text style={{ color: '#9ca3af', textAlign: 'center' }}>No sizes found for this product. Add sizes in the Products tab first.</Text>
              </View>
            ) : (
              selectedProduct.productSizes.map(size => {
                const t = templates[size.id] || {};
                const { base, sell } = calcPrice(t);
                return (
                  <View key={size.id} style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#f3f4f6', overflow: 'hidden', marginBottom: 14 }}>
                    {/* Size header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                      <View style={{ width: 36, height: 36, backgroundColor: '#eef2ff', borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                        <Text style={{ color: '#4f46e5', fontWeight: '800', fontSize: 13 }}>{size.sizeLabel}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '700', color: '#111827', fontSize: 14 }}>Size: {size.sizeLabel}</Text>
                        <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 1 }}>
                          Base: ₹{base} · <Text style={{ color: '#4f46e5', fontWeight: '700' }}>Sell: ₹{sell}</Text>
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => saveTemplate(size.id)}
                        disabled={saving === size.id}
                        style={{ backgroundColor: '#f0fdf4', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 5 }}
                      >
                        {saving === size.id
                          ? <ActivityIndicator size="small" color="#16a34a" />
                          : <FontAwesome5 name="save" size={12} color="#16a34a" />}
                        <Text style={{ color: '#16a34a', fontWeight: '700', fontSize: 12 }}>Save</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Fields */}
                    <View style={{ padding: 14 }}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                        {FIXED_FIELDS.map(({ key, label }) => (
                          <View key={key} style={{ width: '30%' }}>
                            <Text style={{ fontSize: 10, color: '#6b7280', fontWeight: '600', marginBottom: 4 }}>{label}</Text>
                            <TextInput
                              style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 8, fontSize: 13, color: '#111827', textAlign: 'right' }}
                              keyboardType="decimal-pad"
                              value={String(t[key] ?? '')}
                              onChangeText={v => updateField(size.id, key, v)}
                              placeholder="0"
                              placeholderTextColor="#9ca3af"
                            />
                          </View>
                        ))}

                        {/* Round Off */}
                        <View style={{ width: '30%', justifyContent: 'flex-end' }}>
                          <Text style={{ fontSize: 10, color: '#6b7280', fontWeight: '600', marginBottom: 4 }}>Round Off</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 }}>
                            <Switch
                              value={t.roundOff !== false && t.roundOff !== 'false'}
                              onValueChange={v => updateField(size.id, 'roundOff', v)}
                              trackColor={{ false: '#e5e7eb', true: '#a5b4fc' }}
                              thumbColor={t.roundOff !== false ? '#4f46e5' : '#9ca3af'}
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}
