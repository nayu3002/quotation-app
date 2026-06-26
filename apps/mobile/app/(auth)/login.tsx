import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StatusBar, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Sign In Error', error.message);
    setLoading(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#1e1b4b' }}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <View style={{ width: 64, height: 64, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 28 }}>🧵</Text>
            </View>
            <Text style={{ fontSize: 32, fontWeight: '800', color: 'white', letterSpacing: -0.5 }}>QuoteWise</Text>
            <Text style={{ color: '#a5b4fc', marginTop: 4, fontSize: 15 }}>Wholesale Clothing Quotations</Text>
          </View>

          {/* Card */}
          <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 24, padding: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
            <Text style={{ fontSize: 20, fontWeight: '600', color: 'white', marginBottom: 24 }}>Sign in to your account</Text>

            <Text style={{ color: '#c7d2fe', fontSize: 13, fontWeight: '500', marginBottom: 6 }}>Email address</Text>
            <TextInput
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 14, padding: 14, color: 'white', fontSize: 15, marginBottom: 16 }}
              placeholder="you@example.com"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />

            <Text style={{ color: '#c7d2fe', fontSize: 13, fontWeight: '500', marginBottom: 6 }}>Password</Text>
            <TextInput
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 14, padding: 14, color: 'white', fontSize: 15, marginBottom: 24 }}
              placeholder="••••••••"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />

            <TouchableOpacity
              style={{ backgroundColor: '#6366f1', padding: 16, borderRadius: 14, alignItems: 'center', opacity: loading ? 0.6 : 1 }}
              onPress={signInWithEmail}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
