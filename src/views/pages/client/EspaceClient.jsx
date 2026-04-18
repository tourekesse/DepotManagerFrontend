import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  Paper,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ShoppingCart,
  History,
  Logout,
  Receipt,
  LocalShipping,
  CheckCircle,
  Pending,
  Cancel,
} from '@mui/icons-material';
import { privateApi } from '../../../api/axios';

/**
 * EspaceClient - Dashboard restreint pour les clients (role CLIENT_BAR)
 * Affiche uniquement:
 * - Bouton "Nouvelle commande"
 * - Historique des commandes
 */
export default function EspaceClient() {
  const navigate = useNavigate();
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCommande, setSelectedCommande] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Récupérer infos client depuis localStorage
  const email = localStorage.getItem('email') || '';
  const firstName = localStorage.getItem('firstName') || 'Client';
  const role = localStorage.getItem('role') || '';

  useEffect(() => {
    // Vérifier que l'utilisateur est bien un client
    if (role !== 'CLIENT_BAR') {
      navigate('/login-client');
      return;
    }

    fetchCommandes();
  }, [role, navigate]);

  const fetchCommandes = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const response = await privateApi.get('/api/commandes-mobile/mes-commandes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setCommandes(response.data || []);
    } catch (err) {
      console.error('Erreur chargement commandes:', err);
      if (err.response?.status === 401) {
        setError('Session expirée. Reconnectez-vous.');
        setTimeout(() => navigate('/login-client'), 2000);
      } else {
        setError('Erreur lors du chargement de vos commandes');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login-client');
  };

  const handleNewCommande = () => {
    navigate('/commande-client');
  };

  const handleViewDetails = (commande) => {
    setSelectedCommande(commande);
    setDialogOpen(true);
  };

  const getStatutColor = (statut) => {
    switch (statut?.toUpperCase()) {
      case 'EN_ATTENTE':
      case 'PENDING':
        return 'warning';
      case 'VALIDEE':
      case 'VALIDATED':
        return 'info';
      case 'EN_PREPARATION':
        return 'primary';
      case 'LIVREE':
      case 'DELIVERED':
        return 'success';
      case 'ANNULEE':
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatutIcon = (statut) => {
    switch (statut?.toUpperCase()) {
      case 'EN_ATTENTE':
      case 'PENDING':
        return <Pending />;
      case 'VALIDEE':
      case 'VALIDATED':
        return <CheckCircle />;
      case 'EN_PREPARATION':
        return <ShoppingCart />;
      case 'LIVREE':
      case 'DELIVERED':
        return <LocalShipping />;
      case 'ANNULEE':
      case 'CANCELLED':
        return <Cancel />;
      default:
        return <Receipt />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatMontant = (montant) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(montant || 0);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Header */}
      <AppBar position="static" sx={{ bgcolor: '#059669' }}>
        <Toolbar>
          <Box
            component="img"
            src="/logo.svg"
            alt="DepotManager Logo"
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              mr: 2,
            }}
          />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            DepotManager Client
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {firstName}
          </Typography>
          <IconButton color="inherit" onClick={handleLogout}>
            <Logout />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Boutons d'action */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Card sx={{ flex: 1, background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' }}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<ShoppingCart />}
                onClick={handleNewCommande}
                sx={{
                  bgcolor: 'white',
                  color: '#0f766e',
                  fontWeight: 'bold',
                  px: 4,
                  py: 1.5,
                  '&:hover': {
                    bgcolor: '#f0f0f0'
                  }
                }}
              >
                Nouvelle Commande
              </Button>
            </CardContent>
          </Card>
          
          <Card sx={{ flex: 1, background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)' }}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<History />}
                onClick={() => navigate('/accueil/mes-commandes')}
                sx={{
                  bgcolor: 'white',
                  color: '#1e40af',
                  fontWeight: 'bold',
                  px: 4,
                  py: 1.5,
                  '&:hover': {
                    bgcolor: '#f0f0f0'
                  }
                }}
              >
                Mes Commandes
              </Button>
            </CardContent>
          </Card>
        </Box>

        {/* Historique des commandes */}
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <History sx={{ mr: 1, color: '#059669' }} />
            <Typography variant="h5" fontWeight="bold">
              Historique des commandes
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>Chargement...</Typography>
            </Box>
          ) : commandes.length === 0 ? (
            <Alert severity="info">
              Aucune commande pour le moment. Commencez par passer votre première commande!
            </Alert>
          ) : (
            <List>
              {commandes.map((commande, index) => (
                <React.Fragment key={commande.id || index}>
                  <ListItem
                    sx={{
                      bgcolor: '#fafafa',
                      borderRadius: 2,
                      mb: 2,
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: '#f0f0f0'
                      }
                    }}
                    onClick={() => handleViewDetails(commande)}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mb: 1 }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Commande #{commande.id}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(commande.dateCommande)}
                        </Typography>
                      </Box>
                      <Chip
                        icon={getStatutIcon(commande.statut)}
                        label={commande.statut || 'N/A'}
                        color={getStatutColor(commande.statut)}
                        size="small"
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <Typography variant="body2">
                        {commande.nombreArticles || 0} article(s)
                      </Typography>
                      <Typography variant="h6" fontWeight="bold" color="primary">
                        {formatMontant(commande.montantTotal)}
                      </Typography>
                    </Box>
                  </ListItem>
                  {index < commandes.length - 1 && <Divider sx={{ my: 1 }} />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
      </Container>

      {/* Dialog Détails Commande */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Commande #{selectedCommande?.id}</Typography>
            <Chip
              icon={getStatutIcon(selectedCommande?.statut)}
              label={selectedCommande?.statut || 'N/A'}
              color={getStatutColor(selectedCommande?.statut)}
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedCommande && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Date: {formatDate(selectedCommande.dateCommande)}
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                Détails:
              </Typography>
              <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, mb: 2 }}>
                <Typography variant="body2">
                  Nombre d'articles: {selectedCommande.nombreArticles || 0}
                </Typography>
                <Typography variant="body2">
                  Montant total: <strong>{formatMontant(selectedCommande.montantTotal)}</strong>
                </Typography>
                {selectedCommande.livreur && (
                  <Typography variant="body2">
                    Livreur: {selectedCommande.livreur}
                  </Typography>
                )}
              </Box>

              {selectedCommande.commentaire && (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    Commentaire:
                  </Typography>
                  <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 2 }}>
                    {selectedCommande.commentaire}
                  </Typography>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
