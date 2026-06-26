import { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FontAwesome5 } from '@expo/vector-icons';
import { API_BASE } from '../../lib/config';
import { supabase } from '../../lib/supabase';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

const defaultForm = { name: '', phone: '', email: '', address: '' };

export default function CustomersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['customers', search],
    queryFn: async () => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch(`${API_BASE}/api/customers?search=${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
  });

  function openCreate() {
    setEditing(null);
    setForm(defaultForm);
    setShowModal(true);
  }

  function openEdit(c: Customer) {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '' });
    setShowModal(true);
  }

  async function handleSubmit() {
    if (!form.name.trim()) { Alert.alert('Name required', 'Please enter the customer name.'); return; }
    setSaving(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const url = editing ? `${API_BASE}/api/customers/${editing.id}` : `${API_BASE}/api/customers`;
      await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    Alert.alert('Delete Customer', `Delete "${name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const session = await supabase.auth.getSession();
          const token = session.data.session?.access_token;
          await fetch(`${API_BASE}/api/customers/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          queryClient.invalidateQueries({ queryKey: ['customers'] });
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
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827' }}>Customers</Text>
            <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>{customers.length} customer{customers.length !== 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity
            onPress={openCreate}
            style={{ backgroundColor: '#4f46e5', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, gap: 6 }}
          >
            <FontAwesome5 name="plus" size={12} color="white" />
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, marginBottom: 14 }}>
          <FontAwesome5 name="search" size={14} color="#9ca3af" />
          <TextInput
            style={{ flex: 1, padding: 12, fontSize: 14, color: '#111827' }}
            placeholder="Search by name, phone, email..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#4f46e5" /></View>
      ) : customers.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <FontAwesome5 name="users" size={40} color="#e5e7eb" />
          <Text style={{ color: '#9ca3af', fontWeight: '600', marginTop: 16, fontSize: 16 }}>{search ? 'No customers found' : 'No customers yet'}</Text>
          {!search && <TouchableOpacity onPress={openCreate} style={{ marginTop: 12 }}><Text style={{ color: '#4f46e5', fontWeight: '600' }}>Add your first customer →</Text></TouchableOpacity>}
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item: c }) => (
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push(`/customers/${c.id}` as any)} style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f3f4f6', flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 44, height: 44, backgroundColor: '#eef2ff', borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Text style={{ color: '#4f46e5', fontWeight: '800', fontSize: 18 }}>{c.name[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: '#111827', fontSize: 15 }}>{c.name}</Text>
                {c.phone && <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}><FontAwesome5 name="phone" size={10} color="#9ca3af" /> {c.phone}</Text>}
                {c.email && <Text style={{ color: '#6b7280', fontSize: 12 }}><FontAwesome5 name="envelope" size={10} color="#9ca3af" /> {c.email}</Text>}
              </View>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <TouchableOpacity onPress={() => openEdit(c)} style={{ padding: 8, backgroundColor: '#eef2ff', borderRadius: 10 }}>
                  <FontAwesome5 name="pencil-alt" size={13} color="#4f46e5" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(c.id, c.name)} style={{ padding: 8, backgroundColor: '#fef2f2', borderRadius: 10 }}>
                  <FontAwesome5 name="trash" size={13} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <View style={{ flex: 1, backgroundColor: '#f8f9fc' }}>
          <View style={{ backgroundColor: 'white', paddingTop: 20, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>{editing ? 'Edit Customer' : 'New Customer'}</Text>
            <TouchableOpacity onPress={() => setShowModal(false)} style={{ padding: 8, backgroundColor: '#f3f4f6', borderRadius: 10 }}>
              <FontAwesome5 name="times" size={14} color="#374151" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            {[
              { label: 'Full Name *', key: 'name', type: 'default', placeholder: 'e.g. Rajesh Kumar' },
              { label: 'Phone', key: 'phone', type: 'phone-pad', placeholder: '+91 99999 99999' },
              { label: 'Email', key: 'email', type: 'email-address', placeholder: 'customer@email.com' },
              { label: 'Address', key: 'address', type: 'default', placeholder: 'Business or delivery address' },
            ].map(({ label, key, type, placeholder }) => (
              <View key={key}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>{label}</Text>
                <TextInput
                  style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, fontSize: 15, color: '#111827' }}
                  placeholder={placeholder}
                  placeholderTextColor="#9ca3af"
                  value={form[key as keyof typeof form]}
                  onChangeText={(v) => setForm({ ...form, [key]: v })}
                  keyboardType={type as any}
                  autoCapitalize={key === 'email' ? 'none' : 'words'}
                />
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 12, paddingTop: 8 }}>
              <TouchableOpacity onPress={() => setShowModal(false)} style={{ flex: 1, backgroundColor: '#f3f4f6', padding: 16, borderRadius: 14, alignItems: 'center' }}>
                <Text style={{ fontWeight: '700', color: '#374151', fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSubmit} disabled={saving} style={{ flex: 1, backgroundColor: '#4f46e5', padding: 16, borderRadius: 14, alignItems: 'center', opacity: saving ? 0.6 : 1 }}>
                {saving ? <ActivityIndicator color="white" /> : <Text style={{ fontWeight: '700', color: 'white', fontSize: 15 }}>{editing ? 'Update' : 'Create'}</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
