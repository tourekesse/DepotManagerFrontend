import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  Typography,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Paper,
  Divider,
  FormControlLabel,
  Switch,
  Alert,
  Tooltip,
  LinearProgress
} from '@mui/material';
import { Delete, Add, CheckCircle, Warning, Info, Error as ErrorIcon } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { privateApi } from '../api/axios';
import { getActivePointDeVenteId } from '../utils/pdv';

// Helper: format number with thousands separators + ' F'
const formatF = (n) => `${Number(n || 0).toLocaleString('fr-FR')} F`;

// ============================================
// COMPOSANT LIGNE ITEM
// ============================================
const ItemRow = ({ item, onDelete }) => {
  const { type, nom, qte, consigne, value } = item;
  const total = type === 'ESPECES' ? value : (consigne * qte);
  
  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      bgcolor: type === 'MANQUANT' ? 'error.lighter' : 'success.lighter',
      p: 1,
      mb: 1,
      borderRadius: 1,
      border: `1px solid ${type === 'MANQUANT' ? 'error.light' : 'success.light'}`
    }}>
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
          {type === 'MANQUANT' ? '❌ ' : '💰 '}{nom}
        </Typography>
        {type !== 'ESPECES' && (
          <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
            {formatF(consigne)} × {qte} = {formatF(total)}
          </Typography>
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" sx={{ 
          fontWeight: 'bold', 
          fontSize: '0.85rem',
          color: type === 'MANQUANT' ? 'error.main' : 'success.main'
        }}>
          {formatF(total)}
        </Typography>
        <Tooltip title="Supprimer">
          <IconButton size="small" onClick={onDelete} sx={{ color: 'error.main' }}>
            <Delete sx={{ fontSize: '0.8rem' }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

// ============================================
// COMPOSANT AJOUT RAPIDE
// ============================================
const AjoutRapide = ({ options, onAdd, label, type = 'produit' }) => {
  const [selected, setSelected] = useState('');
  const [qte, setQte] = useState(1);
  const selectedItem = options.find(opt => String(opt.id) === String(selected));

  return (
    <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <Box sx={{ flex: 1, minWidth: 150 }}>
        <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontSize: '0.75rem' }}>
          {type === 'produit' ? 'Produit manquant' : 'Type de casier'}
        </Typography>
        <Select
          size="small"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          fullWidth
          displayEmpty
          sx={{ fontSize: '0.8rem' }}
        >
          <MenuItem value="" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
            {label}
          </MenuItem>
          {options.map(opt => (
            <MenuItem key={opt.id} value={opt.id} sx={{ fontSize: '0.8rem' }}>
              {opt.nom} - {formatF(opt.consigne)}
            </MenuItem>
          ))}
        </Select>
      </Box>
      
      <Box>
        <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontSize: '0.75rem' }}>
          Quantité
        </Typography>
        <TextField
          size="small"
          type="number"
          value={qte}
          onChange={(e) => setQte(Math.max(1, parseInt(e.target.value, 10) || 1))}
          sx={{ width: 80, '& .MuiInputBase-input': { fontSize: '0.8rem' } }}
          InputProps={{
            inputProps: { min: 1 }
          }}
        />
      </Box>
      
      {selectedItem && (
        <Box sx={{ px: 1 }}>
          <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'info.main' }}>
            Total: {formatF(selectedItem.consigne * qte)}
          </Typography>
        </Box>
      )}
      
      <Button
        variant="contained"
        size="small"
        onClick={() => {
          onAdd(selected, qte);
          setSelected('');
          setQte(1);
        }}
        disabled={!selected}
        sx={{ minWidth: 40, height: 40 }}
      >
        <Add />
      </Button>
    </Box>
  );
};

// ============================================
// COMPOSANT PRINCIPAL CORRIGÉ
// ============================================
const LivraisonSimple = ({ livraison, onValidate, onClose }) => {
  const [open, setOpen] = useState(false);
  const [manquants, setManquants] = useState([]);
  const [compensations, setCompensations] = useState([]);
  const [typeCasiers, setTypeCasiers] = useState([]);
  const [compType, setCompType] = useState('CASIER');
  const [montantEspeces, setMontantEspeces] = useState('');
  const [tousLesCasiersRendus, setTousLesCasiersRendus] = useState(true);
  const [erreur, setErreur] = useState('');
  const [loading, setLoading] = useState(false);

  // DEBUG: Afficher les données reçues
  useEffect(() => {
    console.log('=== 🐛 DÉBOGAGE DONNÉES LIVRAISON ===');
    console.log('Livraison complète:', livraison);
    
    if (livraison.details && livraison.details.length > 0) {
      console.log('Premier article détaillé:', livraison.details[0]);
      console.log('Champs disponibles:', Object.keys(livraison.details[0]));
      
      // Calcul manuel pour vérification
      livraison.details.forEach((art, i) => {
        const consigneCasier = Number(art.consigneCasier || 0);
        const consigneBouteille = Number(art.consigneBouteille || 0);
        const nbBouteilles = Number(art.nombreBouteillesParCasier || 
                                  art.nbBouteillesParCasier || 0);
        const total = consigneCasier + (consigneBouteille * nbBouteilles);
        
        console.log(`${i+1}. ${art.nomProduit}:`, {
          consigneCasier,
          consigneBouteille,
          nbBouteilles,
          totalCalculé: total
        });
      });
    }
  }, [livraison]);

  // Charger les types de casiers
  useEffect(() => {
    const pvId = getActivePointDeVenteId();
    if (!pvId) return;
    
    setLoading(true);
    privateApi
      .get(`/api/type-casiers/point-de-vente/${pvId}/consignables`)
      .then(res => {
        console.log('🔍 Types de casiers reçus:', res.data);
        
        const data = Array.isArray(res.data) ? res.data : [];
        const transformed = data.map(tc => {
          // Utiliser consigneTotaleParCasier (3000, 3600, etc.)
          const consigneTotale = Number(
            tc.consigneTotaleParCasier ||  // 3000 pour Beaufort 50cl
            tc.consigne_totale ||          // alternative
            0
          );
          
          return {
            id: String(tc.id),
            nom: tc.nomDisplay || tc.nom_display || 'Casier',
            consigne: consigneTotale,
            details: {
              prixCasier: tc.prixConsigneCasier,
              prixBouteille: tc.prixConsigneBouteille,
              nbBouteilles: tc.nbreBouteillesParCasier
            }
          };
        });
        
        setTypeCasiers(transformed);
        setErreur('');
      })
      .catch(err => {
        console.error('Erreur chargement types de casiers:', err);
        setErreur('Impossible de charger les types de casiers');
        setTypeCasiers([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Articles avec calcul de consigne TOTALE (casier + bouteilles)
  const articles = useMemo(() => {
    const arts = livraison.details || livraison.articles || [];
    
    console.log('=== 🧮 CALCUL CONSIGNES ARTICLES ===');
    
    return arts.map(a => {
      // Récupérer les valeurs
      const consigneCasier = Number(a.consigneCasier || 0);
      const consigneBouteille = Number(a.consigneBouteille || 0);
      const nbBouteilles = Number(
        a.nombreBouteillesParCasier ||
        a.nbBouteillesParCasier ||
        a.nbreBouteillesParCasier || 0
      );
      
      // CALCUL DE LA CONSIGNE TOTALE
      const consigneTotale = consigneCasier + (consigneBouteille * nbBouteilles);
      
      console.log(`${a.nomProduit || a.designation}:`, {
        consigneCasier,
        consigneBouteille,
        nbBouteilles,
        consigneTotale
      });
      
      return {
        ...a,
        consigneTotale: consigneTotale
      };
    });
  }, [livraison]);

  // Produits pour liste déroulante - AVEC CONSIGNE TOTALE CORRECTE
  const produits = useMemo(() => {
    console.log('🔄 Création liste produits...');
    
    const prods = articles.map(a => {
      const nom = a.nomProduit || a.designation || 'Produit';
      
      // Utiliser la consigne totale calculée
      const consigne = a.consigneTotale || 0;
      
      console.log(`📋 Produit "${nom}": ${consigne} F`);
      
      return {
        id: String(a.produitId || a.id),
        nom: nom,
        consigne: consigne  // 3000 pour Beaufort 50cl, 3600 pour Beaufort 33cl
      };
    });
    
    return prods;
  }, [articles]);

  // Calcul des totaux
  const totalBrut = useMemo(() => {
    const brut = livraison.montantTotal || livraison.totalGeneral || 0;
    console.log('💰 Total brut:', brut);
    return brut;
  }, [livraison]);

  const totalConsigne = useMemo(() => {
    // Calculer à partir des articles
    const consigneCalculee = articles.reduce((sum, a) => sum + (a.consigneTotale || 0), 0);
    
    // Vérifier avec la valeur de l'API
    const consigneAPI = livraison.montantEmballage || livraison.montantEmballageTotal || 0;
    
    console.log('📦 Total consigne:', {
      calculé: consigneCalculee,
      depuisAPI: consigneAPI,
      cohérent: consigneCalculee === Number(consigneAPI)
    });
    
    return consigneCalculee;
  }, [articles, livraison]);

  const totalNet = useMemo(() => {
    const net = totalBrut - totalConsigne;
    console.log('🧮 Total net (sans consigne):', net);
    return net;
  }, [totalBrut, totalConsigne]);

  // Calculs compensation
  const totalManquants = useMemo(() => 
    manquants.reduce((sum, m) => sum + (m.consigne * m.qte), 0), 
    [manquants]
  );

  const totalCompensations = useMemo(() => 
    compensations.reduce((sum, c) => {
      if (c.type === 'ESPECES') return sum + Number(c.value || 0);
      return sum + (Number(c.consigne || 0) * Number(c.qte || 0));
    }, 0), 
    [compensations]
  );

  const solde = Number(totalManquants) - Number(totalCompensations);
  
  // Montant final à encaisser
  const montantFinal = useMemo(() => {
    const final = totalBrut + solde;
    console.log('🎯 Montant final:', { totalBrut, solde, final });
    return final;
  }, [totalBrut, solde]);

  // Pourcentage de compensation
  const pourcentageCompense = totalConsigne > 0 
    ? Math.min(100, Math.round((totalCompensations / totalConsigne) * 100))
    : 0;

  // Vérification des incohérences
  const verificationIncoherence = useMemo(() => {
    const erreurs = [];
    
    if (totalManquants > totalConsigne) {
      erreurs.push(`Les manquants (${formatF(totalManquants)}) dépassent la consigne totale (${formatF(totalConsigne)})`);
    }
    
    if (manquants.some(m => !m.consigne || m.consigne === 0)) {
      erreurs.push('Certains manquants n\'ont pas de valeur de consigne');
    }
    
    if (compensations.some(c => c.type !== 'ESPECES' && (!c.consigne || c.consigne === 0))) {
      erreurs.push('Certaines compensations n\'ont pas de valeur');
    }
    
    return erreurs;
  }, [totalManquants, totalConsigne, manquants, compensations]);

  // Actions
  const ajouterManquant = (produitId, qte) => {
    if (!produitId) {
      setErreur('Veuillez sélectionner un produit');
      return;
    }
    
    const produit = produits.find(p => p.id === String(produitId));
    if (!produit) {
      setErreur('Produit non trouvé');
      return;
    }
    
    // Vérifier si le total des manquants ne dépasse pas la consigne
    const nouveauTotal = totalManquants + (produit.consigne * qte);
    if (nouveauTotal > totalConsigne) {
      setErreur(`Total manquants (${formatF(nouveauTotal)}) dépasse la consigne (${formatF(totalConsigne)})`);
      return;
    }
    
    setErreur('');
    setManquants(prev => [...prev, { 
      ...produit, 
      qte: Number(qte),
      type: 'MANQUANT'
    }]);
  };

  const ajouterCompensation = (typeId, qte) => {
    if (compType === 'ESPECES') return;
    
    if (!typeId) {
      setErreur('Veuillez sélectionner un type de casier');
      return;
    }
    
    const type = typeCasiers.find(t => String(t.id) === String(typeId));
    if (!type) {
      setErreur('Type de casier non trouvé');
      return;
    }
    
    setErreur('');
    setCompensations(prev => [...prev, { 
      type: 'CASIER', 
      ...type, 
      qte: Number(qte)
    }]);
  };

  const ajouterCompensationEspeces = () => {
    const value = Number(montantEspeces);
    if (value <= 0 || isNaN(value)) {
      setErreur('Veuillez saisir un montant valide et positif');
      return;
    }
    
    setErreur('');
    setCompensations(prev => [...prev, { 
      type: 'ESPECES', 
      nom: 'Espèces',
      value: value
    }]);
    setMontantEspeces('');
  };

  const handleToutOk = async () => {
    if (!tousLesCasiersRendus) {
      setOpen(true);
      return;
    }
    
    // Tous casiers rendus : paye seulement le net
    const casiersRendus = articles.reduce((sum, a) => {
      const qte = a.quantiteLivree || a.quantite || 0;
      return sum + qte;
    }, 0);
    
    console.log('✅ Validation - Tous casiers rendus:', {
      venteId: livraison.id,
      casiersRendus,
      montantPaye: totalNet,
      totalBrut,
      totalConsigne
    });
    
    onValidate({
      venteId: livraison.id,
      casiersRendus: casiersRendus,
      bouteillesRendues: 0,
      montantPaye: totalNet
    });
    onClose && onClose();
  };

  const handleValiderProbleme = () => {
    if (verificationIncoherence.length > 0) {
      setErreur(verificationIncoherence[0]);
      return;
    }
    
    console.log('✅ Validation avec compensation:', {
      venteId: livraison.id,
      casiersRendus: compensations.filter(c => c.type === 'CASIER').reduce((sum, c) => sum + (c.qte || 0), 0),
      montantPaye: montantFinal,
      totalBrut,
      solde,
      manquants: totalManquants,
      compensations: totalCompensations
    });
    
    onValidate({
      venteId: livraison.id,
      casiersRendus: compensations
        .filter(c => c.type === 'CASIER')
        .reduce((sum, c) => sum + (c.qte || 0), 0),
      bouteillesRendues: 0,
      montantPaye: montantFinal
    });
    setOpen(false);
    onClose && onClose();
  };

  // Rendu conditionnel si chargement
  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography>Chargement des données...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, maxWidth: 400, mx: 'auto' }}>
      
      {/* En-tête */}
      <Typography variant="h6" align="center" gutterBottom sx={{ fontSize: '1rem', fontWeight: 'bold' }}>
        🚚 Livraison - {livraison.nomClient || livraison.clientNom || 'Client'}
      </Typography>

      {/* Panier Livraison */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ color: 'primary.main' }}>
          📦 DÉTAIL DE LA LIVRAISON
        </Typography>
        
        {articles.map((item, idx) => (
          <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
            <Box>
              <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 'medium' }}>
                {item.nomProduit || item.designation || 'Article'}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                {item.quantiteLivree || item.quantite || 1} × {formatF(item.prixUnitaire || 0)}
                {item.consigneTotale > 0 && ` (Consigne: ${formatF(item.consigneTotale)})`}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
              {formatF((item.prixUnitaire || 0) * (item.quantiteLivree || item.quantite || 1))}
            </Typography>
          </Box>
        ))}
        
        {/* Consigne */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          mt: 2, 
          pt: 2, 
          borderTop: '1px dashed #ccc' 
        }}>
          <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 'medium' }}>
            Consigne totale :
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'warning.main' }}>
            {formatF(totalConsigne)}
          </Typography>
        </Box>
        
        {/* TOTAL */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          mt: 2, 
          pt: 2, 
          borderTop: '2px solid #1976d2',
          alignItems: 'center'
        }}>
          <Box>
            <Typography variant="body1" fontWeight="bold" sx={{ fontSize: '0.95rem' }}>
              {tousLesCasiersRendus ? 'TOTAL À ENCAISSER' : 'TOTAL BRUT'}
            </Typography>
            {tousLesCasiersRendus && (
              <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'success.main' }}>
                (Consigne déduite)
              </Typography>
            )}
          </Box>
          <Typography variant="h6" fontWeight="bold" color="primary" sx={{ fontSize: '1.1rem' }}>
            {formatF(tousLesCasiersRendus ? totalNet : totalBrut)}
          </Typography>
        </Box>
      </Paper>

      {/* Switch: Tous les casiers rendus ? */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: tousLesCasiersRendus ? 'success.lighter' : 'warning.lighter' }}>
        <FormControlLabel
          control={
            <Switch
              checked={tousLesCasiersRendus}
              onChange={(e) => setTousLesCasiersRendus(e.target.checked)}
              color="success"
              size="medium"
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                {tousLesCasiersRendus ? '✅ TOUS LES CASIERS RENDUS' : '⚠️ CASIERS MANQUANTS'}
              </Typography>
              <Tooltip title={tousLesCasiersRendus 
                ? "Le client a rendu tous les casiers et bouteilles. La consigne est déduite." 
                : "Certains casiers/bouteilles ne sont pas rendus. Compensation nécessaire."}>
                <Info sx={{ fontSize: '0.9rem', color: 'info.main' }} />
              </Tooltip>
            </Box>
          }
          sx={{ width: '100%', m: 0 }}
        />
      </Paper>

      {/* Boutons principaux */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
        <Button
          fullWidth
          variant="contained"
          color="success"
          startIcon={<CheckCircle />}
          onClick={handleToutOk}
          disabled={!tousLesCasiersRendus}
          sx={{ 
            py: 1.5, 
            fontSize: '0.9rem',
            fontWeight: 'bold',
            bgcolor: tousLesCasiersRendus ? 'success.main' : 'grey.400'
          }}
        >
          VALIDER LA LIVRAISON • {formatF(totalNet).replace(' F', '')}
        </Button>
        
        <Button
          fullWidth
          variant="contained"
          color="warning"
          startIcon={<Warning />}
          onClick={() => {
            setErreur('');
            setOpen(true);
          }}
          disabled={tousLesCasiersRendus}
          sx={{ 
            py: 1.5, 
            fontSize: '0.9rem',
            fontWeight: 'bold',
            bgcolor: !tousLesCasiersRendus ? 'warning.main' : 'grey.400'
          }}
        >
          SAISIR LES COMPENSATIONS
        </Button>
      </Box>

      {/* Dialog compensation */}
      <Dialog 
        open={open} 
        onClose={() => {
          setErreur('');
          setOpen(false);
        }}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogContent sx={{ p: 2 }}>
          
          {/* Titre */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ color: 'primary.main', mb: 0.5 }}>
              ♻️ COMPENSATION DES CONSIGNES
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
              Indiquez ce qui manque et comment c'est compensé
            </Typography>
          </Box>

          {/* Erreurs */}
          {erreur && (
            <Alert 
              severity="error" 
              sx={{ mb: 2 }}
              onClose={() => setErreur('')}
            >
              {erreur}
            </Alert>
          )}

          {verificationIncoherence.length > 0 && (
            <Alert 
              severity="warning" 
              icon={<ErrorIcon />}
              sx={{ mb: 2 }}
            >
              {verificationIncoherence[0]}
            </Alert>
          )}

          {/* Montant à compenser */}
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2, 
              mb: 3, 
              bgcolor: 'info.lighter',
              borderColor: 'info.main',
              textAlign: 'center'
            }}
          >
            <Typography variant="body2" sx={{ fontSize: '0.85rem', mb: 1, color: 'info.dark' }}>
              MONTANT TOTAL À COMPENSER
            </Typography>
            <Typography 
              variant="h4" 
              fontWeight="bold" 
              sx={{ 
                color: 'info.dark',
                mb: 1
              }}
            >
              {formatF(totalConsigne)}
            </Typography>
            
            {/* Barre de progression */}
            <Box sx={{ mt: 2 }}>
              <LinearProgress 
                variant="determinate" 
                value={pourcentageCompense}
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  bgcolor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: pourcentageCompense >= 100 ? 'success.main' : 'warning.main'
                  }
                }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                  {pourcentageCompense}% compensé
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                  {formatF(totalCompensations)} / {formatF(totalConsigne)}
                </Typography>
              </Box>
            </Box>
          </Paper>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            
            {/* Colonne gauche - Manquants */}
            <Box>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, color: 'error.main' }}>
                ❌ MANQUANTS
              </Typography>
              
              <AjoutRapide
                options={produits}
                onAdd={ajouterManquant}
                label="Sélectionner un produit"
                type="produit"
              />
              
              <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                {manquants.length === 0 ? (
                  <Typography variant="body2" sx={{ 
                    textAlign: 'center', 
                    color: 'text.secondary',
                    fontStyle: 'italic',
                    p: 2,
                    bgcolor: 'grey.50',
                    borderRadius: 1
                  }}>
                    Aucun manquant saisi
                  </Typography>
                ) : (
                  manquants.map((m, idx) => (
                    <ItemRow
                      key={idx}
                      item={m}
                      onDelete={() => setManquants(manquants.filter((_, i) => i !== idx))}
                    />
                  ))
                )}
              </Box>
              
              <Box sx={{ mt: 2, p: 1, bgcolor: 'error.lighter', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                  Total manquants: {formatF(totalManquants)}
                </Typography>
              </Box>
            </Box>

            {/* Colonne droite - Compensations */}
            <Box>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, color: 'success.main' }}>
                💰 COMPENSATIONS
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 1, fontSize: '0.75rem' }}>
                  Type de compensation
                </Typography>
                <Select
                  size="small"
                  value={compType}
                  onChange={(e) => setCompType(e.target.value)}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  <MenuItem value="CASIER">Casier rendu</MenuItem>
                  <MenuItem value="ESPECES">Espèces</MenuItem>
                </Select>
                
                {compType === 'CASIER' ? (
                  <AjoutRapide
                    options={typeCasiers}
                    onAdd={ajouterCompensation}
                    label="Sélectionner un type de casier"
                    type="casier"
                  />
                ) : (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                    <TextField
                      size="small"
                      type="number"
                      value={montantEspeces}
                      onChange={(e) => setMontantEspeces(e.target.value)}
                      fullWidth
                      label="Montant en espèces"
                      InputProps={{
                        endAdornment: 'F'
                      }}
                    />
                    <Button
                      variant="contained"
                      onClick={ajouterCompensationEspeces}
                      disabled={!montantEspeces || Number(montantEspeces) <= 0}
                      sx={{ minWidth: 40, height: 40 }}
                    >
                      <Add />
                    </Button>
                  </Box>
                )}
              </Box>
              
              <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                {compensations.length === 0 ? (
                  <Typography variant="body2" sx={{ 
                    textAlign: 'center', 
                    color: 'text.secondary',
                    fontStyle: 'italic',
                    p: 2,
                    bgcolor: 'grey.50',
                    borderRadius: 1
                  }}>
                    Aucune compensation saisie
                  </Typography>
                ) : (
                  compensations.map((c, idx) => (
                    <ItemRow
                      key={idx}
                      item={{ ...c, type: 'COMPENSATION' }}
                      onDelete={() => setCompensations(compensations.filter((_, i) => i !== idx))}
                    />
                  ))
                )}
              </Box>
              
              <Box sx={{ mt: 2, p: 1, bgcolor: 'success.lighter', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                  Total compensations: {formatF(totalCompensations)}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Résumé final */}
          <Paper variant="outlined" sx={{ mt: 3, p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, textAlign: 'center' }}>
              📊 RÉCAPITULATIF FINAL
            </Typography>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
              <Box>
                <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>Total brut:</Typography>
                <Typography variant="body1" fontWeight="bold">{formatF(totalBrut)}</Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>Consigne totale:</Typography>
                <Typography variant="body1" fontWeight="bold" color="warning.main">
                  {formatF(totalConsigne)}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>Manquants:</Typography>
                <Typography variant="body1" fontWeight="bold" color="error.main">
                  {formatF(totalManquants)}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>Compensations:</Typography>
                <Typography variant="body1" fontWeight="bold" color="success.main">
                  {formatF(totalCompensations)}
                </Typography>
              </Box>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 1.5,
              bgcolor: solde > 0 ? 'error.lighter' : solde < 0 ? 'warning.lighter' : 'success.lighter',
              borderRadius: 1,
              border: `1px solid ${solde > 0 ? 'error.main' : solde < 0 ? 'warning.main' : 'success.main'}`
            }}>
              <Box>
                <Typography variant="body2" fontWeight="bold">
                  SOLDE FINAL:
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {solde > 0 
                    ? 'Client doit à la société' 
                    : solde < 0 
                    ? 'Société doit au client' 
                    : 'Parfaitement soldé'}
                </Typography>
              </Box>
              <Typography 
                variant="h6" 
                fontWeight="bold" 
                sx={{ 
                  color: solde > 0 ? 'error.main' : solde < 0 ? 'warning.main' : 'success.main'
                }}
              >
                {solde > 0 ? '+' : ''}{formatF(solde)}
              </Typography>
            </Box>
          </Paper>

          {/* Montant final à encaisser */}
          <Paper variant="outlined" sx={{ 
            mt: 3, 
            p: 2.5, 
            bgcolor: 'primary.lighter', 
            borderColor: 'primary.main',
            borderWidth: 2,
            textAlign: 'center'
          }}>
            <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.9rem', mb: 1, color: 'primary.dark' }}>
              💵 MONTANT TOTAL À ENCAISSER
            </Typography>
            <Typography variant="h4" fontWeight="bold" sx={{ color: 'primary.dark' }}>
              {formatF(montantFinal)}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 1, fontSize: '0.75rem' }}>
              {formatF(totalBrut)} {solde !== 0 && ` + Solde ${solde > 0 ? '+' : ''}${formatF(solde)}`}
            </Typography>
          </Paper>

        </DialogContent>

        <DialogActions sx={{ p: 2, bgcolor: 'grey.50' }}>
          <Button 
            onClick={() => {
              setErreur('');
              setOpen(false);
            }} 
            variant="outlined"
            sx={{ fontSize: '0.85rem' }}
          >
            Annuler
          </Button>
          <Button 
            variant="contained" 
            onClick={handleValiderProbleme}
            disabled={verificationIncoherence.length > 0}
            sx={{ 
              fontSize: '0.85rem',
              fontWeight: 'bold',
              px: 3
            }}
          >
            VALIDER • {formatF(montantFinal).replace(' F', '')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

LivraisonSimple.propTypes = {
  livraison: PropTypes.object.isRequired,
  onValidate: PropTypes.func.isRequired,
  onClose: PropTypes.func,
};

export default LivraisonSimple;
