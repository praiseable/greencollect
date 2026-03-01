import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { registerDetails } from '../../services/auth.service';
import useAuthStore from '../../store/auth.store';

const roles = [
  { id: 'house_owner', label: 'House Owner', icon: '🏠', desc: 'Post garbage for pickup' },
  { id: 'local_collector', label: 'Local Collector', icon: '🚛', desc: 'Collect garbage nearby' },
  { id: 'regional_collector', label: 'Regional Buyer', icon: '🏭', desc: 'Buy garbage in bulk' },
];

export default function RegisterScreen() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name.trim() || !selectedRole) {
      return Alert.alert('Error', 'Please enter your name and select a role');
    }
    setLoading(true);
    try {
      const user = await registerDetails({ name: name.trim(), role: selectedRole });
      setUser(user);

      switch (selectedRole) {
        case 'house_owner':
          router.replace('/(owner)');
          break;
        case 'local_collector':
          router.replace('/(collector)');
          break;
        case 'regional_collector':
          router.replace('/(regional)');
          break;
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#ecfdf5' }} contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <Text style={{ fontSize: 28, fontWeight: '800', color: '#064e3b' }}>Complete Profile</Text>
      <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4, marginBottom: 32 }}>
        Tell us about yourself to get started
      </Text>

      <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Your Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Enter your full name"
        style={{
          backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
          borderColor: '#d1d5db', paddingVertical: 14, paddingHorizontal: 16,
          fontSize: 16, marginBottom: 24,
        }}
      />

      <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 12 }}>I am a...</Text>
      {roles.map((role) => (
        <TouchableOpacity
          key={role.id}
          onPress={() => setSelectedRole(role.id)}
          style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
            borderWidth: 2,
            borderColor: selectedRole === role.id ? '#10b981' : '#e5e7eb',
          }}
        >
          <Text style={{ fontSize: 36, marginRight: 16 }}>{role.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>{role.label}</Text>
            <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{role.desc}</Text>
          </View>
          {selectedRole === role.id && (
            <Text style={{ fontSize: 20, color: '#10b981' }}>✓</Text>
          )}
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        onPress={handleRegister}
        disabled={loading}
        style={{
          backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 12,
          marginTop: 16, opacity: loading ? 0.7 : 1,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, textAlign: 'center' }}>
          {loading ? 'Setting up...' : 'Get Started ♻️'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
