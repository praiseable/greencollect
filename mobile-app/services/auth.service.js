import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function sendOtp(phone) {
  const res = await api.post('/auth/send-otp', { phone });
  return res.data;
}

export async function verifyOtp(phone, otp, otpId) {
  const res = await api.post('/auth/verify-otp', { phone, otp, otp_id: otpId });
  const { access_token, refresh_token, user, is_new_user } = res.data;

  await AsyncStorage.setItem('gc_access_token', access_token);
  await AsyncStorage.setItem('gc_refresh_token', refresh_token);
  await AsyncStorage.setItem('gc_user', JSON.stringify(user));

  return { user, isNewUser: is_new_user };
}

export async function registerDetails(data) {
  const res = await api.put('/auth/register-details', data);
  const user = res.data.user;
  await AsyncStorage.setItem('gc_user', JSON.stringify(user));
  return user;
}

export async function updateFcmToken(token) {
  await api.put('/auth/register-details', { fcm_token: token });
}

export async function logout() {
  await AsyncStorage.multiRemove(['gc_access_token', 'gc_refresh_token', 'gc_user']);
}

export async function getStoredUser() {
  const userStr = await AsyncStorage.getItem('gc_user');
  return userStr ? JSON.parse(userStr) : null;
}

export async function isLoggedIn() {
  const token = await AsyncStorage.getItem('gc_access_token');
  return !!token;
}
