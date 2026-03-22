import * as React from 'react';
import {
  Box, Button, IconButton, Stack, Tooltip, Alert,
  useTheme, useMediaQuery, Card, CardContent, Typography, Divider, Grid
} from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PrintIcon from '@mui/icons-material/Print';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../../crud-dashboard/components/PageContainer';
import useNotifications from '../../../crud-dashboard/hooks/useNotifications/useNotifications';
import { privateApi } from '../../../api/axios';
import LivraisonStepperModal from '../../../components/LivraisonStepperModal';
import LivraisonOtpModal from '../../../components/LivraisonOtpModal';
import GererCasiersModal from '../../../components/GererCasiersModal';
import LivreurCasiersModal from '../../../components/LivreurCasiersModal';
import PrintReceiptButton from '../../../components/PrintReceiptButton';
import { formatDateCI } from '../../../utils/dateUtils';
import { useUser } from '../../../context/UserContext';

export default function MesLivraisonsPage() {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { activePointDeVente, user } = useUser();
  const role = (user?.role || '').toUpperCase();
  const isLivreur = role.includes('LIVREUR');
  const isGerant = role.includes('GERANT');
  
  // Debug pour voir les rôles détectés
  console.log('🔍 Debug MesLivraisonsPage:', { 
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
      // 🔥 NOUVEAU: Récupérer les COMMANDES assignées au livreur connecté (endpoint dédié)
      const livreurId = user?.userId;
      const res = await privateApi.get(`/api/commandes-mobile/livreur/${livreurId}/commandes`);
      // Mapper les commandes pour compatibilité avec l'affichage
      const mappedRows = (res.data || []).map(cmd => ({
        id: cmd.id,
        nomClient: cmd.nomClient,
        dateVente: cmd.dateCommande,
        totalGeneral: cmd.montantTotal,
        statutLivraison: cmd.statut === 'EN_ATTENTE' ? 'NON_LIVREE' : 'LIVREE',
        modeLivraison: cmd.modeRetrait,
        montantEmballage: cmd.montantEmballage || 0,
        type: 'commande',
        telephoneClient: cmd.telephoneClient,
        statutCommande: cmd.statut
      }));
      setRows(mappedRows);
    } catch (e) {
      console.error('Erreur chargement livraisons:', e);
      setError("Impossible de charger mes livraisons.");
      notifications.show('Erreur de connexion au serveur', { severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [notifications, activePointDeVente, user]);

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

  // Ouvrir la gestion des casiers (différent pour livreur vs gérant)
  const handleOpenCasiers = (row) => {
    const mtEmballage = row.montantEmballageTotal || row.montantEmballage || 0;
    
    setClientNomForCasiers(row.nomClient || 'Client');
    
    // Pour livreur: stocker la commande (pas besoin de transformation)
    if (isLivreur) {
      setSelectedVenteForCasiers({
        id: row.id,
        montantTotal: row.totalGeneral,
        montantEmballage: mtEmballage,
        type: 'commande',
        statut: row.statutCommande,
        clientTelephone: row.telephoneClient
      });
    } else {
      // Pour gérant: comportement existant
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
    }
    setCasiersModalOpen(true);
  };

  const handleStepperClose = () => {
    setStepperOpen(false);
    setSelectedVente(null);
    setOtpModalOpen(false);
    setVenteEnCoursValidation(null);
  };

  const handleStepperValidate = async (payload) => {
    try {
      const vente = selectedVente;
      const modeLivraison = vente?.modeLivraison || vente?.mode_livraison;
      
      if (!modeLivraison) {
        notifications.show('❌ Erreur: Mode de livraison non défini', { severity: 'error' });
        throw new Error('Mode de livraison non défini');
      }
      
      // 📍 VENTE SUR PLACE : Validation directe
      if (modeLivraison === 'SUR_PLACE') {
        try {
          await privateApi.post(`/api/ventes/${payload.venteId}/dispatcher`, {
            casiersRendus: payload.casiersRendus || 0,
            bouteillesRendues: payload.bouteillesRendues || 0,
            montantPaye: payload.montantPaye || 0
          });
          
          await loadData();
          handleStepperClose();
          notifications.show('🎉 Retrait sur place terminé !', { severity: 'success' });
          return Promise.resolve();
        } catch (error) {
          notifications.show('❌ Erreur: ' + error.message, { severity: 'error' });
          throw error;
        }
      }
      
      // 🚚 LIVRAISON : Ouvrir modal OTP
      if (modeLivraison === 'A_LIVRER') {
        console.log('🚚 Livraison détectée - ouverture modal OTP');
        setStepperOpen(false);
        setVenteEnCoursValidation({ ...vente, payload });
        setOtpModalOpen(true);
        return Promise.resolve();
      }
      
      throw new Error('Mode de livraison non géré: ' + modeLivraison);
      
    } catch (err) {
      console.error('Erreur validation:', err);
      notifications.show(err.message || 'Erreur lors de la validation', { severity: 'error' });
      throw err;
    }
  };

  const handleOtpValidationSuccess = async () => {
    try {
      setOtpModalOpen(false);
      
      const { payload } = venteEnCoursValidation;
      
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
      width: 200,
      getActions: ({ row }) => {
        const actions = [];

        // Action de validation pour les livreurs (commandes non livrées)
        if (isLivreur && row.statutLivraison === 'NON_LIVREE') {
          actions.push(
            <GridActionsCellItem
              icon={<LocalShippingIcon />}
              label="Livrer commande"
              onClick={() => handleValidate(row)}
              color="primary"
            />
          );
        }

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
            <LocalShippingIcon sx={{ fontSize: 22 }} />
            <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 'bold' }}>
              Mes Livraisons
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
                        {isLivreur && row.statutLivraison === 'NON_LIVREE' && (
                          <IconButton size="small" color="primary" onClick={() => handleValidate(row)} title="Livrer">
                            <LocalShippingIcon fontSize="small" />
                          </IconButton>
                        )}
                        {(isLivreur || isGerant) && (
                          <IconButton 
                            size="small" 
                            color="secondary" 
                            onClick={() => handleOpenCasiers(row)}
                            sx={{ ml: 1 }}
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
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{parseFloat(row.totalGeneral || 0).toLocaleString('fr-FR')} FCFA</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="textSecondary">Date</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDateCI(row.dateVente)}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="textSecondary">Statut</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.statutCommande || row.statutLivraison}</Typography>
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
      {/* Modal Gérer Casiers - différent selon le rôle */}
      {isLivreur ? (
        <LivreurCasiersModal
          open={casiersModalOpen}
          onClose={() => {
            setCasiersModalOpen(false);
            setSelectedVenteForCasiers(null);
          }}
          commande={selectedVenteForCasiers}
          onValidate={() => {
            loadData();
            setCasiersModalOpen(false);
            setSelectedVenteForCasiers(null);
            notifications.show("Livraison validée avec succès !", { severity: "success" });
          }}
          clientNom={clientNomForCasiers}
        />
      ) : (
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
      )}
    </>
  );
}
