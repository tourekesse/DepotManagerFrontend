import * as React from 'react';
import {
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  Button,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Divider,
  Grid,
  Checkbox,
  Paper
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../../crud-dashboard/components/PageContainer';
import useNotifications from '../../../crud-dashboard/hooks/useNotifications/useNotifications';
import { privateApi } from '../../../api/axios';
import { formatDateCI } from '../../../utils/dateUtils';
import { formatCurrency } from '../../../utils/currencyUtils';

export default function MesCommandesPage() {
  const notifications = useNotifications();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [userRole, setUserRole] = React.useState(null);
  const [clientId, setClientId] = React.useState(null);

  // Charger le rôle et clientId depuis localStorage au montage
  React.useEffect(() => {
    const role = localStorage.getItem('role');
    const cid = localStorage.getItem('clientId');
    setUserRole(role);
    setClientId(cid);
  }, []);

  // Décoder le token JWT pour obtenir le rôle et le point de vente
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // Mettre à jour depuis le token aussi (pour les données fresches)
        if (payload.role && !userRole) {
          setUserRole(payload.role);
        }
        if (payload.clientId && !clientId) {
          setClientId(payload.clientId);
        }
      } catch (e) {
        console.error('Erreur décodage token:', e);
      }
    }
  }, [userRole, clientId]);

  const loadData = React.useCallback(async () => {
    console.log('🔍 Debug - Chargement des commandes, rôle:', userRole, 'clientId:', clientId);
    
    setLoading(true);
    try {
      let res;
      if (userRole === 'GERANT' || userRole === 'PROPRIETAIRE_SOUS_USER_DEPOT') {
        // Gérant: charger TOUTES les commandes du point de vente (pour les statistiques)
        res = await privateApi.get('/api/commandes/231/toutes');
        console.log('✅ API Gérant Response (toutes commandes PV):', res.data);
      } else {
        // Client: charger TOUS les commandes (y compris celles terminées)
        res = await privateApi.get('/api/commandes/client/mes-commandes');
        console.log('✅ API Client Response (toutes commandes):', res.data);
      }
      const commandes = Array.isArray(res.data) ? res.data : [];
      console.log('📦 Commandes count:', commandes.length);
      
      // Filtrer pour le Gérant: afficher toutes les commandes
      // Le backend retourne déjà tout, on n'a juste fait le mapping
      setRows(commandes);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des commandes:', error);
      notifications.error('Erreur lors du chargement des commandes');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [notifications, userRole, clientId]);

  React.useEffect(() => {
    if (!userRole) return; // Attendre que userRole soit chargé
    loadData();
  }, [loadData, userRole]);

  const columns = [
    { field: 'id', headerName: 'N°', width: 80 },
    {
      field: 'clientNom',
      headerName: 'Client',
      width: 180,
      hide: userRole === 'CLIENT_BAR' || !userRole, // Cacher pour les clients eux-mêmes
      renderCell: (params) => params.value || '-'
    },
    {
      field: 'dateCommande',
      headerName: 'Date',
      width: 180,
      renderCell: (params) => formatDateCI(params.row.dateCommande)
    },
    {
      field: 'montantTotal',
      headerName: 'Montant',
      width: 140,
      renderCell: (params) => params.value ? formatCurrency(parseFloat(params.value)) : '-'
    },
    { field: 'statut', headerName: 'Statut', width: 130 },

    {
      field: 'modeRetrait',
      headerName: 'Mode de retrait',
      width: 140,
      renderCell: (params) => {
        const mode = params.value || params.row.modeRetrait || params.row.mode || '';
        let color = '#1976d2';
        let icon = '📦';
        
        if (mode === 'LIVRAISON') {
          color = '#2e7d32';
          icon = '🚚';
        } else if (mode === 'RETRAIT') {
          color = '#ed6c02';
          icon = '🏪';
        }
        
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>{icon}</span>
            <Typography sx={{ color, fontWeight: 'bold' }}>
              {mode}
            </Typography>
          </Box>
        );
      }
    },
    {
      field: 'archived',
      headerName: 'Archivé',
      width: 120,
      type: 'boolean',
      renderCell: (params) => (
        <Checkbox
          checked={params.value === true}
          onChange={async (e) => {
            e.stopPropagation();
            try {
              await privateApi.put(`/api/commandes/${params.row.id}/archive`, {
                archived: e.target.checked
              });
              // Mettre à jour localement
              setRows(prev => prev.map(r => r.id === params.row.id ? { ...r, archived: e.target.checked } : r));
            } catch (err) {
              console.error('Erreur toggle archive:', err);
            }
          }}
          size="small"
          color="primary"
        />
      ),
      hide: userRole === 'CLIENT_BAR' || !userRole
    }
  ];

  // Vue mobile optimisée - colonnes prioritaires seulement
  const renderMobileView = () => {
    return (
      <Stack spacing={2} sx={{ mt: 2 }}>
        {rows.map((row) => (
          <Card key={row.id} sx={{ borderRadius: 2, boxShadow: 1 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  {row.clientNom || 'Client'}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  #{row.id}
                </Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">Mode</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {row.modeRetrait === 'LIVRAISON' ? '🚚 Livraison' : '🏪 Retrait'}
                  </Typography>
                </Grid>
                <Grid item xs={6} sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" color="textSecondary">Montant</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {row.montantTotal ? formatCurrency(parseFloat(row.montantTotal)) : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="textSecondary">Statut</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.statut}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  };

  return (
    <PageContainer
      title={
        <Stack spacing={0.2} direction="row" alignItems="center">
          <ShoppingBagIcon sx={{ fontSize: 22 }} />
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            Mes commandes
          </Typography>
        </Stack>
      }
      actions={
        <Tooltip title="Actualiser">
          <IconButton onClick={loadData} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      }
    >
      <Box sx={{ width: '100%', mt: 2 }}>
        {isMobile ? (
          renderMobileView()
        ) : (
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={rows.filter(row => row.archived !== true)}
              columns={columns}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              localeText={{ noRowsLabel: 'Aucune commande trouvée' }}
              disableRowSelectionOnClick
              getRowId={(row) => row.id}
              sx={{
                '& .MuiDataGrid-row:nth-of-type(even)': {
                  backgroundColor: '#f5f5f5',
                },
                '& .MuiDataGrid-row:nth-of-type(odd)': {
                  backgroundColor: '#ffffff',
                },
                '& .MuiDataGrid-row:hover': {
                  backgroundColor: '#e3f2fd',
                },
              }}
            />
          </Box>
        )}
      </Box>
    </PageContainer>
  );
}