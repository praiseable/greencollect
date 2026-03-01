import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useAuthStore = create((set) => ({
  user: null,
  isLoggedIn: false,
  isLoading: true,

  setUser: (user) => set({ user, isLoggedIn: !!user }),

  initialize: async () => {
    try {
      const token = await AsyncStorage.getItem('gc_access_token');
      const userStr = await AsyncStorage.getItem('gc_user');
      if (token && userStr) {
        set({ user: JSON.parse(userStr), isLoggedIn: true, isLoading: false });
      } else {
        set({ user: null, isLoggedIn: false, isLoading: false });
      }
    } catch {
      set({ user: null, isLoggedIn: false, isLoading: false });
    }
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['gc_access_token', 'gc_refresh_token', 'gc_user']);
    set({ user: null, isLoggedIn: false });
  },
}));

export default useAuthStore;
