
import * as React from 'react';
import {
  Box, Button, IconButton, Stack, Tooltip, Alert,
  useTheme, useMediaQuery, Card, CardContent, Typography, Divider, Grid
} from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { useNavigate, useLocation } from 'react-router-dom';
import PageContainer from '../../../crud-dashboard/components/PageContainer';
import useNotifications from '../../../crud-dashboard/hooks/useNotifications/useNotifications';
import { privateApi } from '../../../api/axios';
import LivraisonStepperModal from '../../../components/LivraisonStepperModal';
import LivraisonOtpModal from '../../../components/LivraisonOtpModal';
import AttenteValidationClientModal from './AttenteValidationClientModal';
import GererCasiersModal from '../../../components/GererCasiersModal';
import PrintReceiptButton from '../../../components/PrintReceiptButton';
import { sendDeliveryValidationRequest, getDeliveryValidationStatus } from '../../../api/validationApi';
import { formatDateCI } from '../../../utils/dateUtils';
import { useUser } from '../../../context/UserContext';


export default function LivraisonList() {
  const navigate = useNavigate();
  const location = useLocation();
  const notifications = useNotifications();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { activePointDeVente, user } = useUser();
  const role = (user?.role || '').toUpperCase();
  const isLivreur = role.includes('LIVREUR');
  const isGerant = role.includes('GERANT');
  
  // Récupérer commandeId depuis la navigation (si venant de CommandeDepotList)
  const commandeIdFromNavigation = location.state?.commandeId;
  
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const showDebugButton = false;
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
      let res;
      
      // 🔥 FILTRAGE SPÉCIFIQUE si commandeId fourni depuis CommandeDepotList
      if (commandeIdFromNavigation) {
        res = await privateApi.get(`/api/commandes/${commandeIdFromNavigation}`);
        // Transformer la commande unique en format compatible
        const commandeSpecifique = {
          id: res.data.id,
          nomClient: res.data.client?.raisonsociale || res.data.client?.nom || 'Client',
          dateCommande: res.data.dateCommande,
          totalGeneral: res.data.montantTotal,
          statutLivraison: 'NON_LIVREE',
          modeRetrait: res.data.modeRetrait,
          livreur: res.data.livreur,
          client: res.data.client,
          estCommande: true,
          statutCommande: res.data.statut
        };
        setRows([commandeSpecifique]);
      } else {
        // 🔥 FILTRER UNIQUEMENT les commandes LIVRAISON en attente
        res = await privateApi.get(`/api/commandes/point-de-vente/${activePointDeVente.id}/en-attente`);
        const commandesEnAttente = (res.data || [])
          .filter(cmd => cmd.modeRetrait === 'LIVRAISON') // Filtrer uniquement LIVRAISON
          .map(cmd => ({
            // Transformer les commandes en format compatible avec l'UI existant
            id: cmd.id,
            nomClient: cmd.client?.raisonsociale || cmd.client?.nom || 'Client',
            dateCommande: cmd.dateCommande,
            totalGeneral: cmd.montantTotal,
            statutLivraison: 'NON_LIVREE', // Toutes les commandes en attente sont non livrées
            modeRetrait: cmd.modeRetrait,
            livreur: cmd.livreur,
            client: cmd.client,
            // Garder une référence pour la transformation future
            estCommande: true,
            statutCommande: cmd.statut
          }));
        setRows(commandesEnAttente);
      }
    } catch (e) {
      setError("Impossible de charger les commandes en attente.");
      notifications.show('Erreur de connexion au serveur', { severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [notifications, activePointDeVente, commandeIdFromNavigation]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const [stepperOpen, setStepperOpen] = React.useState(false);
  const [selectedVente, setSelectedVente] = React.useState(null);
  const [otpModalOpen, setOtpModalOpen] = React.useState(false);
  const [venteEnCoursValidation, setVenteEnCoursValidation] = React.useState(null);

  const handleValidate = (row) => {
    setSelectedVente(row);
    setStepperOpen(true);
  };

  // Ouvrir la gestion des casiers pour une commande
  const handleOpenCasiers = async (row) => {
    // Utiliser l'ID de la vente si disponible, sinon l'ID de la commande
    const idToUse = row.venteId || row.id;
    
    try {
      // Récupérer les détails complets de la commande avec les lignes et produits
      const res = await privateApi.get(`/api/commandes/${idToUse}`);
      const commandeDetails = res.data;
      
      // Montant des emballages - utiliser la donnée réelle si disponible, sinon calculer
      const mtEmballage = row.mtEmballage || row.montantEmballage || 0;
      
      setClientNomForCasiers(row.nomClient || commandeDetails.client?.raisonsociale || commandeDetails.client?.nom || 'Client');
      setSelectedVenteForCasiers({
        venteId: idToUse,
        dateVente: commandeDetails.dateCommande,
        mtEmballage: mtEmballage,
        montantLiquide: commandeDetails.montantLiquide,
        montantEmballage: commandeDetails.montantEmballage,
        estCommande: row.estCommande,
        montantTotal: commandeDetails.montantTotal,
        lignes: commandeDetails.lignes || []
      });
      setVentesCasiers([{
        venteId: idToUse,
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
  const handleStepperClose = () => {
    setStepperOpen(false);
    setSelectedVente(null);
    setValidationModalOpen(false);
    setValidationStatus('pending');
    setValidationToken(null);
    setOtpModalOpen(false);
    setVenteEnCoursValidation(null);
  };
  // --- Validation client bloquante ---
  const [validationModalOpen, setValidationModalOpen] = React.useState(false);
  const [validationStatus, setValidationStatus] = React.useState('pending');
  const [validationToken, setValidationToken] = React.useState(null);

  const handleStepperValidate = async (payload) => {
    try {
      const vente = selectedVente;
      const modeRetrait = vente?.modeRetrait || vente?.mode_livraison;
      
      if (!modeRetrait) {
        notifications.show('❌ Erreur: Mode de retrait non défini', { severity: 'error' });
        throw new Error('Mode de retrait non défini');
      }
      
      // 📍 SUR PLACE : Validation directe de la commande
      if (modeRetrait === 'RETRAIT') {
        try {
          // Transformer la commande en vente d'abord
          if (vente.estCommande) {
            await privateApi.post(`/api/commandes/${vente.id}/transformer-en-vente`);
          }
          
          // Puis dispatcher comme avant
          await privateApi.post(`/api/ventes/${payload.venteId}/dispatcher`, {
            casiersRendus: payload.casiersRendus || 0,
            bouteillesRendues: payload.bouteillesRendues || 0,
            montantPaye: payload.montantPaye || 0
          });
          
          await loadData();
          handleStepperClose();
          notifications.show('🎉 Commande sur place terminée !', { severity: 'success' });
          return Promise.resolve();
        } catch (error) {
          notifications.show('❌ Erreur: ' + error.message, { severity: 'error' });
          throw error;
        }
      }
      
      // 🚚 LIVRAISON : Ouvrir modal OTP
      if (modeRetrait === 'LIVRAISON') {
        // Fermer le stepper modal d'abord
        setStepperOpen(false);
        // Puis ouvrir le modal OTP
        setVenteEnCoursValidation({ ...vente, payload });
        setOtpModalOpen(true);
        return Promise.resolve();
      }
      
      throw new Error('Mode de retrait non géré: ' + modeRetrait);
      
    } catch (err) {
      console.error('Erreur validation:', err);
      notifications.show(err.message || 'Erreur lors de la validation', { severity: 'error' });
      throw err;
    }
  };

  // Callback après validation OTP réussie
  const handleOtpValidationSuccess = async () => {
    try {
      setOtpModalOpen(false);
      
      const { payload } = venteEnCoursValidation;
      
      // Transformer la commande en vente si nécessaire
      if (venteEnCoursValidation.estCommande) {
        await privateApi.post(`/api/commandes/${venteEnCoursValidation.id}/transformer-en-vente`);
      }
      
      // Maintenant que l'OTP est validé, on peut dispatcher
      await privateApi.post(`/api/ventes/${payload.venteId}/dispatcher`, {
        casiersRendus: payload.casiersRendus || 0,
        bouteillesRendues: payload.bouteillesRendues || 0,
        montantPaye: payload.montantPaye || 0
      });
      
      await loadData();
      handleStepperClose();
      
      notifications.show('🎉 Livraison validée avec succès !', { 
        severity: 'success',
        autoHideDuration: 5000
      });
      
    } catch (err) {
      console.error('Erreur après validation OTP:', err);
      notifications.show('Erreur: ' + err.message, { severity: 'error' });
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
      width: 200,
      getActions: ({ row }) => {
        const actions = [];

        if (isLivreur) {
          actions.push(
            <GridActionsCellItem
              icon={<LocalShippingIcon />}
              label="Valider livraison"
              onClick={() => handleValidate(row)}
              color="primary"
            />
          );
        }

        // Action de gestion des casiers
        actions.push(
          <GridActionsCellItem
            icon={<Inventory2Icon />}
            label="Gérer casiers"
            onClick={() => handleOpenCasiers(row)}
            color="secondary"
            title="Gérer les casiers/compensation"
          />
        );

        if (isLivreur || isGerant) {
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
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Vente #{row.id}</Typography>
                <Box>
                  {isLivreur && (
                    <IconButton size="small" color="primary" onClick={() => handleValidate(row)}>
                      <LocalShippingIcon fontSize="small" />
                    </IconButton>
                  )}
                  {showDebugButton || isGerant ? (
                    <IconButton 
                      size="small" 
                      color="secondary" 
                      onClick={() => handleOpenCasiers(row)}
                      sx={{ ml: isLivreur ? 1 : 0 }}
                    >
                      <Inventory2Icon fontSize="small" />
                    </IconButton>
                  ) : null}
                  {(isLivreur || isGerant) && (
                    <Box component="span" sx={{ ml: (isGerant || isLivreur) ? 1 : 0 }}>
                      <PrintReceiptButton venteId={row.id} size="small" />
                    </Box>
                  )}
                </Box>
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
          <LocalShippingIcon sx={{ fontSize: 22, color: 'red' }} />
          <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 'bold', color: 'red' }}>
            Livraisons à valider
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
    <LivraisonOtpModal
      open={otpModalOpen}
      onClose={() => {
        setOtpModalOpen(false);
        setVenteEnCoursValidation(null);
      }}
      vente={venteEnCoursValidation}
      onValidationSuccess={handleOtpValidationSuccess}
    />
    <AttenteValidationClientModal
      open={validationModalOpen && selectedVente?.modeLivraison !== 'SUR_PLACE'}
      status={validationStatus}
    />
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
