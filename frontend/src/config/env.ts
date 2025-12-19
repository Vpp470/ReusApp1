import Constants from 'expo-constants';

// Detectar l'entorn automàticament
const getBackendUrl = (): string => {
  // Si estem a producció (www.reusapp.com), usar el backend de Railway
  if (typeof window !== 'undefined' && window.location.hostname === 'www.reusapp.com') {
    return 'https://www.reusapp.com';
  }
  
  // Si estem a reusapp.com (sense www), usar el backend de Railway
  if (typeof window !== 'undefined' && window.location.hostname === 'reusapp.com') {
    return 'https://www.reusapp.com';
  }
  
  // Altrament, usar la variable d'entorn (per desenvolupament)
  return Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
         process.env.EXPO_PUBLIC_BACKEND_URL || 
         'https://www.reusapp.com';
};

export const API_URL = getBackendUrl();

export const config = {
  apiUrl: API_URL,
  environment: typeof window !== 'undefined' && 
               (window.location.hostname === 'www.reusapp.com' || window.location.hostname === 'reusapp.com') 
               ? 'production' : 'development',
};
