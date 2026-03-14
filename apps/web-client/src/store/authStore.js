import { create } from 'zustand';
import api from '../services/api';
import { tokenStore } from '../services/api-client';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || localStorage.getItem('dealer_user') || 'null'),
  token: tokenStore.get(), // Use tokenStore for backward compatibility
  loading: false,
  error: null,

  login: async (credentials) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/auth/login', credentials);
      // Use tokenStore to store access token (refresh token is in HttpOnly cookie)
      if (data.accessToken) {
        tokenStore.set(data.accessToken, data.expiresIn || 900);
      }
      // Note: refreshToken not in response - it's in HttpOnly cookie (skill requirement)
      if (data.user) {
        localStorage.setItem('dealer_user', JSON.stringify(data.user));
        localStorage.setItem('user', JSON.stringify(data.user)); // Old key
      }
      set({ user: data.user, token: data.accessToken, loading: false });
      return data;
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Login failed';
      set({ error: msg, loading: false });
      throw err;
    }
  },

  register: async (userData) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/auth/register', userData);
      // Use tokenStore to store access token (refresh token is in HttpOnly cookie)
      if (data.accessToken) {
        tokenStore.set(data.accessToken, data.expiresIn || 900);
      }
      // Note: refreshToken not in response - it's in HttpOnly cookie (skill requirement)
      if (data.user) {
        localStorage.setItem('dealer_user', JSON.stringify(data.user));
        localStorage.setItem('user', JSON.stringify(data.user)); // Old key
      }
      set({ user: data.user, token: data.accessToken, loading: false });
      return data;
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Registration failed';
      set({ error: msg, loading: false });
      throw err;
    }
  },

  logout: () => {
    api.post('/auth/logout').catch(() => { });
    tokenStore.clear(); // Clears all token-related storage
    set({ user: null, token: null });
  },

  fetchProfile: async () => {
    try {
      const { data } = await api.get('/auth/me');
      localStorage.setItem('dealer_user', JSON.stringify(data));
      localStorage.setItem('user', JSON.stringify(data)); // Old key
      set({ user: data });
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  },

  isAuthenticated: () => !!tokenStore.get(), // Use tokenStore
}));

export default useAuthStore;
