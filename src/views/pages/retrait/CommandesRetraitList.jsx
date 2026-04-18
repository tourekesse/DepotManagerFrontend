
import * as React from 'react';
import {
  Box, Button, IconButton, Stack, Tooltip, Alert,
  useTheme, useMediaQuery, Card, CardContent, Typography, Divider, Grid, Chip
} from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../../crud-dashboard/components/PageContainer';
import useNotifications from '../../../crud-dashboard/hooks/useNotifications/useNotifications';
import { privateApi } from '../../../api/axios';
import GererCasiersModal from '../../../components/GererCasiersModal';
import PrintReceiptButton from '../../../components/PrintReceiptButton';
import { formatDateCI } from '../../../utils/dateUtils';
import { useUser } from '../../../context/UserContext';

export default function CommandesRetraitList() {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { activePointDeVente, user } = useUser();
  const role = (user?.role || '').toUpperCase();
  const isGerant = role.includes('GERANT');
  
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
      // 🔥 FILTRER UNIQUEMENT les commandes RETRAIT en attente
      const res = await privateApi.get(`/api/commandes/point-de-vente/${activePointDeVente.id}/en-attente`);
      const commandesEnAttente = (res.data || [])
        .filter(cmd => cmd.modeRetrait === 'RETRAIT') // Filtrer uniquement RETRAIT
        .map(cmd => ({
          id: cmd.id,
          nomClient: cmd.client?.raisonsociale || cmd.client?.nom || 'Client',
          dateCommande: cmd.dateCommande,
          totalGeneral: cmd.montantTotal,
          statutLivraison: cmd.statut || 'EN_ATTENTE',
          modeRetrait: cmd.modeRetrait,
          livreur: cmd.livreur,
          client: cmd.client,
          estCommande: true,
          statutCommande: cmd.statut,
          montantEmballage: cmd.montantEmballage || 0,
          montantLiquide: cmd.montantLiquide || 0
        }));
      setRows(commandesEnAttente);
    } catch (e) {
      setError("Impossible de charger les commandes à retirer.");
      notifications.show('Erreur de connexion au serveur', { severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [notifications, activePointDeVente]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Ouvrir la gestion des casiers pour une commande
  const handleOpenCasiers = async (row) => {
    try {
      const res = await privateApi.get(`/api/commandes/${row.id}`);
      const commandeDetails = res.data;
      
      const mtEmballage = row.montantEmballage || 0;
      
      setClientNomForCasiers(row.nomClient || commandeDetails.client?.raisonsociale || commandeDetails.client?.nom || 'Client');
      setSelectedVenteForCasiers({
        venteId: row.id,
        dateVente: commandeDetails.dateCommande,
        mtEmballage: mtEmballage,
        montantLiquide: commandeDetails.montantLiquide,
        montantEmballage: commandeDetails.montantEmballage,
        estCommande: row.estCommande,
        montantTotal: commandeDetails.montantTotal,
        lignes: commandeDetails.lignes || []
      });
      setVentesCasiers([{
        venteId: row.id,
        dateVente: commandeDetails.dateCommande,
        mtEmballage: mtEmballage,
        montantLiquide: commandeDetails.montantLiquide,
        montantEmballage: commandeDetails.montantEmballage,
        montantTotal: commandeDetails.montantTotal,
        lignes: commandeDetails.lignes || []
      }]);
      setCasiersModalOpen(true);
    } catch (error) {
      console.error('Erreur lors du chargement des détails de la commande:', error);
      notifications.show('Erreur lors du chargement des détails de la commande', { severity: 'error' });
    }
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 80 },
    { field: 'nomClient', headerName: 'Client', width: 150 },
    {
      field: 'dateCommande',
      headerName: 'Date',
      width: 140,
      renderCell: (params) => formatDateCI(params.row.dateCommande)
    },
    {
      field: 'totalGeneral',
      headerName: 'Montant',
      width: 110,
      renderCell: (params) => params.value ? parseFloat(params.value).toLocaleString('fr-FR') + ' FCFA' : ''
    },
    {
      field: 'statutLivraison',
      headerName: 'Statut',
      width: 130,
      renderCell: (params) => {
        const statut = params.row.statutCommande || params.row.statutLivraison;
        const estLivree = statut === 'LIVREE' || statut === 'LIVREE_ET_PAYEE' || statut === 'LIVREE_EN_ATTENTE_PAIEMENT';
        const color = estLivree ? '#2e7d32' : '#ed6c02';
        const bgColor = estLivree ? '#e8f5e9' : '#fff3e0';
        
        return (
          <Chip
            label={estLivree ? '✅ Livrée' : '🟠 À retirer'}
            size="small"
            sx={{bgcolor: bgColor, color: color, fontWeight: 'bold'}}
          />
        );
      }
    },
    {
      field: 'actions',
      type: 'actions',
      width: 150,
      getActions: ({ row }) => {
        const actions = [];

        // Action de gestion des casiers
        actions.push(
          <GridActionsCellItem
            icon={<Inventory2Icon />}
            label="Gérer casiers"
            onClick={() => handleOpenCasiers(row)}
            color="secondary"
            title="Gérer les casiers/vides rendus"
          />
        );

        if (isGerant) {
          actions.push(<PrintReceiptButton venteId={row.id} size="small" />);
        }

        return actions;
      },
    },
  ];

  const renderMobileView = () => {
    return (
      <Stack spacing={2} sx={{ mt: 2 }}>
        {rows.map((row) => (
          <Card key={row.id} sx={{ borderRadius: 2, boxShadow: 1 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Commande #{row.id}</Typography>
                <Box>
                  {showDebugButton || isGerant ? (
                    <IconButton 
                      size="small" 
                      color="secondary" 
                      onClick={() => handleOpenCasiers(row)}
                    >
                      <Inventory2Icon fontSize="small" />
                    </IconButton>
                  ) : null}
                  {isGerant && (
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
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{parseFloat(row.totalGeneral || 0).toLocaleString('fr-FR')} FCFA</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="textSecondary">Date</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDateCI(row.dateCommande)}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="textSecondary">Statut</Typography>
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
          <LocalShippingIcon sx={{ fontSize: 22, color: 'orange' }} />
          <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 'bold', color: 'orange' }}>
            Commandes à retirer
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
