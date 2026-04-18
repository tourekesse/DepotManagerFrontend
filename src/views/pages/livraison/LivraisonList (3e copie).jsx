
import * as React from 'react';
import {
  Box, Button, IconButton, Stack, Tooltip, Alert,
  useTheme, useMediaQuery, Card, CardContent, Typography, Divider, Grid
} from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../../crud-dashboard/components/PageContainer';
import useNotifications from '../../../crud-dashboard/hooks/useNotifications/useNotifications';
import { privateApi } from '../../../api/axios';
import LivraisonStepperModal from '../../../components/LivraisonStepperModal';
import { formatDateCI } from '../../../utils/dateUtils';
import { useUser } from '../../../context/UserContext';


export default function LivraisonList() {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { activePointDeVente } = useUser();

  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const loadData = React.useCallback(async () => {
    if (!activePointDeVente?.id) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await privateApi.get(`/api/ventes/point-de-vente/${activePointDeVente.id}`);
      // Filtrer cote JS les ventes non livrees
      const nonLivrees = (res.data || []).filter(v => v.statutLivraison === 'NON_LIVREE');
      setRows(nonLivrees);
    } catch (e) {
      setError("Impossible de charger les livraisons.");
      notifications.show('Erreur de connexion au serveur', { severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [notifications, activePointDeVente]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const [stepperOpen, setStepperOpen] = React.useState(false);
  const [selectedVente, setSelectedVente] = React.useState(null);

  const handleValidate = (row) => {
    setSelectedVente(row);
    setStepperOpen(true);
  };
  const handleStepperClose = () => {
    setStepperOpen(false);
    setSelectedVente(null);
  };
  const handleStepperValidate = async (payload) => {
    try {
      // Appeler le dispatcher avec l'ID de la vente
      const dispatcherPayload = {
        casiersRendus: payload.casiersRendus || 0,
        bouteillesRendues: payload.bouteillesRendues || 0,
        montantPaye: payload.montantPaye || 0
      };
      
      await privateApi.post(`/api/ventes/${payload.venteId}/dispatcher`, dispatcherPayload);
      notifications.show('Livraison dispatchée et soldes mis à jour', { severity: 'success' });
      await loadData();
      return Promise.resolve();
    } catch (err) {
      console.error('Erreur dispatch:', err);
      notifications.show(
        err.response?.data?.message || 'Erreur lors du dispatch de la livraison',
        { severity: 'error' }
      );
      throw err;
    }
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 80 },
    { field: 'nomClient', headerName: 'Client', width: 150 },
    {
      field: 'dateVente',
      headerName: 'Date',
      width: 140,
      renderCell: (params) => formatDateCI(params.row.dateVente)
    },
    {
      field: 'totalGeneral',
      headerName: 'Montant',
      width: 110,
      renderCell: (params) => params.value ? parseFloat(params.value).toLocaleString('fr-FR') + ' FCFA' : ''
    },
    {
      field: 'statutLivraison',
      headerName: 'Etat livraison',
      width: 140,
      renderCell: (params) => {
        if (params.value === 'NON_LIVREE') return 'NON LIVREE';
        if (params.value === 'LIVREE') return 'LIVREE';
        return params.value || '';
      }
    },
    {
      field: 'actions',
      type: 'actions',
      width: 120,
      getActions: ({ row }) => [
        <GridActionsCellItem
          icon={<LocalShippingIcon />}
          label="Valider livraison"
          onClick={() => handleValidate(row)}
          color="primary"
        />
      ],
    },
  ];

  const renderMobileView = () => {
    return (
      <Stack spacing={2} sx={{ mt: 2 }}>
        {rows.map((row) => (
          <Card key={row.id} sx={{ borderRadius: 2, boxShadow: 1 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Vente #{row.id}</Typography>
                <IconButton size="small" color="primary" onClick={() => handleValidate(row)}>
                  <LocalShippingIcon fontSize="small" />
                </IconButton>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">Client</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.clientNom}</Typography>
                </Grid>
                <Grid item xs={6} sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" color="textSecondary">Montant</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{parseFloat(row.montant || 0).toLocaleString('fr-FR')} FCFA</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="textSecondary">Date</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDateCI(row.dateVente)}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="textSecondary">Etat livraison</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.statutLivraison}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  };

  return (
    <>
    <PageContainer
      title={
        <Stack spacing={0.2} direction="row" alignItems="center">
          <LocalShippingIcon sx={{ fontSize: 22 }} />
          <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 'bold' }}>
            Livraisons a valider
          </Typography>
        </Stack>
      }
      actions={
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Actualiser">
            <IconButton onClick={loadData} disabled={loading}><RefreshIcon /></IconButton>
          </Tooltip>
        </Stack>
      }
    >
      <Box sx={{ width: '100%', mt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {isMobile ? (
          renderMobileView()
        ) : (
          <Box sx={{ height: 650, width: '100%' }}>
            <DataGrid
              rows={rows}
              columns={columns}
              loading={loading}
              disableRowSelectionOnClick
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              sx={{
                border: 'none', boxShadow: 1, borderRadius: 2, bgcolor: 'background.paper',
                '& .MuiDataGrid-columnHeaders': { backgroundColor: '#f8f9fa' }
              }}
            />
          </Box>
        )}
      </Box>
    </PageContainer>
    <LivraisonStepperModal
      open={stepperOpen}
      onClose={handleStepperClose}
      vente={selectedVente}
      onValidate={handleStepperValidate}
    />
    </>
  );
}
