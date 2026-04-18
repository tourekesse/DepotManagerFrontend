import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Stack, Typography, IconButton,
  Box, Chip, Alert, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel
} from '@mui/material';
import { Close, CameraAlt, Delete, LocalBar, Inventory2 } from '@mui/icons-material';

/**
 * Mini-dialogue pour déclarer une casse à la livraison.
 * 2 modes :
 *   - BOUTEILLES : bouteilles cassées dans un casier (casier vide toujours rendu)
 *   - CASIER_ENTIER : casier entier perdu/cassé (tout est perdu)
 */
const CasseDialog = ({ open, onClose, onAdd, articles }) => {
  const [typeCasse, setTypeCasse] = useState('BOUTEILLES'); // 'BOUTEILLES' | 'CASIER_ENTIER'
  const [produitId, setProduitId] = useState('');
  const [quantite, setQuantite] = useState(1);
  const [commentaire, setCommentaire] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [error, setError] = useState('');

  const handleClose = () => {
    setTypeCasse('BOUTEILLES');
    setProduitId('');
    setQuantite(1);
    setCommentaire('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setError('');
    onClose();
  };

  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleValidate = () => {
    if (!produitId) {
      setError('Sélectionnez un produit/casier');
      return;
    }
    if (quantite <= 0) {
      setError('Quantité invalide');
      return;
    }

    const article = articles.find(a => String(a.produitId) === String(produitId));
    
    // Calcul des impacts selon le type de casse
    let prixUnitaireImpact, consigneImpact, quantiteImpact;

    if (typeCasse === 'BOUTEILLES') {
      // Bouteilles cassées : impact au niveau bouteille, casier vide rendu
      prixUnitaireImpact = article?.prixParBouteille || (article?.prixUnitaire / (article?.nbBouteillesParCasier || 1));
      consigneImpact = article?.consigneBouteille || 0; // Consigne bouteille non rendue
      quantiteImpact = Number(quantite);
    } else {
      // Casier entier : impact au niveau casier, tout est perdu
      prixUnitaireImpact = article?.prixUnitaire || 0;
      consigneImpact = article?.consigneCasier || 0; // Consigne casier non rendue
      quantiteImpact = Number(quantite);
    }

    onAdd({
      produitId: Number(produitId),
      produitNom: article?.nomProduit || 'Produit',
      quantite: quantiteImpact,
      typeCasse, // 'BOUTEILLES' | 'CASIER_ENTIER'
      prixUnitaire: prixUnitaireImpact,
      consigneUnitaire: consigneImpact,
      typeCasierId: article?.typeCasierId || null,
      commentaire,
      photoFile,
      photoPreview
    });

    handleClose();
  };

  const selectedArticle = articles.find(a => String(a.produitId) === String(produitId));

  // Calcul de l'impact financier selon le type
  let impactProduit = 0;
  let impactConsigne = 0;
  let impactTotal = 0;

  if (selectedArticle) {
    if (typeCasse === 'BOUTEILLES') {
      const prixParBouteille = selectedArticle?.prixParBouteille || (selectedArticle?.prixUnitaire / (selectedArticle?.nbBouteillesParCasier || 1));
      const consigneParBouteille = selectedArticle?.consigneBouteille || 0;
      impactProduit = prixParBouteille * quantite;
      impactConsigne = consigneParBouteille * quantite;
    } else {
      impactProduit = (selectedArticle?.prixUnitaire || 0) * quantite;
      impactConsigne = (selectedArticle?.consigneCasier || 0) * quantite;
    }
    impactTotal = impactProduit + impactConsigne;
  }

  // Max quantité selon le type
  const maxQuantite = typeCasse === 'BOUTEILLES'
    ? (selectedArticle?.nbBouteillesParCasier || selectedArticle?.quantite || 24)
    : (selectedArticle?.quantite || 99);

  const labelQuantite = typeCasse === 'BOUTEILLES'
    ? 'Nb bouteilles cassées'
    : 'Nb casiers perdus';

  const maxHint = typeCasse === 'BOUTEILLES'
    ? `Max: ${maxQuantite} bouteilles/casier`
    : `Max: ${maxQuantite} casiers commandés`;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label="🔴 CASSE" color="error" size="small" />
          <Typography variant="h6" sx={{ fontSize: '1rem' }}>Déclarer une casse</Typography>
        </Stack>
        <IconButton size="small" onClick={handleClose}><Close /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={1.5}>

          {/* 🔘 Type de casse */}
          <FormControl>
            <FormLabel sx={{ fontSize: '0.85rem', fontWeight: 600 }}>Type de casse</FormLabel>
            <RadioGroup
              row
              value={typeCasse}
              onChange={(e) => { setTypeCasse(e.target.value); setQuantite(1); setError(''); }}
              sx={{ gap: 1 }}
            >
              <FormControlLabel
                value="BOUTEILLES"
                control={<Radio size="small" />}
                label={
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <LocalBar sx={{ fontSize: 16, color: 'warning.main' }} />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>Bouteilles cassées</Typography>
                  </Stack>
                }
                slotProps={{ typography: { sx: { fontSize: '0.8rem' } } }}
              />
              <FormControlLabel
                value="CASIER_ENTIER"
                control={<Radio size="small" />}
                label={
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Inventory2 sx={{ fontSize: 16, color: 'error.main' }} />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>Casier entier perdu</Typography>
                  </Stack>
                }
                slotProps={{ typography: { sx: { fontSize: '0.8rem' } } }}
              />
            </RadioGroup>
          </FormControl>

          {/* Explication selon le type */}
          {typeCasse === 'BOUTEILLES' ? (
            <Alert severity="info" sx={{ py: 0.5, fontSize: '0.75rem' }} icon={false}>
              Le casier vide est toujours rendu. Seules les bouteilles cassées sont déduites.
            </Alert>
          ) : (
            <Alert severity="error" sx={{ py: 0.5, fontSize: '0.75rem' }} icon={false}>
              Tout le casier est perdu : produit + consignes non rendues.
            </Alert>
          )}

          {/* Produit / Casier concerné */}
          <TextField
            select
            label={typeCasse === 'BOUTEILLES' ? 'Casier concerné' : 'Casier perdu'}
            size="small"
            value={produitId}
            onChange={(e) => { setProduitId(e.target.value); setError(''); }}
            fullWidth
            placeholder="Sélectionnez un casier"
          >
            {articles.map((a) => (
              <MenuItem key={a.produitId} value={a.produitId}>
                {a.nomProduit} (×{a.quantite} casiers)
              </MenuItem>
            ))}
          </TextField>

          {/* Quantité cassée */}
          <TextField
            label={labelQuantite}
            type="number"
            size="small"
            value={quantite}
            onChange={(e) => { setQuantite(Math.max(1, parseInt(e.target.value) || 1)); setError(''); }}
            inputProps={{ min: 1, max: maxQuantite }}
            fullWidth
            helperText={maxHint}
          />

          {/* Photo obligatoire */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
              Photo (obligatoire) 📸
            </Typography>
            <input
              accept="image/*"
              capture="environment"
              type="file"
              onChange={handlePhotoCapture}
              style={{ display: 'none' }}
              id="casse-photo-input"
            />
            <label htmlFor="casse-photo-input">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CameraAlt />}
                size="small"
                fullWidth
                color={photoFile ? 'success' : 'inherit'}
              >
                {photoFile ? '✅ Photo prise' : 'Prendre une photo'}
              </Button>
            </label>
            {photoPreview && (
              <Box sx={{ mt: 0.5, position: 'relative' }}>
                <img src={photoPreview} alt="Preuve casse" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 8 }} />
                <IconButton
                  size="small"
                  sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.6)', color: 'white' }}
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                >
                  <Delete sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            )}
            {!photoFile && (
              <Typography variant="caption" color="warning.main">⚠️ Photo obligatoire pour valider</Typography>
            )}
          </Box>

          {/* Commentaire */}
          <TextField
            label="Commentaire (optionnel)"
            size="small"
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            multiline
            rows={2}
            fullWidth
            placeholder="Ex: tombé pendant le déchargement..."
          />

          {/* Impact financier */}
          {impactProduit > 0 && (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              <Typography variant="caption">
                💰 Impact : <strong>-{impactProduit.toLocaleString('fr-FR')} F</strong> (produit)
                {impactConsigne > 0 && <>, <strong>-{impactConsigne.toLocaleString('fr-FR')} F</strong> ({typeCasse === 'BOUTEILLES' ? 'consigne bouteille' : 'consigne casier'})</>}
                <br />
                <strong>Total : -{impactTotal.toLocaleString('fr-FR')} F</strong>
              </Typography>
            </Alert>
          )}

          {error && <Alert severity="error" sx={{ py: 0.5 }}>{error}</Alert>}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 1.5 }}>
        <Button onClick={handleClose} size="small">Annuler</Button>
        <Button
          onClick={handleValidate}
          variant="contained"
          color="error"
          size="small"
          disabled={!photoFile}
        >
          ✅ Enregistrer la casse
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CasseDialog;
