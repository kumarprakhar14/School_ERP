import { AsyncLocalStorage } from 'node:async_hooks';

export const requestContext = new AsyncLocalStorage();

/**
 * Helper to get the current context store
 * @returns {Map<string, any> | undefined}
 */
export const getContext = () => requestContext.getStore();

/**
 * Helper to get a specific value from the context
 * @param {string} key
 * @returns {any}
 */
export const getContextValue = (key) => {
  const store = getContext();
  return store ? store.get(key) : undefined;
};

/**
 * Helper to set a specific value in the context
 * @param {string} key
 * @param {any} value
 */
export const setContextValue = (key, value) => {
  const store = getContext();
  if (store) {
    store.set(key, value);
  }
};
