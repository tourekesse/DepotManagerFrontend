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
  Checkbox
} from '@mui/material';
import { Delete, Add, CheckCircle, Warning } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { privateApi } from '../api/axios';
import PanierLivraison from './PanierLivraison';
import { getActivePointDeVenteId } from '../utils/pdv';

// Helper: format number with thousands separators + ' F'
const formatF = (n) => `${Number(n || 0).toLocaleString('fr-FR')} F`;

// ============================================
// COMPOSANT LIGNE ITEM (réutilisable)
// ============================================
const ItemRow = ({ label, value, onDelete }) => (
  <Box sx={{ 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    bgcolor: 'grey.50',
    p: 0.5,
    mb: 0.5,
    borderRadius: 0.5
  }}>
    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
      {label}
    </Typography>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>
        {value}
      </Typography>
      <IconButton size="small" onClick={onDelete}>
        <Delete sx={{ fontSize: '0.8rem' }} />
      </IconButton>
    </Box>
  </Box>
);

ItemRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onDelete: PropTypes.func.isRequired,
};

// ============================================
// COMPOSANT AJOUT RAPIDE
// ============================================
const AjoutRapide = ({ options, onAdd, label }) => {
  const [selected, setSelected] = useState('');
  const [qte, setQte] = useState(1);

  return (
    <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
      <Select
        size="small"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        sx={{ flex: 1, fontSize: '0.8rem' }}
        displayEmpty
      >
        <MenuItem value="" sx={{ fontSize: '0.8rem' }}>
          {label}
        </MenuItem>
        {options.map(opt => (
          <MenuItem key={opt.id} value={opt.id} sx={{ fontSize: '0.8rem' }}>
            {opt.nom}
          </MenuItem>
        ))}
      </Select>
      
      <TextField
        size="small"
        type="number"
        value={qte}
        onChange={(e) => setQte(Math.max(1, parseInt(e.target.value, 10) || 1))}
        sx={{ width: 60, '& .MuiInputBase-input': { fontSize: '0.8rem' } }}
      />
      
      <Button
        variant="contained"
        size="small"
        onClick={() => {
          onAdd(selected, qte);
          setSelected('');
          setQte(1);
        }}
        sx={{ minWidth: 40 }}
      >
        <Add sx={{ fontSize: '0.9rem' }} />
      </Button>
    </Box>
  );
};

AjoutRapide.propTypes = {
  options: PropTypes.array.isRequired,
  onAdd: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================
const LivraisonSimple = ({ livraison, onValidate, onClose }) => {
  const [open, setOpen] = useState(false);
  const [manquants, setManquants] = useState([]);
  const [compensations, setCompensations] = useState([]);
  const [typeCasiers, setTypeCasiers] = useState([]);
  const [compType, setCompType] = useState('CASIER');
  const [montantEspeces, setMontantEspeces] = useState(0);
  const [clientARetourneTousCasiers, setClientARetourneTousCasiers] = useState(true);

  // Charger les types de casiers consignables pour le PV actif
  useEffect(() => {
    const pvId = getActivePointDeVenteId();
    if (!pvId) return;
    privateApi
      .get(`/api/type-casiers/point-de-vente/${pvId}/consignables`)
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : [];
        setTypeCasiers(data.map(tc => ({
          id: String(tc.id),
          nom: tc.nomDisplay,
          consigne: Number(tc.consigneTotaleParCasier || tc.prixConsigneCasier || 0)
        })));
      })
      .catch(() => setTypeCasiers([]));
  }, []);

  // Données produits depuis la vente réelle
  const articles = useMemo(() => livraison.details || livraison.articles || [], [livraison]);
  const produits = useMemo(() => (
    (articles || []).map(a => ({
      id: String(a.produitId || a.id),
      nom: a.nomProduit || a.designation || 'Produit',
      consigne: Number(a.consigneCasier || 0)
    }))
  ), [articles]);

  // Calculs
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

  // Actions
  const ajouterManquant = (produitId, qte) => {
    if (!produitId) return;
    const produit = produits.find(p => p.id === String(produitId));
    if (!produit) return;
    setManquants(prev => [...prev, { ...produit, qte: Number(qte) }]);
  };

  const ajouterCompensation = (typeId, qte) => {
    if (compType === 'ESPECES') return;
    if (!typeId) return;
    const type = typeCasiers.find(t => String(t.id) === String(typeId));
    if (!type) return;
    setCompensations(prev => [...prev, { type: 'CASIER', ...type, qte: Number(qte) }]);
  };

  const ajouterCompensationEspeces = () => {
    const value = Number(montantEspeces || 0);
    if (value <= 0) return;
    setCompensations(prev => [...prev, { type: 'ESPECES', value }]);
    setMontantEspeces(0);
  };

  // =================================================================
  // 1. ACTION : TOUT EST OK
  // =================================================================
  const handleToutOk = async () => {
    try {
      const montantTotal = Number(livraison.montantTotal || livraison.totalGeneral || 0);
      const montantEmballageTotal = Number(livraison.montantEmballageTotal || 0);
      
      let montantPaye;
      let casiersRendus;
      const prixUnitaireEmballage = articles.find(a => a.prixUnitaireEmballage > 0)?.prixUnitaireEmballage || 0;
      
      if (clientARetourneTousCasiers) {
        // Le client rend ses consignes : ne paie que le liquide
        montantPaye = montantTotal - montantEmballageTotal;
        casiersRendus = prixUnitaireEmballage > 0 
          ? Math.round(montantEmballageTotal / prixUnitaireEmballage)
          : 0;
      } else {
        // Le client ne rend pas ses consignes : paie la totalité
        montantPaye = montantTotal;
        casiersRendus = 0;
      }
      
      await onValidate({
        id: livraison.id,
        typeVente: "VENTE_COMPTANT",
        montant: montantPaye,
        casiersRendus: casiersRendus,
        bouteillesRendus: 0
      });
    } catch (error) {
      console.error('Erreur lors de la validation:', error);
      alert('Erreur lors de la validation de la livraison');
    }
  };

  // =================================================================
  // 2. ACTION : BOUTON PROBLÈME (Saisie manuelle des vides)
  // =================================================================
  const handleValiderProbleme = async () => {
    // CORRECTION : Utilisation de c.qte au lieu de c.quantite pour éviter le bug du NaN
    const totalCasiersRendus = compensations
      .filter(c => c.type === 'CASIER')
      .reduce((sum, c) => sum + Number(c.qte || 0), 0);

    const totalBouteillesRendues = compensations
      .filter(c => c.type === 'BOUTEILLE')
      .reduce((sum, c) => sum + Number(c.qte || 0), 0);

    const montantTotalCommande = Number(livraison.montantTotal || livraison.totalGeneral || 0);

    await onValidate({
      id: livraison.id,
      typeVente: "VENTE_COMPTANT",
      montant: montantTotalCommande + solde, // Solde calculé (Manquants - Rendus)
      casiersRendus: totalCasiersRendus,
      bouteillesRendus: totalBouteillesRendues
    });
    
    setOpen(false);
  };

  // =================================================================
  // 3. ACTION : VALIDER EN DETTE CLIENT
  // =================================================================
  const handleValiderDetteClient = async () => {
    try {
      const montantTotal = Number(livraison.montantTotal || livraison.totalGeneral || 0);
      
      await onValidate({
        id: livraison.id,
        typeVente: "VENTE_CREDIT", // Indique au backend d'activer le compte crédit
        montant: montantTotal,
        casiersRendus: 0,
        bouteillesRendus: 0
      });
      
    } catch (error) {
      console.error('Erreur lors de la validation en dette client:', error);
      alert('Erreur lors de la validation en dette client');
    }
  };

  return (
    <Box sx={{ p: 1, maxWidth: 400, mx: 'auto' }}>
      
      {/* En-tête */}
      <Typography variant="h6" align="center" gutterBottom sx={{ fontSize: '1rem' }}>
        🚚 {livraison.nomClient || livraison.clientNom || 'Client'}
      </Typography>

      {/* Panier Livraison */}
      <PanierLivraison livraison={livraison} />

      {/* Case à cocher pour les casiers */}
      <Box sx={{ mb: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={clientARetourneTousCasiers}
              onChange={(e) => setClientARetourneTousCasiers(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
              Le client a retourné tous ses casiers
            </Typography>
          }
        />
        <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.75rem', ml: 4 }}>
          {clientARetourneTousCasiers 
            ? "✓ La consigne sera retirée de la facture (paiement des liquides uniquement)" 
            : "✗ Le client paie le montant total (consigne incluse)"}
        </Typography>
      </Box>

      {/* Boutons principaux */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
        <Button
          fullWidth
          variant="contained"
          color="success"
          startIcon={<CheckCircle />}
          onClick={handleToutOk}
          sx={{ py: 1, fontSize: '0.8rem' }}
        >
          TOUT EST OK
        </Button>
        
        <Button
          fullWidth
          variant="contained"
          color="warning"
          startIcon={<Warning />}
          onClick={() => setOpen(true)}
          sx={{ py: 1, fontSize: '0.8rem' }}
        >
          PROBLÈME
        </Button>
        
        <Button
          fullWidth
          variant="contained"
          color="error"
          onClick={handleValiderDetteClient}
          sx={{ py: 1, fontSize: '0.8rem' }}
        >
          VALIDER EN DETTE CLIENT
        </Button>
      </Box>

      {/* Dialog saisie vide rendu */}
      <Dialog 
        open={open} 
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogContent sx={{ p: 1.5 }}>
          
          {/* Titre */}
          <Typography variant="subtitle1" align="center" gutterBottom sx={{ fontSize: '0.9rem' }}>
            ♻️ Saisir vide rendu
          </Typography>

          {/* Section Manquants */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold" gutterBottom sx={{ fontSize: '0.8rem' }}>
              ❌ Manquants
            </Typography>
            
            <AjoutRapide
              options={produits}
              onAdd={ajouterManquant}
              label="-- Produit --"
            />
            
            <Box sx={{ maxHeight: 100, overflow: 'auto' }}>
              {manquants.map((m, idx) => (
                <ItemRow
                  key={idx}
                  label={`${m.nom} × ${m.qte}`}
                  value={formatF(Number(m.consigne) * Number(m.qte))}
                  onDelete={() => setManquants(manquants.filter((_, i) => i !== idx))}
                />
              ))}
            </Box>
          </Box>

          {/* Section Vides rendus */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold" gutterBottom sx={{ fontSize: '0.8rem' }}>
              💰 Vides rendus
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
              <Select
                size="small"
                value={compType}
                onChange={(e) => setCompType(e.target.value)}
                sx={{ width: 160, fontSize: '0.8rem' }}
              >
                <MenuItem value="CASIER" sx={{ fontSize: '0.8rem' }}>Casier</MenuItem>
                <MenuItem value="ESPECES" sx={{ fontSize: '0.8rem' }}>Espèces</MenuItem>
              </Select>
              {compType === 'CASIER' ? (
                <AjoutRapide
                  options={typeCasiers}
                  onAdd={ajouterCompensation}
                  label="-- Type de casier --"
                />
              ) : (
                <>
                  <TextField
                    size="small"
                    type="number"
                    value={montantEspeces}
                    onChange={(e) => setMontantEspeces(Math.max(1, parseInt(e.target.value, 10) || 0))}
                    sx={{ width: 120, '& .MuiInputBase-input': { fontSize: '0.8rem' } }}
                    placeholder="Montant"
                  />
                  <Button
                    variant="contained"
                    size="small"
                    onClick={ajouterCompensationEspeces}
                    sx={{ minWidth: 40 }}
                  >
                    <Add sx={{ fontSize: '0.9rem' }} />
                  </Button>
                </>
              )}
            </Box>
            
            <Box sx={{ maxHeight: 100, overflow: 'auto' }}>
              {compensations.map((c, idx) => (
                <ItemRow
                  key={idx}
                  label={c.type === 'ESPECES' ? `Espèces` : `${c.nom} × ${c.qte}`}
                  value={c.type === 'ESPECES' ? formatF(Number(c.value)) : formatF(Number(c.consigne) * Number(c.qte))}
                  onDelete={() => setCompensations(compensations.filter((_, i) => i !== idx))}
                />
              ))}
            </Box>
          </Box>

          {/* Totaux */}
          <Paper variant="outlined" sx={{ p: 1.5, mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Manquants:</Typography>
              <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.8rem' }}>
                {formatF(totalManquants)}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Vide rendu:</Typography>
              <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.8rem' }}>
                {formatF(totalCompensations)}
              </Typography>
            </Box>
            
            <Divider sx={{ my: 0.5 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.9rem' }}>SOLDE:</Typography>
              <Typography 
                variant="body2" 
                fontWeight="bold" 
                sx={{ 
                  fontSize: '0.9rem',
                  color: solde > 0 ? 'error.main' : solde < 0 ? 'warning.main' : 'success.main'
                }}
              >
                {formatF(solde)}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}>
              {solde > 0 ? 'Le client doit à la société' : solde < 0 ? 'La société doit au client' : 'Soldé'}
            </Typography>
          </Paper>

        </DialogContent>

        <DialogActions sx={{ p: 1 }}>
          <Button 
            onClick={() => setOpen(false)} 
            size="small"
            sx={{ fontSize: '0.8rem' }}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={handleValiderProbleme}
            size="small"
            sx={{ fontSize: '0.8rem' }}
          >
            Envoyer code de confirmation
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