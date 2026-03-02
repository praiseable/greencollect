import { create } from 'zustand';
import api from '../services/api';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,
  loading: false,
  error: null,

  login: async (credentials) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/auth/login', credentials);
      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
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
      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      set({ user: data.user, token: data.accessToken, loading: false });
      return data;
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Registration failed';
      set({ error: msg, loading: false });
      throw err;
    }
  },

  logout: () => {
    api.post('/auth/logout').catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },

  fetchProfile: async () => {
    try {
      const { data } = await api.get('/auth/me');
      localStorage.setItem('user', JSON.stringify(data));
      set({ user: data });
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  },

  isAuthenticated: () => !!get().token,
}));

export default useAuthStore;
