import * as React from 'react';
import {
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  Button
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../../crud-dashboard/components/PageContainer';
import useNotifications from '../../../crud-dashboard/hooks/useNotifications/useNotifications';
import { privateApi } from '../../../api/axios';
import { formatDateCI } from '../../../utils/dateUtils';

export default function MesCommandesPage() {
  const notifications = useNotifications();
  const navigate = useNavigate();
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const loadData = React.useCallback(async () => {
    console.log('🔍 Debug - Chargement des commandes client connecté');
    
    // Vérifier si c'est un client connecté (clientId dans localStorage)
    const clientId = localStorage.getItem('clientId');
    
    if (!clientId) {
      console.log('❌ Client non connecté - clientId manquant');
      setRows([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Utiliser le nouvel endpoint qui extrait automatiquement le clientId du JWT
      const res = await privateApi.get('/api/commandes/client/mes-commandes');
      console.log('✅ API Response:', res.data);
      const commandes = Array.isArray(res.data) ? res.data : [];
      console.log('📦 Commandes count:', commandes.length);
      setRows(commandes);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des commandes:', error);
      notifications.error('Erreur lors du chargement des commandes');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [notifications]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = [
    { field: 'id', headerName: 'N°', width: 80 },
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
      renderCell: (params) => params.value ? parseFloat(params.value).toLocaleString('fr-FR') + ' FCFA' : ''
    },

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
    }
  ];

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
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/accueil/commandes/nouvelle')}
            sx={{ bgcolor: '#2e7d32' }}
          >
            Nouvelle Commande
          </Button>
          <Tooltip title="Actualiser">
            <IconButton onClick={loadData} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      }
    >
      <Box sx={{ height: 600, width: '100%', mt: 2 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          localeText={{ noRowsLabel: 'Aucune commande trouvée' }}
          disableRowSelectionOnClick
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
    </PageContainer>
  );
}