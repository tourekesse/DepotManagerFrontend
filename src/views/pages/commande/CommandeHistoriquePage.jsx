
import * as React from 'react';
import {
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  Button
} from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import AddIcon from '@mui/icons-material/Add';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../../crud-dashboard/components/PageContainer';
import useNotifications from '../../../crud-dashboard/hooks/useNotifications/useNotifications';
import { privateApi } from '../../../api/axios';
import { formatDateCI } from '../../../utils/dateUtils';
import { useUser } from '../../../context/UserContext';


export default function CommandeHistoriquePage({ isClientView = false }) {
  const notifications = useNotifications();
  const navigate = useNavigate();
  const { user } = useUser();
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);



  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      // Pour gérant: utilise /api/commandes avec X-PV-ID header
      const res = await privateApi.get('/api/commandes');
      const commandes = Array.isArray(res.data) ? res.data : [];
      const mappedRows = commandes.map((cmd) => ({
        id: cmd.id,
        dateCommande: cmd.dateCommande,
        montantTotal: cmd.montantTotal || cmd.total || 0,
        statut: cmd.statut || '',
        mode: cmd.modeRetrait || '',
      }));
      setRows(mappedRows);
    } catch (e) {
      console.error('Erreur chargement commandes:', e);
      notifications.show("Erreur de connexion à l'API", { severity: 'error' });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [notifications]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);



  const columns = [
    { field: 'id', headerName: isClientView ? 'N°' : 'ID', width: 80 },
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
      field: 'statut',
      headerName: 'Statut',
      width: 120,
      renderCell: (params) => params.value?.name || params.value || ''
    },
    {
      field: 'mode',
      headerName: isClientView ? 'Mode de retrait' : 'Mode',
      width: 140,
      renderCell: (params) => params.value?.name || params.value || ''
    },

  ];

  return (
    <PageContainer
      title={
        <Stack spacing={0.2} direction="row" alignItems="center">
          {isClientView ? <ShoppingBagIcon sx={{ fontSize: 22 }} /> : <ShoppingCartIcon sx={{ fontSize: 22 }} />}
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            Historique Commandes
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
        />
      </Box>
    </PageContainer>
  );
}
