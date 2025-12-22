import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { User } from '../types';
import { registerForPushNotificationsAsync } from '../services/notifications';
import api from '../services/api';

// Claus d'emmagatzematge
const STORAGE_KEYS = {
  USER: 'reusapp_user_data',
  TOKEN: 'reusapp_auth_token',
  IS_AUTH: 'reusapp_is_authenticated',
  CONSENT: 'reusapp_has_consent',
};

// Storage robust que funciona a totes les plataformes
const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        // Web: utilitzar localStorage
        if (typeof localStorage !== 'undefined') {
          const value = localStorage.getItem(key);
          console.log(`📖 [WEB] getItem(${key}):`, value ? 'FOUND' : 'NULL');
          return value;
        }
        return null;
      } else {
        // Native (iOS/Android): utilitzar SecureStore (més fiable)
        const value = await SecureStore.getItemAsync(key);
        console.log(`📖 [SECURE] getItem(${key}):`, value ? 'FOUND' : 'NULL');
        return value;
      }
    } catch (error) {
      console.error(`❌ Error getItem(${key}):`, error);
      // Fallback a AsyncStorage si SecureStore falla
      try {
        const fallbackValue = await AsyncStorage.getItem(key);
        console.log(`📖 [FALLBACK] getItem(${key}):`, fallbackValue ? 'FOUND' : 'NULL');
        return fallbackValue;
      } catch {
        return null;
      }
    }
  },
  
  setItem: async (key: string, value: string): Promise<boolean> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
          console.log(`💾 [WEB] setItem(${key}): SAVED`);
          return true;
        }
        return false;
      } else {
        // Native: guardar a SecureStore i també a AsyncStorage com a backup
        await SecureStore.setItemAsync(key, value);
        console.log(`💾 [SECURE] setItem(${key}): SAVED`);
        // Backup a AsyncStorage
        try {
          await AsyncStorage.setItem(key, value);
        } catch {}
        return true;
      }
    } catch (error) {
      console.error(`❌ Error setItem(${key}):`, error);
      // Fallback a AsyncStorage
      try {
        await AsyncStorage.setItem(key, value);
        console.log(`💾 [FALLBACK] setItem(${key}): SAVED`);
        return true;
      } catch {
        return false;
      }
    }
  },
  
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
          console.log(`🗑️ [WEB] removeItem(${key}): REMOVED`);
        }
      } else {
        await SecureStore.deleteItemAsync(key);
        console.log(`🗑️ [SECURE] removeItem(${key}): REMOVED`);
        // També eliminar del backup
        try {
          await AsyncStorage.removeItem(key);
        } catch {}
      }
    } catch (error) {
      console.error(`❌ Error removeItem(${key}):`, error);
      try {
        await AsyncStorage.removeItem(key);
      } catch {}
    }
  },
  
  // Guardar totes les dades d'autenticació d'una sola vegada
  saveAuthData: async (user: User, token: string): Promise<boolean> => {
    try {
      const userData = JSON.stringify(user);
      
      const results = await Promise.all([
        secureStorage.setItem(STORAGE_KEYS.USER, userData),
        secureStorage.setItem(STORAGE_KEYS.TOKEN, token),
        secureStorage.setItem(STORAGE_KEYS.IS_AUTH, 'true'),
      ]);
      
      const allSaved = results.every(r => r === true);
      console.log('💾 Auth data saved:', allSaved ? 'SUCCESS' : 'PARTIAL');
      return allSaved;
    } catch (error) {
      console.error('❌ Error saving auth data:', error);
      return false;
    }
  },
  
  // Carregar totes les dades d'autenticació
  loadAuthData: async (): Promise<{ user: User | null; token: string | null; isAuth: boolean }> => {
    try {
      const [userStr, token, isAuth] = await Promise.all([
        secureStorage.getItem(STORAGE_KEYS.USER),
        secureStorage.getItem(STORAGE_KEYS.TOKEN),
        secureStorage.getItem(STORAGE_KEYS.IS_AUTH),
      ]);
      
      console.log('📦 Auth data loaded:', {
        hasUser: !!userStr,
        hasToken: !!token,
        isAuth: isAuth,
      });
      
      if (userStr && token && isAuth === 'true') {
        const user = JSON.parse(userStr) as User;
        return { user, token, isAuth: true };
      }
      
      return { user: null, token: null, isAuth: false };
    } catch (error) {
      console.error('❌ Error loading auth data:', error);
      return { user: null, token: null, isAuth: false };
    }
  },
  
  // Eliminar totes les dades d'autenticació
  clearAuthData: async (): Promise<void> => {
    await Promise.all([
      secureStorage.removeItem(STORAGE_KEYS.USER),
      secureStorage.removeItem(STORAGE_KEYS.TOKEN),
      secureStorage.removeItem(STORAGE_KEYS.IS_AUTH),
    ]);
    console.log('🗑️ Auth data cleared');
  },
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
  verifyToken: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  hasConsent: false,
  
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  setToken: (token) => set({ token }),
  
  setConsent: async (hasConsent) => {
    try {
      await secureStorage.setItem(STORAGE_KEYS.CONSENT, hasConsent ? 'true' : 'false');
      console.log('✅ Consent saved:', hasConsent);
      set({ hasConsent });
    } catch (error) {
      console.error('❌ Error saving consent:', error);
    }
  },
  
  login: async (user, token) => {
    try {
      console.log('🔐 Guardant sessió per a:', user.email);
      
      // Guardar les dades de forma segura
      const saved = await secureStorage.saveAuthData(user, token);
      
      if (saved) {
        console.log('✅ Sessió guardada correctament per a:', user.email);
        set({ user, token, isAuthenticated: true });
        
        // Registrar push token en segon pla
        registerForPushNotificationsAsync().then(async (pushToken) => {
          if (pushToken) {
            try {
              await api.put('/users/push-token', 
                { push_token: pushToken },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              console.log('📱 Push token registered');
            } catch (error) {
              console.error('Error registering push token:', error);
            }
          }
        }).catch(() => {});
      } else {
        console.error('❌ Error guardant sessió - dades no guardades');
        // Encara així, permetre l'accés però avisar que no es recordarà
        set({ user, token, isAuthenticated: true });
      }
    } catch (error) {
      console.error('❌ Error en login:', error);
      // Permetre accés encara que falli el guardat
      set({ user, token, isAuthenticated: true });
    }
  },
  
  logout: async () => {
    try {
      console.log('🚪 Tancant sessió...');
      await secureStorage.clearAuthData();
      console.log('✅ Sessió tancada correctament');
      set({ user: null, token: null, isAuthenticated: false });
    } catch (error) {
      console.error('❌ Error tancant sessió:', error);
      // Forçar logout encara que falli
      set({ user: null, token: null, isAuthenticated: false });
    }
  },
  
  // Verificar que el token és vàlid amb el servidor
  verifyToken: async (): Promise<boolean> => {
    const { token } = get();
    if (!token) return false;
    
    try {
      console.log('🔍 Verificant token amb el servidor...');
      const response = await api.get('/users/me', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      
      if (response.data && response.data._id) {
        console.log('✅ Token vàlid per a:', response.data.email);
        // Actualitzar les dades de l'usuari
        set({ user: response.data });
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Token invàlid o servidor no disponible');
      return false;
    }
  },
  
  loadStoredAuth: async () => {
    try {
      console.log('═══════════════════════════════════════');
      console.log('🔍 CARREGANT SESSIÓ GUARDADA...');
      console.log('📱 Plataforma:', Platform.OS);
      console.log('═══════════════════════════════════════');
      
      // Carregar dades guardades
      const { user, token, isAuth } = await secureStorage.loadAuthData();
      const consentStr = await secureStorage.getItem(STORAGE_KEYS.CONSENT);
      const hasConsent = consentStr === 'true';
      
      if (user && token && isAuth) {
        console.log('📦 Sessió trobada per a:', user.email);
        
        // Establir l'estat amb les dades guardades
        set({ 
          user, 
          token, 
          isAuthenticated: true, 
          hasConsent, 
          isLoading: false 
        });
        
        console.log('✅ SESSIÓ RESTAURADA CORRECTAMENT');
        console.log('═══════════════════════════════════════');
        
        // Verificar token amb el servidor en segon pla (opcional)
        // Si falla, l'usuari continuarà autenticat fins que faci una acció que requereixi servidor
        
      } else {
        console.log('ℹ️ NO HI HA SESSIÓ GUARDADA');
        console.log('➡️ Redirigint a login...');
        console.log('═══════════════════════════════════════');
        set({ hasConsent, isLoading: false, isAuthenticated: false });
      }
    } catch (error) {
      console.error('❌ ERROR CARREGANT SESSIÓ:', error);
      console.log('➡️ Redirigint a login per seguretat...');
      console.log('═══════════════════════════════════════');
      set({ isLoading: false, isAuthenticated: false });
    }
  },
}));
