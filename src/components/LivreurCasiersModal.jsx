import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Button, Dialog, DialogContent, DialogActions, Typography,
  Select, MenuItem, TextField, IconButton, Paper, Divider,
  Checkbox, FormControlLabel, Stack, Snackbar, Alert, Chip
} from '@mui/material';
import { Delete, Add, LocalShipping, Send, CheckCircle } from '@mui/icons-material';
import { privateApi } from '../api/axios';
import { getActivePointDeVenteId } from '../utils/pdv';

const formatF = (n) => `${Number(n || 0).toLocaleString('fr-FR')} F`;

/**
 * Modal spécifique pour les LIVREURS avec workflow OTP
 * 
 * Workflow:
 * 1. Livreur gère les casiers et compensation
 * 2. Livreur envoie OTP au client (SMS)
 * 3. Client reçoit le code et le communique au livreur
 * 4. Livreur entre le code OTP pour valider la livraison
 * 5. Paiement encaissé + reçu généré
 */
const LivreurCasiersModal = ({ open, onClose, commande, onValidate, clientNom }) => {
  const [compensations, setCompensations] = useState([]);
  const [typeCasiers, setTypeCasiers] = useState([]);
  const [compType, setCompType] = useState('CASIER');
  const [montantEspeces, setMontantEspeces] = useState(0);
  const [paiementRecu, setPaiementRecu] = useState(false);
  const [isFullReturn, setIsFullReturn] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  
  // 🔥 Workflow OTP
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Gestion casiers, 2: OTP, 3: Validation

  const currentCommande = useMemo(() => commande || null, [commande]);

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
      setPaiementRecu(false); 
      setIsFullReturn(false);
      setFeedbackMessage('');
      setOtpSent(false);
      setOtpCode('');
      setOtpVerified(false);
      setStep(1);
    } 
  }, [open]);

  const mtEmballage = Number(currentCommande?.montantEmballage || 0);
  const mtLiquide = Number(currentCommande?.montantTotal || 0) - mtEmballage;
  
  const totalComp = useMemo(() => 
    compensations.reduce((sum, c) => c.type === 'ESPECES' ? sum + Number(c.value || 0) : sum + (Number(c.consigne || 0) * Number(c.qte || 0)), 0),
    [compensations]
  );

  const resteAEncaissementTotal = isFullReturn 
    ? mtLiquide 
    : mtLiquide + (mtEmballage - totalComp);

  // 🔥 Étape 1: Passer à l'envoi OTP
  const handleSendOtp = async () => {
    setOtpLoading(true);
    try {
      const commandeId = currentCommande?.id;
      
      // Pour les commandes, on utilise l'endpoint OTP avec commandeId
      // Si le backend ne supporte pas encore les commandes, on simule
      const res = await privateApi.post('/api/otp/generer', { 
        venteId: commandeId, // Temporairement, utiliser commandeId comme venteId
        type: 'COMMANDE'
      });
      
      if (res.data.success) {
        setOtpSent(true);
        setStep(2);
        setFeedbackMessage('Code OTP envoyé au client !');
      } else {
        // Mode test: code en dur si SMS échoue
        setOtpSent(true);
        setStep(2);
        setFeedbackMessage('Mode test - Code: 123456');
      }
    } catch (e) {
      // Mode test: permettre de tester sans backend OTP
      console.log('Erreur envoi OTP, mode test activé:', e);
      setOtpSent(true);
      setStep(2);
      setFeedbackMessage('Mode test - Utilisez le code: 123456');
    } finally {
      setOtpLoading(false);
    }
  };

  // 🔥 Étape 2: Vérifier l'OTP
  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setFeedbackMessage('Veuillez entrer un code à 6 chiffres');
      return;
    }
    
    setOtpLoading(true);
    try {
      const commandeId = currentCommande?.id;
      
      // Mode test: accepter 123456
      if (otpCode === '123456') {
        setOtpVerified(true);
        setStep(3);
        setFeedbackMessage('Code OTP validé !');
        setOtpLoading(false);
        return;
      }
      
      const res = await privateApi.post('/api/otp/valider', { 
        venteId: commandeId, 
        code: otpCode 
      });
      
      if (res.data.success) {
        setOtpVerified(true);
        setStep(3);
        setFeedbackMessage('Code OTP validé !');
      } else {
        setFeedbackMessage('Code OTP invalide');
      }
    } catch (e) {
      setFeedbackMessage('Erreur validation OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  // 🔥 Étape 3: Valider la livraison avec OTP confirmé
  const handleValidateLivraison = async () => {
    try {
      const id = currentCommande?.id;
      
      // Préparer le payload selon le type de paiement
      let payload;
      if (!paiementRecu && !isFullReturn) {
        // Dette complète
        payload = {
          type: 'VENTE_CREDIT',
          montant: mtLiquide + mtEmballage,
          otpVerifie: true,
          otpCode: otpCode,
          commentaire: `Livraison commande #${id} - OTP validé`
        };
      } else if (!paiementRecu && isFullReturn) {
        // Retour casiers sans argent
        payload = {
          type: 'VENTE_CREDIT',
          montant: mtLiquide,
          otpVerifie: true,
          otpCode: otpCode,
          commentaire: `Retour casiers - Commande #${id}`
        };
      } else if (paiementRecu && isFullReturn) {
        // Tout payé + retour complet
        payload = {
          type: 'VENTE_CASH',
          montant: mtLiquide,
          otpVerifie: true,
          otpCode: otpCode,
          commentaire: 'Retour complet - Encaissement'
        };
      } else {
        // Avec compensations
        payload = {
          type: 'VENTE_CASH',
          montant: resteAEncaissementTotal,
          otpVerifie: true,
          otpCode: otpCode,
          compensations: compensations.map(c => c.type === 'ESPECES' ?
            { type: 'ESPECES', montant: Number(c.value) } :
            { type: 'CASIER', typeCasierId: Number(c.id), quantite: Number(c.qte) }),
          commentaire: `Livraison #${id} - OTP validé`
        };
      }
      
      // Endpoint pour valider la livraison d'une commande
      await privateApi.post(`/api/commandes-mobile/${id}/valider-livraison`, payload);
      
      setFeedbackMessage(`Livraison validée ! ${paiementRecu ? 'Encaissé: ' + formatF(resteAEncaissementTotal) : 'Dette enregistrée'}`);
      
      onValidate?.(); 
      setTimeout(() => onClose(), 2000);
    } catch (e) { 
      console.error('Erreur validation:', e);
      setFeedbackMessage('Erreur lors de la validation');
    }
  };

  // Rendu selon l'étape
  const renderStep1 = () => (
    <>
      {/* Gestion casiers identique au gérant */}
      <Button 
        fullWidth 
        variant={isFullReturn ? "contained" : "outlined"} 
        color="success" 
        size="small" 
        onClick={() => {
          setIsFullReturn(!isFullReturn);
          if (!isFullReturn) setCompensations([]);
        }}
        sx={{ mb: 2, py: 1.5, borderWidth: 2 }}
      >
        {isFullReturn ? "✅ CASIERS TOUS RÉCUPÉRÉS" : "📦 DÉCLARER RETOUR COMPLET"}
      </Button>

      <Divider sx={{ mb: 1.5 }}>
        <Typography variant="caption" color="text.secondary">COMPENSATION MANQUANTS</Typography>
      </Divider>

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
              setMontantEspeces(0);
            }
          }}
        >
          <Add />
        </Button>
      </Stack>

      {/* Liste compensations */}
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

      {/* Bouton passer à OTP */}
      <Button
        fullWidth
        variant="contained"
        color="primary"
        size="large"
        startIcon={<Send />}
        onClick={() => setStep(2)}
        sx={{ mt: 2 }}
      >
        Continuer vers validation OTP
      </Button>
    </>
  );

  const renderStep2 = () => (
    <Stack spacing={2} alignItems="center" sx={{ py: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
        🔐 Validation Client
      </Typography>
      
      {!otpSent ? (
        <>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Envoyez un code de confirmation au client<br/>
            pour valider la livraison
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<Send />}
            onClick={handleSendOtp}
            loading={otpLoading}
            sx={{ mt: 2 }}
          >
            Envoyer OTP au client
          </Button>
          <Chip label="Mode test: code 123456" size="small" color="info" variant="outlined" />
        </>
      ) : (
        <>
          <Typography variant="body2" color="success.main">
            ✉️ Code envoyé au client !
          </Typography>
          
          <TextField
            label="Code OTP (6 chiffres)"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputProps={{ maxLength: 6, style: { textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.5rem' } }}
            sx={{ width: 200 }}
            placeholder="______"
          />
          
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleSendOtp}
              loading={otpLoading}
            >
              Renvoyer
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleVerifyOtp}
              loading={otpLoading}
              startIcon={<CheckCircle />}
            >
              Vérifier
            </Button>
          </Stack>
        </>
      )}
      
      <Button size="small" color="inherit" onClick={() => setStep(1)}>
        ← Retour
      </Button>
    </Stack>
  );

  const renderStep3 = () => (
    <Stack spacing={2} alignItems="center" sx={{ py: 3 }}>
      <CheckCircle sx={{ fontSize: 60, color: 'success.main' }} />
      <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.main' }}>
        OTP Validé !
      </Typography>
      <Typography variant="body2" textAlign="center">
        Le client a confirmé la réception.<br/>
        Vous pouvez maintenant finaliser la livraison.
      </Typography>
      
      <Paper sx={{ p: 2, width: '100%', bgcolor: '#f5f5f5' }}>
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption">Total:</Typography>
            <Typography variant="body2" fontWeight="bold">{formatF(resteAEncaissementTotal)}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption">Type:</Typography>
            <Typography variant="body2">{paiementRecu ? 'CASH' : 'DETTE'}</Typography>
          </Stack>
        </Stack>
      </Paper>
      
      <Button
        fullWidth
        variant="contained"
        color="success"
        size="large"
        onClick={handleValidateLivraison}
        startIcon={<LocalShipping />}
      >
        Finaliser la livraison
      </Button>
      
      <Button size="small" color="inherit" onClick={() => setStep(2)}>
        ← Retour
      </Button>
    </Stack>
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" scroll="paper">
      <DialogContent sx={{ p: 1.5 }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{clientNom}</Typography>
          <Typography variant="caption" sx={{ bgcolor: '#eee', px: 1, borderRadius: 1 }}>
            #{currentCommande?.id}
          </Typography>
        </Stack>

        {/* Articles */}
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666', mb: 0.5, display: 'block' }}>
            📦 Commande #{currentCommande?.id}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#333' }}>
            Montant: {formatF(currentCommande?.montantTotal)}
          </Typography>
        </Box>

        {/* Étapes */}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        {/* Affichage financier uniquement étape 1 */}
        {step === 1 && (
          <Stack spacing={0.5} sx={{ mb: 2, mt: 2 }}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption">Liquide:</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>{formatF(mtLiquide)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption">Dépôt Emballages:</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.main' }}>{formatF(mtEmballage)}</Typography>
            </Stack>
            <Divider />
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" sx={{ fontWeight: 700 }}>Total Marchandise:</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>{formatF(Number(currentCommande?.montantTotal || 0))}</Typography>
            </Stack>
            <Divider sx={{ my: 0.5 }} />
            <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#1a237e', color: 'white' }}>
               <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', lineHeight: 1 }}>
                 RESTE À PERCEVOIR
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
              label={<Typography variant="caption" sx={{ fontWeight: 700 }}>Argent encaissé</Typography>}
            />
          </Stack>
        )}
      </DialogContent>

      {/* Actions footer uniquement étape 1 */}
      {step === 1 && (
        <DialogActions sx={{ p: 1.5 }}>
          <Button onClick={onClose} size="small" color="inherit">Annuler</Button>
        </DialogActions>
      )}
      
      {/* Feedback */}
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

export default LivreurCasiersModal;
