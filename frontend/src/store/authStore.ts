import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { User } from '../types';
import { registerForPushNotificationsAsync } from '../services/notifications';
import api from '../services/api';

// Helper per storage que funciona tant a web com a native
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
      return;
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
      return;
    }
    return AsyncStorage.removeItem(key);
  }
};

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasConsent: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setConsent: (hasConsent: boolean) => Promise<void>;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  hasConsent: false,
  
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  setToken: (token) => set({ token }),
  
  setConsent: async (hasConsent) => {
    try {
      await AsyncStorage.setItem('hasConsent', hasConsent ? 'true' : 'false');
      console.log('✅ Consent saved:', hasConsent);
      set({ hasConsent });
    } catch (error) {
      console.error('❌ Error saving consent:', error);
    }
  },
  
  login: async (user, token) => {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(user));
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('isAuthenticated', 'true');
      console.log('✅ Auth data saved to AsyncStorage');
      set({ user, token, isAuthenticated: true });
      
      // Registrar push token
      try {
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          await api.put('/users/push-token', 
            { push_token: pushToken },
            { headers: { Authorization: token } }
          );
          console.log('Push token registered successfully');
        }
      } catch (error) {
        console.error('Error registering push token:', error);
      }
    } catch (error) {
      console.error('❌ Error saving auth data:', error);
    }
  },
  
  logout: async () => {
    try {
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('isAuthenticated');
      console.log('✅ Auth data removed from AsyncStorage');
      set({ user: null, token: null, isAuthenticated: false });
    } catch (error) {
      console.error('❌ Error removing auth data:', error);
    }
  },
  
  loadStoredAuth: async () => {
    try {
      console.log('🔍 Loading stored auth...');
      const userStr = await AsyncStorage.getItem('user');
      const token = await AsyncStorage.getItem('token');
      const isAuth = await AsyncStorage.getItem('isAuthenticated');
      const consentStr = await AsyncStorage.getItem('hasConsent');
      
      console.log('📦 Stored data:', { 
        hasUser: !!userStr, 
        hasToken: !!token, 
        isAuth,
        hasConsent: consentStr
      });
      
      const hasConsent = consentStr === 'true';
      
      if (userStr && token && isAuth === 'true') {
        const user = JSON.parse(userStr);
        console.log('✅ Auth restored for user:', user.email);
        set({ user, token, isAuthenticated: true, hasConsent, isLoading: false });
      } else {
        console.log('ℹ️ No stored auth found');
        set({ hasConsent, isLoading: false });
      }
    } catch (error) {
      console.error('❌ Error loading stored auth:', error);
      set({ isLoading: false });
    }
  },
}));