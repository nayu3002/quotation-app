import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native'
import { useState, useCallback } from 'react'
import { FileText, TrendingUp, DollarSign, CheckCircle, Plus, ChevronRight } from 'lucide-react-native'
import { useRouter } from 'expo-router'

const C = { bg: '#0f1117', card: '#1a1f2e', border: '#2d3748', primary: '#7c5cfc', text: '#e2e8f0', muted: '#64748b', green: '#10b981', blue: '#06b6d4', yellow: '#f59e0b' }

const KPIs = [
  { label: 'Total Quotes', value: '47', icon: FileText, color: C.primary, trend: '+12%' },
  { label: 'Win Rate', value: '68%', icon: TrendingUp, color: C.green, trend: '+5%' },
  { label: 'Revenue', value: '$128k', icon: DollarSign, color: C.yellow, trend: '+22%' },
  { label: 'Signed', value: '32', icon: CheckCircle, color: C.blue, trend: '+8%' },
]

const QUOTES = [
  { id: '1', title: 'Website Redesign', client: 'Acme Corp', amount: '$12,500', status: 'sent', statusColor: C.blue },
  { id: '2', title: 'SEO Package', client: 'StartupXYZ', amount: '$3,200', status: 'viewed', statusColor: '#8b5cf6' },
  { id: '3', title: 'Brand Identity', client: 'LocalBiz', amount: '$8,000', status: 'signed', statusColor: C.green },
  { id: '4', title: 'App Development', client: 'TechCo', amount: '$45,000', status: 'draft', statusColor: C.muted },
]

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1500)
  }, [])

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}>
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Good morning 👋</Text>
          <Text style={s.subtitle}>Here's your business snapshot</Text>
        </View>
        <TouchableOpacity style={s.newBtn} onPress={() => router.push('/quotes/new' as any)}>
          <Plus size={18} color="#fff" />
          <Text style={s.newBtnText}>New Quote</Text>
        </TouchableOpacity>
      </View>

      <View style={s.kpiGrid}>
        {KPIs.map(kpi => (
          <View key={kpi.label} style={s.kpiCard}>
            <View style={[s.kpiIcon, { backgroundColor: kpi.color + '25' }]}>
              <kpi.icon size={20} color={kpi.color} />
            </View>
            <Text style={s.kpiValue}>{kpi.value}</Text>
            <Text style={s.kpiLabel}>{kpi.label}</Text>
            <Text style={[s.kpiTrend, { color: C.green }]}>{kpi.trend}</Text>
          </View>
        ))}
      </View>

      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Recent Quotes</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/quotes' as any)}>
            <Text style={s.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        {QUOTES.map(q => (
          <TouchableOpacity key={q.id} style={s.quoteCard}>
            <View style={[s.quoteIcon, { backgroundColor: q.statusColor + '20' }]}>
              <FileText size={16} color={q.statusColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.quoteTitle} numberOfLines={1}>{q.title}</Text>
              <Text style={s.quoteClient}>{q.client}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={s.quoteAmount}>{q.amount}</Text>
              <View style={[s.badge, { backgroundColor: q.statusColor + '20' }]}>
                <Text style={[s.badgeText, { color: q.statusColor }]}>{q.status}</Text>
              </View>
            </View>
            <ChevronRight size={14} color={C.muted} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={[s.section, { marginBottom: 40 }]}>
        <Text style={s.sectionTitle}>Quick Actions</Text>
        <View style={s.actionsGrid}>
          {[
            { label: 'New Quote', icon: FileText, color: C.primary },
            { label: 'Add Client', icon: CheckCircle, color: C.green },
            { label: 'Pipeline', icon: TrendingUp, color: C.blue },
            { label: 'Invoices', icon: DollarSign, color: C.yellow },
          ].map(a => (
            <TouchableOpacity key={a.label} style={s.actionCard}>
              <View style={[s.actionIcon, { backgroundColor: a.color + '20' }]}>
                <a.icon size={22} color={a.color} />
              </View>
              <Text style={s.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  greeting: { fontSize: 22, fontWeight: '700', color: C.text },
  subtitle: { fontSize: 13, color: C.muted, marginTop: 2 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  newBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10, marginBottom: 8 },
  kpiCard: { width: '47%', backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  kpiIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  kpiValue: { fontSize: 22, fontWeight: '700', color: C.text },
  kpiLabel: { fontSize: 12, color: C.muted, marginTop: 2 },
  kpiTrend: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  section: { paddingHorizontal: 20, marginTop: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  seeAll: { fontSize: 13, color: C.primary },
  quoteCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  quoteIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  quoteTitle: { fontSize: 14, fontWeight: '600', color: C.text },
  quoteClient: { fontSize: 12, color: C.muted, marginTop: 1 },
  quoteAmount: { fontSize: 14, fontWeight: '700', color: C.text },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  actionCard: { width: '47%', backgroundColor: C.card, borderRadius: 14, padding: 16, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.border },
  actionIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 13, fontWeight: '600', color: C.text },
})
