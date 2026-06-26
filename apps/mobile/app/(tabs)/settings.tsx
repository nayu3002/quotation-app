import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, StatusBar, Image,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/useAppStore';
import { API_BASE } from '../../lib/config';

interface OrgData {
  id: string;
  name: string;
  gstNumber: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  logoUrl: string | null;
}

const getToken = async () => {
  const s = await supabase.auth.getSession();
  return s.data.session?.access_token;
};

export default function SettingsScreen() {
  const { user } = useAppStore();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({ name: '', gstNumber: '', phone: '', email: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: org, isLoading } = useQuery<OrgData>({
    queryKey: ['org-settings'],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
  });

  useEffect(() => {
    if (org) {
      setForm({
        name: org.name || '',
        gstNumber: org.gstNumber || '',
        phone: org.phone || '',
        email: org.email || '',
        address: org.address || '',
      });
    }
  }, [org]);

  async function handleSave() {
    if (!form.name.trim()) { Alert.alert('Business Name required'); return; }
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ['org-settings'] });
      Alert.alert('Saved!', 'Business profile updated successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function handlePickLogo() {
    try {
      const ImagePicker = require('expo-image-picker');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow access to your photo library to upload a logo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;

      setUploading(true);
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: 'image/jpeg',
        name: 'logo.jpg',
      } as any);

      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/settings/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ['org-settings'] });
      Alert.alert('Logo Updated!', 'Your business logo has been saved.');
    } catch {
      Alert.alert('Error', 'Failed to upload logo. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fc' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={{ backgroundColor: 'white', paddingTop: 16, paddingBottom: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827' }}>Settings</Text>
        <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>Manage your business profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* User Profile Card */}
        <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#f3f4f6', padding: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ width: 56, height: 56, backgroundColor: '#eef2ff', borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
            <FontAwesome5 name="user" size={24} color="#4f46e5" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', color: '#111827', fontSize: 16 }}>
              {user?.user_metadata?.full_name || 'Account'}
            </Text>
            <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>{user?.email}</Text>
          </View>
        </View>

        {/* Business Logo */}
        <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#f3f4f6', padding: 20, marginBottom: 16 }}>
          <Text style={{ fontWeight: '700', color: '#111827', fontSize: 15, marginBottom: 14 }}>Business Logo</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ width: 72, height: 72, backgroundColor: '#f3f4f6', borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#e5e7eb', borderStyle: 'dashed', overflow: 'hidden' }}>
              {isLoading ? (
                <ActivityIndicator color="#4f46e5" />
              ) : org?.logoUrl ? (
                <Image source={{ uri: org.logoUrl }} style={{ width: 72, height: 72 }} resizeMode="contain" />
              ) : (
                <FontAwesome5 name="building" size={28} color="#d1d5db" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                onPress={handlePickLogo}
                disabled={uploading}
                style={{ backgroundColor: '#eef2ff', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}
              >
                {uploading
                  ? <ActivityIndicator size="small" color="#4f46e5" />
                  : <FontAwesome5 name="upload" size={13} color="#4f46e5" />}
                <Text style={{ color: '#4f46e5', fontWeight: '700', fontSize: 13 }}>
                  {uploading ? 'Uploading...' : org?.logoUrl ? 'Change Logo' : 'Upload Logo'}
                </Text>
              </TouchableOpacity>
              <Text style={{ color: '#9ca3af', fontSize: 11, marginTop: 6 }}>JPG or PNG · Square format recommended</Text>
            </View>
          </View>
        </View>

        {/* Business Details Form */}
        <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#f3f4f6', padding: 20, marginBottom: 16 }}>
          <Text style={{ fontWeight: '700', color: '#111827', fontSize: 15, marginBottom: 16 }}>Business Details</Text>

          {isLoading ? (
            <View style={{ alignItems: 'center', padding: 20 }}>
              <ActivityIndicator color="#4f46e5" />
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              {[
                { label: 'Business Name *', key: 'name', placeholder: 'Sharma Garments Pvt. Ltd.', type: 'default' },
                { label: 'GST Number', key: 'gstNumber', placeholder: '22AAAAA0000A1Z5', type: 'default' },
                { label: 'Phone', key: 'phone', placeholder: '+91 99999 99999', type: 'phone-pad' },
                { label: 'Email', key: 'email', placeholder: 'info@yourcompany.com', type: 'email-address' },
              ].map(({ label, key, placeholder, type }) => (
                <View key={key}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>{label}</Text>
                  <TextInput
                    style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, fontSize: 15, color: '#111827' }}
                    placeholder={placeholder}
                    placeholderTextColor="#9ca3af"
                    value={form[key as keyof typeof form]}
                    onChangeText={v => setForm({ ...form, [key]: v })}
                    keyboardType={type as any}
                    autoCapitalize={key === 'email' ? 'none' : 'words'}
                  />
                </View>
              ))}

              {/* Address – multiline */}
              <View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Address</Text>
                <TextInput
                  style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, fontSize: 15, color: '#111827', minHeight: 80 }}
                  placeholder="Full business address"
                  placeholderTextColor="#9ca3af"
                  value={form.address}
                  onChangeText={v => setForm({ ...form, address: v })}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={{ backgroundColor: '#4f46e5', padding: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, opacity: saving ? 0.6 : 1 }}
              >
                {saving
                  ? <ActivityIndicator color="white" />
                  : <FontAwesome5 name="save" size={14} color="white" />}
                <Text style={{ color: 'white', fontWeight: '800', fontSize: 15 }}>{saving ? 'Saving...' : 'Save Changes'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* App Info */}
        <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#f3f4f6', overflow: 'hidden', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f9fafb' }}>
            <View style={{ width: 36, height: 36, backgroundColor: '#eef2ff', borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Text style={{ fontSize: 18 }}>🧵</Text>
            </View>
            <View>
              <Text style={{ fontWeight: '700', color: '#111827', fontSize: 15 }}>QuoteWise</Text>
              <Text style={{ color: '#6b7280', fontSize: 12 }}>Wholesale Clothing Quotations</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
            <View style={{ width: 36, height: 36, backgroundColor: '#f0fdf4', borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <FontAwesome5 name="code-branch" size={14} color="#16a34a" />
            </View>
            <View>
              <Text style={{ fontWeight: '600', color: '#111827', fontSize: 14 }}>Version</Text>
              <Text style={{ color: '#6b7280', fontSize: 12 }}>1.0.0 · Mobile App</Text>
            </View>
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#fecaca', padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          <FontAwesome5 name="sign-out-alt" size={16} color="#ef4444" />
          <Text style={{ fontWeight: '700', color: '#ef4444', fontSize: 15 }}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
