import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { sendOtp, verifyOtp } from '../../services/auth.service';
import useAuthStore from '../../store/auth.store';

export default function LoginScreen() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpId, setOtpId] = useState(null);
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [loading, setLoading] = useState(false);

  async function handleSendOtp() {
    if (!phone || phone.length < 10) {
      return Alert.alert('Error', 'Please enter a valid phone number');
    }
    setLoading(true);
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+92${phone}`;
      const res = await sendOtp(formattedPhone);
      setOtpId(res.otp_id);
      setStep('otp');

      // Show OTP in dev mode
      if (res.otp) {
        Alert.alert('Dev Mode', `Your OTP is: ${res.otp}`);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otp || otp.length !== 6) {
      return Alert.alert('Error', 'Please enter the 6-digit OTP');
    }
    setLoading(true);
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+92${phone}`;
      const { user, isNewUser } = await verifyOtp(formattedPhone, otp, otpId);
      setUser(user);

      if (isNewUser || !user.name || !user.role) {
        router.replace('/(auth)/register');
      } else {
        switch (user.role) {
          case 'house_owner':
            router.replace('/(owner)');
            break;
          case 'local_collector':
            router.replace('/(collector)');
            break;
          case 'regional_collector':
            router.replace('/(regional)');
            break;
          default:
            router.replace('/(auth)/register');
        }
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#ecfdf5' }}
    >
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 8 }}>♻️</Text>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#064e3b', textAlign: 'center' }}>
          GreenCollect
        </Text>
        <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 40 }}>
          Smart Garbage Collection Platform
        </Text>

        {step === 'phone' ? (
          <View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
              Phone Number
            </Text>
            <View
              style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
                borderColor: '#d1d5db', paddingHorizontal: 12,
              }}
            >
              <Text style={{ fontSize: 16, color: '#6b7280', marginRight: 4 }}>+92</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="9876543210"
                keyboardType="phone-pad"
                maxLength={10}
                style={{ flex: 1, paddingVertical: 14, fontSize: 16 }}
              />
            </View>

            <TouchableOpacity
              onPress={handleSendOtp}
              disabled={loading}
              style={{
                backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 12,
                marginTop: 20, opacity: loading ? 0.7 : 1,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, textAlign: 'center' }}>
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 16 }}>
              Enter the 6-digit OTP sent to +92{phone}
            </Text>
            <TextInput
              value={otp}
              onChangeText={setOtp}
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              style={{
                backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
                borderColor: '#d1d5db', paddingVertical: 14, paddingHorizontal: 16,
                fontSize: 24, textAlign: 'center', letterSpacing: 8,
              }}
            />

            <TouchableOpacity
              onPress={handleVerifyOtp}
              disabled={loading}
              style={{
                backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 12,
                marginTop: 20, opacity: loading ? 0.7 : 1,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, textAlign: 'center' }}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep('phone')} style={{ marginTop: 16 }}>
              <Text style={{ color: '#10b981', textAlign: 'center' }}>← Change phone number</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
