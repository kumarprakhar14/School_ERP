import { useState } from 'react';
import { Bell, BellOff, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import usePushNotification from '../hooks/usePushNotification';

/**
 * Push Notification Opt-In Card
 * 
 * Shows an informative card explaining what notifications the user will receive.
 * Only displayed when the user hasn't subscribed yet and hasn't dismissed the card.
 * After enabling: shows a compact "Notifications enabled" state with a disable option.
 * 
 * Does NOT auto-subscribe — requires explicit user click.
 */
export default function PushNotification() {
  const { isSupported, isSubscribed, permission, isLoading, subscribe, unsubscribe } = usePushNotification();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't render if:
  // - Browser doesn't support push
  // - Permission was permanently denied
  // - User dismissed the card (session only)
  if (!isSupported || (permission === 'denied' && !isSubscribed)) return null;
  if (isDismissed && !isSubscribed) return null;

  const handleEnable = async () => {
    const result = await subscribe();
    if (result.success) {
      toast.success('Notifications enabled successfully!');
    } else {
      toast.error(result.message || 'Failed to enable notifications.');
    }
  };

  const handleDisable = async () => {
    const result = await unsubscribe();
    if (result.success) {
      toast.success('Notifications disabled.');
    } else {
      toast.error(result.message || 'Failed to disable notifications.');
    }
  };

  // Compact enabled state
  if (isSubscribed) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-xs font-bold text-emerald-700">Notifications On</span>
        </div>
        <button
          onClick={handleDisable}
          disabled={isLoading}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors font-medium flex items-center gap-1"
          title="Disable notifications"
        >
          <BellOff className="w-3 h-3" />
          Disable
        </button>
      </div>
    );
  }

  // Full opt-in card
  return (
    <div className="mt-3 bg-blue-50/50 border border-blue-100 rounded-xl p-4 relative">
      <button
        onClick={() => setIsDismissed(true)}
        className="absolute top-2.5 right-2.5 text-gray-400 hover:text-gray-600 transition-colors"
        title="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
          <Bell className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-gray-900">Stay Updated</h4>
          <ul className="mt-1.5 space-y-0.5 text-xs text-gray-600">
            <li className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-blue-400 shrink-0"></span>
              New notices & announcements
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-indigo-400 shrink-0"></span>
              Assignment updates
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0"></span>
              Fee reminders
            </li>
          </ul>
          <button
            onClick={handleEnable}
            disabled={isLoading}
            className="mt-3 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center gap-1.5 shadow-sm"
          >
            <Bell className="w-3.5 h-3.5" />
            {isLoading ? 'Enabling...' : 'Enable Notifications'}
          </button>
        </div>
      </div>
    </div>
  );
}
