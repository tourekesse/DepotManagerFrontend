import * as React from 'react';
import {
  Box, Button, IconButton, Stack, Tooltip, Alert,
  useTheme, useMediaQuery, Card, CardContent, Typography, Divider, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Chip
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PhoneIcon from '@mui/icons-material/Phone';
import PlaceIcon from '@mui/icons-material/Place';
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
import { formatCurrency } from '../../../utils/currencyUtils';

function getArticleName(article) {
  return article?.nomProduit
    || article?.designation
    || article?.produitNom
    || article?.produit?.nomProduit
    || article?.produit?.designation
    || 'Produit';
}

function getDetailArticles(detail) {
  if (!detail) return [];
  return detail.details || detail.articles || detail.lignes || [];
}

function CommandeDetailsDialog({ open, onClose, detail, loading, error }) {
  const articles = getDetailArticles(detail);
  const telephone = detail?.telephoneClient || detail?.client?.telephone || '';
  const adresse = detail?.adresseClient || detail?.adresse || detail?.client?.adresse || '';
  const mapsUrl = detail?.latitudeClient && detail?.longitudeClient
    ? `https://www.google.com/maps?q=${detail.latitudeClient},${detail.longitudeClient}`
    : null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 800 }}>
        Détails commande #{detail?.id || ''}
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Stack alignItems="center" spacing={2} sx={{ py: 5 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">Chargement des détails...</Typography>
          </Stack>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Stack spacing={2.5}>
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Client</Typography>
                <Typography variant="body1" fontWeight={700}>{detail?.nomClient || 'Client'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Montant total</Typography>
                <Typography variant="body1" fontWeight={700}>{formatCurrency(detail?.montantTotal)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Téléphone</Typography>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <PhoneIcon sx={{ fontSize: 17, color: 'text.secondary' }} />
                  <Typography variant="body2" fontWeight={600}>{telephone || 'Non renseigné'}</Typography>
                </Stack>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Emballages</Typography>
                <Typography variant="body2" fontWeight={600}>{formatCurrency(detail?.montantEmballage)}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Adresse</Typography>
                <Stack direction="row" spacing={0.75} alignItems="flex-start">
                  <PlaceIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.2 }} />
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{adresse || 'Non renseignée'}</Typography>
                    {mapsUrl && (
                      <Button
                        size="small"
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        sx={{ px: 0, minWidth: 0 }}
                      >
                        Ouvrir la position
                      </Button>
                    )}
                  </Box>
                </Stack>
              </Grid>
            </Grid>

            <Divider />

            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle1" fontWeight={800}>Produits à livrer</Typography>
              <Chip size="small" label={`${articles.length} article${articles.length > 1 ? 's' : ''}`} />
            </Stack>

            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Produit</TableCell>
                    <TableCell align="right">Quantité</TableCell>
                    <TableCell align="right">Prix unitaire</TableCell>
                    <TableCell align="right">Emballage</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {articles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Typography variant="body2" color="text.secondary">Aucun article trouvé.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : articles.map((article, index) => (
                    <TableRow key={`${article.produitId || index}-${index}`}>
                      <TableCell>{getArticleName(article)}</TableCell>
                      <TableCell align="right">{Number(article.quantite || 0).toLocaleString('fr-FR')}</TableCell>
                      <TableCell align="right">{formatCurrency(article.prixUnitaire)}</TableCell>
                      <TableCell align="right">{formatCurrency(article.consigneCasier || article.prixUnitaireEmballage)}</TableCell>
                      <TableCell align="right">{formatCurrency(article.prixTotal || article.montantTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function MesLivraisonsPage() {
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
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [selectedCommandeDetail, setSelectedCommandeDetail] = React.useState(null);
  const [detailsLoading, setDetailsLoading] = React.useState(false);
  const [detailsError, setDetailsError] = React.useState('');

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

  const handleOpenDetails = async (row) => {
    setDetailsOpen(true);
    setSelectedCommandeDetail({ ...row, id: row.id });
    setDetailsLoading(true);
    setDetailsError('');
    try {
      const res = await privateApi.get(`/api/commandes-mobile/${row.id}/details`);
      setSelectedCommandeDetail(res.data || row);
    } catch (e) {
      console.error('Erreur chargement détails commande:', e);
      setDetailsError("Impossible de charger les détails de cette commande.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedCommandeDetail(null);
    setDetailsError('');
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
      headerName: 'Actions',
      width: 310,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const row = params.row;
        return (
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Button
              size="small"
              variant="outlined"
              startIcon={<VisibilityIcon />}
              onClick={() => handleOpenDetails(row)}
            >
              Voir détails
            </Button>
            {(isLivreur || isGerant) && (
              <Tooltip title="Gérer les casiers/vides rendus">
                <IconButton size="small" color="secondary" onClick={() => handleOpenCasiers(row)}>
                  <Inventory2Icon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {(isLivreur || isGerant) && <PrintReceiptButton venteId={row.id} size="small" />}
          </Stack>
        );
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
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatCurrency(row.totalGeneral)}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="textSecondary">Date</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDateCI(row.dateVente)}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="textSecondary">Statut</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.statutCommande || row.statutLivraison}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Button
                          fullWidth
                          size="small"
                          variant="outlined"
                          startIcon={<VisibilityIcon />}
                          onClick={() => handleOpenDetails(row)}
                          sx={{ mt: 1 }}
                        >
                          Voir détails
                        </Button>
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
      <CommandeDetailsDialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        detail={selectedCommandeDetail}
        loading={detailsLoading}
        error={detailsError}
      />
    </>
  );
}
