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
  Grid,
  Paper,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Stack,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Fade,
  Slide,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import { 
  ArrowBack, 
  Save, 
  AutoAwesome, 
  TrendingUp, 
  TrendingDown,
  MonetizationOn,
  ShoppingBag,
  Info,
  AttachMoney,
  SwapVert,
  Close,
  CheckCircle,
  Help,
} from '@mui/icons-material';
import { privateApi } from '../../../api/axios';
import useActivePointDeVenteId from '../../../hooks/useActivePointDeVenteId';
import { formatCurrency } from '../../../utils/currencyUtils';

export default function AjustementClient() {
  const navigate = useNavigate();
  const pvId = useActivePointDeVenteId(); // Utilise le pvId dynamique de l'utilisateur connecté
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openConfirm, setOpenConfirm] = useState(false);
  
  // 🚀 Nouveaux états pour l'interface intelligente
  const [operationType, setOperationType] = useState('paiement'); // paiement, remboursement, consignation, deconsignation
  const [montant, setMontant] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false); // Pour afficher l'explication détaillée
  const [hideHelpPermanently, setHideHelpPermanently] = useState(false); // Pour masquer l'aide définitivement
  
  // 🚀 Nouveau: Répartition intelligente par défaut
  const [repartitionMode, setRepartitionMode] = useState('auto'); // auto, manuel
  const [montantLiquideInput, setMontantLiquideInput] = useState('');
  const [montantEmballageInput, setMontantEmballageInput] = useState('');

  // 🎯 Configuration des types d'opérations intelligentes AVEC EXEMPLES CONCRETS
  const operations = {
    paiement: {
      label: 'Paiement client',
      icon: <TrendingDown />,
      color: 'success',
      description: 'Le client paie sa dette',
      exemple: 'Client doit 50 000F, paie 20 000F → Nouvelle dette: 30 000F',
      casUsage: ['Client passe au dépôt', 'Paiement partiel', 'Régularisation de compte'],
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
      liquideSign: -1, // Diminue la dette
      emballageSign: 0,
      placeholder: 'Ex: Client paie 50 000 FCFA',
      caisseImpact: 'entrée', // L'argent entre en caisse
    },
    remboursement: {
      label: 'Remboursement au client',
      icon: <TrendingUp />,
      color: 'error',
      description: 'On rembourse le client (trop-payé, retour)',
      exemple: 'Client a trop payé 10 000F → On lui rembourse 10 000F',
      casUsage: ['Erreur de caisse', 'Retour marchandise', 'Avoir client'],
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
      liquideSign: 1, // Augmente la dette (ou réduit le crédit)
      emballageSign: 0,
      placeholder: 'Ex: Remboursement de 20 000 FCFA pour retour',
      caisseImpact: 'sortie', // L'argent sort de la caisse
    },
    consignation: {
      label: 'Consignation emballages',
      icon: <ShoppingBag />,
      color: 'info',
      description: 'Le client paie la consigne (prix des emballages)',
      exemple: 'Client prend 10 casiers → Paie 10 × 500F = 5 000F de consigne',
      casUsage: ['Client achète des casiers', 'Nouveau client sans emballages'],
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
      liquideSign: 0,
      emballageSign: -1, // Diminue la dette emballage (client dépose)
      placeholder: 'Ex: Consigne 10 casiers à 500 FCFA (5 000 FCFA)',
      caisseImpact: 'entrée',
    },
    deconsignation: {
      label: 'Retour emballage/Déconsignation',
      icon: <ShoppingBag />,
      color: 'warning',
      description: 'On rembourse la consigne quand le client rapporte les emballages',
      exemple: 'Client rapporte 15 casiers → On lui rembourse 15 × 500F = 7 500F',
      casUsage: ['Client rend ses casiers', 'Fin de contrat', 'Retour définitif'],
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
      liquideSign: 0,
      emballageSign: 1, // Augmente la dette emballage (client retourne)
      placeholder: 'Ex: Retour 15 casiers (remboursement consigne)',
      caisseImpact: 'sortie',
    },
  };

  // Charger la liste des clients à l'initialisation
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
      const response = await privateApi.get(`/api/clients`, {
        params: { pointDeVenteId: pvId }
      });
      setClients(response.data || []);
    } catch (err) {
      console.error('Erreur chargement clients:', err);
      setError('Erreur lors du chargement des clients');
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

  // 🤖 Calculer automatiquement les ajustements selon le type d'opération ET la répartition
  const calculerAjustements = () => {
    const operation = operations[operationType];
    
    // MODE MANUEL : utiliser les champs spécifiques
    if (repartitionMode === 'manuel') {
      const ajustementLiquide = ['paiement', 'remboursement'].includes(operationType)
        ? (parseFloat(montantLiquideInput) || 0) * operation.liquideSign
        : 0;

      const ajustementEmballage = ['consignation', 'deconsignation'].includes(operationType)
        ? (parseFloat(montantEmballageInput) || 0) * operation.emballageSign
        : 0;

      return { ajustementLiquide, ajustementEmballage };
    }

    // MODE AUTO : Répartition intelligente basée sur les dettes existantes
    const montantTotal = parseFloat(montant) || 0;
    let ajustementLiquide = 0;
    let ajustementEmballage = 0;

    if (['paiement'].includes(operationType)) {
      // Paiement : d'abord le liquide, puis l'emballage
      const detteLiquide = selectedClient?.montantLiquide || 0;
      const detteEmballage = selectedClient?.montantEmballage || 0;

      if (montantTotal <= detteLiquide) {
        ajustementLiquide = -montantTotal;
      } else {
        ajustementLiquide = -detteLiquide;
        const reste = montantTotal - detteLiquide;
        if (reste <= detteEmballage) {
          ajustementEmballage = -reste;
        } else {
          ajustementEmballage = -detteEmballage;
        }
      }
    } else if (['remboursement'].includes(operationType)) {
      // Remboursement : l'utilisateur décide, pas d'auto
      ajustementLiquide = montantTotal * operation.liquideSign;
    } else {
      // Consignation/Déconsignation : sur l'emballage
      ajustementEmballage = montantTotal * operation.emballageSign;
    }

    return { ajustementLiquide, ajustementEmballage };
  };

  // 🎨 Générer le libellé intelligent
  const genererLibelle = () => {
    if (!selectedClient || !montant) return '';
    
    const operation = operations[operationType];
    const montantFormate = formatCurrency(parseFloat(montant));

    switch (operationType) {
      case 'paiement':
        return `PAIEMENT CLIENT ${selectedClient.raisonsociale} - ${montantFormate}`;
      case 'remboursement':
        return `REMBOURSEMENT CLIENT ${selectedClient.raisonsociale} - ${montantFormate}`;
      case 'consignation':
        return `RETOUR CONSIGNE ${selectedClient.raisonsociale} - ${montantFormate}`;
      case 'deconsignation':
        return `RETOUR EMBALLAGE ${selectedClient.raisonsociale} - ${montantFormate}`;
      default:
        return '';
    }
  };

  // 📊 Calculer les nouveaux soldes (optimisé avec useMemo)
  const nouveauxSoldes = useMemo(() => {
    if (!selectedClient || !montant) return null;

    const { ajustementLiquide, ajustementEmballage } = calculerAjustements();
    
    return {
      liquidePrevious: selectedClient.montantLiquide || 0,
      liquideNew: (selectedClient.montantLiquide || 0) + ajustementLiquide,
      emballagePrevious: selectedClient.montantEmballage || 0,
      emballageNew: (selectedClient.montantEmballage || 0) + ajustementEmballage,
    };
  }, [selectedClient, montant, operationType, repartitionMode, montantLiquideInput, montantEmballageInput]);

  const operation = operations[operationType];

  // 🎯 Afficher automatiquement l'aperçu quand les données sont complètes
  useEffect(() => {
    if (repartitionMode === 'manuel') {
      const liquide = parseFloat(montantLiquideInput) || 0;
      const emballage = parseFloat(montantEmballageInput) || 0;
      setShowPreview(selectedClient && (liquide > 0 || emballage > 0));
    } else {
      setShowPreview(selectedClient && montant && parseFloat(montant) > 0);
    }
  }, [selectedClient, montant, montantLiquideInput, montantEmballageInput, operationType, repartitionMode]);

  const handleValider = useCallback(() => {
    setError('');
    
    if (!selectedClient) {
      setError('Veuillez sélectionner un client');
      return;
    }

    if (repartitionMode === 'manuel') {
      const liquide = parseFloat(montantLiquideInput) || 0;
      const emballage = parseFloat(montantEmballageInput) || 0;
      
      if (liquide === 0 && emballage === 0) {
        setError('Veuillez saisir au moins un montant');
        return;
      }
    } else {
      if (!montant || parseFloat(montant) <= 0) {
        setError('Veuillez saisir un montant valide');
        return;
      }
    }

    setOpenConfirm(true);
  }, [selectedClient, repartitionMode, montantLiquideInput, montantEmballageInput, montant]);

  const handleConfirm = async () => {
    setOpenConfirm(false);
    
    try {
      const { ajustementLiquide, ajustementEmballage } = calculerAjustements();
      const libelle = genererLibelle();

      await privateApi.post('/api/caisse/ajuster-client', null, {
        params: {
          pvId,
          clientId: selectedClient.id,
          ajustementLiquide: ajustementLiquide !== 0 ? ajustementLiquide : null,
          ajustementEmballage: ajustementEmballage !== 0 ? ajustementEmballage : null,
          libelle,
          description: description || `Opération: ${operations[operationType].label}`,
        },
      });

      setSuccess('✨ Opération enregistrée avec succès ! Redirection...');
      setTimeout(() => navigate('/accueil/caisse/journal'), 1500);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.response?.data?.message || 'Erreur lors de l\'ajustement');
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Card elevation={3}>
        <CardContent>
          {/* En-tête avec gradient moderne */}
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: 3,
              background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
              p: 3,
              borderRadius: 2,
              color: 'white',
              mx: -2,
              mt: -2,
            }}
          >
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate('/accueil/caisse/journal')}
              sx={{ mr: 2, color: 'white', borderColor: 'white' }}
              variant="outlined"
            >
              Retour
            </Button>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoAwesome /> Ajustement Intelligent
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                ✨ Décrivez simplement l'opération, le système calcule tout automatiquement
              </Typography>
            </Box>
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

          <Grid container spacing={{ xs: 2, sm: 2, md: 3 }}>
            {/* 1️⃣ ÉTAPE 1: Type d'opération */}
            <Grid item xs={12}>
              <Paper sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: { xs: 1.5, sm: 2 }, display: 'flex', alignItems: 'center', gap: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                  <SwapVert /> Étape 1: Quel type d'opération ?
                </Typography>
                <ToggleButtonGroup
                  value={operationType}
                  exclusive
                  onChange={(e, newValue) => {
                    if (newValue) {
                      setOperationType(newValue);
                    }
                  }}
                  fullWidth
                  sx={{ flexWrap: 'wrap' }}
                >
                  {Object.entries(operations).map(([key, op]) => (
                    <ToggleButton 
                      key={key} 
                      value={key}
                      sx={{ 
                        flex: { xs: '1 1 45%', sm: '1 1 auto' },
                        py: { xs: 1.5, sm: 2 },
                        px: { xs: 1, sm: 1.5 },
                        flexDirection: 'column',
                        gap: 0.5,
                        position: 'relative',
                        '&:hover': { transform: 'scale(1.02)' }
                      }}
                    >
                      <Tooltip 
                        title={op.exemple} 
                        arrow 
                        placement="top"
                      >
                        <Box sx={{ fontSize: { xs: 24, sm: 32 } }}>{op.icon}</Box>
                      </Tooltip>
                      <Typography variant="body2" fontWeight="bold" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                        {op.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                        {op.description}
                      </Typography>
                      {/* Indicateur visuel d'impact caisse */}
                      <Box sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        fontSize: { xs: 10, sm: 12 },
                        fontWeight: 'bold',
                        color: op.caisseImpact === 'entrée' ? 'success.main' : 'error.main',
                        bgcolor: 'white',
                        borderRadius: '50%',
                        width: { xs: 16, sm: 20 },
                        height: { xs: 16, sm: 20 },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `2px solid ${op.caisseImpact === 'entrée' ? 'success.main' : 'error.main'}`,
                      }}>
                        {op.caisseImpact === 'entrée' ? '↓' : '↑'}
                      </Box>
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
                
                {/* 🎯 AIDE INTÉGRÉE INTELLIGENTE */}
                {!hideHelpPermanently && (
                  <Alert 
                    severity="info" 
                    sx={{ mt: { xs: 1.5, sm: 2 } }}
                    action={
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexDirection: { xs: 'column', sm: 'row' } }}>
                        <Button 
                          size="small" 
                          onClick={() => setShowExplanation(true)}
                          sx={{ textTransform: 'none', fontSize: { xs: '0.75rem', sm: '0.8rem' } }}
                        >
                          Voir l'explication détaillée
                        </Button>
                        <Button 
                          size="small" 
                          color="error"
                          onClick={handleHideHelpPermanently}
                          sx={{ textTransform: 'none', fontSize: { xs: '0.75rem', sm: '0.8rem' } }}
                        >
                          Ne plus afficher
                        </Button>
                      </Box>
                    }
                  >
                    <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                      <strong>💡 Comment choisir ?</strong><br/>
                      • <strong>↓ Entrée</strong> : Client paie ou dépose des emballages<br/>
                      • <strong>↑ Sortie</strong> : On rembourse le client ou il retourne des emballages<br/>
                      <strong>Besoin d'aide ?</strong> Cliquez sur "Voir l'explication détaillée"
                    </Typography>
                  </Alert>
                )}
                
                {/* Bouton pour réafficher l'aide si masquée */}
                {hideHelpPermanently && (
                  <Box sx={{ mt: { xs: 1.5, sm: 2 }, textAlign: 'center' }}>
                    <Button 
                      size="small" 
                      onClick={handleShowHelpAgain}
                      sx={{ textTransform: 'none', fontSize: { xs: '0.75rem', sm: '0.8rem' } }}
                      startIcon={<Help />}
                    >
                      Afficher l'aide
                    </Button>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* 2️⃣ ÉTAPE 2: Client */}
            <Grid item xs={12}>
              <Paper sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: { xs: 1.5, sm: 2 }, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                  Étape 2: Sélectionner le client
                </Typography>
                <Autocomplete
                  options={clients}
                  getOptionLabel={(option) => `${option.raisonsociale}${option.telephone ? ` (${option.telephone})` : ''}`}
                  value={selectedClient}
                  onChange={(e, newValue) => setSelectedClient(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Client"
                      placeholder="Rechercher un client..."
                      variant="outlined"
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1">{option.raisonsociale}</Typography>
                        {option.telephone && (
                          <Typography variant="caption" color="text.secondary">
                            {option.telephone}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ textAlign: 'right', ml: 2 }}>
                        <Typography variant="caption" color="error">
                          Dette: {formatCurrency(option.montantLiquide)}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  loading={loading}
                  disabled={loading}
                />
              </Paper>
            </Grid>

            {/* Affichage des soldes actuels */}
            {selectedClient && (
              <Grid item xs={12}>
                <Slide direction="up" in={true}>
                  <Paper sx={{ p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Info /> Soldes actuels de {selectedClient.raisonsociale}
                    </Typography>
                    
                    {/* 🎯 GUIDE D'INTERPRÉTATION */}
                    <Alert severity="success" sx={{ mb: 2, bgcolor: 'white', '& .MuiAlert-message': { fontSize: { xs: '0.8rem', sm: '0.875rem' } } }}>
                      <Typography variant="body2">
                        <strong>📖 Comment lire ces soldes :</strong><br/>
                        • <strong>💰 Dette liquide</strong> : Ce que le client doit en argent<br/>
                        • <strong>📦 Dette emballage</strong> : Ce que le client doit en casiers<br/>
                        <strong>Négatif = Créance</strong> | <strong>Positif = Avoir</strong>
                      </Typography>
                    </Alert>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <MonetizationOn />
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Dette liquide
                            </Typography>
                            <Typography variant="h6" color="error">
                              {formatCurrency(selectedClient.montantLiquide)}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ShoppingBag />
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Dette emballage
                            </Typography>
                            <Typography variant="h6" color="warning.main">
                              {formatCurrency(selectedClient.montantEmballage)}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                </Slide>
              </Grid>
            )}

            {/* 3️⃣ ÉTAPE 3: Montant de l'opération */}
            <Grid item xs={12}>
              <Paper sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: { xs: 1.5, sm: 2 }, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                  Étape 3: Montant de l'opération
                </Typography>
                <TextField
                  fullWidth
                  label={`Montant (FCFA)`}
                  type="number"
                  placeholder={operation.placeholder}
                  value={montant}
                  onChange={(e) => {
                    setMontant(e.target.value);
                    setMontantLiquideInput('');
                    setMontantEmballageInput('');
                  }}
                  variant="outlined"
                  InputProps={{
                    startAdornment: <AttachMoney sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                  helperText={
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {operation.icon}
                      {operation.description}
                    </Box>
                  }
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontSize: '1.25rem',
                      fontWeight: 'bold',
                    }
                  }}
                />
              </Paper>
            </Grid>

            {/* 4️⃣ ÉTAPE 4: Répartition intelligente */}
            {selectedClient && montant && parseFloat(montant) > 0 && ['paiement', 'remboursement'].includes(operationType) && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3, bgcolor: 'info.light', borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SwapVert /> Étape 4: Sur quoi s'applique cet argent ?
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <ToggleButtonGroup
                      value={repartitionMode}
                      exclusive
                      onChange={(e, newValue) => newValue && setRepartitionMode(newValue)}
                      fullWidth
                    >
                      <ToggleButton value="auto" sx={{ py: 1.5, flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="body2" fontWeight="bold">🤖 Auto</Typography>
                        <Typography variant="caption">Répartition intelligente</Typography>
                      </ToggleButton>
                      <ToggleButton value="manuel" sx={{ py: 1.5, flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="body2" fontWeight="bold">✋ Manuel</Typography>
                        <Typography variant="caption">Vous décidez</Typography>
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>

                  {repartitionMode === 'auto' ? (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        💡 <strong>Mode Auto :</strong> Le système répartit intelligemment<br/><br/>
                        <strong>📊 Exemple concret :</strong><br/>
                        • Client doit : 30 000F (liquide) + 10 000F (emballage)<br/>
                        • Il paie : 25 000F<br/>
                        • <strong>Résultat auto :</strong> 25 000F appliqués à la dette liquide<br/>
                        • Nouvelle dette : 5 000F (liquide) + 10 000F (emballage)<br/><br/>
                        <em>Le système paie toujours la dette liquide en premier !</em>
                      </Typography>
                    </Alert>
                  ) : (
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                      <TextField
                        label="Sur la dette liquide"
                        type="number"
                        placeholder="0"
                        value={montantLiquideInput}
                        onChange={(e) => setMontantLiquideInput(e.target.value)}
                        variant="outlined"
                        size="small"
                        helperText={`Disponible: ${formatCurrency(selectedClient?.montantLiquide || 0)}`}
                      />
                      <TextField
                        label="Sur la dette emballage"
                        type="number"
                        placeholder="0"
                        value={montantEmballageInput}
                        onChange={(e) => setMontantEmballageInput(e.target.value)}
                        variant="outlined"
                        size="small"
                        helperText={`Disponible: ${formatCurrency(selectedClient?.montantEmballage || 0)}`}
                      />
                    </Box>
                  )}
                </Paper>
              </Grid>
            )}

            {/* Description optionnelle */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Note additionnelle (optionnel)"
                placeholder="Ex: Paiement partiel, opération exceptionnelle..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={2}
                variant="outlined"
              />
            </Grid>

            {/* 🎯 APERÇU AUTOMATIQUE */}
            {showPreview && (
              <Grid item xs={12}>
                <Fade in={showPreview}>
                  <Paper 
                    sx={{ 
                      p: 3, 
                      background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                      color: 'white',
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AutoAwesome /> Aperçu de l'opération
                    </Typography>

                    <Grid container spacing={2}>
                      {/* Impact caisse */}
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2, bgcolor: operation.caisseImpact === 'entrée' ? 'success.main' : 'error.main', color: 'white' }}>
                          <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                            Impact caisse
                          </Typography>
                          <Typography variant="h5" fontWeight="bold">
                            {operation.caisseImpact === 'entrée' ? '➕ ENTRÉE' : '➖ SORTIE'}
                          </Typography>
                          <Typography variant="h6">
                            {formatCurrency(parseFloat(montant))}
                          </Typography>
                        </Paper>
                      </Grid>

                      {/* Impact client */}
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.2)' }}>
                          <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                            Nouveau solde client
                          </Typography>
                          {nouveauxSoldes && (
                            <>
                              {nouveauxSoldes.liquideNew !== nouveauxSoldes.liquidePrevious && (
                                <Box sx={{ mb: 1 }}>
                                  <Typography variant="caption">Liquide</Typography>
                                  <Typography variant="body1" fontWeight="bold">
                                    {formatCurrency(nouveauxSoldes.liquidePrevious)} → {formatCurrency(nouveauxSoldes.liquideNew)}
                                  </Typography>
                                </Box>
                              )}
                              {nouveauxSoldes.emballageNew !== nouveauxSoldes.emballagePrevious && (
                                <Box>
                                  <Typography variant="caption">Emballage</Typography>
                                  <Typography variant="body1" fontWeight="bold">
                                    {formatCurrency(nouveauxSoldes.emballagePrevious)} → {formatCurrency(nouveauxSoldes.emballageNew)}
                                  </Typography>
                                </Box>
                              )}
                            </>
                          )}
                        </Paper>
                      </Grid>

                      {/* Libellé auto-généré */}
                      <Grid item xs={12}>
                        <Divider sx={{ my: 1, bgcolor: 'rgba(255,255,255,0.3)' }} />
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>
                          Libellé auto-généré:
                        </Typography>
                        <Typography variant="body1" fontWeight="bold" sx={{ mt: 0.5 }}>
                          {genererLibelle()}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Fade>
              </Grid>
            )}

            {/* Boutons d'action */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button 
                  size="large"
                  onClick={() => navigate('/accueil/caisse/journal')}
                >
                  Annuler
                </Button>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Save />}
                  onClick={handleValider}
                  disabled={!selectedClient || !montant || parseFloat(montant) <= 0}
                  sx={{
                    background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                    px: 4,
                  }}
                >
                  Valider l'opération
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Dialog de confirmation moderne */}
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
          fontSize: { xs: '1rem', sm: '1.25rem' },
          py: { xs: 1, sm: 1.5 }
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesome />
            Confirmer l'opération
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: { xs: 1, sm: 2 }, p: { xs: 2, sm: 2.5 } }}>
          <Stack spacing={{ xs: 1.5, sm: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>Client</Typography>
              <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>{selectedClient?.raisonsociale}</Typography>
            </Box>
            
            <Box>
              <Typography variant="caption" color="text.secondary">Type d'opération</Typography>
              <Chip 
                label={operation.label} 
                color={operation.color}
                icon={operation.icon}
                sx={{ mt: 0.5 }}
              />
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">Montant</Typography>
              <Typography variant="h5" color={operation.color}>
                {formatCurrency(parseFloat(montant))}
              </Typography>
            </Box>

            <Divider />

            <Alert severity="info" icon={<AutoAwesome />}>
              <Typography variant="body2">
                <strong>Impact caisse:</strong> {operation.caisseImpact === 'entrée' ? '➕ Entrée' : '➖ Sortie'} de {formatCurrency(parseFloat(montant))}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Cette opération sera enregistrée dans le journal de caisse
              </Typography>
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenConfirm(false)}>Annuler</Button>
          <Button 
            variant="contained" 
            onClick={handleConfirm}
            sx={{
              background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
            }}
          >
            ✨ Confirmer
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
                severity={operations[operationType].caisseImpact === 'entrée' ? 'success' : 'warning'}
                sx={{ mt: 2 }}
              >
                <Typography variant="body2" fontWeight="bold">
                  💰 IMPACT CAISSE : {operations[operationType].caisseImpact === 'entrée' ? '➕ ENTRÉE D\'ARGENT' : '➖ SORTIE D\'ARGENT'}
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
