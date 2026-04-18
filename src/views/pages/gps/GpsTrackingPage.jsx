/**
 * Page de suivi GPS des livraisons.
 * 
 * NOUVELLE PAGE ISOLÉE - Ne modifie AUCUN code existant.
 * Accessible via /accueil/gps-tracking
 */
import React from 'react';
import {
  Box, Typography, Grid, Paper, Stack, Chip, IconButton, Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  LocalShipping as TruckIcon,
  Speed as SpeedIcon,
  BatteryStd as BatteryIcon
} from '@mui/icons-material';
import PageContainer from '../../../crud-dashboard/components/PageContainer';
import GpsTrackingMap from '../../../components/gps/GpsTrackingMap';
import { privateApi } from '../../../api/axios';
import useNotifications from '../../../crud-dashboard/hooks/useNotifications/useNotifications';

export default function GpsTrackingPage() {
  const notifications = useNotifications();
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Force refresh des positions
      await privateApi.get('/api/gps/positions-recentes');
      notifications.show('📍 Positions actualisées', { severity: 'success' });
    } catch (e) {
      notifications.show('Erreur de rafraîchissement', { severity: 'error' });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <PageContainer
      title={
        <Stack direction="row" spacing={1} alignItems="center">
          <TruckIcon sx={{ fontSize: 28, color: '#1976d2' }} />
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Suivi GPS des Livraisons
          </Typography>
          <Chip label="NOUVEAU" color="success" size="small" sx={{ fontWeight: 700 }} />
        </Stack>
      }
      actions={
        <Tooltip title="Actualiser les positions">
          <IconButton onClick={handleRefresh} disabled={refreshing} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      }
    >
      <Box sx={{ width: '100%' }}>
        {/* Carte principale */}
        <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <GpsTrackingMap />
        </Paper>

        {/* Stats rapides */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, borderRadius: 2, bgcolor: '#e3f2fd' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <TruckIcon sx={{ color: '#1976d2' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Livreurs actifs
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    --
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, borderRadius: 2, bgcolor: '#e8f5e9' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <SpeedIcon sx={{ color: '#388e3c' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Vitesse moyenne
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    -- km/h
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, borderRadius: 2, bgcolor: '#fff3e0' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <BatteryIcon sx={{ color: '#f57c00' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Batterie moyenne
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    --%
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        {/* Info box */}
        <Paper sx={{ p: 2, mt: 2, borderRadius: 2, bgcolor: '#f5f5f5' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            ℹ️ Comment ça marche ?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Les positions GPS sont envoyées automatiquement par l'app mobile du livreur toutes les 10-30 secondes
            • La carte se met à jour en temps réel (refresh auto toutes les 10s)
            • Cliquez sur un marqueur pour voir les détails du livreur
            • <strong>Fonctionnalité en cours de déploiement</strong> - nécessite l'app mobile livreur avec GPS activé
          </Typography>
        </Paper>
      </Box>
    </PageContainer>
  );
}
