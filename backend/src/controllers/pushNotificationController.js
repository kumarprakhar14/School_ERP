import { saveSubscription, removeSubscription } from '../services/notificationService.js';

/**
 * Subscribe to push notifications.
 * Saves the browser push subscription to the database, associated with the
 * authenticated user. Called when the user clicks "Enable Notifications".
 */
const subscribe = async (req, res, next) => {
  try {
    const subscription = req.body;
    const { userId, schoolId } = req.user;

    await saveSubscription(userId, schoolId, subscription);

    res.status(201).json({ message: 'Subscription saved successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Unsubscribe from push notifications.
 * Removes the subscription from the database. Called when the user
 * explicitly disables notifications from settings.
 */
const unsubscribe = async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    const { userId } = req.user;

    if (!endpoint) {
      return res.status(400).json({ message: 'Subscription endpoint is required' });
    }

    await removeSubscription(userId, endpoint);

    res.json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    next(error);
  }
};

export { subscribe, unsubscribe };