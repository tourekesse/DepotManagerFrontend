import * as React from 'react';
import {
  Box, Button, IconButton, Stack, Tooltip, Alert,
  useTheme, useMediaQuery, Card, CardContent, Typography, Divider, Grid
} from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import HistoryIcon from '@mui/icons-material/History';
import PrintIcon from '@mui/icons-material/Print';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../../crud-dashboard/components/PageContainer';
import useNotifications from '../../../crud-dashboard/hooks/useNotifications/useNotifications';
import { privateApi } from '../../../api/axios';
import GererCasiersModal from '../../../components/GererCasiersModal';
import PrintReceiptButton from '../../../components/PrintReceiptButton';
import { formatDateCI } from '../../../utils/dateUtils';
import { useUser } from '../../../context/UserContext';
import { formatCurrency } from '../../../utils/currencyUtils';

export default function LivraisonHistoriquePage() {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { activePointDeVente, user } = useUser();
  const role = (user?.role || '').toUpperCase();
  const isLivreur = role.includes('LIVREUR');
  const isGerant = role.includes('GERANT');
  
  // Debug pour voir les rôles détectés
  console.log('🔍 Debug LivraisonHistoriquePage:', { 
    user: user, 
    role: role, 
    isLivreur: isLivreur, 
    isGerant: isGerant 
  });

  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  // States pour gérer casiers
  const [casiersModalOpen, setCasiersModalOpen] = React.useState(false);
  const [selectedVenteForCasiers, setSelectedVenteForCasiers] = React.useState(null);
  const [ventesCasiers, setVentesCasiers] = React.useState([]);
  const [clientNomForCasiers, setClientNomForCasiers] = React.useState('');

  const loadData = React.useCallback(async () => {
    if (!activePointDeVente?.id) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Utiliser le même endpoint que LivraisonList pour tester
      const res = await privateApi.get(`/api/ventes/point-de-vente/${activePointDeVente.id}`);
      const toutesLivraisons = res.data || [];
      setRows(toutesLivraisons);
    } catch (e) {
      setError("Impossible de charger l'historique des livraisons.");
      notifications.show('Erreur de connexion au serveur', { severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [notifications, activePointDeVente]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Ouvrir la gestion des casiers (pour les livreurs et gérants)
  const handleOpenCasiers = (row) => {
    const mtEmballage = row.montantEmballageTotal || row.montantEmballage || 0;
    
    setClientNomForCasiers(row.nomClient || 'Client');
    setSelectedVenteForCasiers({
      venteId: row.id,
      dateVente: row.dateVente,
      mtEmballage: mtEmballage
    });
    setVentesCasiers([{
      venteId: row.id,
      dateVente: row.dateVente,
      mtEmballage: mtEmballage
    }]);
    setCasiersModalOpen(true);
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
      field: 'dateLivraison',
      headerName: 'Date livraison',
      width: 140,
      renderCell: (params) => params.value ? formatDateCI(params.value) : '-'
    },
    {
      field: 'totalGeneral',
      headerName: 'Montant',
      width: 110,
      renderCell: (params) => params.value ? formatCurrency(params.value) : ''
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
      width: 150,
      getActions: ({ row }) => {
        const actions = [];

        // Action de gestion des casiers pour les livreurs ET gérants
        if (isLivreur || isGerant) {
          actions.push(
            <GridActionsCellItem
              icon={<Inventory2Icon />}
              label="Gérer casiers"
              onClick={() => handleOpenCasiers(row)}
              color="secondary"
              title="Gérer les casiers/compensation"
            />
          );
        }

        // Action d'impression
        if (isLivreur || isGerant) {
          actions.push(<PrintReceiptButton venteId={row.id} size="small" />);
        }

        return actions;
      },
    },
  ];

  return (
    <>
      <PageContainer
        title={
          <Stack spacing={0.2} direction="row" alignItems="center">
            <HistoryIcon sx={{ fontSize: 22 }} />
            <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 'bold' }}>
              Historique des Livraisons
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
            <Stack spacing={2} sx={{ mt: 2 }}>
              {rows.map((row) => (
                <Card key={row.id} sx={{ borderRadius: 2, boxShadow: 1 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Livraison #{row.id}</Typography>
                      <Box>
                        {(isLivreur || isGerant) && (
                          <IconButton 
                            size="small" 
                            color="secondary" 
                            onClick={() => handleOpenCasiers(row)}
                          >
                            <Inventory2Icon fontSize="small" />
                          </IconButton>
                        )}
                        {(isLivreur || isGerant) && (
                          <Box component="span" sx={{ ml: 1 }}>
                            <PrintReceiptButton venteId={row.id} size="small" />
                          </Box>
                        )}
                      </Box>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">Client</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.nomClient}</Typography>
                      </Grid>
                      <Grid item xs={6} sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="textSecondary">Montant</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatCurrency(row.totalGeneral)}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="textSecondary">Date commande</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDateCI(row.dateVente)}</Typography>
                      </Grid>
                      {row.dateLivraison && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="textSecondary">Date livraison</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDateCI(row.dateLivraison)}</Typography>
                        </Grid>
                      )}
                      <Grid item xs={12}>
                        <Typography variant="caption" color="textSecondary">Etat livraison</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.statutLivraison}</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Stack>
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
      <GererCasiersModal
        open={casiersModalOpen}
        onClose={() => {
          setCasiersModalOpen(false);
          setSelectedVenteForCasiers(null);
        }}
        vente={selectedVenteForCasiers}
        onValidate={() => {
          loadData();
          setCasiersModalOpen(false);
          setSelectedVenteForCasiers(null);
          setVentesCasiers([]);
          notifications.show("Casiers gérés avec succès", { severity: "success" });
        }}
        clientNom={clientNomForCasiers}
        ventesCasiers={ventesCasiers}
      />
    </>
  );
}
