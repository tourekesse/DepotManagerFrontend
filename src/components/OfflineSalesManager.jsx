// Composant pour les ventes hors ligne
// src/components/OfflineSalesManager.jsx

import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Chip,
  Alert,
  Collapse,
  Badge
} from '@mui/material';
import {
  Sync as SyncIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  WifiOff as OfflineIcon,
  CheckCircle as SyncedIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useOfflineSales } from '../hooks/useOfflineSales';
import { usePWA } from '../hooks/usePWA';

const OfflineSalesManager = () => {
  const { isOnline } = usePWA();
  const {
    pendingSales,
    hasPendingSales,
    pendingCount,
    pendingTotal,
    loadPendingSales,
    syncAllSales,
    deletePendingSale
  } = useOfflineSales();

  const [expanded, setExpanded] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);

  // Charger les ventes en attente au montage
  useEffect(() => {
    loadPendingSales();
  }, [loadPendingSales]);

  // Synchroniser automatiquement quand on passe en ligne
  useEffect(() => {
    if (isOnline && hasPendingSales) {
      handleSyncAll();
    }
  }, [isOnline]);

  const handleSyncAll = async () => {
    if (!isOnline) return;
    
    setSyncing(true);
    try {
      const syncedCount = await syncAllSales();
      if (syncedCount > 0) {
        // Notification de succès
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Dépôt Manager', {
            body: `${syncedCount} vente(s) synchronisée(s) avec succès !`,
            icon: '/logos/icon-pwa.svg'
          });
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('fr-FR');
  };

  if (!hasPendingSales) {
    return null;
  }

  return (
    <Box sx={{ mb: 2 }}>
      {/* Carte principale */}
      <Card 
        sx={{ 
          cursor: 'pointer',
          border: isOnline ? '2px solid #4CAF50' : '2px solid #FF9800'
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <CardContent sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Badge badgeContent={pendingCount} color="error">
                <OfflineIcon color={isOnline ? 'success' : 'warning'} />
              </Badge>
              <Typography variant="h6" component="div">
                Ventes hors ligne
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip 
                label={formatCurrency(pendingTotal)}
                color="primary"
                variant="outlined"
                size="small"
              />
              {isOnline ? (
                <SyncedIcon color="success" />
              ) : (
                <ErrorIcon color="warning" />
              )}
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </Box>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {isOnline 
              ? `${pendingCount} vente(s) en attente de synchronisation`
              : `Mode hors ligne - ${pendingCount} vente(s) enregistrées localement`
            }
          </Typography>
        </CardContent>
      </Card>

      {/* Détails développés */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ mt: 2 }}>
          {/* Bouton de synchronisation */}
          {isOnline && (
            <Box sx={{ mb: 2 }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={syncing ? <SyncIcon sx={{ animation: 'spin 1s linear infinite' }} /> : <SyncIcon />}
                onClick={handleSyncAll}
                disabled={syncing || !isOnline}
                sx={{ mb: 2 }}
              >
                {syncing ? 'Synchronisation...' : `Synchroniser ${pendingCount} vente(s)`}
              </Button>
            </Box>
          )}

          {/* Liste des ventes en attente */}
          <List dense>
            {pendingSales.map((sale) => (
              <ListItem key={sale.id} divider>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" fontWeight="bold">
                        {sale.clientName || 'Client inconnu'}
                      </Typography>
                      <Typography variant="body2" color="primary">
                        {formatCurrency(sale.total)}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(sale.timestamp)} • {sale.items?.length || 0} article(s)
                    </Typography>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => deletePendingSale(sale.id)}
                    size="small"
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>

          {/* Alertes informatives */}
          {!isOnline && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Vous êtes actuellement hors ligne. Les ventes seront synchronisées automatiquement dès que la connexion sera rétablie.
              </Typography>
            </Alert>
          )}

          {isOnline && pendingCount > 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Cliquez sur "Synchroniser" pour envoyer les ventes en attente au serveur.
              </Typography>
            </Alert>
          )}
        </Box>
      </Collapse>

      {/* Animation CSS */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  );
};

export default OfflineSalesManager;
