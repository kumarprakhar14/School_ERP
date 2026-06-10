import { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { toast } from 'sonner';
import usePushNotification from '../hooks/usePushNotification';

/**
 * Push Notification Permission UI
 * 
 * Full-width, dismissible banner rendered at the top of the dashboard.
 * Matches existing SchoolChakra design system.
 */
export default function PushNotification() {
  const { isSupported, isSubscribed, permission, isLoading, subscribe } = usePushNotification();
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (!isSupported) return;

    if (permission === 'granted' || isSubscribed) {
      setShouldShow(false);
      return;
    }

    if (permission === 'denied') {
      setShouldShow(true);
      return;
    }

    if (permission === 'default') {
      const dismissStateStr = localStorage.getItem('notificationBannerDismissState');
      if (!dismissStateStr) {
        setShouldShow(true);
        return;
      }

      try {
        const dismissState = JSON.parse(dismissStateStr);
        const { count, lastDismissedAt } = dismissState;
        const daysSinceDismiss = (Date.now() - lastDismissedAt) / (1000 * 60 * 60 * 24);

        if (count === 1 && daysSinceDismiss >= 7) {
          setShouldShow(true);
        } else if (count === 2 && daysSinceDismiss >= 30) {
          setShouldShow(true);
        } else if (count >= 3) {
          setShouldShow(false);
        } else {
          setShouldShow(false);
        }
      } catch (e) {
        localStorage.removeItem('notificationBannerDismissState');
        setShouldShow(true);
      }
    }
  }, [isSupported, isSubscribed, permission]);

  if (!shouldShow) return null;

  const handleDismiss = () => {
    setShouldShow(false);
    
    if (permission === 'default') {
      const dismissStateStr = localStorage.getItem('notificationBannerDismissState');
      let count = 1;
      if (dismissStateStr) {
        try {
          const dismissState = JSON.parse(dismissStateStr);
          count = dismissState.count + 1;
        } catch (e) {}
      }
      localStorage.setItem('notificationBannerDismissState', JSON.stringify({
        count,
        lastDismissedAt: Date.now()
      }));
    }
  };

  const handleEnable = async () => {
    const result = await subscribe();
    if (result.success) {
      toast.success('Notifications enabled successfully!');
      setShouldShow(false);
    } else {
      toast.error(result.message || 'Failed to enable notifications.');
    }
  };

  // State 3: Denied
  if (permission === 'denied') {
    return (
      <div className="w-full bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm shadow-sm">
        <div className="flex items-center gap-2.5 text-red-800 flex-1">
          <BellOff className="w-4 h-4 shrink-0 text-red-500" />
          <p className="font-medium">
            <span className="font-bold mr-1">Notifications are blocked in your browser.</span>
            <span className="text-red-700/80">Enable notifications from your browser settings to receive school updates.</span>
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          <button
            onClick={() => window.open('https://support.google.com/chrome/answer/3220216', '_blank')}
            className="text-xs font-bold text-red-600 hover:text-red-800 transition-colors bg-white px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50"
          >
            How to Enable
          </button>
          <button
            onClick={() => setShouldShow(false)}
            className="text-red-400 hover:text-red-700 transition-colors p-1"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // State 1: Default (Opt-In Banner)
  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm shadow-sm">
      <div className="flex items-center gap-2.5 text-gray-900 flex-1">
        <Bell className="w-4 h-4 text-blue-600 shrink-0" />
        <p>
          <span className="font-bold mr-1">Browser Notifications</span>
          <span className="text-gray-500 font-medium">Get notices, assignments, attendance updates and fee reminders instantly.</span>
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
        <button
          onClick={handleEnable}
          disabled={isLoading}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-colors text-xs disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isLoading ? 'Enabling...' : 'Enable Notifications'}
        </button>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-700 transition-colors p-1"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
