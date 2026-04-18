// Intégration PWA dans App.jsx
// Modifications à apporter à src/App.jsx

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Importer les composants PWA
import PWAInstaller from './components/PWAInstaller';
import OfflineSalesManager from './components/OfflineSalesManager';

// Vos imports existants...
import AuthGuard from './guards/AuthGuard';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Créer le client React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        // Ne pas réessayer en mode hors ligne
        if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

// Thème Material-UI
const theme = createTheme({
  palette: {
    primary: {
      main: '#8BC34A',
    },
    secondary: {
      main: '#673ab7',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

// Service Worker registration
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('🔧 Service Worker registered:', registration);
      
      // Vérifier les mises à jour
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Nouvelle version disponible
            if (window.confirm('Une nouvelle version est disponible. Recharger maintenant ?')) {
              window.location.reload();
            }
          }
        });
      });
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  }
};

function App() {
  // Enregistrer le Service Worker au démarrage
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <NotificationProvider>
            <Router>
              <div className="App">
                {/* Composants PWA */}
                <PWAInstaller />
                <OfflineSalesManager />
                
                {/* Vos routes existantes */}
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  
                  <Route path="/" element={
                    <AuthGuard>
                      <Layout />
                    </AuthGuard>
                  }>
                    <Route index element={<Dashboard />} />
                    <Route path="accueil/ventes/nouveau" element={<BoissonApp />} />
                    <Route path="clients" element={<ClientsPage />} />
                    <Route path="produits" element={<ProductsPage />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    {/* Vos autres routes... */}
                  </Route>
                </Routes>
              </div>
            </Router>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
