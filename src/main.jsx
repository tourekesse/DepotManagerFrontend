// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import App from "./App";
import depotTropicalTheme from "./theme/depotTropicalTheme";
import { UserProvider } from "./context/UserContext";
import { ReceiptModalProvider } from "./contexts/ReceiptModalContext";
import { fetchBackendUrl, setBackendUrl } from "./api/axios";

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);

const registerPwaAutoUpdate = async () => {
  if (!('serviceWorker' in navigator)) return;

  if (import.meta.env.DEV) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
    return;
  }

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  const registration = await navigator.serviceWorker.register('/sw-mobile.js', { updateViaCache: 'none' });
  console.log('Mobile Service Worker registered:', registration);

  const activateWaitingWorker = () => {
    if (registration.waiting) {
      console.log('Nouvelle version détectée sur le VPS. Application mise à jour.');
      registration.waiting.postMessage('skipWaiting');
    }
  };

  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing;
    if (!newWorker) return;
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        activateWaitingWorker();
      }
    });
  });

  activateWaitingWorker();

  setInterval(() => {
    navigator.serviceWorker.ready
      .then((readyRegistration) => readyRegistration.update())
      .catch(() => {});
  }, 10 * 60 * 1000);
};

// Configuration async avant le rendu
(async () => {
  registerPwaAutoUpdate().catch((error) => {
    console.error('Service Worker registration failed:', error);
  });

  try {
    const { loadCountries } = await import('./config/countries');
    await loadCountries();
  } catch (e) {
    console.warn('Failed to load country config:', e);
  }

  try {
    const url = await fetchBackendUrl();
    setBackendUrl(url);
    const apiUrl = url || import.meta.env.VITE_API_URL || '';
    console.log('🔧 Backend URL configuré:', apiUrl || '(proxy Vite)');
    try {
      const { setApiBaseUrl } = await import('./api/core/OpenAPI');
      setApiBaseUrl(apiUrl);
    } catch (e) {
      // OpenAPI non disponible
    }
  } catch (error) {
    console.error('❌ Erreur configuration backend URL:', error);
  }
  
  root.render(
    <React.StrictMode>
      <ThemeProvider theme={depotTropicalTheme}>
        <CssBaseline />
        <UserProvider>
          <ReceiptModalProvider>
            <App />
          </ReceiptModalProvider>
        </UserProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
})();
