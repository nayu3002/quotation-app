import { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator,
  Alert, Modal, ScrollView, StatusBar, Switch,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FontAwesome5 } from '@expo/vector-icons';
import { API_BASE } from '../../lib/config';
import { supabase } from '../../lib/supabase';

interface ProductSize {
  id: string;
  sizeLabel: string;
  sortOrder: number;
}

interface ProductType {
  id: string;
  name: string;
  description: string | null;
  productSizes: ProductSize[];
}

interface SizeRow {
  id: string;
  sizeLabel: string;
  fabricAvg: string;
  fabricRate: string;
  stitchingCost: string;
  matchingCost: string;
  labelCost: string;
  extraCost: string;
  profitMultiplier: string;
  roundOff: boolean;
}

const QUICK_SIZES: { label: string; sizes: string[] }[] = [
  { label: 'S/M/L/XL/XXL', sizes: ['S', 'M', 'L', 'XL', 'XXL'] },
  { label: '38–46 (Shirt)', sizes: ['38', '39', '40', '41', '42', '43', '44', '45', '46'] },
  { label: '28–38 (Pant)', sizes: ['28', '30', '32', '34', '36', '38'] },
  { label: 'Free Size', sizes: ['Free Size'] },
];

function makeRow(label = ''): SizeRow {
  return {
    id: Math.random().toString(36).slice(2),
    sizeLabel: label,
    fabricAvg: '0', fabricRate: '0', stitchingCost: '0',
    matchingCost: '0', labelCost: '0', extraCost: '0',
    profitMultiplier: '1.2', roundOff: true,
  };
}

const getToken = async () => {
  const s = await supabase.auth.getSession();
  return s.data.session?.access_token;
};

export default function ProductsScreen() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Create product modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [productForm, setProductForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);

  // Setup panel modal
  const [setupProduct, setSetupProduct] = useState<ProductType | null>(null);
  const [rows, setRows] = useState<SizeRow[]>([makeRow()]);
  const [saving, setSaving] = useState(false);

  const { data: products = [], isLoading } = useQuery<ProductType[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
  });

  async function handleCreate() {
    if (!productForm.name.trim()) {
      Alert.alert('Name required');
      return;
    }
    setCreating(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: productForm.name.trim(), description: productForm.description || null }),
      });
      if (!res.ok) throw new Error();
      const newProduct = await res.json();
      setShowCreateModal(false);
      setProductForm({ name: '', description: '' });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      // Open setup panel right after creation
      openSetup({ ...newProduct, productSizes: [] });
    } catch {
      Alert.alert('Error', 'Failed to create product');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    Alert.alert('Delete Product', `Delete "${name}" and all its sizes?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const token = await getToken();
          await fetch(`${API_BASE}/api/products/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          queryClient.invalidateQueries({ queryKey: ['products'] });
        },
      },
    ]);
  }

  function openSetup(product: ProductType) {
    setSetupProduct(product);
    if (product.productSizes?.length > 0) {
      setRows(product.productSizes.map(s => makeRow(s.sizeLabel)));
    } else {
      setRows([makeRow()]);
    }
  }

  async function handleSaveSetup() {
    if (!setupProduct) return;
    const valid = rows.filter(r => r.sizeLabel.trim());
    if (valid.length === 0) { Alert.alert('Add at least one size'); return; }
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/products/${setupProduct.id}/bulk-setup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sizes: valid.map((r, i) => ({
            sizeLabel: r.sizeLabel.trim(),
            sortOrder: i,
            fabricAvg: parseFloat(r.fabricAvg) || 0,
            fabricRate: parseFloat(r.fabricRate) || 0,
            stitchingCost: parseFloat(r.stitchingCost) || 0,
            matchingCost: parseFloat(r.matchingCost) || 0,
            labelCost: parseFloat(r.labelCost) || 0,
            extraCost: parseFloat(r.extraCost) || 0,
            profitMultiplier: parseFloat(r.profitMultiplier) || 1.2,
            roundOff: r.roundOff,
          })),
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      Alert.alert('Saved!', `${data.created} size${data.created !== 1 ? 's' : ''} saved.`);
      setSetupProduct(null);
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch {
      Alert.alert('Error', 'Failed to save sizes');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fc' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={{ backgroundColor: 'white', paddingTop: 16, paddingBottom: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827' }}>Products</Text>
          <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>Manage product types and sizes</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowCreateModal(true)}
          style={{ backgroundColor: '#4f46e5', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, gap: 6 }}
        >
          <FontAwesome5 name="plus" size={12} color="white" />
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Add</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : products.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <FontAwesome5 name="box" size={40} color="#e5e7eb" />
          <Text style={{ color: '#9ca3af', fontWeight: '600', marginTop: 16, fontSize: 16 }}>No products yet</Text>
          <TouchableOpacity onPress={() => setShowCreateModal(true)} style={{ marginTop: 12 }}>
            <Text style={{ color: '#4f46e5', fontWeight: '600' }}>Add your first product →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item: product }) => (
            <View style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#f3f4f6', overflow: 'hidden' }}>
              {/* Product Header Row */}
              <TouchableOpacity
                onPress={() => setExpandedId(expandedId === product.id ? null : product.id)}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
              >
                <View style={{ width: 42, height: 42, backgroundColor: '#f5f3ff', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <FontAwesome5 name="box" size={16} color="#7c3aed" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: '#111827', fontSize: 15 }}>{product.name}</Text>
                  <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>
                    {product.productSizes.length} size{product.productSizes.length !== 1 ? 's' : ''}
                    {product.description ? ` · ${product.description}` : ''}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TouchableOpacity
                    onPress={() => openSetup(product)}
                    style={{ backgroundColor: '#eef2ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                  >
                    <Text style={{ color: '#4f46e5', fontSize: 11, fontWeight: '700' }}>
                      {product.productSizes.length > 0 ? 'Edit Sizes' : 'Set Up Sizes'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(product.id, product.name)}
                    style={{ padding: 8, backgroundColor: '#fef2f2', borderRadius: 8 }}
                  >
                    <FontAwesome5 name="trash" size={12} color="#ef4444" />
                  </TouchableOpacity>
                  <FontAwesome5
                    name={expandedId === product.id ? 'chevron-up' : 'chevron-down'}
                    size={12} color="#9ca3af"
                  />
                </View>
              </TouchableOpacity>

              {/* Sizes List */}
              {expandedId === product.id && (
                <View style={{ borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingHorizontal: 16, paddingVertical: 12 }}>
                  {product.productSizes.length === 0 ? (
                    <TouchableOpacity onPress={() => openSetup(product)}>
                      <Text style={{ color: '#4f46e5', fontSize: 13, fontWeight: '600' }}>No sizes yet. Tap to set up →</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {product.productSizes.map(s => (
                        <View key={s.id} style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>{s.sizeLabel}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        />
      )}

      {/* Create Product Modal */}
      <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreateModal(false)}>
        <View style={{ flex: 1, backgroundColor: '#f8f9fc' }}>
          <View style={{ backgroundColor: 'white', paddingTop: 20, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>New Product Type</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)} style={{ padding: 8, backgroundColor: '#f3f4f6', borderRadius: 10 }}>
              <FontAwesome5 name="times" size={14} color="#374151" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            <View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Product Name *</Text>
              <TextInput
                style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, fontSize: 15, color: '#111827' }}
                placeholder="e.g. Shirt, Pant, Full Shirt, Skirt"
                placeholderTextColor="#9ca3af"
                value={productForm.name}
                onChangeText={v => setProductForm({ ...productForm, name: v })}
                autoFocus
              />
            </View>
            <View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Description (optional)</Text>
              <TextInput
                style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, fontSize: 15, color: '#111827' }}
                placeholder="Optional note"
                placeholderTextColor="#9ca3af"
                value={productForm.description}
                onChangeText={v => setProductForm({ ...productForm, description: v })}
              />
            </View>
            <View style={{ backgroundColor: '#eef2ff', borderRadius: 12, padding: 12 }}>
              <Text style={{ color: '#4f46e5', fontSize: 12, fontWeight: '600' }}>
                💡 After creating, you'll go directly to set up sizes & rates.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, paddingTop: 8 }}>
              <TouchableOpacity onPress={() => setShowCreateModal(false)} style={{ flex: 1, backgroundColor: '#f3f4f6', padding: 16, borderRadius: 14, alignItems: 'center' }}>
                <Text style={{ fontWeight: '700', color: '#374151', fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreate} disabled={creating} style={{ flex: 1, backgroundColor: '#4f46e5', padding: 16, borderRadius: 14, alignItems: 'center', opacity: creating ? 0.6 : 1 }}>
                {creating ? <ActivityIndicator color="white" /> : <Text style={{ fontWeight: '700', color: 'white', fontSize: 15 }}>Create & Set Up →</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Sizes Setup Modal */}
      <Modal visible={!!setupProduct} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSetupProduct(null)}>
        <View style={{ flex: 1, backgroundColor: '#f8f9fc' }}>
          {/* Header */}
          <View style={{ backgroundColor: 'white', paddingTop: 20, paddingBottom: 14, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827' }}>{setupProduct?.name} — Sizes & Rates</Text>
              <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>Enter size labels and their default cost rates</Text>
            </View>
            <TouchableOpacity onPress={() => setSetupProduct(null)} style={{ padding: 8, backgroundColor: '#f3f4f6', borderRadius: 10, marginLeft: 8 }}>
              <FontAwesome5 name="times" size={14} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Quick-add size sets */}
          <View style={{ backgroundColor: '#eef2ff', padding: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#4f46e5', marginBottom: 8, textTransform: 'uppercase' }}>Quick Add Size Sets</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {QUICK_SIZES.map(qs => (
                  <TouchableOpacity
                    key={qs.label}
                    onPress={() => setRows(qs.sizes.map(s => makeRow(s)))}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'white', borderWidth: 1, borderColor: '#a5b4fc', borderRadius: 8 }}
                  >
                    <Text style={{ color: '#4338ca', fontSize: 12, fontWeight: '600' }}>{qs.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
            {rows.map((row, idx) => (
              <View key={row.id} style={{ backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#f3f4f6', padding: 14, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={{ fontWeight: '700', color: '#6b7280', fontSize: 12 }}>Row {idx + 1}</Text>
                  {rows.length > 1 && (
                    <TouchableOpacity onPress={() => setRows(rows.filter((_, i) => i !== idx))}>
                      <FontAwesome5 name="trash" size={13} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: '600', marginBottom: 5 }}>SIZE LABEL *</Text>
                <TextInput
                  style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, fontSize: 15, color: '#111827', marginBottom: 10, fontWeight: '700' }}
                  placeholder="e.g. S, M, L, 38"
                  placeholderTextColor="#9ca3af"
                  value={row.sizeLabel}
                  onChangeText={v => setRows(rows.map((r, i) => i === idx ? { ...r, sizeLabel: v } : r))}
                />

                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  {[
                    { label: 'Fabric Avg (m)', key: 'fabricAvg' },
                    { label: 'Rate (₹/m)', key: 'fabricRate' },
                    { label: 'Stitching ₹', key: 'stitchingCost' },
                  ].map(f => (
                    <View key={f.key} style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, color: '#6b7280', fontWeight: '600', marginBottom: 4 }}>{f.label}</Text>
                      <TextInput
                        style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 8, fontSize: 13, color: '#111827', textAlign: 'right' }}
                        keyboardType="decimal-pad"
                        value={(row as any)[f.key]}
                        onChangeText={v => setRows(rows.map((r, i) => i === idx ? { ...r, [f.key]: v } : r))}
                        placeholder="0"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  {[
                    { label: 'Matching ₹', key: 'matchingCost' },
                    { label: 'Label ₹', key: 'labelCost' },
                    { label: 'Extra ₹', key: 'extraCost' },
                  ].map(f => (
                    <View key={f.key} style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, color: '#6b7280', fontWeight: '600', marginBottom: 4 }}>{f.label}</Text>
                      <TextInput
                        style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 8, fontSize: 13, color: '#111827', textAlign: 'right' }}
                        keyboardType="decimal-pad"
                        value={(row as any)[f.key]}
                        onChangeText={v => setRows(rows.map((r, i) => i === idx ? { ...r, [f.key]: v } : r))}
                        placeholder="0"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, color: '#6b7280', fontWeight: '600', marginBottom: 4 }}>PROFIT ×</Text>
                    <TextInput
                      style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 8, fontSize: 13, color: '#111827', textAlign: 'right' }}
                      keyboardType="decimal-pad"
                      value={row.profitMultiplier}
                      onChangeText={v => setRows(rows.map((r, i) => i === idx ? { ...r, profitMultiplier: v } : r))}
                      placeholder="1.2"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16 }}>
                    <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: '600' }}>Round Off</Text>
                    <Switch
                      value={row.roundOff}
                      onValueChange={v => setRows(rows.map((r, i) => i === idx ? { ...r, roundOff: v } : r))}
                      trackColor={{ false: '#e5e7eb', true: '#a5b4fc' }}
                      thumbColor={row.roundOff ? '#4f46e5' : '#9ca3af'}
                    />
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity
              onPress={() => setRows([...rows, makeRow()])}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#a5b4fc', borderStyle: 'dashed', marginBottom: 16 }}
            >
              <FontAwesome5 name="plus" size={13} color="#4f46e5" />
              <Text style={{ color: '#4f46e5', fontWeight: '700', fontSize: 14 }}>Add Another Size</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#f3f4f6', padding: 16, flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => setSetupProduct(null)} style={{ flex: 1, backgroundColor: '#f3f4f6', padding: 16, borderRadius: 14, alignItems: 'center' }}>
              <Text style={{ fontWeight: '700', color: '#374151', fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSaveSetup} disabled={saving} style={{ flex: 2, backgroundColor: '#4f46e5', padding: 16, borderRadius: 14, alignItems: 'center', opacity: saving ? 0.6 : 1 }}>
              {saving ? <ActivityIndicator color="white" /> : <Text style={{ fontWeight: '700', color: 'white', fontSize: 15 }}>Save All Sizes & Rates</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
