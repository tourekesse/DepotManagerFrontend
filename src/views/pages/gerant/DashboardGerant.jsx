import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Paper,
  Tab,
  Tabs,
  Badge,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  CheckCircle,
  Close,
  Edit,
  Pause,
  MoreVert,
  Error,
  Check,
  Info,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  PersonAdd,
  Send,
} from '@mui/icons-material';
import { privateApi } from '../../../api/axios';
import useActivePointDeVenteId from '../../../hooks/useActivePointDeVenteId';
import InvitationModal from '../../../components/InvitationModal';

const formatMontant = (montant) => {
  if (!montant || isNaN(montant)) return '0 FCFA';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(montant) + ' FCFA';
};

// Dialog pour voir les détails d'une commande
const CommandeDetailDialog = ({ open, commande, onClose, onValider, onModifier, onRefuser }) => {
  const [action, setAction] = useState(null);
  const [raison, setRaison] = useState('');
  const [modification, setModification] = useState('');

  const handleAction = () => {
    if (action === 'valider') {
      onValider(commande.id);
    } else if (action === 'modifier') {
      onModifier(commande.id, modification);
    } else if (action === 'refuser') {
      onRefuser(commande.id, raison);
    }
    handleClose();
  };

  const handleClose = () => {
    setAction(null);
    setRaison('');
    setModification('');
    onClose();
  };

  if (!commande) return null;

  const totalDette = commande.lignes?.reduce((sum, ligne) => sum + (ligne.montantTotal || 0), 0) || 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ 
        background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
        color: 'white',
        fontWeight: 'bold',
      }}>
        📋 Détails Commande
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Stack spacing={2}>
          {/* En-tête */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">PRÉ-FACTURE</Typography>
                <Typography variant="h6" fontWeight="bold">{commande.preFactureNumero}</Typography>
              </Box>
              <Chip 
                label={commande.statut?.replace(/_/g, ' ')}
                color={commande.statut === 'EN_ATTENTE' ? 'warning' : 'success'}
                size="small"
              />
            </Box>
          </Box>

          {/* Client */}
          <Paper sx={{ p: 2, bgcolor: 'info.light' }}>
            <Typography variant="caption" color="text.secondary">🧑 Client</Typography>
            <Typography variant="body2" fontWeight="bold">{commande.clientNom}</Typography>
            <Typography variant="caption">📞 {commande.clientTelephone}</Typography>
          </Paper>

          {/* Montant */}
          <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">💰 Montant Total</Typography>
            <Typography variant="h5" fontWeight="bold" color="success.main">
              {formatMontant(commande.montantTotal)}
            </Typography>
          </Box>

          {/* Articles */}
          <Box>
            <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
              📦 Articles ({commande.lignes?.length || 0})
            </Typography>
            <List disablePadding>
              {commande.lignes?.map((ligne, idx) => (
                <ListItem key={idx} disableGutters dense>
                  <ListItemText
                    primary={`${ligne.produitNom}`}
                    secondary={`${ligne.quantite} × ${formatMontant(ligne.prixUnitaire)} = ${formatMontant(ligne.montantTotal)}`}
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>

          {/* Paiement */}
          <Box>
            <Typography variant="caption" color="text.secondary">💳 Mode Paiement</Typography>
            <Chip 
              label={
                commande.typePaiement === 'LIVRAISON' ? '🚚 À la livraison' :
                commande.typePaiement === 'MOBILE_MONEY' ? '📱 Mobile Money' :
                '📋 Crédit'
              }
              variant="outlined"
              size="small"
              sx={{ mt: 1 }}
            />
          </Box>

          {/* Checks automatiques */}
          <Alert severity="info">
            <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
              ✅ Checks automatiques
            </Typography>
            <Typography variant="caption" display="block">
              ✓ Stock suffisant
            </Typography>
            <Typography variant="caption" display="block">
              ✓ Client actif
            </Typography>
            <Typography variant="caption" display="block">
              ✓ Crédit OK (si crédit)
            </Typography>
          </Alert>

          {/* Actions */}
          {action === null && (
            <Stack spacing={2}>
              <Button
                fullWidth
                variant="contained"
                color="success"
                startIcon={<Check />}
                onClick={() => setAction('valider')}
              >
                ✅ Valider
              </Button>
              <Button
                fullWidth
                variant="outlined"
                color="primary"
                startIcon={<Edit />}
                onClick={() => setAction('modifier')}
              >
                ✏️ Modifier (proposer changement)
              </Button>
              <Button
                fullWidth
                variant="outlined"
                color="warning"
                startIcon={<Pause />}
                onClick={() => setAction('attendre')}
              >
                ⏸️ En attente (réappro)
              </Button>
              <Button
                fullWidth
                variant="outlined"
                color="error"
                startIcon={<Close />}
                onClick={() => setAction('refuser')}
              >
                ❌ Refuser
              </Button>
            </Stack>
          )}

          {/* Formulaire modification */}
          {action === 'modifier' && (
            <Box>
              <TextField
                fullWidth
                label="Proposer une modification"
                placeholder="Ex: Quantité réduite, stock insuffisant..."
                value={modification}
                onChange={(e) => setModification(e.target.value)}
                multiline
                rows={3}
              />
              <Alert severity="info" sx={{ mt: 2 }}>
                Client devra revalider avant création de vente
              </Alert>
            </Box>
          )}

          {/* Formulaire refus */}
          {action === 'refuser' && (
            <TextField
              fullWidth
              label="Raison du refus"
              placeholder="Ex: Stock insuffisant, client bloqué..."
              value={raison}
              onChange={(e) => setRaison(e.target.value)}
              multiline
              rows={3}
            />
          )}

          {/* Formulaire attente */}
          {action === 'attendre' && (
            <Alert severity="warning">
              Commande mise en attente. Client sera notifié qu'on attend réappro.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose}>Annuler</Button>
        {action !== null && (
          <Button
            variant="contained"
            onClick={handleAction}
            disabled={
              (action === 'modifier' && !modification) ||
              (action === 'refuser' && !raison)
            }
          >
            Confirmer
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

// Component principal: Dashboard Gérant
export default function DashboardGerant() {
  const navigate = useNavigate();
  const pvId = useActivePointDeVenteId(); // Utilise le pvId dynamique de l'utilisateur connecté
  const [tab, setTab] = useState(0);
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedCommande, setSelectedCommande] = useState(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [openInvitationModal, setOpenInvitationModal] = useState(false);
  const [invitationMode, setInvitationMode] = useState('invite'); // 'invite' ou 'create'

  // Mock depot info - à remplacer avec les vraies données
  const depotInfo = { name: 'Dépôt Principal', id: pvId };
  const gerantInfo = { name: 'Gérant Principal' };

  useEffect(() => {
    chargerCommandes();
  }, [tab]);

  const chargerCommandes = async () => {
    try {
      setLoading(true);
      const response = await privateApi.get('/api/commandes/en-attente', {
        params: { pvId, page: 0, size: 50 }
      });
      setCommandes(response.data.content || []);
    } catch (err) {
      console.error('Erreur chargement:', err);
      setError('Erreur lors du chargement des commandes');
    } finally {
      setLoading(false);
    }
  };

  const handleValiderCommande = async (commandeId) => {
    try {
      const gerantId = 1; // À récupérer depuis auth
      await privateApi.post(`/api/commandes/${commandeId}/valider`, null, {
        params: { gerantId }
      });
      chargerCommandes();
      setOpenDetail(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la validation');
    }
  };

  const handleModifierCommande = async (commandeId, modification) => {
    try {
      await privateApi.put(`/api/commandes/${commandeId}/modifier`, {
        detailsModification: modification,
      });
      chargerCommandes();
      setOpenDetail(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la modification');
    }
  };

  const handleRefuserCommande = async (commandeId, raison) => {
    try {
      await privateApi.post(`/api/commandes/${commandeId}/refuser`, null, {
        params: { raison }
      });
      chargerCommandes();
      setOpenDetail(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du refus');
    }
  };

  const handleInvitationSuccess = (data) => {
    setSuccess(`✅ Invitation envoyée à ${data.clientName} avec succès!`);
    setOpenInvitationModal(false);
  };

  const commandesEnAttente = commandes.filter(c => c.statut === 'EN_ATTENTE');
  const commandesModifiees = commandes.filter(c => c.statut === 'MODIFIEE');
  const commandesValidees = commandes.filter(c => c.statut === 'VALIDEE');

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header */}
      <Box sx={{
        background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
        color: 'white',
        p: 3,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>
            📊 Dashboard Gérant
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Validation commandes mobiles
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<PersonAdd />}
            onClick={() => {
              setInvitationMode('invite');
              setOpenInvitationModal(true);
            }}
            sx={{ 
              bgcolor: 'rgba(255,255,255,0.2)', 
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
            }}
          >
            Inviter Client
          </Button>
          <Button
            variant="outlined"
            startIcon={<Send />}
            onClick={() => {
              setInvitationMode('create');
              setOpenInvitationModal(true);
            }}
            sx={{ 
              borderColor: 'rgba(255,255,255,0.5)', 
              color: 'white',
              '&:hover': { 
                borderColor: 'rgba(255,255,255,0.8)',
                bgcolor: 'rgba(255,255,255,0.1)'
              }
            }}
          >
            Créer & Inviter
          </Button>
        </Box>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ p: 2 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Badge badgeContent={commandesEnAttente.length} color="warning">
                <ShoppingCart color="primary" sx={{ fontSize: 40 }} />
              </Badge>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                En attente
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Badge badgeContent={commandesModifiees.length} color="warning">
                <Edit color="warning" sx={{ fontSize: 40 }} />
              </Badge>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                À revalider
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Badge badgeContent={commandesValidees.length} color="success">
                <Check color="success" sx={{ fontSize: 40 }} />
              </Badge>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Validées
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Messages */}
      {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ m: 2 }}>{success}</Alert>}

      {/* Tabs */}
      <Tabs 
        value={tab} 
        onChange={(e, v) => setTab(v)}
        sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label={`📋 En attente (${commandesEnAttente.length})`} />
        <Tab label={`✏️ À revalider (${commandesModifiees.length})`} />
        <Tab label={`✅ Validées (${commandesValidees.length})`} />
      </Tabs>

      {/* Contenu */}
      <Box sx={{ p: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2}>
            {(tab === 0 ? commandesEnAttente : tab === 1 ? commandesModifiees : commandesValidees).map(commande => (
              <Card 
                key={commande.id}
                sx={{
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }
                }}
                onClick={() => {
                  setSelectedCommande(commande);
                  setOpenDetail(true);
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box>
                      <Typography variant="body1" fontWeight="bold">
                        {commande.clientNom}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {commande.preFactureNumero}
                      </Typography>
                    </Box>
                    <Chip
                      label={formatMontant(commande.montantTotal)}
                      color="primary"
                      variant="filled"
                      icon={<AttachMoney />}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip 
                        label={`${commande.lignes?.length || 0} articles`}
                        variant="outlined"
                        size="small"
                      />
                      <Chip
                        label={commande.typePaiement === 'LIVRAISON' ? '🚚' : 
                               commande.typePaiement === 'MOBILE_MONEY' ? '📱' : '📋'}
                        size="small"
                      />
                    </Box>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCommande(commande);
                        setOpenDetail(true);
                      }}
                    >
                      Voir
                    </Button>
                  </Box>

                  {commande.modifieeParGerant && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      ⚠️ Modification proposée: {commande.detailsModification}
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}

            {(tab === 0 ? commandesEnAttente : tab === 1 ? commandesModifiees : commandesValidees).length === 0 && (
              <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'info.light' }}>
                <Typography color="text.secondary">
                  Aucune commande dans cette catégorie
                </Typography>
              </Paper>
            )}
          </Stack>
        )}
      </Box>

      {/* Detail Dialog */}
      {selectedCommande && (
        <CommandeDetailDialog
          open={openDetail}
          commande={selectedCommande}
          onClose={() => setOpenDetail(false)}
          onValider={handleValiderCommande}
          onModifier={handleModifierCommande}
          onRefuser={handleRefuserCommande}
        />
      )}

      {/* Invitation Modal */}
      <InvitationModal
        open={openInvitationModal}
        onClose={() => setOpenInvitationModal(false)}
        onSuccess={handleInvitationSuccess}
        depotInfo={depotInfo}
        gerantInfo={gerantInfo}
        mode={invitationMode}
      />
    </Box>
  );
}
