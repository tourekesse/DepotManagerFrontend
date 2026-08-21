import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  Tab,
  Tabs,
  Badge,
  CircularProgress,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Navigation,
  Phone,
  MapPin,
  CheckCircle,
  DirectionsCar,
  LocalAtm,
} from '@mui/icons-material';
import { privateApi } from '../../../api/axios';
import { formatCurrency } from '../../../utils/currencyUtils';

const formatMontant = (montant) => {
  if (!montant || isNaN(montant)) return formatCurrency(0);
  return formatCurrency(montant);
};

// Dialog pour livrer une vente
const LivraisonDetailDialog = ({ open, vente, onClose, onLivrer, loading }) => {
  const [paiementCollecte, setPaiementCollecte] = useState(false);
  const [montantPaye, setMontantPaye] = useState(vente?.totalGeneral?.toString() || '');
  const [signature, setSignature] = useState('');

  const handleLivrer = () => {
    onLivrer(vente.id, {
      statutLivraison: 'LIVREE',
      paiementCollecte,
      montantPaye: parseFloat(montantPaye),
      signature,
    });
  };

  if (!vente) return null;

  // Vérifier si c'est un paiement à la livraison
  const estPaiementLivraison = vente.modePaiement === 'ESPECES' || vente.modePaiement === 'MOBILE_MONEY';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontWeight: 'bold',
      }}>
        🚚 Livraison #VTE-{vente.id}
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Infos client */}
          <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
            <Typography variant="body2" fontWeight="bold">
              👤 {vente.clientPointVente?.nomClient || 'Client inconnu'}
            </Typography>
            <Typography variant="caption">
              📍 {vente.clientPointVente?.adresse || 'Adresse non spécifiée'}
            </Typography>
            <Typography variant="caption" display="block">
              📞 {vente.clientPointVente?.telephone || 'Tel non disponible'}
            </Typography>
          </Box>

          {/* Montant */}
          <Box>
            <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
              💰 Montant total
            </Typography>
            <Typography variant="h5" color="primary" fontWeight="bold">
              {formatMontant(vente.totalGeneral)}
            </Typography>
          </Box>

          {/* Articles */}
          <Box>
            <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
              📦 Articles à livrer
            </Typography>
            <List disablePadding>
              {vente.details?.slice(0, 3).map((detail, idx) => (
                <ListItem key={idx} disableGutters dense>
                  <ListItemText
                    primary={`${detail.quantite}× ${detail.article?.libelle || 'Article'}`}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
                  />
                </ListItem>
              ))}
              {vente.details?.length > 3 && (
                <ListItem disableGutters dense>
                  <ListItemText
                    primary={`... et ${vente.details.length - 3} autres`}
                    primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                  />
                </ListItem>
              )}
            </List>
          </Box>

          <Divider />

          {/* Paiement à la livraison */}
          {estPaiementLivraison && (
            <Alert severity="warning">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocalAtm />
                <Box>
                  <Typography variant="body2" fontWeight="bold">
                    Paiement à collecter
                  </Typography>
                  <Typography variant="body2" color="error" fontWeight="bold">
                    {formatMontant(vente.totalGeneral)}
                  </Typography>
                </Box>
              </Box>
            </Alert>
          )}

          {/* Champ montant payé */}
          {estPaiementLivraison && (
            <TextField
              fullWidth
              label="Montant reçu (FCFA)"
              type="number"
              value={montantPaye}
              onChange={(e) => setMontantPaye(e.target.value)}
              size="small"
              inputProps={{ step: "100", min: "0" }}
            />
          )}

          {/* Paiement confirmé */}
          {estPaiementLivraison && (
            <Box>
              <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
                💰 Paiement reçu?
              </Typography>
              <Button
                fullWidth
                variant={paiementCollecte ? "contained" : "outlined"}
                color={paiementCollecte ? "success" : "inherit"}
                onClick={() => setPaiementCollecte(!paiementCollecte)}
              >
                {paiementCollecte ? '✅ Paiement reçu' : '❌ En attente paiement'}
              </Button>
            </Box>
          )}

          {/* Signature */}
          <Box>
            <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
              ✍️ Signature/Code
            </Typography>
            <TextField
              fullWidth
              label="Signature client ou code de livraison"
              placeholder="Ex: Signé par X ou code OTP"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              size="small"
            />
          </Box>

          {/* Consignation emballage */}
          {(vente.montantEmballageTotal > 0 || vente.montantVidesRendus > 0) && (
            <Alert severity="info">
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                📦 Gestion des emballages
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Typography variant="caption">
                  Consigné: {formatMontant(vente.montantEmballageTotal)}
                </Typography>
                <Typography variant="caption">
                  Ramené: {formatMontant(vente.montantVidesRendus)}
                </Typography>
              </Box>
            </Alert>
          )}

          <Alert severity="success">
            Confirmez quand la livraison est effectuée et le paiement collecté
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={handleLivrer}
          disabled={loading || (estPaiementLivraison && !paiementCollecte)}
          startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
        >
          {loading ? 'Enregistrement...' : 'Confirmer livraison'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Component principal: PWA Livreur
export default function PWALivreur() {
  const [tab, setTab] = useState(0);
  const [ventes, setVentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVente, setSelectedVente] = useState(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const livreurId = 1; // À récupérer depuis auth

  useEffect(() => {
    chargerVentes();
    // Refresh auto toutes les 10 secondes
    const interval = setInterval(chargerVentes, 10000);
    return () => clearInterval(interval);
  }, []);

  const chargerVentes = async () => {
    try {
      setLoading(true);
      // Récupérer les ventes non livrées assignées à ce livreur
      const response = await privateApi.get('/api/ventes', {
        params: { 
          livreurId, 
          statutLivraison: 'NON_LIVREE',
          page: 0, 
          size: 50 
        }
      });
      setVentes(response.data.content || response.data || []);
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors du chargement des livraisons');
    } finally {
      setLoading(false);
    }
  };

  const handleLivrer = async (venteId, livraisonData) => {
    setSubmitting(true);
    try {
      // Mettre à jour la vente avec le statut de livraison
      await privateApi.put(`/api/ventes/${venteId}`, {
        statutLivraison: livraisonData.statutLivraison,
        montantPaye: livraisonData.montantPaye,
        modePaiement: livraisonData.paiementCollecte ? 'ESPECES' : undefined,
      });
      chargerVentes();
      setOpenDetail(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la livraison');
    } finally {
      setSubmitting(false);
    }
  };

  const ventesEnRoute = ventes.filter(v => v.statutLivraison === 'NON_LIVREE');
  const ventesLivrees = ventes.filter(v => v.statutLivraison === 'LIVREE');

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header */}
      <Box sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        p: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}>
        <DirectionsCar sx={{ fontSize: 40 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight="bold">
            🚚 Mes livraisons
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {ventesEnRoute.length} livraisons en attente
          </Typography>
        </Box>
        <Button
          variant="outlined"
          sx={{ color: 'white', borderColor: 'white' }}
          onClick={chargerVentes}
          size="small"
        >
          🔄 Actualiser
        </Button>
      </Box>

      {/* Messages */}
      {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}

      {/* Stats */}
      <Grid container spacing={2} sx={{ p: 2 }}>
        <Grid item xs={6}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Badge badgeContent={ventesEnRoute.length} color="warning">
                <DirectionsCar color="primary" sx={{ fontSize: 35 }} />
              </Badge>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                En attente
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Badge badgeContent={ventesLivrees.length} color="success">
                <CheckCircle color="success" sx={{ fontSize: 35 }} />
              </Badge>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Livrées
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs 
        value={tab} 
        onChange={(e, v) => setTab(v)}
        sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label={`🚚 À livrer (${ventesEnRoute.length})`} />
        <Tab label={`✅ Livrées (${ventesLivrees.length})`} />
      </Tabs>

      {/* Contenu */}
      <Box sx={{ p: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(tab === 0 ? ventesEnRoute : ventesLivrees).map(vente => (
              <Card 
                key={vente.id}
                sx={{
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1.5 }}>
                    <Box>
                      <Typography variant="body1" fontWeight="bold">
                        {vente.clientPointVente?.nomClient || 'Client inconnu'}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <MapPin sx={{ fontSize: 16 }} />
                        <Typography variant="caption" color="text.secondary">
                          {vente.clientPointVente?.adresse || 'Adresse non spécifiée'}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={formatMontant(vente.totalGeneral)}
                      color="success"
                      variant="filled"
                    />
                  </Box>

                  <Divider sx={{ my: 1 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip 
                        label={`📦 ${vente.details?.length || 0}`}
                        variant="outlined"
                        size="small"
                      />
                      {(vente.modePaiement === 'ESPECES' || vente.modePaiement === 'MOBILE_MONEY') && (
                        <Chip
                          label="💰 À collecter"
                          color="warning"
                          variant="filled"
                          size="small"
                        />
                      )}
                    </Box>
                    {tab === 0 && (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => {
                          setSelectedVente(vente);
                          setOpenDetail(true);
                        }}
                      >
                        Livrer
                      </Button>
                    )}
                  </Box>

                  {/* Infos de contact */}
                  <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Phone />}
                      href={`tel:${vente.clientPointVente?.telephone}`}
                    >
                      Appeler
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Navigation />}
                      onClick={() => {
                        // Ouvrir GPS
                        window.open(`https://maps.google.com/?q=${vente.clientPointVente?.adresse}`, '_blank');
                      }}
                    >
                      GPS
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}

            {(tab === 0 ? ventesEnRoute : ventesLivrees).length === 0 && (
              <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'info.light' }}>
                <Typography color="text.secondary">
                  {tab === 0 ? 'Aucune livraison en attente' : 'Aucune livraison effectuée'}
                </Typography>
              </Paper>
            )}
          </Box>
        )}
      </Box>

      {/* Detail Dialog */}
      {selectedVente && (
        <LivraisonDetailDialog
          open={openDetail}
          vente={selectedVente}
          onClose={() => setOpenDetail(false)}
          onLivrer={handleLivrer}
          loading={submitting}
        />
      )}
    </Box>
  );
}
