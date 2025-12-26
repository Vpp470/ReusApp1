/**
 * Servei de Web Push Notifications per El Tomb de Reus
 * Gestiona el registre del Service Worker i les subscripcions push
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Obtenir la URL base de l'API
const getApiBase = (): string => {
  // En web, primer intentem obtenir la URL de l'entorn
  const envUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                 process.env.EXPO_PUBLIC_BACKEND_URL;
  
  if (envUrl) {
    return `${envUrl}/api`;
  }
  
  // Fallback: usar URL relativa
  return '/api';
};

/**
 * Converteix una clau base64 URL-safe a Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Verifica si el navegador suporta Web Push
 */
export function isWebPushSupported(): boolean {
  if (Platform.OS !== 'web') return false;
  
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Verifica l'estat actual de les notificacions
 */
export function getNotificationPermission(): NotificationPermission | null {
  if (Platform.OS !== 'web' || !('Notification' in window)) return null;
  return Notification.permission;
}

/**
 * Registra el Service Worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (Platform.OS !== 'web' || !('serviceWorker' in navigator)) {
    console.log('[WebPush] Service Worker no suportat');
    return null;
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    
    console.log('[WebPush] Service Worker registrat:', registration.scope);
    return registration;
  } catch (error) {
    console.error('[WebPush] Error registrant Service Worker:', error);
    return null;
  }
}

/**
 * Sol·licita permís per notificacions
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (Platform.OS !== 'web' || !('Notification' in window)) {
    return 'denied';
  }
  
  const permission = await Notification.requestPermission();
  console.log('[WebPush] Permís de notificacions:', permission);
  return permission;
}

/**
 * Obté la clau pública VAPID del servidor
 */
export async function getVapidPublicKey(): Promise<string | null> {
  try {
    const apiBase = getApiBase();
    console.log('[WebPush] Obtenint clau VAPID de:', `${apiBase}/web-push/vapid-public-key`);
    const response = await fetch(`${apiBase}/web-push/vapid-public-key`);
    if (!response.ok) {
      throw new Error('No s\'ha pogut obtenir la clau VAPID');
    }
    const data = await response.json();
    return data.vapidPublicKey;
  } catch (error) {
    console.error('[WebPush] Error obtenint clau VAPID:', error);
    return null;
  }
}

/**
 * Subscriu l'usuari a les notificacions Web Push
 */
export async function subscribeToWebPush(authToken?: string): Promise<boolean> {
  if (!isWebPushSupported()) {
    console.log('[WebPush] Web Push no suportat');
    return false;
  }
  
  // Obtenir token - si no es passa, intentar del localStorage
  let token = authToken;
  if (!token && typeof localStorage !== 'undefined') {
    token = localStorage.getItem('reusapp_auth_token') || undefined;
    console.log('[WebPush] Token obtingut de localStorage:', token ? 'SÍ' : 'NO');
  }
  
  if (!token) {
    console.error('[WebPush] No hi ha token d\'autenticació!');
    return false;
  }
  
  try {
    // 1. Registrar Service Worker
    console.log('[WebPush] 1. Registrant Service Worker...');
    const registration = await registerServiceWorker();
    if (!registration) {
      throw new Error('No s\'ha pogut registrar el Service Worker');
    }
    console.log('[WebPush] Service Worker registrat correctament');
    
    // 2. Sol·licitar permís
    console.log('[WebPush] 2. Sol·licitant permís...');
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.log('[WebPush] Permís de notificacions no concedit:', permission);
      return false;
    }
    console.log('[WebPush] Permís concedit!');
    
    // 3. Obtenir clau VAPID
    console.log('[WebPush] 3. Obtenint clau VAPID...');
    const vapidPublicKey = await getVapidPublicKey();
    if (!vapidPublicKey) {
      throw new Error('No s\'ha pogut obtenir la clau VAPID');
    }
    console.log('[WebPush] Clau VAPID obtinguda');
    
    // 4. Crear subscripció push
    console.log('[WebPush] 4. Creant subscripció push...');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });
    
    console.log('[WebPush] Subscripció creada:', subscription.endpoint);
    
    // 5. Enviar subscripció al servidor
    console.log('[WebPush] 5. Enviant subscripció al servidor...');
    const subscriptionJson = subscription.toJSON();
    const apiBase = getApiBase();
    console.log('[WebPush] API Base:', apiBase);
    console.log('[WebPush] Token (primers 20 chars):', token.substring(0, 20) + '...');
    
    const response = await fetch(`${apiBase}/web-push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscriptionJson.keys?.p256dh,
          auth: subscriptionJson.keys?.auth
        }
      })
    });
    
    console.log('[WebPush] Resposta del servidor:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[WebPush] Error del servidor:', errorText);
      throw new Error('Error guardant subscripció al servidor: ' + errorText);
    }
    
    // 6. Guardar estat local
    await AsyncStorage.setItem('web_push_subscribed', 'true');
    
    console.log('[WebPush] ✅ Subscripció completada amb èxit');
    return true;
    
  } catch (error) {
    console.error('[WebPush] Error subscrivint:', error);
    return false;
  }
}

/**
 * Dessubscriu l'usuari de les notificacions Web Push
 */
export async function unsubscribeFromWebPush(authToken: string): Promise<boolean> {
  if (Platform.OS !== 'web') return false;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
    }
    
    // Eliminar del servidor
    const apiBase = getApiBase();
    await fetch(`${apiBase}/web-push/unsubscribe`, {
      method: 'DELETE',
      headers: {
        'Authorization': authToken
      }
    });
    
    await AsyncStorage.removeItem('web_push_subscribed');
    
    console.log('[WebPush] Dessubscrit correctament');
    return true;
    
  } catch (error) {
    console.error('[WebPush] Error dessubscrivint:', error);
    return false;
  }
}

/**
 * Verifica si l'usuari ja està subscrit
 */
export async function isSubscribedToWebPush(): Promise<boolean> {
  if (Platform.OS !== 'web' || !('serviceWorker' in navigator)) {
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Re-sincronitza la subscripció existent amb el servidor
 * Útil quan la subscripció existeix al navegador però no s'ha guardat al servidor
 */
export async function resyncWebPushSubscription(authToken?: string): Promise<boolean> {
  if (!isWebPushSupported()) {
    console.log('[WebPush] Web Push no suportat');
    return false;
  }
  
  // Obtenir token
  let token = authToken;
  if (!token && typeof localStorage !== 'undefined') {
    token = localStorage.getItem('reusapp_auth_token') || undefined;
  }
  
  if (!token) {
    console.error('[WebPush] No hi ha token d\'autenticació per re-sincronitzar!');
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      console.log('[WebPush] No hi ha subscripció existent per re-sincronitzar');
      return false;
    }
    
    console.log('[WebPush] Re-sincronitzant subscripció existent...');
    
    const subscriptionJson = subscription.toJSON();
    const apiBase = getApiBase();
    
    const response = await fetch(`${apiBase}/web-push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscriptionJson.keys?.p256dh,
          auth: subscriptionJson.keys?.auth
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[WebPush] Error re-sincronitzant:', errorText);
      return false;
    }
    
    console.log('[WebPush] ✅ Re-sincronització completada');
    return true;
    
  } catch (error) {
    console.error('[WebPush] Error re-sincronitzant:', error);
    return false;
  }
}

/**
 * Inicialitza Web Push automàticament si l'usuari ja ha donat permís
 */
export async function initWebPushIfPermitted(authToken: string): Promise<void> {
  if (!isWebPushSupported()) return;
  
  const permission = getNotificationPermission();
  if (permission === 'granted') {
    const isSubscribed = await isSubscribedToWebPush();
    if (!isSubscribed) {
      console.log('[WebPush] Re-subscrivint usuari amb permís existent...');
      await subscribeToWebPush(authToken);
    }
  }
}
