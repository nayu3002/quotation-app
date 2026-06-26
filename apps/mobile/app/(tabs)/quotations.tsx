import { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, StatusBar, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FontAwesome5 } from '@expo/vector-icons';
import { formatCurrency, formatDate } from '../../lib/utils';
import { API_BASE } from '../../lib/config';
import { supabase } from '../../lib/supabase';

interface Quotation {
  id: string;
  quotationNumber: string | null;
  status: string;
  total: string;
  createdAt: string;
  customer: { name: string; phone: string | null };
  lineItems: { id: string }[];
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#f3f4f6', text: '#6b7280' },
  sent: { bg: '#eff6ff', text: '#2563eb' },
  accepted: { bg: '#f0fdf4', text: '#16a34a' },
  rejected: { bg: '#fef2f2', text: '#dc2626' },
};

export default function QuotationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: quotations = [], isLoading } = useQuery<Quotation[]>({
    queryKey: ['quotations', search, filterStatus, filterStartDate, filterEndDate],
    queryFn: async () => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (filterStatus !== 'all') params.append('status', filterStatus)
      if (filterStartDate) params.append('startDate', new Date(filterStartDate).toISOString())
      if (filterEndDate) {
        const end = new Date(filterEndDate)
        end.setHours(23, 59, 59, 999)
        params.append('endDate', end.toISOString())
      }

      const res = await fetch(`${API_BASE}/api/quotations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
  });

  async function handleDelete(id: string, num: string) {
    Alert.alert('Delete Quotation', `Delete ${num}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const session = await supabase.auth.getSession();
          const token = session.data.session?.access_token;
          await fetch(`${API_BASE}/api/quotations/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          queryClient.invalidateQueries({ queryKey: ['quotations'] });
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fc' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={{ padding: 16 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827' }}>Quotations</Text>
            <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>{quotations.length} quotation{quotations.length !== 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity
            style={{ backgroundColor: '#4f46e5', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, gap: 6 }}
            onPress={() => router.push('/create-quotation')}
          >
            <FontAwesome5 name="plus" size={12} color="white" />
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>New</Text>
          </TouchableOpacity>
        </View>

        {/* Search & Filter */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12 }}>
            <FontAwesome5 name="search" size={14} color="#9ca3af" />
            <TextInput
              style={{ flex: 1, padding: 12, fontSize: 14, color: '#111827' }}
              placeholder="Search quotations or customer..."
              placeholderTextColor="#9ca3af"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity 
            style={{ width: 48, backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' }}
            onPress={() => setShowFilter(true)}
          >
            <FontAwesome5 name="filter" size={16} color={filterStatus !== 'all' || filterStartDate || filterEndDate ? '#4f46e5' : '#6b7280'} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : quotations.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <FontAwesome5 name="file-invoice" size={40} color="#e5e7eb" />
          <Text style={{ color: '#9ca3af', fontWeight: '600', marginTop: 16, fontSize: 16 }}>{search ? 'No quotations found' : 'No quotations yet'}</Text>
          {!search && (
            <TouchableOpacity onPress={() => router.push('/create-quotation')} style={{ marginTop: 12 }}>
              <Text style={{ color: '#4f46e5', fontWeight: '600' }}>Create your first quotation →</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={quotations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item: q }) => {
            const statusStyle = STATUS_COLORS[q.status] || STATUS_COLORS.draft;
            return (
              <TouchableOpacity
                onPress={() => router.push(`/quotations/${q.id}?from=quotations` as any)}
                onLongPress={() => handleDelete(q.id, q.quotationNumber || q.id)}
                style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f3f4f6', flexDirection: 'row', alignItems: 'center' }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: '#111827', fontSize: 15 }}>
                    {q.quotationNumber || q.id.slice(0, 8).toUpperCase()}
                  </Text>
                  <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 3 }}>{q.customer.name}</Text>
                  <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>{formatDate(q.createdAt)} · {q.lineItems.length} size{q.lineItems.length !== 1 ? 's' : ''}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontWeight: '800', color: '#111827', fontSize: 16 }}>{formatCurrency(Number(q.total))}</Text>
                  <View style={{ backgroundColor: statusStyle.bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, marginTop: 6 }}>
                    <Text style={{ color: statusStyle.text, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>{q.status}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Filter Modal */}
      <Modal visible={showFilter} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>Filter Quotations</Text>
              <TouchableOpacity onPress={() => setShowFilter(false)} style={{ padding: 4 }}>
                <FontAwesome5 name="times" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, fontWeight: '700', color: '#4b5563', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Date Range</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, fontWeight: '600' }}>From (YYYY-MM-DD)</Text>
                <TextInput
                  style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', padding: 14, borderRadius: 12, color: '#111827', fontWeight: '500' }}
                  placeholder="e.g. 2024-01-01"
                  placeholderTextColor="#d1d5db"
                  value={filterStartDate}
                  onChangeText={setFilterStartDate}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, fontWeight: '600' }}>To (YYYY-MM-DD)</Text>
                <TextInput
                  style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', padding: 14, borderRadius: 12, color: '#111827', fontWeight: '500' }}
                  placeholder="e.g. 2024-12-31"
                  placeholderTextColor="#d1d5db"
                  value={filterEndDate}
                  onChangeText={setFilterEndDate}
                />
              </View>
            </View>

            <Text style={{ fontSize: 13, fontWeight: '700', color: '#4b5563', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Status</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}>
              {['all', 'draft', 'sent', 'accepted', 'rejected'].map(s => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setFilterStatus(s)}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
                    backgroundColor: filterStatus === s ? '#4f46e5' : '#f3f4f6',
                    borderWidth: 1, borderColor: filterStatus === s ? '#4f46e5' : '#e5e7eb',
                  }}
                >
                  <Text style={{ color: filterStatus === s ? 'white' : '#4b5563', fontWeight: '700', textTransform: 'capitalize', fontSize: 13 }}>
                    {s === 'all' ? 'Any Status' : s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={{ backgroundColor: '#4f46e5', padding: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
              onPress={() => setShowFilter(false)}
            >
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
