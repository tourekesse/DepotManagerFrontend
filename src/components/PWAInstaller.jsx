// Composant PWA Installer
// src/components/PWAInstaller.jsx

import React from 'react';
import {
  Button,
  Box,
  Typography,
  Snackbar,
  Alert,
  IconButton,
  Chip
} from '@mui/material';
import {
  Download as InstallIcon,
  Notifications as NotificationsIcon,
  WifiOff as OfflineIcon,
  Sync as SyncIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { usePWA } from '../hooks/usePWA';

const PWAInstaller = () => {
  const {
    canInstall,
    installPWA,
    isInstalled,
    notificationPermission,
    requestNotificationPermission,
    isOnline,
    pendingSync,
    syncOfflineData
  } = usePWA();

  const [showInstallPrompt, setShowInstallPrompt] = React.useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = React.useState(false);

  // Afficher le prompt d'installation après 30 secondes
  React.useEffect(() => {
    if (canInstall && !isInstalled) {
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [canInstall, isInstalled]);

  // Afficher le prompt de notifications après l'installation
  React.useEffect(() => {
    if (isInstalled && notificationPermission === 'default') {
      const timer = setTimeout(() => {
        setShowNotificationPrompt(true);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isInstalled, notificationPermission]);

  const handleInstall = async () => {
    const success = await installPWA();
    if (success) {
      setShowInstallPrompt(false);
    }
  };

  const handleNotifications = async () => {
    const success = await requestNotificationPermission();
    if (success) {
      setShowNotificationPrompt(false);
    }
  };

  return (
    <>
      {/* Bouton d'installation PWA */}
      {canInstall && !isInstalled && (
        <Box sx={{ position: 'fixed', bottom: 80, right: 16, zIndex: 1000 }}>
          <Button
            variant="contained"
            startIcon={<InstallIcon />}
            onClick={handleInstall}
            sx={{
              borderRadius: 28,
              px: 2,
              py: 1,
              boxShadow: 3,
              background: 'linear-gradient(45deg, #8BC34A 30%, #4CAF50 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #7CB342 30%, #388E3C 90%)',
              }
            }}
          >
            Installer l'app
          </Button>
        </Box>
      )}

      {/* Indicateur de statut hors ligne */}
      {!isOnline && (
        <Box sx={{ position: 'fixed', top: 16, left: 16, zIndex: 1000 }}>
          <Chip
            icon={<OfflineIcon />}
            label="Hors ligne"
            color="warning"
            variant="outlined"
          />
        </Box>
      )}

      {/* Bouton de synchronisation */}
      {!isOnline && (
        <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000 }}>
          <Button
            variant="contained"
            startIcon={pendingSync ? <SyncIcon sx={{ animation: 'spin 1s linear infinite' }} /> : <SyncIcon />}
            onClick={syncOfflineData}
            disabled={pendingSync}
            sx={{
              borderRadius: 28,
              boxShadow: 3
            }}
          >
            {pendingSync ? 'Synchronisation...' : 'Synchroniser'}
          </Button>
        </Box>
      )}

      {/* Snackbar d'installation */}
      <Snackbar
        open={showInstallPrompt}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: 8 }}
      >
        <Alert
          severity="info"
          action={
            <>
              <Button size="small" onClick={handleInstall}>
                Installer
              </Button>
              <IconButton size="small" onClick={() => setShowInstallPrompt(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </>
          }
        >
          <Typography variant="body2">
            📱 Installez Dépôt Manager pour un accès rapide et hors ligne !
          </Typography>
        </Alert>
      </Snackbar>

      {/* Snackbar de notifications */}
      <Snackbar
        open={showNotificationPrompt}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: 8 }}
      >
        <Alert
          severity="info"
          action={
            <>
              <Button size="small" onClick={handleNotifications}>
                Activer
              </Button>
              <IconButton size="small" onClick={() => setShowNotificationPrompt(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </>
          }
        >
          <Typography variant="body2">
            🔔 Activez les notifications pour recevoir les nouvelles commandes en temps réel !
          </Typography>
        </Alert>
      </Snackbar>

      {/* Indicateur de notifications activées */}
      {isInstalled && notificationPermission === 'granted' && (
        <Box sx={{ position: 'fixed', top: 16, right: 16, zIndex: 1000 }}>
          <Chip
            icon={<NotificationsIcon />}
            label="Notifications activées"
            color="success"
            size="small"
          />
        </Box>
      )}

      {/* Animation CSS pour le spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default PWAInstaller;
