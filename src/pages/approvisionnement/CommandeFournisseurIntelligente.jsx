import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, CardContent, Typography, Button, Alert, Stack, Box,
  Snackbar, IconButton, ToggleButtonGroup, ToggleButton,
  TextField, MenuItem, Skeleton, Collapse
} from '@mui/material';
import { Add, Remove, Save, Print, WhatsApp, Close } from '@mui/icons-material';
import { privateApi } from '../../api/axios';
import useActivePointDeVenteId from '../../hooks/useActivePointDeVenteId';
import { formatCurrency } from '../../utils/currencyUtils';

const formatF = (n) => formatCurrency(Math.round(n) || 0);

const ProductRow = ({ item, index, mode, onUpdateQty }) => {
  const isManuel = mode === 'manuel';
  const hasDette = !isManuel && (item.quantiteDette || 0) > 0;
  const cashQte = item.quantiteSuggeree - (item.quantiteDette || 0);
  const montant = item.prixUnitaire * item.quantiteSuggeree;

  return (
    <Box
      sx={{
        border: isManuel ? '1px solid #90caf9' : '1px solid #e0e0e0',
        borderLeft: isManuel ? '4px solid #1976d2' : '1px solid #e0e0e0',
        borderRadius: 2,
        p: { xs: 1.5, sm: 2.5 },
        mb: 1.5,
        backgroundColor: hasDette ? '#e8f5e9' : isManuel ? '#fafbff' : 'white'
      }}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
        <Typography variant="subtitle2" fontWeight="medium" sx={{
          width: { xs: '100%', sm: 'auto' },
          flex: { sm: 1 },
          fontSize: { xs: '15px', sm: '14px' },
          lineHeight: 1.2,
          mb: { xs: 0.3, sm: 0 }
        }}>
          {item.typeCasierNom || item.nomProduit}
        </Typography>

        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flex: { xs: 1, sm: 'none' } }}>
          <IconButton
            onClick={() => onUpdateQty(index, item.quantiteSuggeree - 1)}
            disabled={item.quantiteSuggeree <= 0}
            sx={{ width: 44, height: 44 }}
          >
            <Remove />
          </IconButton>
          <Typography sx={{ minWidth: 36, textAlign: 'center', fontSize: { xs: '18px', sm: '16px' }, fontWeight: 700 }}>
            {item.quantiteSuggeree}
          </Typography>
          <IconButton
            onClick={() => onUpdateQty(index, item.quantiteSuggeree + 1)}
            sx={{ width: 44, height: 44 }}
          >
            <Add />
          </IconButton>
        </Stack>

        <Typography variant="subtitle2" fontWeight="bold" sx={{
          minWidth: 85,
          textAlign: { xs: 'right', sm: 'right' },
          fontSize: { xs: '15px', sm: '14px' }
        }}>
          {formatF(montant)}
        </Typography>
      </Box>

      {!isManuel && (
        <Box mt={1.2} pt={1} sx={{
          borderTop: '1px dashed #e0e0e0',
          display: 'flex', flexWrap: 'wrap', gap: { xs: 0.5, sm: 1 }
        }}>
          {hasDette && (
            <Box sx={{
              flex: { xs: '1 1 calc(50% - 4px)', sm: 1 },
              minWidth: { xs: 0, sm: 0 },
              backgroundColor: '#e8f5e9', borderRadius: 1, p: 0.6
            }}>
              <Typography sx={{ fontSize: { xs: '11px', sm: '12px' }, color: '#2e7d32', fontWeight: 600 }}>
                ✅ {item.quantiteDette} cas. dettes
              </Typography>
              <Typography sx={{ fontSize: { xs: '11px', sm: '12px' }, color: '#2e7d32', fontWeight: 700 }}>
                {formatF(item.prixUnitaire * item.quantiteDette)}
              </Typography>
            </Box>
          )}

          <Box sx={{
            flex: { xs: '1 1 calc(50% - 4px)', sm: 1 },
            minWidth: { xs: 0, sm: 0 },
            backgroundColor: '#fff3e0', borderRadius: 1, p: 0.6
          }}>
            <Typography sx={{ fontSize: { xs: '11px', sm: '12px' }, color: '#e65100', fontWeight: 600 }}>
              💵 {Math.max(0, cashQte)} cas. cash
            </Typography>
            <Typography sx={{ fontSize: { xs: '11px', sm: '12px' }, color: '#e65100', fontWeight: 700 }}>
              {formatF(item.prixUnitaire * Math.max(0, cashQte))}
            </Typography>
          </Box>

          {item.margeTotale > 0 && (
            <Box sx={{
              flex: { xs: '1 1 100%', sm: 1 },
              backgroundColor: '#e3f2fd', borderRadius: 1, p: 0.6
            }}>
              <Typography sx={{ fontSize: { xs: '11px', sm: '12px' }, color: '#1565c0', fontWeight: 600 }}>
                📈 Marge
              </Typography>
              <Typography sx={{ fontSize: { xs: '11px', sm: '12px' }, color: '#1565c0', fontWeight: 700 }}>
                {formatF(item.margeTotale)}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {isManuel && (
        <Box mt={0.8} pt={0.8} sx={{ borderTop: '1px dashed #e0e0e0' }}>
          <Typography variant="caption" color="text.secondary">
            Prix unitaire: {formatF(item.prixUnitaire)}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

const CommandeFournisseurIntelligente = () => {
  const pointDeVenteId = useActivePointDeVenteId();

  const [mode, setMode] = useState('auto');

  const [data, setData] = useState(null);
  const [propositions, setPropositions] = useState([]);
  const [originalPropositions, setOriginalPropositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [infoDettes, setInfoDettes] = useState(null);

  const [fournisseurs, setFournisseurs] = useState([]);
  const [selectedFournisseurId, setSelectedFournisseurId] = useState('');
  const [produits, setProduits] = useState([]);
  const [loadingFournisseurs, setLoadingFournisseurs] = useState(false);
  const [loadingProduits, setLoadingProduits] = useState(false);
  const [produitFilter, setProduitFilter] = useState('');

  const [saving, setSaving] = useState(false);
  const [bonCommandeId, setBonCommandeId] = useState(null);
  const [bonCommandeNumero, setBonCommandeNumero] = useState(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [showAutoInfo, setShowAutoInfo] = useState(true);
  const [showManualInfo, setShowManualInfo] = useState(true);

  const fetchInfoDettes = useCallback(async () => {
    if (!pointDeVenteId) return;
    try {
      const response = await privateApi.get('/api/reapprovisionnement/info-dettes-mois', {
        headers: { 'X-PV-ID': pointDeVenteId }
      });
      setInfoDettes(response.data);
    } catch (err) {
      console.warn('Impossible de charger les infos dettes');
    }
  }, [pointDeVenteId]);

  const fetchPropositions = useCallback(async () => {
    if (!pointDeVenteId) {
      setError('Point de vente non identifié');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await privateApi.get('/api/reapprovisionnement/intelligent', {
        headers: { 'X-PV-ID': pointDeVenteId }
      });

      const props = response.data.propositions || [];
      setData(response.data);
      setOriginalPropositions(JSON.parse(JSON.stringify(props)));
      setPropositions(props);
      setBonCommandeId(null);
      setError(null);

    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Erreur de chargement';

      if (errorMsg.includes('Aucune caisse ouverte')) {
        setData({ caisseOuverte: false, caisseDisponible: 0, budgetEstime: 0 });
        if (err.response?.data?.propositions) {
          setPropositions(err.response.data.propositions);
        }
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  }, [pointDeVenteId]);

  const fetchFournisseurs = useCallback(async () => {
    if (!pointDeVenteId) return;
    setLoadingFournisseurs(true);
    try {
      const res = await privateApi.get('/api/fournisseurs/actifs');
      setFournisseurs(res.data || []);
    } catch (err) {
      console.warn('Impossible de charger les fournisseurs');
    } finally {
      setLoadingFournisseurs(false);
    }
  }, [pointDeVenteId]);

  const fetchProduits = useCallback(async () => {
    if (!pointDeVenteId) return;
    setLoadingProduits(true);
    try {
      const res = await privateApi.get('/api/produits');
      const list = res.data || [];
      setProduits(list);
      setPropositions(list.map(p => ({
        typeCasierId: p.typeCasierId || p.id_type_casier || p.id,
        typeCasierNom: p.nomProduit || p.designation,
        nomProduit: p.nomProduit || p.designation,
        quantiteSuggeree: 0,
        prixUnitaire: parseFloat(p.prixAchatHt) || 0,
        montant: 0,
        quantiteDette: 0,
        margeTotale: 0,
      })));
    } catch (err) {
      console.error('Erreur chargement produits:', err);
    } finally {
      setLoadingProduits(false);
    }
  }, [pointDeVenteId]);

  useEffect(() => {
    setMode('auto');
    setSelectedFournisseurId('');
    setProduits([]);
    setProduitFilter('');
    fetchPropositions();
    fetchInfoDettes();
  }, [pointDeVenteId, fetchPropositions, fetchInfoDettes]);

  const handleModeChange = (newMode) => {
    if (!newMode || newMode === mode) return;
    setBonCommandeId(null);
    setBonCommandeNumero(null);
    setShowAutoInfo(true);
    setShowManualInfo(true);
    if (newMode === 'manuel') {
      fetchFournisseurs();
      if (produits.length === 0) {
        fetchProduits();
      } else {
        setPropositions(produits.map(p => ({
          typeCasierId: p.typeCasierId || p.id_type_casier || p.id,
          typeCasierNom: p.nomProduit || p.designation,
          nomProduit: p.nomProduit || p.designation,
          quantiteSuggeree: 0,
          prixUnitaire: parseFloat(p.prixAchatHt) || 0,
          montant: 0,
          quantiteDette: 0,
          margeTotale: 0,
        })));
      }
    } else {
      if (originalPropositions.length > 0) {
        setPropositions(JSON.parse(JSON.stringify(originalPropositions)));
      }
    }
    setMode(newMode);
  };

  const updateQuantity = (index, newQty) => {
    if (newQty < 0) return;
    setPropositions(prev => {
      const updated = [...prev];
      const item = { ...updated[index] };
      item.quantiteSuggeree = newQty;
      item.montant = item.prixUnitaire * newQty;
      updated[index] = item;
      return updated;
    });
  };

  const totalActuel = propositions.reduce((sum, item) => sum + (item.montant || 0), 0);
  const budgetDisponible = data?.caisseDisponible || data?.budgetEstime || 0;
  const depassement = totalActuel > budgetDisponible;

  const totalDette = propositions.reduce((sum, item) => {
    return sum + ((item.prixUnitaire || 0) * (item.quantiteDette || 0));
  }, 0);
  const totalComptant = totalActuel - totalDette;

  const totalMarge = propositions.reduce((sum, item) => sum + (item.margeTotale || 0), 0);

  const hasAny = propositions.some(p => p.quantiteSuggeree > 0);
  const canSubmit = hasAny && !(mode === 'manuel' && !selectedFournisseurId);

  const handleValider = async () => {
    if (mode === 'manuel' && !selectedFournisseurId) {
      alert('Veuillez sélectionner un fournisseur destinataire');
      return;
    }
    if (depassement) {
      if (!window.confirm('Le total dépasse le budget disponible. Voulez-vous continuer ?')) {
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        lignes: propositions
          .filter(p => p.quantiteSuggeree > 0)
          .map(p => ({
            typeCasierId: p.typeCasierId,
            quantiteCommandee: p.quantiteSuggeree,
            prixUnitaire: p.prixUnitaire
          }))
      };
      if (mode === 'manuel') {
        payload.fournisseurId = parseInt(selectedFournisseurId);
      }
      const response = await privateApi.post('/api/reapprovisionnement/valider', payload, {
        headers: { 'X-PV-ID': pointDeVenteId }
      });

      if (response.data?.bonCommandeId) {
        setBonCommandeId(response.data.bonCommandeId);
        setBonCommandeNumero(response.data.numeroBon);
        setOpenSnackbar(true);
      }
      if (mode === 'auto') {
        fetchPropositions();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la validation');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    if (bonCommandeId) {
      window.open(`/api/reapprovisionnement/bon-commande/${bonCommandeId}/pdf`, '_blank');
    }
  };

  const handleWhatsApp = () => {
    if (!bonCommandeId) return;
    privateApi.get(`/api/reapprovisionnement/bon-commande/${bonCommandeId}/format-whatsapp`)
      .then(response => {
        const text = response.data?.text || `Bon de commande n° ${bonCommandeNumero}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      })
      .catch(() => {
        window.open(`https://wa.me/?text=${encodeURIComponent(`Bon de commande ${bonCommandeNumero}`)}`, '_blank');
      });
  };

  const filteredPropositions = mode === 'manuel' && produitFilter
    ? propositions.filter(p =>
        (p.typeCasierNom || '').toLowerCase().includes(produitFilter.toLowerCase())
      )
    : propositions;

  if (loading && mode === 'auto') return (
    <Box sx={{ p: 2 }}>
      <Skeleton variant="rounded" height={40} sx={{ mb: 2 }} />
      <Skeleton variant="rounded" height={80} sx={{ mb: 2 }} />
      {[1,2,3].map(i => (
        <Skeleton key={i} variant="rounded" height={100} sx={{ mb: 1.5 }} />
      ))}
      <Skeleton variant="rounded" height={48} sx={{ mb: 1 }} />
    </Box>
  );
  if (error && mode === 'auto') return <Alert severity="error">{error}</Alert>;

  return (
    <Card>
      <CardContent>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(e, newMode) => handleModeChange(newMode)}
          fullWidth
          size="small"
          sx={{ mb: 2 }}
        >
          <ToggleButton value="auto">Automatique</ToggleButton>
          <ToggleButton value="manuel">Manuel</ToggleButton>
        </ToggleButtonGroup>

        <Collapse in={mode === 'auto' && showAutoInfo}>
          <Box sx={{ mb: 2, p: 1.5, backgroundColor: '#e8f5e9', borderRadius: 1, border: '1px solid #a5d6a7' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" fontWeight="bold" color="#2e7d32" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                🤖 Mode Automatique
              </Typography>
              <IconButton size="small" onClick={() => setShowAutoInfo(false)} sx={{ width: 32, height: 32 }}>
                <Close fontSize="small" />
              </IconButton>
            </Box>
            <Typography variant="caption" color="#558b2f">
              Suggestions basées sur les dettes clients encaissées ce mois-ci
            </Typography>
          </Box>
        </Collapse>

        <Collapse in={mode === 'manuel' && showManualInfo}>
          <Box sx={{ mb: 2, p: 1.5, backgroundColor: '#e3f2fd', borderRadius: 1, border: '1px solid #90caf9' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" fontWeight="bold" color="#1565c0" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                ✏️ Mode Manuel
              </Typography>
              <IconButton size="small" onClick={() => setShowManualInfo(false)} sx={{ width: 32, height: 32 }}>
                <Close fontSize="small" />
              </IconButton>
            </Box>
            <Typography variant="caption" color="#1976d2">
              Vous composez librement la commande
            </Typography>
          </Box>
        </Collapse>

        {mode === 'manuel' && (
          <Box sx={{ mb: 2, p: 2, border: '2px solid #1976d2', borderRadius: 2, backgroundColor: '#e3f2fd' }}>
            <Typography variant="subtitle2" color="primary" fontWeight="bold" gutterBottom>
              FOURNISSEUR DESTINATAIRE *
            </Typography>
            {loadingFournisseurs ? (
              <Typography variant="body2">Chargement...</Typography>
            ) : (
              <TextField
                select
                fullWidth
                value={selectedFournisseurId}
                onChange={(e) => setSelectedFournisseurId(e.target.value)}
                size="small"
              >
                <MenuItem value="">-- Sélectionnez un fournisseur --</MenuItem>
                {fournisseurs.map(f => (
                  <MenuItem key={f.id} value={f.id}>
                    {f.raisonsociale}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Box>
        )}

        {mode === 'manuel' && (
          <TextField
            fullWidth
            size="small"
            placeholder="🔍 Rechercher un produit..."
            value={produitFilter}
            onChange={(e) => setProduitFilter(e.target.value)}
            sx={{ mb: 2 }}
          />
        )}

        {mode === 'manuel' && loadingProduits && (
          <Box sx={{ mb: 2 }}>
            {[1,2,3].map(i => (
              <Skeleton key={i} variant="rounded" height={80} sx={{ mb: 1.5 }} />
            ))}
          </Box>
        )}

        <Box sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 2, backgroundColor: '#fafafa' }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            FONDS DISPONIBLES
          </Typography>

          <Typography variant="h5" fontWeight="bold" color="success.main">
            {formatF(budgetDisponible)}
          </Typography>

          {mode === 'auto' && infoDettes?.montantDettesLiquideEnAttente > 0 && (
            <Typography variant="body2" color="error.dark" sx={{ mt: 0.5, fontWeight: 600 }}>
              ⚠ Dettes liquides impayées: {formatF(infoDettes.montantDettesLiquideEnAttente)}
            </Typography>
          )}

          {mode === 'auto' && infoDettes?.montantDettesEmballageEnAttente > 0 && (
            <Typography variant="body2" color="warning.dark" sx={{ mt: 0.5, fontWeight: 600 }}>
              ⚠ Dettes emballages en attente: {formatF(infoDettes.montantDettesEmballageEnAttente)}
            </Typography>
          )}

          {mode === 'auto' && infoDettes?.montantTotalDettes > 0 && (
            <Typography variant="body2" color="success.dark" sx={{ mt: 0.5 }}>
              Dont {formatF(infoDettes.montantTotalDettes)} déjà réglés par vos clients ce mois
            </Typography>
          )}
        </Box>

        {depassement && (
          <Alert severity="warning" sx={{ mb: 2, py: 1 }}>
            Attention : le total dépasse le budget de {formatF(totalActuel - budgetDisponible)}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          {mode === 'auto' && propositions.length === 0 && (
            <Box textAlign="center" py={5}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Aucune suggestion pour le moment
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Le système n'a détecté aucun besoin de réapprovisionnement
                basé sur vos ventes et dettes payées.
              </Typography>
            </Box>
          )}

          {filteredPropositions.map((item) => {
            const idx = propositions.indexOf(item);
            return (
              <ProductRow
                key={idx}
                item={item}
                index={idx}
                mode={mode}
                onUpdateQty={updateQuantity}
              />
            );
          })}
        </Box>

        {mode === 'auto' && (
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                if (originalPropositions.length > 0) {
                  setPropositions(JSON.parse(JSON.stringify(originalPropositions)));
                }
              }}
            >
              Réinitialiser aux suggestions intelligentes
            </Button>
          </Box>
        )}

        {mode === 'auto' && totalDette > 0 && (
          <Box sx={{ mb: 1.5, p: 1, backgroundColor: '#fafafa', borderRadius: 1, border: '1px solid #e0e0e0' }}>
            <Typography sx={{ fontSize: '13px', textAlign: 'center', fontWeight: 600 }}>
              ✅ {formatF(totalDette)} dettes &nbsp;&nbsp;·&nbsp;&nbsp; 💵 {formatF(totalComptant)} cash
            </Typography>
          </Box>
        )}

        {mode === 'auto' && totalMarge > 0 && (
          <Box sx={{ mb: 1.5, p: 1, backgroundColor: '#e3f2fd', borderRadius: 1, border: '1px solid #1565c0' }}>
            <Typography sx={{ fontSize: '13px', textAlign: 'center', fontWeight: 600, color: '#1565c0' }}>
              📈 Marge estimée: {formatF(totalMarge)}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, px: 1, py: 1, borderTop: '1px solid #e0e0e0' }}>
          <Typography variant="h6" sx={{ fontSize: '17px' }}>Total commande</Typography>
          <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '18px' }}>
            {formatF(totalActuel)}
          </Typography>
        </Box>

        {mode === 'auto' && (infoDettes?.montantDettesLiquideEnAttente > 0 || infoDettes?.montantDettesEmballageEnAttente > 0) && (
          <Alert severity="warning" sx={{ mb: 2, py: 1 }}>
            <Typography variant="body2" fontWeight="medium">
              Attention : Vous avez {(infoDettes?.montantDettesLiquideEnAttente > 0 ? formatF(infoDettes.montantDettesLiquideEnAttente) : "0")} de dettes liquides impayées{(infoDettes?.montantDettesEmballageEnAttente > 0 ? ` et ${formatF(infoDettes.montantDettesEmballageEnAttente)} d'emballages non rendus` : "")}. Cette commande est basée sur vos besoins réels, mais pensez au recouvrement.
            </Typography>
          </Alert>
        )}

        <Button
          fullWidth
          variant="contained"
          size="large"
          startIcon={<Save />}
          onClick={handleValider}
          disabled={saving || !canSubmit}
          sx={{ py: 1.5, mb: 2 }}
        >
          {saving ? 'Création en cours...' : 'Valider et Créer le Bon de Commande'}
        </Button>

        {bonCommandeId && (
          <Box sx={{ mt: 3, p: 2, border: '1px dashed #4caf50', borderRadius: 2, backgroundColor: '#f1f8e9' }}>
            <Typography variant="subtitle2" color="success.main" gutterBottom align="center">
              ✓ Bon de commande créé avec succès
            </Typography>

            <Stack spacing={1.5} mt={1}>
              <Button
                fullWidth
                variant="contained"
                color="success"
                startIcon={<WhatsApp />}
                onClick={handleWhatsApp}
                size="large"
              >
                Envoyer au fournisseur par WhatsApp
              </Button>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<Print />}
                onClick={handlePrint}
                size="large"
              >
                Télécharger le PDF
              </Button>
            </Stack>
          </Box>
        )}
      </CardContent>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={4000}
        onClose={() => setOpenSnackbar(false)}
        message={`Bon de commande ${bonCommandeNumero} créé avec succès`}
      />
    </Card>
  );
};

export default CommandeFournisseurIntelligente;
