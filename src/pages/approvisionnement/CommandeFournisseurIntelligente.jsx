import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, Typography, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Alert, Stack, Box,
  Snackbar, IconButton
} from '@mui/material';
import { Add, Remove, Save, Refresh, Print, WhatsApp, NavigateNext } from '@mui/icons-material';
import { privateApi } from '../../api/axios';
import useActivePointDeVenteId from '../../hooks/useActivePointDeVenteId';
import { useNavigate } from 'react-router-dom';

const formatF = (n) => (n || 0).toLocaleString() + ' FCFA';

const CommandeFournisseurIntelligente = () => {
  const pointDeVenteId = useActivePointDeVenteId();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [propositions, setPropositions] = useState([]);
  const [originalPropositions, setOriginalPropositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [bonCommandeId, setBonCommandeId] = useState(null);
  const [bonCommandeNumero, setBonCommandeNumero] = useState(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [infoDettes, setInfoDettes] = useState(null);

  // === NOUVEAU : Sélection du fournisseur (le bon de commande lui est destiné) ===
  const [fournisseurs, setFournisseurs] = useState([]);
  const [selectedFournisseurId, setSelectedFournisseurId] = useState(null);
  const [loadingFournisseurs, setLoadingFournisseurs] = useState(true);

  const fetchInfoDettes = async () => {
    if (!pointDeVenteId) return;
    try {
      const response = await privateApi.get('/api/reapprovisionnement/info-dettes-mois', {
        headers: { 'X-PV-ID': pointDeVenteId }
      });
      setInfoDettes(response.data);
    } catch (err) {
      console.warn('Impossible de charger les infos dettes');
    }
  };

  const fetchFournisseurs = async () => {
    if (!pointDeVenteId) return;
    setLoadingFournisseurs(true);
    try {
      const res = await privateApi.get('/api/fournisseurs/actifs');
      const list = res.data || [];
      setFournisseurs(list);
      // Auto-sélection du premier si un seul ou aucun sélectionné
      if (list.length > 0 && !selectedFournisseurId) {
        setSelectedFournisseurId(list[0].id);
      }
    } catch (err) {
      console.warn('Impossible de charger les fournisseurs actifs');
      setFournisseurs([]);
    } finally {
      setLoadingFournisseurs(false);
    }
  };

  const fetchPropositions = async () => {
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
      setPropositions(props);
      setOriginalPropositions(JSON.parse(JSON.stringify(props))); // deep copy
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
  };

  useEffect(() => {
    fetchPropositions();
    fetchInfoDettes();
    fetchFournisseurs();
  }, [pointDeVenteId]);

  const updateQuantity = (index, newQty) => {
    if (newQty < 0) return;
    const updated = [...propositions];
    const item = updated[index];
    item.quantiteSuggeree = newQty;
    item.montant = item.prixUnitaire * newQty;
    setPropositions(updated);
  };

  const totalActuel = propositions.reduce((sum, item) => sum + (item.montant || 0), 0);
  const budgetDisponible = data?.caisseDisponible || data?.budgetEstime || 0;
  const depassement = totalActuel > budgetDisponible;

  // Calculs globaux pour le récapitulatif clair
  const totalDette = propositions.reduce((sum, item) => {
    return sum + ((item.prixUnitaire || 0) * (item.quantiteDette || 0));
  }, 0);
  const totalComptant = totalActuel - totalDette;
  
  // Marge bénéficiaire totale
  const totalMarge = propositions.reduce((sum, item) => sum + (item.margeTotale || 0), 0);

  const handleValider = async () => {
    if (!selectedFournisseurId) {
      alert("Veuillez sélectionner un fournisseur destinataire du bon de commande.");
      return;
    }
    if (depassement) {
      if (!window.confirm('Le total dépasse le budget disponible. Voulez-vous continuer ?')) {
        return;
      }
    }
    setSaving(true);
    try {
      const response = await privateApi.post('/api/reapprovisionnement/valider', {
        lignes: propositions
          .filter(p => p.quantiteSuggeree > 0)
          .map(p => ({
            typeCasierId: p.typeCasierId,
            quantiteCommandee: p.quantiteSuggeree,
            prixUnitaire: p.prixUnitaire
          })),
        fournisseurId: selectedFournisseurId
      }, {
        headers: { 'X-PV-ID': pointDeVenteId }
      });

      if (response.data?.bonCommandeId) {
        setBonCommandeId(response.data.bonCommandeId);
        setBonCommandeNumero(response.data.numeroBon);
        setOpenSnackbar(true);
      }
      fetchPropositions();
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
        // Ouvre directement wa.me avec le numéro de test WhatsApp de l'utilisateur
        // 225 = préfixe Côte d'Ivoire pour wa.me
        window.open(`https://wa.me/2250708404050?text=${encodeURIComponent(text)}`, '_blank');
      })
      .catch(() => {
        const fallback = `Bon de commande ${bonCommandeNumero}`;
        window.open(`https://wa.me/2250708404050?text=${encodeURIComponent(fallback)}`, '_blank');
      });
  };

  if (loading) return <Typography>Chargement...</Typography>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Card>
      <CardContent>
        {/* === En-tête style Bon de Commande === */}
        <Box mb={2}>
          <Typography variant="h6" fontWeight="bold">
            Commande Fournisseur Intelligente
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Suggestions basées sur ce que vous avez déjà encaissé via les dettes clients.
          </Typography>
          {/* Note test */}
          <Alert severity="info" sx={{ mt: 1, py: 0.5, fontSize: '13px' }}>
            🧪 MODE TEST — Les envois WhatsApp utilisent ton numéro 0708404050.
          </Alert>
        </Box>

        {/* === SÉLECTION FOURNISSEUR (obligatoire - le bon lui est destiné) === */}
        <Box sx={{ mb: 2, p: 2, border: '2px solid #1976d2', borderRadius: 2, backgroundColor: '#e3f2fd' }}>
          <Typography variant="subtitle2" color="primary" fontWeight="bold" gutterBottom>
            FOURNISSEUR DESTINATAIRE DU BON DE COMMANDE *
          </Typography>
          {loadingFournisseurs ? (
            <Typography variant="body2">Chargement des fournisseurs...</Typography>
          ) : fournisseurs.length === 0 ? (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              Aucun fournisseur actif pour ce point de vente.<br />
              Exécute le script <code>docs/IMPORT_FOURNISSEURS_LEGACY.sql</code> ou crée des fournisseurs dans la page de gestion.
            </Alert>
          ) : (
            <Box component="select"
              value={selectedFournisseurId || ''}
              onChange={(e) => setSelectedFournisseurId(e.target.value ? Number(e.target.value) : null)}
              style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: 4, border: '1px solid #1976d2' }}
            >
              <option value="">-- Sélectionnez le fournisseur --</option>
              {fournisseurs.map(f => (
                <option key={f.id} value={f.id}>
                  {f.raisonsociale} {f.telephone ? `• ${f.telephone}` : ''} {f.ville ? `(${f.ville})` : ''}
                </option>
              ))}
            </Box>
          )}
          {selectedFournisseurId && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Les lignes de ce bon de commande seront envoyées à ce fournisseur.
            </Typography>
          )}
        </Box>

        {/* === Section Fonds + Budget (style Bon de Commande) === */}
        <Box sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 2, backgroundColor: '#fafafa' }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            FONDS DISPONIBLES
          </Typography>

          <Typography variant="h5" fontWeight="bold" color="success.main">
            {formatF(budgetDisponible)}
          </Typography>

          {/* 🔹 Avertissement dettes liquides impayées */}
          {infoDettes?.montantDettesLiquideEnAttente > 0 && (
            <Typography variant="body2" color="error.dark" sx={{ mt: 0.5, fontWeight: 600 }}>
              ⚠ Dettes liquides impayées: {formatF(infoDettes.montantDettesLiquideEnAttente)}
            </Typography>
          )}

          {/* 🔹 Avertissement dettes emballages en attente */}
          {infoDettes?.montantDettesEmballageEnAttente > 0 && (
            <Typography variant="body2" color="warning.dark" sx={{ mt: 0.5, fontWeight: 600 }}>
              ⚠ Dettes emballages en attente: {formatF(infoDettes.montantDettesEmballageEnAttente)}
            </Typography>
          )}

          {infoDettes?.montantTotalDettes > 0 && (
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

        {/* === Liste style lignes de Bon de Commande (Mobile First) === */}
        <Box sx={{ mb: 3 }}>
          {propositions.length === 0 && (
            <Box textAlign="center" py={5}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Aucune suggestion pour le moment
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Le système n’a détecté aucun besoin de réapprovisionnement 
                basé sur vos ventes et dettes payées.
              </Typography>
            </Box>
          )}

          {propositions.map((item, index) => (
            <Box
              key={index}
              sx={{
                border: '1px solid #e0e0e0',
                borderRadius: 2,
                p: 2.5,           // Plus d'espace pour le doigt
                mb: 1.5,
                backgroundColor: item.quantiteDette > 0 ? '#e8f5e9' : 'white'
              }}
            >
              {/* Ligne unique ultra-compacte mobile-first : Nom + Stepper + Total */}
              <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
                <Typography variant="subtitle2" fontWeight="medium" sx={{ flex: 1, fontSize: '14px', lineHeight: 1.2 }}>
                  {item.typeCasierNom || item.nomProduit}
                </Typography>

                {/* Stepper compact */}
                <Stack direction="row" alignItems="center" spacing={0.3}>
                  <IconButton
                    size="small"
                    onClick={() => updateQuantity(index, item.quantiteSuggeree - 1)}
                    disabled={item.quantiteSuggeree <= 0}
                    sx={{ width: 32, height: 32 }}
                  >
                    <Remove fontSize="small" />
                  </IconButton>
                  <Typography sx={{ minWidth: 32, textAlign: 'center', fontSize: '16px', fontWeight: 700 }}>
                    {item.quantiteSuggeree}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => updateQuantity(index, item.quantiteSuggeree + 1)}
                    sx={{ width: 32, height: 32 }}
                  >
                    <Add fontSize="small" />
                  </IconButton>
                </Stack>

                <Typography variant="subtitle2" fontWeight="bold" sx={{ minWidth: 85, textAlign: 'right', fontSize: '14px' }}>
                  {formatF(item.montant)}
                </Typography>
              </Box>

              {/* Ligne financière compacte en 2-3 colonnes (mobile optimisée) */}
              <Box 
                mt={1.2} 
                pt={1} 
                sx={{ 
                  borderTop: '1px dashed #e0e0e0',
                  display: 'flex',
                  gap: 1
                }}
              >
                {item.quantiteDette > 0 && (
                  <Box sx={{ flex: 1, backgroundColor: '#e8f5e9', borderRadius: 1, p: 0.6 }}>
                    <Typography sx={{ fontSize: '12px', color: '#2e7d32', fontWeight: 600 }}>
                      ✅ {item.quantiteDette} cas. dettes
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: '#2e7d32', fontWeight: 700 }}>
                      {formatF(item.prixUnitaire * item.quantiteDette)}
                    </Typography>
                  </Box>
                )}

                <Box 
                  sx={{ 
                    flex: 1, 
                    backgroundColor: '#fff3e0', 
                    borderRadius: 1, 
                    p: 0.6 
                  }}
                >
                  <Typography sx={{ fontSize: '12px', color: '#e65100', fontWeight: 600 }}>
                    💵 {item.quantiteSuggeree - (item.quantiteDette || 0)} cas. cash
                  </Typography>
                  <Typography sx={{ fontSize: '12px', color: '#e65100', fontWeight: 700 }}>
                    {formatF(item.prixUnitaire * (item.quantiteSuggeree - (item.quantiteDette || 0)))}
                  </Typography>
                </Box>

                {/* 🔹 Marge bénéficiaire */}
                {item.margeTotale > 0 && (
                  <Box sx={{ flex: 1, backgroundColor: '#e3f2fd', borderRadius: 1, p: 0.6 }}>
                    <Typography sx={{ fontSize: '12px', color: '#1565c0', fontWeight: 600 }}>
                      📈 Marge
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: '#1565c0', fontWeight: 700 }}>
                      {formatF(item.margeTotale)}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          ))}
        </Box>

        {/* Actions rapides */}
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

        {/* Récap global ultra-compact (1 ligne) - Mobile First */}
        {totalDette > 0 && (
          <Box sx={{ 
            mb: 1.5, 
            p: 1, 
            backgroundColor: '#fafafa',
            borderRadius: 1,
            border: '1px solid #e0e0e0'
          }}>
            <Typography sx={{ fontSize: '13px', textAlign: 'center', fontWeight: 600 }}>
              ✅ {formatF(totalDette)} dettes &nbsp;&nbsp;·&nbsp;&nbsp; 💵 {formatF(totalComptant)} cash
            </Typography>
          </Box>
        )}

        {/* 🔹 Récap marge bénéficiaire */}
        {totalMarge > 0 && (
          <Box sx={{ 
            mb: 1.5, 
            p: 1, 
            backgroundColor: '#e3f2fd',
            borderRadius: 1,
            border: '1px solid #1565c0'
          }}>
            <Typography sx={{ fontSize: '13px', textAlign: 'center', fontWeight: 600, color: '#1565c0' }}>
              📈 Marge estimée: {formatF(totalMarge)}
            </Typography>
          </Box>
        )}

        {/* Total - bien visible sur mobile */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          mb: 2, 
          px: 1,
          py: 1,
          borderTop: '1px solid #e0e0e0'
        }}>
          <Typography variant="h6" sx={{ fontSize: '17px' }}>Total commande</Typography>
          <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '18px' }}>
            {formatF(totalActuel)}
          </Typography>
        </Box>

        {/* 🔹 Avertissement dettes impayées */}
        {(infoDettes?.montantDettesLiquideEnAttente > 0 || infoDettes?.montantDettesEmballageEnAttente > 0) && (
          <Alert severity="warning" sx={{ mb: 2, py: 1 }}>
            <Typography variant="body2" fontWeight="medium">
              Attention : Vous avez {(infoDettes?.montantDettesLiquideEnAttente > 0 ? formatF(infoDettes.montantDettesLiquideEnAttente) : "0")} de dettes liquides impayées{(infoDettes?.montantDettesEmballageEnAttente > 0 ? ` et ${formatF(infoDettes.montantDettesEmballageEnAttente)} d'emballages non rendus` : "")}. Cette commande est basée sur vos besoins réels, mais pensez au recouvrement.
            </Typography>
          </Alert>
        )}

        {/* Bouton principal - Valider comme Bon de Commande */}
        <Button
          fullWidth
          variant="contained"
          size="large"
          startIcon={<Save />}
          onClick={handleValider}
          disabled={saving || !selectedFournisseurId || propositions.every(p => p.quantiteSuggeree === 0)}
          sx={{ py: 1.5, mb: 2 }}
        >
          {saving ? 'Création en cours...' : 'Valider et Créer le Bon de Commande'}
        </Button>

        {/* Actions après création du bon - Style confirmation commande */}
        {bonCommandeId && (
          <Box sx={{ mt: 3, p: 2, border: '1px dashed #4caf50', borderRadius: 2, backgroundColor: '#f1f8e9' }}>
            <Typography variant="subtitle2" color="success.main" gutterBottom align="center">
              ✓ Bon de commande créé avec succès
            </Typography>

            {/* Note test */}
            <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
              🧪 Les messages WhatsApp sont envoyés vers ton numéro de test 0708404050.
            </Alert>

            <Stack spacing={1.5} mt={1}>
              <Button
                fullWidth
                variant="contained"
                color="success"
                startIcon={<WhatsApp />}
                onClick={handleWhatsApp}
                size="large"
              >
                Envoyer au fournisseur par WhatsApp (vers 0708404050)
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