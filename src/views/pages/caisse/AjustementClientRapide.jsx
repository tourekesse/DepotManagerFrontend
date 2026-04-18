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
  Stack,
  Chip,
  Link,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import { 
  ArrowBack, 
  Save, 
  TrendingDown,
  TrendingUp,
  ShoppingBag,
  Settings,
  LocalAtm,
  Paid,
  CheckCircle,
  Close,
  Calculate,
} from '@mui/icons-material';
import { privateApi } from '../../../api/axios';
import useActivePointDeVenteId from '../../../hooks/useActivePointDeVenteId';

const formatMontant = (montant) => {
  if (!montant || isNaN(montant)) return '0 FCFA';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(montant) + ' FCFA';
};

// Composant de montant rapide
const MontantRapideChip = ({ label, value, selected, onClick }) => (
  <Chip
    label={`${label} (${formatMontant(value)})`}
    onClick={onClick}
    variant={selected ? "filled" : "outlined"}
    color="primary"
    size="small"
    sx={{
      m: 0.5,
      fontWeight: selected ? 'bold' : 'normal',
      cursor: 'pointer',
      bgcolor: selected ? 'primary.main' : 'transparent',
      color: selected ? 'white' : 'primary.main',
      '&:hover': {
        bgcolor: selected ? 'primary.dark' : 'primary.light',
      }
    }}
  />
);

// Composant de statut solde
const StatutSolde = ({ liquide, emballage }) => {
  const total = liquide + emballage;
  const isSolde = total === 0;
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ 
        width: 12, 
        height: 12, 
        borderRadius: '50%',
        bgcolor: isSolde ? 'success.main' : liquide > 0 ? 'error.main' : 'warning.main',
      }} />
      <Typography variant="caption" color={isSolde ? 'success.main' : 'text.secondary'}>
        {isSolde ? '✅ Soldé' : '⚡ En dette'}
      </Typography>
    </Box>
  );
};

export default function AjustementClientRapide() {
  const navigate = useNavigate();
  const pvId = useActivePointDeVenteId(); // Utilise le pvId dynamique déjà disponible
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openConfirm, setOpenConfirm] = useState(false);
  
  // Mode d'opération sélectionné
  const [operationMode, setOperationMode] = useState(null);
  const [montant, setMontant] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationState, setValidationState] = useState({ valid: true, message: '', type: 'info' });

  // 🎯 Configuration des opérations rapides
  const operations = {
    liquide_paiement: {
      label: 'Paiement liquide',
      icon: <TrendingDown />,
      color: 'success',
      ajustementLiquide: (m) => -Math.abs(m),
      ajustementEmballage: () => 0,
      caisseImpact: 'entrée',
      description: 'Le client paie sa dette liquide',
      shortcut: 'L',
    },
    liquide_remboursement: {
      label: 'Remboursement liquide',
      icon: <TrendingUp />,
      color: 'error',
      ajustementLiquide: (m) => Math.abs(m),
      ajustementEmballage: () => 0,
      caisseImpact: 'sortie',
      description: 'Remboursement au client (avoir liquide)',
      shortcut: 'R',
    },
    emballage_consignation: {
      label: 'Retour emballages',
      icon: <ShoppingBag />,
      color: 'info',
      ajustementLiquide: () => 0,
      ajustementEmballage: (m) => -Math.abs(m),
      caisseImpact: 'entrée',
      description: 'Le client dépose des emballages chez vous',
      shortcut: 'E',
    },
    emballage_deconsignation: {
      label: 'Retour emballage/Déconsignation',
      icon: <ShoppingBag sx={{ transform: 'rotate(180deg)' }} />,
      color: 'warning',
      ajustementLiquide: () => 0,
      ajustementEmballage: (m) => Math.abs(m),
      caisseImpact: 'sortie',
      description: 'Client retourne ses emballages',
      shortcut: 'D',
    },
    les2_paiement: {
      label: 'Paiement complet',
      icon: <Paid />,
      color: 'success',
      ajustementLiquide: (m, client) => {
        const liquide = Math.abs(client?.montantLiquide || 0);
        return -Math.min(Math.abs(m), liquide);
      },
      ajustementEmballage: (m, client) => {
        const liquide = Math.abs(client?.montantLiquide || 0);
        const emballage = Math.abs(client?.montantEmballage || 0);
        const reste = Math.abs(m) - liquide;
        return reste > 0 ? -Math.min(reste, emballage) : 0;
      },
      caisseImpact: 'entrée',
      description: 'Paiement global (liquide puis emballage)',
      shortcut: 'P',
    },
  };

  useEffect(() => {
    chargerClients();
  }, []);

  // Gestion des raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Échap pour annuler
      if (e.key === 'Escape' && operationMode) {
        setOperationMode(null);
        setMontant('');
        setDescription('');
      }
      
      // Entrée pour valider
      if (e.key === 'Enter' && operationMode && montant && parseFloat(montant) > 0 && validationState.valid) {
        if (!openConfirm) {
          handleValider();
        } else {
          handleConfirm();
        }
      }
      
      // Raccourcis opérations (uniquement si client sélectionné)
      if (selectedClient && !operationMode) {
        const key = e.key.toUpperCase();
        const operation = Object.entries(operations).find(([_, op]) => op.shortcut === key);
        if (operation) {
          handleOperationClick(operation[0]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [operationMode, montant, selectedClient, openConfirm, validationState.valid]);

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

  const handleOperationClick = (mode) => {
    setOperationMode(mode);
    setMontant('');
    setDescription('');
    setValidationState({ valid: true, message: '', type: 'info' });
  };

  // Validation métier robuste
  const validerMontant = useCallback((montantValue, client, mode) => {
    const montantNum = parseFloat(montantValue);
    
    if (!montantNum || montantNum <= 0) {
      return {
        valid: false,
        message: 'Veuillez saisir un montant valide',
        type: 'error'
      };
    }

    switch(mode) {
      case 'liquide_paiement':
        if (montantNum > Math.abs(client?.montantLiquide || 0)) {
          const max = Math.abs(client?.montantLiquide || 0);
          return {
            valid: max > 0,
            message: `Montant dépasse la dette liquide (${formatMontant(max)})`,
            type: 'warning'
          };
        }
        break;
        
      case 'emballage_consignation':
        if (montantNum > Math.abs(client?.montantEmballage || 0)) {
          const max = Math.abs(client?.montantEmballage || 0);
          return {
            valid: max > 0,
            message: `Montant dépasse la dette emballage (${formatMontant(max)})`,
            type: 'warning'
          };
        }
        break;
        
      case 'les2_paiement':
        const totalDette = Math.abs(client?.montantLiquide || 0) + Math.abs(client?.montantEmballage || 0);
        if (montantNum > totalDette) {
          return {
            valid: totalDette > 0,
            message: `Montant dépasse la dette totale (${formatMontant(totalDette)})`,
            type: 'warning'
          };
        }
        break;
    }
    
    return { valid: true, message: '', type: 'info' };
  }, []);

  // Validation en temps réel
  useEffect(() => {
    if (montant && selectedClient && operationMode) {
      const validation = validerMontant(montant, selectedClient, operationMode);
      setValidationState(validation);
    }
  }, [montant, selectedClient, operationMode, validerMontant]);

  // Calcul des montants rapides suggérés
  const montantsRapides = useMemo(() => {
    if (!selectedClient || !operationMode) return [];
    
    const suggestions = [];
    const liquide = Math.abs(selectedClient.montantLiquide || 0);
    const emballage = Math.abs(selectedClient.montantEmballage || 0);
    const total = liquide + emballage;
    
    switch(operationMode) {
      case 'liquide_paiement':
        if (liquide > 0) {
          suggestions.push(
            { label: '25%', value: Math.round(liquide * 0.25) },
            { label: '50%', value: Math.round(liquide * 0.5) },
            { label: '75%', value: Math.round(liquide * 0.75) },
            { label: '100%', value: liquide }
          );
        }
        break;
        
      case 'emballage_consignation':
        if (emballage > 0) {
          suggestions.push(
            { label: '50%', value: Math.round(emballage * 0.5) },
            { label: '100%', value: emballage }
          );
        }
        break;
        
      case 'les2_paiement':
        if (total > 0) {
          suggestions.push(
            { label: '25%', value: Math.round(total * 0.25) },
            { label: '50%', value: Math.round(total * 0.5) },
            { label: '100%', value: total }
          );
        }
        break;
        
      default:
        [1000, 5000, 10000, 20000, 50000].forEach(val => {
          suggestions.push({ label: formatMontant(val), value: val });
        });
    }
    
    return suggestions.filter(s => s.value >= 100);
  }, [selectedClient, operationMode]);

  // Calcul de l'impact en temps réel
  const impact = useMemo(() => {
    if (!montant || parseFloat(montant) <= 0 || !operationMode || !selectedClient) return null;
    
    const montantNum = parseFloat(montant);
    const operation = operations[operationMode];
    
    const ajustLiq = operation.ajustementLiquide(montantNum, selectedClient);
    const ajustEmb = operation.ajustementEmballage(montantNum, selectedClient);
    
    const nouveauLiquide = Math.max(0, (selectedClient.montantLiquide || 0) + ajustLiq);
    const nouveauEmballage = Math.max(0, (selectedClient.montantEmballage || 0) + ajustEmb);
    
    return {
      ajustLiq,
      ajustEmb,
      nouveauLiquide,
      nouveauEmballage,
      estSolde: nouveauLiquide === 0 && nouveauEmballage === 0,
    };
  }, [montant, operationMode, selectedClient]);

  const handleValider = () => {
    setError('');
    
    if (!selectedClient) {
      setError('Veuillez sélectionner un client');
      return;
    }

    if (!validationState.valid) {
      setError(validationState.message);
      return;
    }

    setOpenConfirm(true);
  };

  const handleConfirm = async () => {
    setOpenConfirm(false);
    setSubmitting(true);
    
    try {
      const operation = operations[operationMode];
      const montantNum = parseFloat(montant);
      
      const ajustementLiquide = operation.ajustementLiquide(montantNum, selectedClient);
      const ajustementEmballage = operation.ajustementEmballage(montantNum, selectedClient);

      const libelle = `${operation.label.toUpperCase()} ${selectedClient.raisonsociale} - ${formatMontant(montantNum)}`;

      await privateApi.post('/api/caisse/ajuster-client', null, {
        params: {
          pvId,
          clientId: selectedClient.id,
          ajustementLiquide: ajustementLiquide !== 0 ? ajustementLiquide : null,
          ajustementEmballage: ajustementEmballage !== 0 ? ajustementEmballage : null,
          libelle,
          description: description || operation.description,
        },
      });

      setSuccess('✨ Opération enregistrée ! Redirection...');
      setTimeout(() => {
        setSubmitting(false);
        navigate('/accueil/caisse/journal');
      }, 1500);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.response?.data?.message || 'Erreur lors de l\'opération');
      setSubmitting(false);
    }
  };

  const operation = operationMode ? operations[operationMode] : null;

  // Si pas de client sélectionné
  if (!selectedClient) {
    return (
      <Box sx={{ p: 2 }}>
        <Card elevation={3}>
          <CardContent>
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
                <Typography variant="h4" fontWeight="bold">
                  ⚡ Ajustement Rapide
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Sélectionner un client pour commencer
                </Typography>
              </Box>
              <Button
                size="small"
                startIcon={<Settings />}
                variant="outlined"
                sx={{ color: 'white', borderColor: 'white' }}
                onClick={() => navigate('/accueil/caisse/ajuster-client')}
              >
                Mode avancé
              </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Autocomplete
                  options={clients}
                  getOptionLabel={(option) => `${option.raisonsociale}${option.telephone ? ` (${option.telephone})` : ''}`}
                  value={selectedClient}
                  onChange={(e, newValue) => setSelectedClient(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Client"
                      placeholder="Chercher un client..."
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
                    </Box>
                  )}
                  loading={loading}
                  disabled={loading}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Si client sélectionné mais pas d'opération
  if (!operationMode) {
    const totalDette = Math.abs(selectedClient.montantLiquide || 0) + Math.abs(selectedClient.montantEmballage || 0);
    
    return (
      <Box sx={{ p: 2 }}>
        <Card elevation={3}>
          <CardContent>
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
                onClick={() => { setSelectedClient(null); setOperationMode(null); }}
                sx={{ mr: 2, color: 'white', borderColor: 'white' }}
                variant="outlined"
              >
                Retour
              </Button>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" fontWeight="bold">
                  {selectedClient.raisonsociale}
                </Typography>
                {selectedClient.telephone && (
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    📞 {selectedClient.telephone}
                  </Typography>
                )}
              </Box>
              <Button
                size="small"
                startIcon={<Settings />}
                variant="outlined"
                sx={{ color: 'white', borderColor: 'white' }}
                onClick={() => navigate('/accueil/caisse/ajuster-client')}
              >
                Mode avancé
              </Button>
            </Box>

            {/* Soldes actuels */}
            <Paper sx={{ p: 3, mb: 3, bgcolor: 'info.light', borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                💼 Soldes actuels
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      💰 Dette liquide
                    </Typography>
                    <Typography variant="h5" color="error" fontWeight="bold">
                      {formatMontant(selectedClient.montantLiquide)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      📦 Dette emballage
                    </Typography>
                    <Typography variant="h5" color="warning.main" fontWeight="bold">
                      {formatMontant(selectedClient.montantEmballage)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      💳 Total à recouvrer
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {formatMontant(totalDette)}
                    </Typography>
                    <StatutSolde 
                      liquide={selectedClient.montantLiquide} 
                      emballage={selectedClient.montantEmballage} 
                    />
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Opérations */}
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              ⚡ Choisir une opération
            </Typography>

            <Grid container spacing={2}>
              {/* Paiement liquide */}
              <Grid item xs={12} sm={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="success"
                  size="large"
                  sx={{ 
                    py: 3, 
                    flexDirection: 'column', 
                    gap: 1,
                    height: '100%',
                    borderWidth: 2,
                    position: 'relative',
                  }}
                  onClick={() => handleOperationClick('liquide_paiement')}
                  disabled={Math.abs(selectedClient.montantLiquide || 0) <= 0}
                >
                  <TrendingDown sx={{ fontSize: 32 }} />
                  <Typography variant="body1" fontWeight="bold">Paiement liquide</Typography>
                  <Typography variant="caption">Réduire la dette liquide</Typography>
                  <Chip 
                    label="L" 
                    size="small" 
                    sx={{ 
                      position: 'absolute', 
                      top: 8, 
                      right: 8,
                      bgcolor: 'success.light',
                      color: 'success.contrastText'
                    }} 
                  />
                </Button>
              </Grid>

              {/* Remboursement liquide */}
              <Grid item xs={12} sm={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  size="large"
                  sx={{ 
                    py: 3, 
                    flexDirection: 'column', 
                    gap: 1,
                    height: '100%',
                    borderWidth: 2,
                    position: 'relative',
                  }}
                  onClick={() => handleOperationClick('liquide_remboursement')}
                >
                  <TrendingUp sx={{ fontSize: 32 }} />
                  <Typography variant="body1" fontWeight="bold">Remboursement liquide</Typography>
                  <Typography variant="caption">Augmenter la dette liquide</Typography>
                  <Chip 
                    label="R" 
                    size="small" 
                    sx={{ 
                      position: 'absolute', 
                      top: 8, 
                      right: 8,
                      bgcolor: 'error.light',
                      color: 'error.contrastText'
                    }} 
                  />
                </Button>
              </Grid>

              {/* Consignation */}
              <Grid item xs={12} sm={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="info"
                  size="large"
                  sx={{ 
                    py: 3, 
                    flexDirection: 'column', 
                    gap: 1,
                    height: '100%',
                    borderWidth: 2,
                    position: 'relative',
                  }}
                  onClick={() => handleOperationClick('emballage_consignation')}
                  disabled={Math.abs(selectedClient.montantEmballage || 0) <= 0}
                >
                  <ShoppingBag sx={{ fontSize: 32 }} />
                  <Typography variant="body1" fontWeight="bold">Retour emballages</Typography>
                  <Typography variant="caption">Client rend des casiers</Typography>
                  <Chip 
                    label="E" 
                    size="small" 
                    sx={{ 
                      position: 'absolute', 
                      top: 8, 
                      right: 8,
                      bgcolor: 'info.light',
                      color: 'info.contrastText'
                    }} 
                  />
                </Button>
              </Grid>

              {/* Déconsignation */}
              <Grid item xs={12} sm={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="warning"
                  size="large"
                  sx={{ 
                    py: 3, 
                    flexDirection: 'column', 
                    gap: 1,
                    height: '100%',
                    borderWidth: 2,
                    position: 'relative',
                  }}
                  onClick={() => handleOperationClick('emballage_deconsignation')}
                >
                  <ShoppingBag sx={{ fontSize: 32, transform: 'rotate(180deg)' }} />
                  <Typography variant="body1" fontWeight="bold">Récupération consigne</Typography>
                  <Typography variant="caption">Client récupère sa consigne</Typography>
                  <Chip 
                    label="D" 
                    size="small" 
                    sx={{ 
                      position: 'absolute', 
                      top: 8, 
                      right: 8,
                      bgcolor: 'warning.light',
                      color: 'warning.contrastText'
                    }} 
                  />
                </Button>
              </Grid>

              {/* Paiement complet */}
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{ 
                    py: 2, 
                    flexDirection: 'column', 
                    gap: 1,
                    background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                    mt: 1,
                    position: 'relative',
                  }}
                  onClick={() => handleOperationClick('les2_paiement')}
                  disabled={totalDette <= 0}
                >
                  <Typography variant="body1" fontWeight="bold">💰 Paiement complet (liquide + emballage)</Typography>
                  <Typography variant="caption">Payer les deux dettes à la fois</Typography>
                  <Chip 
                    label="P" 
                    size="small" 
                    sx={{ 
                      position: 'absolute', 
                      top: 8, 
                      right: 8,
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: 'white'
                    }} 
                  />
                </Button>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/accueil/caisse/ajuster-client')}
                sx={{ cursor: 'pointer', color: 'primary.main' }}
              >
                Mode avancé pour opérations complexes
              </Link>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Si opération sélectionnée - Modal de saisie du montant
  return (
    <Box sx={{ p: 2 }}>
      <Dialog 
        open={true}
        maxWidth="sm"
        fullWidth
        onClose={() => !submitting && setOperationMode(null)}
        disableEscapeKeyDown={submitting}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}>
          {operation.icon}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight="bold">{operation.label}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              {selectedClient.raisonsociale}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            {/* Description */}
            <Typography variant="body2" color="text.secondary">
              {operation.description}
            </Typography>

            {/* Montants rapides */}
            {montantsRapides.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  💡 Montants suggérés
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {montantsRapides.map((suggestion) => (
                    <MontantRapideChip
                      key={suggestion.label}
                      label={suggestion.label}
                      value={suggestion.value}
                      selected={montant === suggestion.value.toString()}
                      onClick={() => setMontant(suggestion.value.toString())}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Champ montant */}
            <TextField
              autoFocus
              fullWidth
              label="Montant (FCFA)"
              type="number"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              variant="outlined"
              placeholder="0"
              inputProps={{ 
                step: "100",
                min: "0",
                inputMode: "decimal"
              }}
              error={!validationState.valid}
              helperText={validationState.message}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LocalAtm />
                  </InputAdornment>
                ),
              }}
            />

            {/* Note optionnelle */}
            <TextField
              fullWidth
              label="Note (optionnel)"
              placeholder="Ex: Paiement partiel, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={2}
              variant="outlined"
              size="small"
            />

            {/* Aperçu de l'impact */}
            {impact && (
              <Alert 
                severity={impact.estSolde ? "success" : "info"} 
                icon={<Calculate />}
                sx={{ mt: 1 }}
              >
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  📊 Aperçu de l'impact
                </Typography>
                
                {impact.ajustLiq !== 0 && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      💰 Dette liquide
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body2" sx={{ textDecoration: 'line-through', opacity: 0.7 }}>
                        {formatMontant(selectedClient.montantLiquide)}
                      </Typography>
                      <Typography variant="body2">→</Typography>
                      <Typography 
                        variant="body2" 
                        fontWeight="bold"
                        color={impact.nouveauLiquide < selectedClient.montantLiquide ? 'success.main' : 'error.main'}
                      >
                        {formatMontant(impact.nouveauLiquide)}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {impact.ajustEmb !== 0 && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      📦 Dette emballage
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body2" sx={{ textDecoration: 'line-through', opacity: 0.7 }}>
                        {formatMontant(selectedClient.montantEmballage)}
                      </Typography>
                      <Typography variant="body2">→</Typography>
                      <Typography 
                        variant="body2" 
                        fontWeight="bold"
                        color={impact.nouveauEmballage < selectedClient.montantEmballage ? 'success.main' : 'error.main'}
                      >
                        {formatMontant(impact.nouveauEmballage)}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {impact.estSolde && (
                  <Box sx={{ mt: 2, p: 1, bgcolor: 'success.light', borderRadius: 1 }}>
                    <Typography variant="body2" fontWeight="bold" color="success.dark" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircle fontSize="small" />
                      ✅ Le client sera entièrement soldé !
                    </Typography>
                  </Box>
                )}
              </Alert>
            )}

            {/* Info impact caisse */}
            {montant && parseFloat(montant) > 0 && (
              <Alert severity={operation.caisseImpact === 'entrée' ? "success" : "warning"}>
                <Typography variant="body2">
                  <strong>Opération:</strong> {operation.label}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  <strong>Montant:</strong> {formatMontant(parseFloat(montant))}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  <strong>Impact caisse:</strong> {operation.caisseImpact === 'entrée' ? '➕ ENTRÉE' : '➖ SORTIE'} {formatMontant(parseFloat(montant))}
                </Typography>
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setOperationMode(null)}
            disabled={submitting}
            startIcon={<Close />}
          >
            Annuler
          </Button>
          <Button 
            variant="contained" 
            onClick={handleValider}
            disabled={!montant || parseFloat(montant) <= 0 || !validationState.valid || submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : <Save />}
            sx={{
              background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
              minWidth: 120,
            }}
          >
            {submitting ? 'Validation...' : '✨ Confirmer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmation */}
      <Dialog 
        open={openConfirm} 
        onClose={() => !submitting && setOpenConfirm(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
          color: 'white',
        }}>
          Confirmer l'opération
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={3}>
            {/* Client */}
            <Box>
              <Typography variant="caption" color="text.secondary">Client</Typography>
              <Typography variant="h6" fontWeight="bold">{selectedClient.raisonsociale}</Typography>
            </Box>
            
            {/* Opération */}
            <Box>
              <Typography variant="caption" color="text.secondary">Opération</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                {operation.icon}
                <Chip 
                  label={operation.label} 
                  color={operation.color}
                  variant="filled"
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
            </Box>

            {/* Montant */}
            <Box>
              <Typography variant="caption" color="text.secondary">Montant</Typography>
              <Typography variant="h4" fontWeight="bold" color={operation.color}>
                {formatMontant(parseFloat(montant))}
              </Typography>
            </Box>

            {/* Impact caisse */}
            <Alert 
              severity={operation.caisseImpact === 'entrée' ? "success" : "warning"}
            >
              <Typography variant="body2">
                <strong>Impact caisse:</strong> {operation.caisseImpact === 'entrée' ? '➕ ENTRÉE' : '➖ SORTIE'} {formatMontant(parseFloat(montant))}
              </Typography>
            </Alert>

            {/* Impact sur les soldes */}
            {impact && (
              <Alert severity="info">
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  📈 Nouveaux soldes après opération
                </Typography>
                
                {impact.estSolde ? (
                  <Typography variant="body2" color="success.main" fontWeight="bold">
                    ✅ Le client sera entièrement soldé !
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                    <Typography variant="body2">
                      💰 Liquide: <strong>{formatMontant(impact.nouveauLiquide)}</strong>
                    </Typography>
                    <Typography variant="body2">
                      📦 Emballage: <strong>{formatMontant(impact.nouveauEmballage)}</strong>
                    </Typography>
                  </Box>
                )}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setOpenConfirm(false)}
            disabled={submitting}
          >
            Annuler
          </Button>
          <Button 
            variant="contained" 
            onClick={handleConfirm}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : <CheckCircle />}
            sx={{
              background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
              minWidth: 120,
            }}
          >
            {submitting ? 'Enregistrement...' : '✨ Valider'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
