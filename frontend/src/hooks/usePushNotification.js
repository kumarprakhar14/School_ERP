import { useState, useEffect } from 'react';
import {
  isPushSupported,
  getPermissionState,
  checkExistingSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from '../lib/pushNotification';

/**
 * Custom hook for managing push notification state in React components.
 * 
 * Checks browser support, current permission, and subscription status on mount.
 * Provides subscribe/unsubscribe functions that update state reactively.
 * 
 * @returns {{
 *   isSupported: boolean,
 *   isSubscribed: boolean,
 *   permission: string,
 *   isLoading: boolean,
 *   subscribe: () => Promise<{success: boolean, message?: string}>,
 *   unsubscribe: () => Promise<{success: boolean, message?: string}>
 * }}
 */
export default function usePushNotification() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const supported = isPushSupported();
      setIsSupported(supported);
      setPermission(getPermissionState());

      if (supported) {
        const subscribed = await checkExistingSubscription();
        setIsSubscribed(subscribed);
      }

      setIsLoading(false);
    };

    init();
  }, []);

  const subscribe = async () => {
    setIsLoading(true);
    const result = await subscribeToPush();
    if (result.success) {
      setIsSubscribed(true);
      setPermission('granted');
    }
    setIsLoading(false);
    return result;
  };

  const unsubscribe = async () => {
    setIsLoading(true);
    const result = await unsubscribeFromPush();
    if (result.success) {
      setIsSubscribed(false);
    }
    setIsLoading(false);
    return result;
  };

  return { isSupported, isSubscribed, permission, isLoading, subscribe, unsubscribe };
}
