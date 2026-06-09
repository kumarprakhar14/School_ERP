import api from './api';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

/**
 * Push Notification Utilities
 * 
 * Standalone functions for managing browser push subscriptions.
 * Used by the usePushNotification hook and PushNotification component.
 * 
 * Subscription is only triggered by explicit user action ("Enable Notifications"),
 * NOT automatically on login. Subscriptions persist across logouts.
 */

/**
 * Convert a URL-safe base64 string to a Uint8Array (for applicationServerKey).
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if the browser supports push notifications.
 */
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Get the current notification permission state.
 * @returns {'default' | 'granted' | 'denied'}
 */
export function getPermissionState() {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

/**
 * Check if the user already has an active push subscription.
 * @returns {Promise<boolean>}
 */
export async function checkExistingSubscription() {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

/**
 * Subscribe the user to push notifications.
 * 1. Registers the service worker
 * 2. Requests notification permission (browser native prompt)
 * 3. Subscribes to the browser push service
 * 4. Sends the subscription to the backend via authenticated API
 * 
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function subscribeToPush() {
  if (!isPushSupported()) {
    return { success: false, message: 'Push notifications are not supported in this browser.' };
  }

  try {
    // 1. Register Service Worker
    const registration = await navigator.serviceWorker.register('/serviceWorker.js', { scope: '/' });

    // 2. Request Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, message: 'Notification permission was denied.' };
    }

    // 3. Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // 4. Subscribe to Browser Push Service
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // 5. Send Subscription to Backend
    await api.post('/notifications/subscribe', subscription.toJSON());

    return { success: true };
  } catch (error) {
    console.error('[Push] Subscription failed:', error);
    return { success: false, message: 'Failed to enable notifications. Please try again.' };
  }
}

/**
 * Unsubscribe the user from push notifications.
 * Removes the subscription from both the browser and the backend.
 * 
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function unsubscribeFromPush() {
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) {
      return { success: true };
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      return { success: true };
    }

    // Unsubscribe from browser
    await subscription.unsubscribe();

    // Notify backend
    await api.post('/notifications/unsubscribe', { endpoint: subscription.endpoint });

    return { success: true };
  } catch (error) {
    console.error('[Push] Unsubscribe failed:', error);
    return { success: false, message: 'Failed to disable notifications.' };
  }
}
