import { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, StatusBar, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FontAwesome5 } from '@expo/vector-icons';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { API_BASE } from '../../../lib/config';
import { supabase } from '../../../lib/supabase';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

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

export default function CustomerProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Fetch Customer
  const { data: customer, isLoading: loadingCustomer } = useQuery<Customer>({
    queryKey: ['customer', id],
    queryFn: async () => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch(`${API_BASE}/api/customers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
  });

  // Fetch Quotations
  const { data: quotations = [], isLoading: loadingQuotations } = useQuery<Quotation[]>({
    queryKey: ['quotations_for_customer', id, search, filterStatus, filterStartDate, filterEndDate],
    queryFn: async () => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      const params = new URLSearchParams();
      params.append('customerId', id!);
      if (search) params.append('search', search);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterStartDate) params.append('startDate', new Date(filterStartDate).toISOString());
      if (filterEndDate) {
        const end = new Date(filterEndDate);
        end.setHours(23, 59, 59, 999);
        params.append('endDate', end.toISOString());
      }

      const res = await fetch(`${API_BASE}/api/quotations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!id,
  });

  async function handleDelete(qId: string, num: string) {
    Alert.alert('Delete Quotation', `Delete ${num}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const session = await supabase.auth.getSession();
          const token = session.data.session?.access_token;
          await fetch(`${API_BASE}/api/quotations/${qId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          queryClient.invalidateQueries({ queryKey: ['quotations_for_customer', id] });
          queryClient.invalidateQueries({ queryKey: ['quotations'] });
        },
      },
    ]);
  }

  if (loadingCustomer) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8f9fc', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#4f46e5" />
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8f9fc', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#6b7280', fontWeight: '600' }}>Customer not found</Text>
        <TouchableOpacity onPress={() => router.push('/customers')} style={{ marginTop: 16 }}>
          <Text style={{ color: '#4f46e5', fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fc' }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={{ padding: 16 }}>
        {/* Header Profile */}
        <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => router.push('/customers')} style={{ padding: 8, backgroundColor: '#f3f4f6', borderRadius: 12, marginBottom: 16 }}>
              <FontAwesome5 name="arrow-left" size={16} color="#4b5563" />
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: '#4f46e5', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, gap: 6 }} onPress={() => router.push('/create-quotation')}>
              <FontAwesome5 name="plus" size={12} color="white" />
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>New Quote</Text>
            </TouchableOpacity>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ width: 64, height: 64, backgroundColor: '#eef2ff', borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#4f46e5', fontWeight: '800', fontSize: 26 }}>{customer.name[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827' }}>{customer.name}</Text>
              {customer.phone && <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}><FontAwesome5 name="phone" size={10} color="#9ca3af" /> {customer.phone}</Text>}
              {customer.email && <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}><FontAwesome5 name="envelope" size={10} color="#9ca3af" /> {customer.email}</Text>}
            </View>
          </View>
        </View>

        <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 12 }}>Quotation History</Text>

        {/* Search & Filter */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12 }}>
            <FontAwesome5 name="search" size={14} color="#9ca3af" />
            <TextInput
              style={{ flex: 1, padding: 12, fontSize: 14, color: '#111827' }}
              placeholder="Search quotations..."
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

      {/* Quotations List */}
      {loadingQuotations ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : quotations.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <FontAwesome5 name="file-invoice" size={40} color="#e5e7eb" />
          <Text style={{ color: '#9ca3af', fontWeight: '600', marginTop: 16, fontSize: 16 }}>No history found for this criteria.</Text>
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
                onPress={() => router.push(`/quotations/${q.id}?from=customer&customerId=${id}` as any)}
                onLongPress={() => handleDelete(q.id, q.quotationNumber || q.id)}
                style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f3f4f6', flexDirection: 'row', alignItems: 'center' }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: '#111827', fontSize: 15 }}>
                    {q.quotationNumber || q.id.slice(0, 8).toUpperCase()}
                  </Text>
                  <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>{formatDate(q.createdAt)} · {q.lineItems.length} sizes</Text>
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
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>Filter History</Text>
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
