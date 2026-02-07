import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { getDigests } from '../services/api';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState({
    visible: false,
    title: '',
    body: '',
    digestId: null,
  });

  // Track last known digest to detect new ones
  const lastDigestIdRef = useRef(null);
  const initializedRef = useRef(false);

  const showNotification = useCallback((title, body, digestId = null) => {
    setNotification({ visible: true, title, body, digestId });
  }, []);

  const dismissNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, visible: false }));
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
    const interval = setInterval(checkForNewDigests, 30000);
    return () => clearInterval(interval);
  }, [showNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notification,
        showNotification,
        dismissNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
