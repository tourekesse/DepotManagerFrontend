import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Button, Dialog, DialogContent, DialogActions, Typography,
  Select, MenuItem, TextField, IconButton, Paper, Divider,
  Checkbox, FormControlLabel, Stack, Snackbar, Alert
} from '@mui/material';
import { Delete, Add, LocalShipping } from '@mui/icons-material';
import { privateApi } from '../api/axios';
import { getActivePointDeVenteId } from '../utils/pdv';

const formatF = (n) => `${Number(n || 0).toLocaleString('fr-FR')} F`;

const GererCasiersModal = ({ open, onClose, vente, ventesCasiers = [], onValidate, clientNom, defaultCreditMode = false }) => {
  const [compensations, setCompensations] = useState([]);
  const [typeCasiers, setTypeCasiers] = useState([]);
  const [compType, setCompType] = useState('CASIER');
  const [montantEspeces, setMontantEspeces] = useState(0);
  const [paiementRecu, setPaiementRecu] = useState(!defaultCreditMode); // Par défaut en mode livraison : on considère qu'on ne reçoit rien en cash (le gérant peut quand même cocher manuellement)
  const [isFullReturn, setIsFullReturn] = useState(false); // État du retour complet
  const [feedbackMessage, setFeedbackMessage] = useState(''); // Message de feedback

  const currentVente = useMemo(() => {
    const list = Array.isArray(ventesCasiers) ? ventesCasiers : [];
    return list[0] || vente || null;
  }, [ventesCasiers, vente]);

  useEffect(() => {
    if (!open) return;
    const pvId = getActivePointDeVenteId();
    privateApi.get(`/api/type-casiers/point-de-vente/${pvId}/consignables`)
      .then(res => setTypeCasiers(res.data.map(tc => ({
        id: String(tc.id), nom: tc.nomDisplay, consigne: Number(tc.consigneTotaleParCasier || 0)
      })))).catch(() => {});
  }, [open]);

  useEffect(() => { 
    if (!open) { 
      setCompensations([]); 
      setPaiementRecu(!defaultCreditMode); 
      setIsFullReturn(false); // Réinitialiser l'état de retour complet
      setFeedbackMessage(''); // Réinitialiser le message de feedback
    } 
  }, [open]);

  const mtEmballage = Number(currentVente?.montantEmballage || currentVente?.mtEmballage || 0);
  const mtLiquide = Number(currentVente?.montantLiquide || 0);
  
  const totalComp = useMemo(() => 
    compensations.reduce((sum, c) => c.type === 'ESPECES' ? sum + Number(c.value || 0) : sum + (Number(c.consigne || 0) * Number(c.qte || 0)), 0),
    [compensations]
  );

  // LOGIQUE GÉRANT : Calcul simple selon l'état de retour
  const resteAEncaissementTotal = isFullReturn 
    ? mtLiquide // Si retour complet, on ne paye que la boisson
    : mtLiquide + (mtEmballage - totalComp); // Sinon, calcul classique

  const handleAction = async () => {
    try {
      const id = currentVente.venteId || currentVente.id;
      
       // Préparer les articles livrés
       const articlesLivres = currentVente?.lignes?.map(l => ({
         produitId: l.produitId,
         quantiteLivree: l.quantite,
         prixUnitaire: l.prixUnitaire || l.prix_unitaire || 0,
         typeCasierId: l.typeCasierId || l.id_type_casier
       })) || [];

       // Logique selon les 3 cas définis
       let payload;
       if (!paiementRecu && !isFullReturn) {
         // Cas 1: Dette complète (16 050)
         payload = {
           type: 'VENTE_CREDIT',
           montant: mtLiquide + mtEmballage, // 16 050
           articlesLivres,
           commentaire: `Dette complète - Commande #${id}`
         };
       } else if (!paiementRecu && isFullReturn) {
         // Cas 2: Retour casiers sans argent (12 000)
         payload = {
           type: 'VENTE_CREDIT',
           montant: mtLiquide, // 12 000
           articlesLivres,
           commentaire: `Retour casiers - Dette liquide - Commande #${id}`
         };
       } else if (paiementRecu && isFullReturn) {
         // Cas 3: Tout est parfait - Échange casiers (12 000 encaissé)
         payload = {
           type: 'CASH_ECHANGE',
           montant: mtLiquide, // 12 000
           articlesLivres,
           manquants: [],
           compensations: [],
           commentaire: 'Livraison conforme - Échange casiers - Encaissement liquide'
         };
       } else {
         // Cas par défaut: avec compensations (échange partiel de casiers)
         payload = {
           type: 'CASH_ECHANGE',
           montant: resteAEncaissementTotal,
           articlesLivres,
           compensations: compensations.map(c => c.type === 'ESPECES' ?
             { type: 'ESPECES', montant: Number(c.value) } :
             { type: 'CASIER', typeCasierId: Number(c.id), quantite: Number(c.qte) }),
           commentaire: `Régul #${id} - Payé: ${paiementRecu} - Échange casiers`
         };
       }
      
      await privateApi.post(`/api/commandes/${id}/valider-probleme`, payload);
      
      // Feedback utilisateur
      if (!paiementRecu) {
        setFeedbackMessage(`Livraison enregistrée (Dette : ${formatF(resteAEncaissementTotal)})`);
      } else {
        setFeedbackMessage(`Livraison enregistrée (Encaissé : ${formatF(resteAEncaissementTotal)})`);
      }
      
      onValidate?.(); 
      setTimeout(() => onClose(), 1500); // Auto-fermeture après 1.5s pour voir le message
    } catch (e) { 
      const errorMsg = e.response?.data?.error || e.response?.data?.message || e.message || 'Erreur lors de la validation';
      setFeedbackMessage(errorMsg);
      // Afficher une alerte plus complète avec solution
      if (errorMsg.includes("caisse") || errorMsg.includes("Caisse")) {
        alert(`${errorMsg}\n\n👉 Solution: Allez dans le menu Caisse → Ouvrir la Caisse avant de valider la livraison.`);
      } else {
        alert(errorMsg);
      }
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" scroll="paper">
      <DialogContent sx={{ p: 1.5 }}>
        {/* Header Compact */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{clientNom}</Typography>
          <Typography variant="caption" sx={{ bgcolor: '#eee', px: 1, borderRadius: 1 }}>#{currentVente?.id}</Typography>
        </Stack>

        {/* Articles ultra-compact */}
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666', mb: 0.5, display: 'block' }}>
            📦 Articles ({currentVente?.lignes?.length || 0})
          </Typography>
          {currentVente?.lignes?.map((l, i) => (
            <Typography key={i} variant="caption" sx={{ fontSize: '0.65rem', color: '#333', display: 'block' }}>
              • {l.produitNom} ×{l.quantite}
            </Typography>
          ))}
        </Box>

        {/* Bouton principal */}
        <Button 
          fullWidth 
          variant={isFullReturn ? "contained" : "outlined"} 
          color="success" 
          size="small" 
          onClick={() => {
            setIsFullReturn(!isFullReturn);
            if (!isFullReturn) setCompensations([]); // On vide les compensations si on passe en "Complet"
          }}
          sx={{ mb: 2, py: 1.5, borderWidth: 2 }}
        >
          {isFullReturn ? "✅ CASIERS TOUS RÉCUPÉRÉS" : "Retour casiers conforme"}
        </Button>

        <Divider sx={{ mb: 1.5 }}><Typography variant="caption" color="text.secondary">📦 SAISIR VIDE RENDU</Typography></Divider>

        {/* Ajout Rapide */}
        <Stack direction="row" spacing={0.5} sx={{ mb: 1 }}>
          <Select size="small" value={compType} onChange={(e) => setCompType(e.target.value)} sx={{ flex: 1, fontSize: '0.75rem' }}>
            <MenuItem value="CASIER">Casier</MenuItem>
            <MenuItem value="ESPECES">Cash</MenuItem>
          </Select>
          {compType === 'CASIER' ? (
            <Select size="small" displayEmpty value="" sx={{ flex: 2, fontSize: '0.75rem' }} onChange={(e) => {
              const t = typeCasiers.find(x => x.id === e.target.value);
              if(t) setCompensations([...compensations, {...t, type:'CASIER', qte:1}]);
            }}>
              <MenuItem value="">Type...</MenuItem>
              {typeCasiers.map(t => <MenuItem key={t.id} value={t.id}>{t.nom}</MenuItem>)}
            </Select>
          ) : (
            <TextField 
              size="small" 
              type="number"
              placeholder="Somme" 
              value={montantEspeces} 
              sx={{ flex: 2 }} 
              onChange={(e) => setMontantEspeces(e.target.value)} 
            />
          )}
          <Button 
            variant="contained" 
            size="small" 
            onClick={() => {
              if(Number(montantEspeces) > 0) {
                setCompensations([...compensations, {type:'ESPECES', value: Number(montantEspeces)}]);
                setMontantEspeces(0); // Reset après ajout
              }
            }}
          >
            <Add />
          </Button>
        </Stack>

        {/* Liste des compensations ultra-compacte */}
        {compensations.length > 0 && (
          <Box sx={{ mb: 2, maxHeight: 60, overflowY: 'auto' }}>
            {compensations.map((c, i) => (
              <Stack key={i} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.25 }}>
                <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                  {c.type === 'ESPECES' ? `💰 ${formatF(c.value)}` : `📦 ${c.nom}`}
                </Typography>
                <IconButton size="small" onClick={() => setCompensations(compensations.filter((_, idx) => idx !== i))}>
                  <Delete sx={{ fontSize: 14 }} />
                </IconButton>
              </Stack>
            ))}
          </Box>
        )}

        {/* Bloc financier - Point d'ancrage */}
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption">Total Marchandise:</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>{formatF(mtLiquide)}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption">Dépôt Emballages:</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.main' }}>{formatF(mtEmballage)}</Typography>
          </Stack>
          <Divider />
          <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#1a237e', color: 'white' }}>
             <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', lineHeight: 1 }}>
               RESTE À PERCEVOIR (CASH)
             </Typography>
             <Typography variant="h6" sx={{ fontWeight: 900 }}>{formatF(resteAEncaissementTotal)}</Typography>
          </Paper>
          <FormControlLabel
            control={<Checkbox 
              checked={paiementRecu} 
              onChange={(e) => setPaiementRecu(e.target.checked)} 
              size="small" 
              color="success" 
            />}
            label={<Typography variant="caption" sx={{ fontWeight: 700 }}>
              Argent encaissé (Cash)
            </Typography>}
          />
        </Stack>

      </DialogContent>
      <DialogActions sx={{ p: 1.5 }}>
        <Button onClick={onClose} size="small" color="inherit">Annuler</Button>
        <Button 
          variant="contained" 
          size="small" 
          onClick={handleAction} 
          color={paiementRecu ? "primary" : "warning"}
          sx={!paiementRecu ? { 
            bgcolor: '#f57c00', 
            '&:hover': { bgcolor: '#ef6c00' },
            fontWeight: 'bold'
          } : {}}
        >
          {paiementRecu ? "Valider & Encaisser" : "Valider en Dette Client"}
        </Button>
      </DialogActions>
      
      {/* Feedback Toast */}
      <Snackbar 
        open={!!feedbackMessage} 
        autoHideDuration={3000} 
        onClose={() => setFeedbackMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={feedbackMessage.includes('Erreur') ? 'error' : 'success'} sx={{ width: '100%' }}>
          {feedbackMessage}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default GererCasiersModal;
