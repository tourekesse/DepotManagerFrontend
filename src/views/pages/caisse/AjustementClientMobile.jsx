import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Fade,
  Slide,
  IconButton,
  Paper,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import { 
  ArrowBack, 
  Save, 
  TrendingUp, 
  TrendingDown,
  MonetizationOn,
  ShoppingBag,
  Info,
  AttachMoney,
  Close,
  CheckCircle,
  Help,
} from '@mui/icons-material';
import { privateApi, publicApi } from '../../../api/axios';
import useActivePointDeVenteId from '../../../hooks/useActivePointDeVenteId';

const formatMontant = (montant) => {
  if (!montant || isNaN(montant)) return '0 FCFA';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(montant) + ' FCFA';
};

export default function AjustementClientMobile() {
  const navigate = useNavigate();
  const pvId = useActivePointDeVenteId(); // Utilise le pvId dynamique
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [libelle, setLibelle] = useState('');
  const [montant, setMontant] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openConfirm, setOpenConfirm] = useState(false);
  
  // États progressifs
  const [currentStep, setCurrentStep] = useState(1); // 1: Client, 2: Type, 3: Libellé, 4: Montant
  const [operationType, setOperationType] = useState('paiement');
  const [showExplanation, setShowExplanation] = useState(false); // Pour afficher l'explication détaillée
  const [hideHelpPermanently, setHideHelpPermanently] = useState(false); // Pour masquer l'aide définitivement

  // 🎯 Configuration des types d'opérations AVEC EXEMPLES CONCRETS
  const operations = {
    paiement: {
      label: 'Paiement dette liquide',
      icon: <TrendingDown />,
      color: 'success',
      description: 'Client paie sa dette liquide (crédit)',
      exemple: 'Doit 50 000F, paie 20 000F → Nouvelle dette: 30 000F',
      casUsage: ['Passe au dépôt', 'Paiement partiel', 'Régularise'],
      explicationDetaillee: {
        titre: '💰 PAIEMENT DETTE LIQUIDE',
        quand: 'QUAND L\'UTILISER ?',
        cas: [
          '🏪 Le client passe au dépôt pour régler sa dette',
          '💸 Le client fait un paiement partiel ou complet',
          '📝 Le client veut régulariser son compte'
        ],
        comment: 'COMMENT ÇA MARCHE ?',
        etapes: [
          '1️⃣ Le client donne de l\'argent',
          '2️⃣ Vous saisissez le montant payé',
          '3️⃣ Le système déduit automatiquement sa dette',
          '4️⃣ L\'argent entre dans votre caisse (➕ ENTRÉE)'
        ],
        resultat: 'RÉSULTAT CONCRET',
        exempleCalc: 'Client doit 50 000F\nIl paie 20 000F\n💡 Nouvelle dette = 30 000F'
      },
      typeoperation: 'Entrée',
      placeholder: 'Ex: 50 000',
    },
    remboursement: {
      label: 'Remboursement',
      icon: <TrendingUp />,
      color: 'error', 
      description: 'Remboursement au client (trop-payé, retour)',
      exemple: 'Trop payé 10 000F → On lui rembourse 10 000F',
      casUsage: ['Erreur caisse', 'Retour marchandise', 'Avoir'],
      explicationDetaillee: {
        titre: '💸 REMBOURSEMENT AU CLIENT',
        quand: 'QUAND L\'UTILISER ?',
        cas: [
          '❌ Erreur de caisse : le client a trop payé',
          '🔄 Retour de marchandise non conforme',
          '💰 Créer un avoir pour le client'
        ],
        comment: 'COMMENT ÇA MARCHE ?',
        etapes: [
          '1️⃣ Vous vérifiez l\'erreur ou le retour',
          '2️⃣ Vous saisissez le montant à rembourser',
          '3️⃣ Le système ajuste le compte du client',
          '4️⃣ L\'argent sort de votre caisse (➖ SORTIE)'
        ],
        resultat: 'RÉSULTAT CONCRET',
        exempleCalc: 'Client a trop payé 10 000F\nVous lui remboursez 10 000F\n💡 Le client récupère son argent'
      },
      typeoperation: 'Sortie',
      placeholder: 'Ex: 20 000',
    },
    consignation: {
      label: 'Consignation',
      icon: <ShoppingBag />,
      color: 'info',
      description: 'Client paie la consigne des emballages',
      exemple: 'Prend 10 casiers → Paie 10 × 500F = 5 000F de consigne',
      casUsage: ['Achète casiers', 'Nouveau client'],
      explicationDetaillee: {
        titre: '📦 CONSIGNATION EMBALLAGES',
        quand: 'QUAND L\'UTILISER ?',
        cas: [
          '🆕 Nouveau client qui n\'a pas de casiers',
          '🛒 Le client achète plus de casiers qu\'il n\'en a',
          '📦 Le client veut des emballages neufs'
        ],
        comment: 'COMMENT ÇA MARCHE ?',
        etapes: [
          '1️⃣ Le client prend des casiers/vidanges',
          '2️⃣ Vous comptez le nombre d\'emballages',
          '3️⃣ Vous calculez : nombre × prix unitaire',
          '4️⃣ Le client paie cette consigne (➕ ENTRÉE)'
        ],
        resultat: 'RÉSULTAT CONCRET',
        exempleCalc: 'Client prend 10 casiers\nPrix unitaire = 500F\n💡 Consigne à payer = 10 × 500F = 5 000F'
      },
      typeoperation: 'Entrée',
      placeholder: 'Ex: 5 000',
    },
    deconsignation: {
      label: 'Déconsignation',
      icon: <MonetizationOn />,
      color: 'warning',
      description: 'Remboursement de la consigne au client',
      exemple: 'Rapporte 15 casiers → Rembourse 15 × 500F = 7 500F',
      casUsage: ['Retour casiers', 'Fin contrat'],
      explicationDetaillee: {
        titre: '📤 DÉCONSIGNATION EMBALLAGES',
        quand: 'QUAND L\'UTILISER ?',
        cas: [
          '🔄 Le client rapporte ses casiers/vidanges',
          '🏁 Fin de contrat avec le client',
          '💵 Le client veut récupérer son argent de consigne'
        ],
        comment: 'COMMENT ÇA MARCHE ?',
        etapes: [
          '1️⃣ Le client rapporte les emballages',
          '2️⃣ Vous vérifiez l\'état et le nombre',
          '3️⃣ Vous calculez le remboursement',
          '4️⃣ Vous lui remboursez la consigne (➖ SORTIE)'
        ],
        resultat: 'RÉSULTAT CONCRET',
        exempleCalc: 'Client rapporte 15 casiers\nPrix unitaire = 500F\n💡 Remboursement = 15 × 500F = 7 500F'
      },
      typeoperation: 'Sortie', 
      placeholder: 'Ex: 3 000',
    },
  };

  // Charger les clients
  useEffect(() => {
    chargerClients();
    // Charger la préférence de masquage de l'aide
    const hideHelp = localStorage.getItem('ajustement-client-hide-help');
    if (hideHelp === 'true') {
      setHideHelpPermanently(true);
    }
  }, []);

  const chargerClients = async () => {
    try {
      setLoading(true);
      
      // 🔍 Comme ClientPage - utilisation de publicApi
      const response = await publicApi.get("/api/clients");
      console.log('✅ Réponse clients (publicApi):', response.data);
      setClients(response.data || []);
    } catch (err) {
      console.error('❌ Erreur chargement clients:', err);
      setError('Erreur: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // 🎯 Fonction pour gérer le masquage de l'aide
  const handleHideHelpPermanently = () => {
    setHideHelpPermanently(true);
    localStorage.setItem('ajustement-client-hide-help', 'true');
    setShowExplanation(false);
  };

  // 🎯 Fonction pour réafficher l'aide si besoin
  const handleShowHelpAgain = () => {
    setHideHelpPermanently(false);
    localStorage.removeItem('ajustement-client-hide-help');
    setShowExplanation(true);
  };

  // 🎯 Générer le libellé automatiquement
  const genererLibelle = useCallback(() => {
    if (!selectedClient) return '';
    
    const operation = operations[operationType];
    const montantFormate = montant ? formatMontant(parseFloat(montant)) : '';

    switch (operationType) {
      case 'paiement':
        return `PAIEMENT DETTE LIQUIDE - ${selectedClient.raisonsociale}${montantFormate ? ' - ' + montantFormate : ''}`;
      case 'remboursement':
        return `REMBOURSEMENT CLIENT ${selectedClient.raisonsociale}${montantFormate ? ' - ' + montantFormate : ''}`;
      case 'consignation':
        return `CONSIGNATION EMBALLAGES - ${selectedClient.raisonsociale}${montantFormate ? ' - ' + montantFormate : ''}`;
      case 'deconsignation':
        return `DÉCONSIGNATION EMBALLAGES - ${selectedClient.raisonsociale}${montantFormate ? ' - ' + montantFormate : ''}`;
      default:
        return '';
    }
  }, [selectedClient, operationType, montant]);

  // Mettre à jour le libellé automatiquement
  useEffect(() => {
    setLibelle(genererLibelle());
  }, [genererLibelle]);

  // 📊 Calculer l'impact (optimisé)
  const impact = useMemo(() => {
    if (!selectedClient || !montant) return null;
    
    const operation = operations[operationType];
    const montantNum = parseFloat(montant) || 0;
    
    return {
      typeoperation: operation.typeoperation,
      montant: montantNum,
      nouveauSoldeLiquide: operationType === 'paiement' 
        ? (selectedClient.montantLiquide || 0) + montantNum
        : operationType === 'remboursement'
        ? (selectedClient.montantLiquide || 0) + montantNum
        : selectedClient.montantLiquide || 0,
      nouveauSoldeEmballage: ['consignation', 'deconsignation'].includes(operationType)
        ? (selectedClient.montantEmballage || 0) + (operationType === 'consignation' ? -montantNum : montantNum)
        : selectedClient.montantEmballage || 0,
    };
  }, [selectedClient, montant, operationType]);

  const handleValider = useCallback(() => {
    setError('');
    
    if (!selectedClient) {
      setError('Veuillez sélectionner un client');
      return;
    }

    if (!montant || parseFloat(montant) <= 0) {
      setError('Veuillez saisir un montant valide');
      return;
    }

    setOpenConfirm(true);
  }, [selectedClient, montant]);

  const handleConfirm = async () => {
    setOpenConfirm(false);
    
    try {
      await privateApi.post('/api/caisse/ajuster-client', null, {
        params: {
          pvId,
          clientId: selectedClient.id,
          ajustementLiquide: impact?.montant && ['paiement', 'remboursement'].includes(operationType) 
            ? (operationType === 'paiement' ? -impact.montant : impact.montant)
            : null,
          ajustementEmballage: impact?.montant && ['consignation', 'deconsignation'].includes(operationType)
            ? (operationType === 'consignation' ? -impact.montant : impact.montant)
            : null,
          libelle,
          description: `Opération: ${operations[operationType].label}`,
        },
      });

      setSuccess('✨ Opération enregistrée avec succès !');
      setTimeout(() => navigate('/accueil/caisse/journal'), 1500);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.response?.data?.message || 'Erreur lors de l\'ajustement');
    }
  };

  const operation = operations[operationType];

  return (
    <Box sx={{ 
      p: { xs: 0.5, sm: 1 }, 
      minHeight: '100vh',
      bgcolor: 'background.default'
    }}>
      {/* Header compact */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: 1,
        gap: 1
      }}>
        <IconButton 
          onClick={() => navigate('/accueil/caisse/journal')}
          size="small"
        >
          <ArrowBack />
        </IconButton>
        <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          Ajustement Client
        </Typography>
      </Box>

      {error && (
        <Fade in>
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        </Fade>
      )}
      {success && (
        <Fade in>
          <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>
        </Fade>
      )}

      {/* 📱 Carte principale compacte */}
      <Card elevation={2} sx={{ mb: 1 }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          
          {/* Étape 1: Client */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.9rem' }}>
              <Typography variant="number">1.</Typography> Client
            </Typography>
            <Autocomplete
              options={clients}
              getOptionLabel={(option) => `${option.raisonsociale}${option.telephone ? ` (${option.telephone})` : ''}`}
              value={selectedClient}
              onChange={(e, newValue) => {
                setSelectedClient(newValue);
                if (newValue) setCurrentStep(2);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Rechercher un client..."
                  size="small"
                  variant="outlined"
                  sx={{ '& .MuiInputBase-input': { fontSize: '0.9rem' } }}
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props} sx={{ p: 0.5 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>{option.raisonsociale}</Typography>
                    {option.telephone && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        {option.telephone}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="caption" color="error" sx={{ ml: 1, fontSize: '0.75rem' }}>
                    {formatMontant(option.montantLiquide)}
                  </Typography>
                </Box>
              )}
              loading={loading}
              disabled={loading}
            />
          </Box>

          {/* Étape 2: Type d'opération (apparaît après client) */}
          {selectedClient && (
            <Slide direction="up" in={true}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.9rem' }}>
                  <Typography variant="number">2.</Typography> Type d'opération
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                  {Object.entries(operations).map(([key, op]) => (
                    <Chip
                      key={key}
                      label={op.label}
                      icon={op.icon}
                      color={operationType === key ? op.color : 'default'}
                      variant={operationType === key ? 'filled' : 'outlined'}
                      onClick={() => {
                        setOperationType(key);
                        setCurrentStep(3);
                      }}
                      size="small"
                      deleteIcon={<Help fontSize="small" />}
                      onDelete={(e) => {
                        e.stopPropagation();
                        setOperationType(key);
                        setShowExplanation(true);
                      }}
                      sx={{ 
                        position: 'relative',
                        '& .MuiChip-label': { fontSize: '0.7rem' },
                        '&:hover': { transform: 'scale(1.05)' },
                        height: '28px'
                      }}
                    />
                  ))}
                </Stack>
                
                {/* 🎯 AIDE INTÉGRÉE INTELLIGENTE MOBILE */}
                {!hideHelpPermanently && (
                  <Alert 
                    severity="info" 
                    sx={{ mt: 1, '& .MuiAlert-message': { fontSize: '0.75rem' } }}
                    action={
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Button 
                          size="small" 
                          onClick={() => setShowExplanation(true)}
                          sx={{ textTransform: 'none', fontSize: '0.7rem', minWidth: 'auto', p: 0.5 }}
                        >
                          Voir l'explication
                        </Button>
                        <Button 
                          size="small" 
                          color="error"
                          onClick={handleHideHelpPermanently}
                          sx={{ textTransform: 'none', fontSize: '0.7rem', minWidth: 'auto', p: 0.5 }}
                        >
                          Ne plus afficher
                        </Button>
                      </Box>
                    }
                  >
                    <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                      <strong>💡 Astuce :</strong><br/>
                      • <strong>↓ Entrée</strong> : Client paie ou dépose<br/>
                      • <strong>↑ Sortie</strong> : Remboursement<br/>
                      <strong>Besoin d'aide ?</strong> Cliquez sur ❓
                    </Typography>
                  </Alert>
                )}
                
                {/* Bouton pour réafficher l'aide si masquée */}
                {hideHelpPermanently && (
                  <Box sx={{ mt: 1, textAlign: 'center' }}>
                    <Button 
                      size="small" 
                      onClick={handleShowHelpAgain}
                      sx={{ textTransform: 'none', fontSize: '0.7rem' }}
                      startIcon={<Help fontSize="small" />}
                    >
                      Afficher l'aide
                    </Button>
                  </Box>
                )}
                {selectedClient && (
                  <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      <strong>📖 Soldes actuels :</strong>
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                      <Typography variant="caption" color="error" sx={{ fontSize: '0.7rem' }}>
                        💰 {formatMontant(selectedClient.montantLiquide)}
                      </Typography>
                      <Typography variant="caption" color="warning.main" sx={{ fontSize: '0.7rem' }}>
                        📦 {formatMontant(selectedClient.montantEmballage)}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ mt: 0.5, fontStyle: 'italic', fontSize: '0.65rem' }}>
                      <em>Négatif = Dette | Positif = Avoir</em>
                    </Typography>
                  </Box>
                )}
              </Box>
            </Slide>
          )}

          {/* Étape 3: Libellé (auto-généré) */}
          {selectedClient && (
            <Slide direction="up" in={true}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.9rem' }}>
                  <Typography variant="number">3.</Typography> Libellé
                </Typography>
                <TextField
                  fullWidth
                  value={libelle}
                  onChange={(e) => setLibelle(e.target.value)}
                  size="small"
                  variant="outlined"
                  helperText="Auto-généré (modifiable)"
                  sx={{ '& .MuiInputBase-input': { fontSize: '0.9rem' } }}
                />
              </Box>
            </Slide>
          )}

          {/* Étape 4: Montant */}
          {selectedClient && (
            <Slide direction="up" in={true}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.9rem' }}>
                  <Typography variant="number">4.</Typography> Montant (FCFA)
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={montant}
                  onChange={(e) => {
                    setMontant(e.target.value);
                    if (e.target.value) setCurrentStep(4);
                  }}
                  size="small"
                  variant="outlined"
                  placeholder={operation.placeholder}
                  InputProps={{
                    endAdornment: <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>F</Typography>,
                  }}
                  sx={{ '& .MuiInputBase-input': { fontSize: '0.9rem' } }}
                />
              </Box>
            </Slide>
          )}

          {/* 📊 Aperçu rapide (compact) */}
          {impact && (
            <Fade in={true}>
              <Paper sx={{ 
                p: 1.5, 
                bgcolor: operation.typeoperation === 'Entrée' ? 'success.light' : 'error.light',
                color: 'white',
                borderRadius: 2,
                mb: 2
              }}>
                <Typography variant="subtitle2" sx={{ mb: 1, opacity: 0.9, fontSize: '0.8rem' }}>
                  Aperçu rapide
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.7rem' }}>
                      Impact caisse
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1rem' }}>
                      {operation.typeoperation === 'Entrée' ? '➕' : '➖'} {formatMontant(impact.montant)}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.7rem' }}>
                      Nouveau solde
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.85rem' }}>
                      {formatMontant(impact.nouveauSoldeLiquide)}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Fade>
          )}

          {/* Bouton d'action */}
          <Button
            fullWidth
            variant="contained"
            size="large"
            startIcon={<Save />}
            onClick={handleValider}
            disabled={!selectedClient || !montant || parseFloat(montant) <= 0}
            sx={{
              background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
              py: 1,
              fontSize: '0.9rem'
            }}
          >
            Valider l'opération
          </Button>

        </CardContent>
      </Card>

      {/* Dialog de confirmation compact */}
      <Dialog 
        open={openConfirm} 
        onClose={() => setOpenConfirm(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
          color: 'white',
          fontSize: '1rem',
          py: 1
        }}>
          Confirmer l'opération
        </DialogTitle>
        <DialogContent sx={{ mt: 1, p: 2 }}>
          <Stack spacing={1.5}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>Client</Typography>
              <Typography variant="body1" sx={{ fontSize: '0.9rem' }}>{selectedClient?.raisonsociale}</Typography>
            </Box>
            
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>Opération</Typography>
              <Chip 
                label={operation.label} 
                color={operation.color}
                icon={operation.icon}
                size="small"
                sx={{ mt: 0.5 }}
              />
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>Montant</Typography>
              <Typography variant="h6" color={operation.color} sx={{ fontSize: '1.1rem' }}>
                {formatMontant(parseFloat(montant))}
              </Typography>
            </Box>

            <Divider />

            <Alert severity="info" sx={{ '& .MuiAlert-message': { fontSize: '0.8rem' } }}>
              <Typography variant="body2">
                <strong>Impact caisse:</strong> {operation.typeoperation === 'Entrée' ? '➕ Entrée' : '➖ Sortie'} de {formatMontant(parseFloat(montant))}
              </Typography>
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setOpenConfirm(false)} sx={{ fontSize: '0.85rem' }}>Annuler</Button>
          <Button 
            variant="contained" 
            onClick={handleConfirm}
            sx={{
              background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
              fontSize: '0.85rem'
            }}
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🎯 DIALOGUE D'EXPLICATION DÉTAILLÉE */}
      <Dialog 
        open={showExplanation} 
        onClose={() => setShowExplanation(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: '80vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          background: `linear-gradient(135deg, ${operations[operationType]?.color}.main 0%, ${operations[operationType]?.color}.light 100%)`,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {operations[operationType]?.icon}
            <Typography variant="h6" fontWeight="bold">
              {operations[operationType]?.explicationDetaillee?.titre}
            </Typography>
          </Box>
          <IconButton onClick={() => setShowExplanation(false)} sx={{ color: 'white' }}>
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          {operations[operationType]?.explicationDetaillee && (
            <Stack spacing={3}>
              {/* QUAND UTILISER */}
              <Box>
                <Typography variant="h6" color={operations[operationType].color} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Help />
                  {operations[operationType].explicationDetaillee.quand}
                </Typography>
                <List>
                  {operations[operationType].explicationDetaillee.cas.map((casItem, index) => (
                    <ListItem key={index} sx={{ bgcolor: 'grey.50', borderRadius: 2, mb: 1 }}>
                      <ListItemText primary={casItem} />
                    </ListItem>
                  ))}
                </List>
              </Box>

              <Divider />

              {/* COMMENT ÇA MARCHE */}
              <Box>
                <Typography variant="h6" color={operations[operationType].color} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle />
                  {operations[operationType].explicationDetaillee.comment}
                </Typography>
                <List>
                  {operations[operationType].explicationDetaillee.etapes.map((etape, index) => (
                    <ListItem key={index} sx={{ bgcolor: 'grey.50', borderRadius: 2, mb: 1 }}>
                      <ListItemText primary={etape} />
                    </ListItem>
                  ))}
                </List>
              </Box>

              <Divider />

              {/* RÉSULTAT CONCRET */}
              <Box>
                <Typography variant="h6" color={operations[operationType].color} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Info />
                  {operations[operationType].explicationDetaillee.resultat}
                </Typography>
                <Alert 
                  severity="info" 
                  sx={{ 
                    '& .MuiAlert-message': { 
                      whiteSpace: 'pre-line',
                      fontFamily: 'monospace'
                    }
                  }}
                >
                  {operations[operationType].explicationDetaillee.exempleCalc}
                </Alert>
              </Box>

              {/* IMPACT CAISSE */}
              <Alert 
                severity={operations[operationType].typeoperation === 'Entrée' ? 'success' : 'warning'}
                sx={{ mt: 2 }}
              >
                <Typography variant="body2" fontWeight="bold">
                  💰 IMPACT CAISSE : {operations[operationType].typeoperation === 'Entrée' ? '➕ ENTRÉE D\'ARGENT' : '➖ SORTIE D\'ARGENT'}
                </Typography>
              </Alert>
            </Stack>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 2, bgcolor: 'grey.50' }}>
          <Button 
            onClick={() => setShowExplanation(false)}
            variant="contained"
            fullWidth
            sx={{
              background: `linear-gradient(135deg, ${operations[operationType]?.color}.main 0%, ${operations[operationType]?.color}.light 100%)`,
            }}
          >
            ✅ J'ai compris, continuer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
