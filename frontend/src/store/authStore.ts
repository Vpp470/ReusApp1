import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { User } from '../types';
import { registerForPushNotificationsAsync } from '../services/notifications';
import api from '../services/api';

// Claus d'emmagatzematge
const STORAGE_KEYS = {
  USER: '@reusapp_user',
  TOKEN: '@reusapp_token',
  IS_AUTH: '@reusapp_isAuthenticated',
  CONSENT: '@reusapp_hasConsent',
};

// Helper per storage que funciona tant a web com a native
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        const value = localStorage.getItem(key);
        console.log(`📖 [WEB] getItem(${key}):`, value ? 'found' : 'null');
        return value;
      }
      const value = await AsyncStorage.getItem(key);
      console.log(`📖 [NATIVE] getItem(${key}):`, value ? 'found' : 'null');
      return value;
    } catch (error) {
      console.error(`❌ Error getItem(${key}):`, error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
        console.log(`💾 [WEB] setItem(${key}): saved`);
        return;
      }
      await AsyncStorage.setItem(key, value);
      console.log(`💾 [NATIVE] setItem(${key}): saved`);
    } catch (error) {
      console.error(`❌ Error setItem(${key}):`, error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
        console.log(`🗑️ [WEB] removeItem(${key}): removed`);
        return;
      }
      await AsyncStorage.removeItem(key);
      console.log(`🗑️ [NATIVE] removeItem(${key}): removed`);
    } catch (error) {
      console.error(`❌ Error removeItem(${key}):`, error);
    }
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
      await storage.setItem(STORAGE_KEYS.CONSENT, hasConsent ? 'true' : 'false');
      console.log('✅ Consent saved:', hasConsent);
      set({ hasConsent });
    } catch (error) {
      console.error('❌ Error saving consent:', error);
    }
  },
  
  login: async (user, token) => {
    try {
      console.log('🔐 Guardant sessió per a:', user.email);
      await storage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      await storage.setItem(STORAGE_KEYS.TOKEN, token);
      await storage.setItem(STORAGE_KEYS.IS_AUTH, 'true');
      console.log('✅ Sessió guardada correctament');
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
      console.error('❌ Error guardant sessió:', error);
    }
  },
  
  logout: async () => {
    try {
      console.log('🚪 Tancant sessió...');
      await storage.removeItem(STORAGE_KEYS.USER);
      await storage.removeItem(STORAGE_KEYS.TOKEN);
      await storage.removeItem(STORAGE_KEYS.IS_AUTH);
      console.log('✅ Sessió tancada correctament');
      set({ user: null, token: null, isAuthenticated: false });
    } catch (error) {
      console.error('❌ Error tancant sessió:', error);
    }
  },
  
  loadStoredAuth: async () => {
    try {
      console.log('🔍 Carregant sessió guardada...');
      console.log('📱 Plataforma:', Platform.OS);
      
      const userStr = await storage.getItem(STORAGE_KEYS.USER);
      const token = await storage.getItem(STORAGE_KEYS.TOKEN);
      const isAuth = await storage.getItem(STORAGE_KEYS.IS_AUTH);
      const consentStr = await storage.getItem(STORAGE_KEYS.CONSENT);
      
      console.log('📦 Dades trobades:', { 
        hasUser: !!userStr, 
        hasToken: !!token, 
        isAuth,
        hasConsent: consentStr
      });
      
      const hasConsent = consentStr === 'true';
      
      if (userStr && token && isAuth === 'true') {
        const user = JSON.parse(userStr);
        console.log('✅ Sessió restaurada per a:', user.email);
        set({ user, token, isAuthenticated: true, hasConsent, isLoading: false });
      } else {
        console.log('ℹ️ No hi ha sessió guardada');
        set({ hasConsent, isLoading: false });
      }
    } catch (error) {
      console.error('❌ Error carregant sessió:', error);
      set({ isLoading: false });
    }
  },
}));