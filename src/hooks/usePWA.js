// Hook React pour PWA Features
// src/hooks/usePWA.js

import { useState, useEffect, useCallback } from 'react';

export const usePWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(false);

  // 1. Installation PWA One-Click
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log('📱 PWA installed successfully');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // 2. Notifications Push
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // 3. Online/Offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Déclencher la synchronisation background
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then(registration => {
          return registration.sync.register('sync-sales');
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fonction d'installation PWA
  const installPWA = useCallback(async () => {
    if (!deferredPrompt) return false;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('📱 User accepted PWA installation');
      } else {
        console.log('📱 User dismissed PWA installation');
      }
      
      setDeferredPrompt(null);
      return outcome === 'accepted';
    } catch (error) {
      console.error('❌ PWA installation error:', error);
      return false;
    }
  }, [deferredPrompt]);

  // Fonction pour demander les notifications
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('🔔 Notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        // S'abonner aux notifications push
        await subscribeToPushNotifications();
        console.log('🔔 Notification permission granted');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Notification permission error:', error);
      return false;
    }
  }, []);

  // S'abonner aux notifications push
  const subscribeToPushNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Vérifier si push manager est disponible
      if (!registration.pushManager) {
        console.warn('🔔 Push notifications not supported');
        return null;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.REACT_APP_VAPID_PUBLIC_KEY
      });

      // Envoyer la subscription au serveur
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });

      console.log('🔔 Push subscription successful');
      return subscription;
    } catch (error) {
      console.error('❌ Push subscription error:', error);
      return null;
    }
  };

  // Envoyer une notification locale
  const showLocalNotification = useCallback((title, options = {}) => {
    // Vérifier si les notifications sont supportées et permission accordée
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      console.warn('🔔 Notification non disponible ou permission non accordée');
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: '/logos/icon-pwa.svg',
        badge: '/logos/favicon.svg',
        vibrate: [200, 100, 200],
        ...options
      });

      // Auto-fermeture après 5 secondes
      setTimeout(() => {
        try {
          notification.close();
        } catch (e) {
          console.warn('⚠️ Erreur fermeture notification:', e);
        }
      }, 5000);

      return notification;
    } catch (error) {
      console.warn('⚠️ Erreur création notification locale:', error);
      return null;
    }
  }, [notificationPermission]);

  // Synchroniser les données hors ligne
  const syncOfflineData = useCallback(async () => {
    if (!isOnline) return false;

    try {
      setPendingSync(true);
      
      // Enregistrer le sync event
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-sales');
        await registration.sync.register('sync-products');
      }

      console.log('🔄 Background sync registered');
      return true;
    } catch (error) {
      console.error('❌ Sync registration error:', error);
      return false;
    } finally {
      setPendingSync(false);
    }
  }, [isOnline]);

  // Sauvegarder des données hors ligne
  const saveOfflineData = useCallback(async (key, data) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['offlineData'], 'readwrite');
      const store = transaction.objectStore('offlineData');
      await store.put({ id: key, data, timestamp: Date.now() });
      console.log('💾 Data saved offline:', key);
      return true;
    } catch (error) {
      console.error('❌ Offline save error:', error);
      return false;
    }
  }, []);

  // Récupérer des données hors ligne
  const getOfflineData = useCallback(async (key) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['offlineData'], 'readonly');
      const store = transaction.objectStore('offlineData');
      const result = await store.get(key);
      return result ? result.data : null;
    } catch (error) {
      console.error('❌ Offline get error:', error);
      return null;
    }
  }, []);

  // Helper pour ouvrir IndexedDB
  const openDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('DepotManagerDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Créer les stores pour les données hors ligne
        if (!db.objectStoreNames.contains('offlineData')) {
          db.createObjectStore('offlineData', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('pendingSales')) {
          db.createObjectStore('pendingSales', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  };

  return {
    // PWA Installation
    deferredPrompt,
    isInstalled,
    canInstall: !!deferredPrompt && !isInstalled,
    installPWA,
    
    // Notifications
    notificationPermission,
    canShowNotifications: notificationPermission === 'granted',
    requestNotificationPermission,
    showLocalNotification,
    
    // Online/Offline
    isOnline,
    pendingSync,
    syncOfflineData,
    
    // Offline Storage
    saveOfflineData,
    getOfflineData
  };
};
