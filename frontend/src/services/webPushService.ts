/**
 * Servei de Web Push Notifications per El Tomb de Reus
 * Gestiona el registre del Service Worker i les subscripcions push
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = '/api';

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
async function getVapidPublicKey(): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE}/web-push/vapid-public-key`);
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
export async function subscribeToWebPush(authToken: string): Promise<boolean> {
  if (!isWebPushSupported()) {
    console.log('[WebPush] Web Push no suportat');
    return false;
  }
  
  try {
    // 1. Registrar Service Worker
    const registration = await registerServiceWorker();
    if (!registration) {
      throw new Error('No s\'ha pogut registrar el Service Worker');
    }
    
    // 2. Sol·licitar permís
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.log('[WebPush] Permís de notificacions no concedit');
      return false;
    }
    
    // 3. Obtenir clau VAPID
    const vapidPublicKey = await getVapidPublicKey();
    if (!vapidPublicKey) {
      throw new Error('No s\'ha pogut obtenir la clau VAPID');
    }
    
    // 4. Crear subscripció push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });
    
    console.log('[WebPush] Subscripció creada:', subscription.endpoint);
    
    // 5. Enviar subscripció al servidor
    const subscriptionJson = subscription.toJSON();
    const response = await fetch(`${API_BASE}/web-push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken
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
      throw new Error('Error guardant subscripció al servidor');
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
    await fetch(`${API_BASE}/web-push/unsubscribe`, {
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
