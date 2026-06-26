import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { FontAwesome5 } from '@expo/vector-icons';
import { formatCurrency, formatDate } from '../../lib/utils';
import { API_BASE } from '../../lib/config';
import { supabase } from '../../lib/supabase';

interface DashboardData {
  customerCount: number;
  productCount: number;
  quotationCount: number;
  totalRevenue: number;
  recentQuotations: Array<{
    id: string;
    quotationNumber: string | null;
    status: string;
    total: string;
    createdAt: string;
    customer: { name: string };
  }>;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#f3f4f6', text: '#6b7280' },
  sent: { bg: '#eff6ff', text: '#2563eb' },
  accepted: { bg: '#f0fdf4', text: '#16a34a' },
  rejected: { bg: '#fef2f2', text: '#dc2626' },
};

export default function Dashboard() {
  const router = useRouter();

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch(`${API_BASE}/api/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load');
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const stats = data ? [
    { label: 'Customers', value: String(data.customerCount), iconName: 'users', bg: '#eff6ff', iconColor: '#2563eb', route: '/(tabs)/customers' },
    { label: 'Products', value: String(data.productCount), iconName: 'box', bg: '#f5f3ff', iconColor: '#7c3aed', route: '/(tabs)/customers' },
    { label: 'Quotations', value: String(data.quotationCount), iconName: 'file-invoice', bg: '#f0fdf4', iconColor: '#16a34a', route: '/(tabs)/quotations' },
    { label: 'Total Revenue', value: formatCurrency(data.totalRevenue ?? 0), iconName: 'chart-line', bg: '#eef2ff', iconColor: '#4f46e5', route: '/(tabs)/quotations' },
  ] : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fc' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827' }}>Good day! 👋</Text>
            <Text style={{ color: '#6b7280', marginTop: 2, fontSize: 13 }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>
          <TouchableOpacity
            style={{ backgroundColor: '#4f46e5', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, gap: 6 }}
            onPress={() => router.push('/create-quotation')}
          >
            <FontAwesome5 name="plus" size={12} color="white" />
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>New Quote</Text>
          </TouchableOpacity>
        </View>

        {isLoading && (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator color="#4f46e5" />
            <Text style={{ color: '#6b7280', marginTop: 12 }}>Loading dashboard...</Text>
          </View>
        )}

        {error && (
          <View style={{ backgroundColor: '#fef2f2', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#fecaca', marginBottom: 16 }}>
            <Text style={{ color: '#dc2626', fontWeight: '600' }}>Could not connect to web app server.</Text>
            <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>Make sure the web app is running and the IP in lib/config.ts is correct.</Text>
          </View>
        )}

        {/* Stats Grid */}
        {data && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
            {stats.map((stat) => (
              <TouchableOpacity
                key={stat.label}
                onPress={() => router.push(stat.route as any)}
                style={{ flex: 1, minWidth: '45%', backgroundColor: 'white', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#f3f4f6' }}
              >
                <View style={{ width: 38, height: 38, backgroundColor: stat.bg, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <FontAwesome5 name={stat.iconName} size={16} color={stat.iconColor} solid />
                </View>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827' }}>{stat.value}</Text>
                <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{stat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Quotations */}
        {data && (
          <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#f3f4f6', overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
              <Text style={{ fontWeight: '700', fontSize: 15, color: '#111827' }}>Recent Quotations</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/quotations')}>
                <Text style={{ color: '#4f46e5', fontWeight: '600', fontSize: 13 }}>View all →</Text>
              </TouchableOpacity>
            </View>

            {data.recentQuotations.length === 0 ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <FontAwesome5 name="file-invoice" size={32} color="#e5e7eb" />
                <Text style={{ color: '#9ca3af', fontWeight: '600', marginTop: 12 }}>No quotations yet</Text>
                <TouchableOpacity style={{ marginTop: 12 }} onPress={() => router.push('/create-quotation')}>
                  <Text style={{ color: '#4f46e5', fontWeight: '600', fontSize: 13 }}>Create your first quotation →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              data.recentQuotations.map((q, i) => {
                const statusStyle = STATUS_COLORS[q.status] || STATUS_COLORS.draft;
                return (
                  <TouchableOpacity
                    key={q.id}
                    onPress={() => router.push(`/quotations/${q.id}` as any)}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: i < data.recentQuotations.length - 1 ? 1 : 0, borderBottomColor: '#f9fafb' }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '600', color: '#111827', fontSize: 14 }}>
                        {q.quotationNumber || `QT-${q.id.slice(0, 8).toUpperCase()}`}
                      </Text>
                      <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>
                        {q.customer.name} · {formatDate(q.createdAt)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontWeight: '700', color: '#111827', fontSize: 14 }}>{formatCurrency(Number(q.total))}</Text>
                      <View style={{ backgroundColor: statusStyle.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginTop: 4 }}>
                        <Text style={{ color: statusStyle.text, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>{q.status}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
