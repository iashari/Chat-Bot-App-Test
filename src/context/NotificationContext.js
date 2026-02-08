import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { getDigests, getUnreadDigestCount } from '../services/api';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState({
    visible: false,
    title: '',
    body: '',
    digestId: null,
  });
  const [unreadCount, setUnreadCount] = useState(0);

  // Track last known digest to detect new ones
  const lastDigestIdRef = useRef(null);
  const initializedRef = useRef(false);

  const showNotification = useCallback((title, body, digestId = null) => {
    setNotification({ visible: true, title, body, digestId });
  }, []);

  const dismissNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, visible: false }));
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const result = await getUnreadDigestCount();
      if (result.success) setUnreadCount(result.count);
    } catch (e) {}
  }, []);

  // Poll for new digests every 30 seconds
  useEffect(() => {
    const checkForNewDigests = async () => {
      try {
        const result = await getDigests();
        if (result.success && result.digests?.length > 0) {
          const latestDigest = result.digests[0];

          // On first load, just record the ID
          if (!initializedRef.current) {
            initializedRef.current = true;
            lastDigestIdRef.current = latestDigest.id;
            return;
          }

          // If there's a new digest we haven't seen
          if (latestDigest.id !== lastDigestIdRef.current) {
            lastDigestIdRef.current = latestDigest.id;
            showNotification(
              latestDigest.title || 'New Digest Available',
              'Your daily news digest is ready. Tap to read.',
              latestDigest.id
            );
          }
        }
      } catch (e) {
        // Silently ignore polling errors
      }
    };

    checkForNewDigests();
    refreshUnreadCount();
    const interval = setInterval(() => {
      checkForNewDigests();
      refreshUnreadCount();
    }, 30000);
    return () => clearInterval(interval);
  }, [showNotification, refreshUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        notification,
        showNotification,
        dismissNotification,
        unreadCount,
        refreshUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
