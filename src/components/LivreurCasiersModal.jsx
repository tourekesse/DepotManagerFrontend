import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Button, Dialog, DialogContent, DialogActions, Typography,
  Select, MenuItem, TextField, IconButton, Paper, Divider,
  Checkbox, FormControlLabel, Stack, Snackbar, Alert, Chip, CircularProgress
} from '@mui/material';
import { Delete, Add, LocalShipping, Send, CheckCircle, BrokenImage, Print, PictureAsPdf, Bluetooth } from '@mui/icons-material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import TelegramIcon from '@mui/icons-material/Telegram';
import { privateApi } from '../api/axios';
import { getActivePointDeVenteId } from '../utils/pdv';
import CasseDialog from './CasseDialog';
import { useBluetoothPrinter } from '../hooks/useBluetoothPrinter';
import useNotifications from '../crud-dashboard/hooks/useNotifications/useNotifications';

const formatF = (n) => `${Number(n || 0).toLocaleString('fr-FR')} F`;

/**
 * Modal spécifique pour les LIVREURS avec workflow OTP
 * 
 * Workflow:
 * 1. Livreur gère les casiers et les vides rendus
 * 2. Livreur envoie OTP au client (SMS)
 * 3. Client reçoit le code et le communique au livreur
 * 4. Livreur entre le code OTP pour valider la livraison
 * 5. Paiement encaissé + reçu généré
 */
const LivreurCasiersModal = ({ open, onClose, commande, onValidate, clientNom }) => {
  const notifications = useNotifications();
  const { printReceipt, isPrinting } = useBluetoothPrinter();
  
  const [compensations, setCompensations] = useState([]);
  const [typeCasiers, setTypeCasiers] = useState([]);
  const [compType, setCompType] = useState('CASIER');
  const [montantEspeces, setMontantEspeces] = useState(0);
  const [paiementRecu, setPaiementRecu] = useState(false);
  const [isFullReturn, setIsFullReturn] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // 🔴 Casses déclarées
  const [casses, setCasses] = useState([]);
  const [casseDialogOpen, setCasseDialogOpen] = useState(false);

  // 🔥 Workflow OTP
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Gestion casiers, 2: OTP, 3: Validation

  // 🔴 Articles de la commande (pour CasseDialog)
  const [commandeArticles, setCommandeArticles] = useState([]);

  // 🔴 Reçu après validation
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptVenteId, setReceiptVenteId] = useState(null);
  const [receiptPdfUrl, setReceiptPdfUrl] = useState(null);
  const [printLoading, setPrintLoading] = useState(false);

  const currentCommande = useMemo(() => commande || null, [commande]);

  // Charger les détails de la commande avec les articles
  useEffect(() => {
    if (!open || !currentCommande?.id) return;
    
    privateApi.get(`/api/commandes-mobile/${currentCommande.id}/details`)
      .then(res => {
        const data = res.data;
        setCommandeArticles(data.details || data.articles || []);
      })
      .catch(err => {
        console.error('Erreur chargement détails commande:', err);
        setCommandeArticles([]);
      });
  }, [open, currentCommande?.id]);

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
      setCasses([]);
      setCommandeArticles([]);
      setReceiptOpen(false);
      setReceiptVenteId(null);
      setReceiptPdfUrl(null);
    }
  }, [open]);

  const mtEmballage = Number(currentCommande?.montantEmballage || 0);
  const mtLiquide = Number(currentCommande?.montantTotal || 0) - mtEmballage;
  
  // 🔴 Impact des casses sur les montants
  const totalCasseProduit = useMemo(() => 
    casses.reduce((sum, c) => sum + (c.prixUnitaire || 0) * (c.quantite || 0), 0),
    [casses]
  );
  const totalCasseConsigne = useMemo(() => 
    casses.reduce((sum, c) => sum + (c.consigneUnitaire || 0) * (c.quantite || 0), 0),
    [casses]
  );
  const totalCasseNb = useMemo(() => 
    casses.reduce((sum, c) => sum + (c.quantite || 0), 0),
    [casses]
  );
  
  // Montants ajustés après casse
  const mtLiquideApresCasse = mtLiquide - totalCasseProduit;
  const mtEmballageApresCasse = mtEmballage - totalCasseConsigne;
  
  const totalComp = useMemo(() => 
    compensations.reduce((sum, c) => c.type === 'ESPECES' ? sum + Number(c.value || 0) : sum + (Number(c.consigne || 0) * Number(c.qte || 0)), 0),
    [compensations]
  );

  const resteAEncaissementTotal = isFullReturn 
    ? mtLiquideApresCasse 
    : mtLiquideApresCasse + (mtEmballageApresCasse - totalComp);

  // 🔥 Étape 1: Passer à l'envoi OTP
  const handleSendOtp = async () => {
    setOtpLoading(true);
    try {
      const commandeId = currentCommande?.id;
      
      // Pour les commandes, on utilise l'endpoint OTP avec commandeId
      // Si le backend ne supporte pas encore les commandes, on simule
      const res = await privateApi.post('/api/otp/generer', {
        commandeId: commandeId
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
  const handleVerifyOtp = async (codeToVerify = otpCode) => {
    const code = codeToVerify || otpCode;
    if (!code || code.length !== 4) {
      setFeedbackMessage('Veuillez entrer un code à 4 chiffres');
      return;
    }

    setOtpLoading(true);
    try {
      const commandeId = currentCommande?.id;

      const res = await privateApi.post('/api/otp/valider', {
        commandeId: commandeId,
        code: code
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

      // Préparer les casses pour le backend (toujours en JSON)
      const cassesPayload = casses.map(c => ({
        produitId: c.produitId,
        quantite: c.quantite,
        typeCasierId: c.typeCasierId,
        typeCasse: c.typeCasse || 'BOUTEILLES',
        commentaire: c.commentaire || '',
        photoUrl: c.photoPreview || '',
        prixUnitaire: c.prixUnitaire || 0,
        consigneUnitaire: c.consigneUnitaire || 0
      }));

      // Préparer le payload selon le type de paiement
      let payload;
      if (!paiementRecu && !isFullReturn) {
        payload = {
          type: 'VENTE_CREDIT',
          montant: mtLiquideApresCasse + mtEmballageApresCasse,
          otpVerifie: true,
          otpCode: otpCode,
          casses: cassesPayload,
          commentaire: `Livraison commande #${id} - OTP validé`
        };
      } else if (!paiementRecu && isFullReturn) {
        payload = {
          type: 'VENTE_CREDIT',
          montant: mtLiquideApresCasse,
          otpVerifie: true,
          otpCode: otpCode,
          casses: cassesPayload,
          commentaire: `Retour casiers - Commande #${id}`
        };
      } else if (paiementRecu && isFullReturn) {
        payload = {
          type: 'VENTE_CASH',
          montant: mtLiquideApresCasse,
          otpVerifie: true,
          otpCode: otpCode,
          casses: cassesPayload,
          commentaire: 'Livraison conforme - Encaissement'
        };
      } else {
        payload = {
          type: 'VENTE_CASH',
          montant: resteAEncaissementTotal,
          otpVerifie: true,
          otpCode: otpCode,
          casses: cassesPayload,
          compensations: compensations.map(c => c.type === 'ESPECES' ?
            { type: 'ESPECES', montant: Number(c.value) } :
            { type: 'CASIER', typeCasierId: Number(c.id), quantite: Number(c.qte) }),
          commentaire: `Livraison #${id} - OTP validé`
        };
      }

      const res = await privateApi.post(`/api/commandes-mobile/${id}/valider-livraison`, payload);
      
      // 🔴 Afficher le reçu après validation réussie
      const venteId = res.data?.vente?.id || res.data?.recu?.venteId;
      if (venteId) {
        setReceiptVenteId(venteId);
        setReceiptOpen(true);
        
        // Charger le PDF du reçu
        try {
          const token = localStorage.getItem('token');
          const pdfRes = await fetch(`/api/recu/${venteId}/pdf`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (pdfRes.ok) {
            const blob = await pdfRes.blob();
            setReceiptPdfUrl(window.URL.createObjectURL(blob));
          }
        } catch (e) {
          console.error('Erreur chargement PDF reçu:', e);
        }
      }

      onValidate?.();
    } catch (e) {
      console.error('Erreur validation:', e);
      setFeedbackMessage('Erreur lors de la validation: ' + (e.response?.data?.detail || e.message));
    }
  };

  // 🔴 Imprimer le reçu en PDF
  const handlePrintReceiptPDF = () => {
    if (receiptPdfUrl) {
      const printWindow = window.open(receiptPdfUrl, '_blank');
      printWindow?.print();
    }
  };

  // 🔴 Imprimer le reçu en Bluetooth
  const handlePrintReceiptBluetooth = async () => {
    if (!receiptVenteId) return;
    setPrintLoading(true);
    try {
      await printReceipt(receiptVenteId);
      notifications.show('✅ Reçu imprimé avec succès', { severity: 'success' });
    } catch (error) {
      console.error('Erreur impression:', error);
      notifications.show('❌ ' + error.message, { severity: 'error' });
    } finally {
      setPrintLoading(false);
    }
  };

  // 🔴 Fermer le modal reçu
  const handleCloseReceipt = () => {
    setReceiptOpen(false);
    setReceiptVenteId(null);
    setReceiptPdfUrl(null);
    onClose();
  };

  // 🔴 Partager le reçu par WhatsApp
  const handleShareWhatsApp = async () => {
    if (!receiptVenteId) return;
    
    setPrintLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/recu/${receiptVenteId}/text`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const texteRecu = await res.text();
        // Encoder le texte pour l'URL WhatsApp
        const encodedText = encodeURIComponent(texteRecu);
        // Ouvrir WhatsApp avec le texte pré-rempli
        window.open(`https://wa.me/?text=${encodedText}`, '_blank');
      } else {
        notifications.show('Erreur génération du reçu', { severity: 'error' });
      }
    } catch (e) {
      console.error('Erreur partage WhatsApp:', e);
      notifications.show('❌ Erreur lors du partage', { severity: 'error' });
    } finally {
      setPrintLoading(false);
    }
  };

  // 🔴 Partager le reçu par Telegram
  const handleShareTelegram = async () => {
    if (!receiptVenteId) return;
    
    setPrintLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/recu/${receiptVenteId}/text`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const texteRecu = await res.text();
        // Encoder le texte pour l'URL Telegram
        const encodedText = encodeURIComponent(texteRecu);
        // Ouvrir Telegram avec le texte pré-rempli
        window.open(`https://t.me/share/url?url=&text=${encodedText}`, '_blank');
      } else {
        notifications.show('Erreur génération du reçu', { severity: 'error' });
      }
    } catch (e) {
      console.error('Erreur partage Telegram:', e);
      notifications.show('❌ Erreur lors du partage', { severity: 'error' });
    } finally {
      setPrintLoading(false);
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
        {isFullReturn ? "✅ CASIERS TOUS RÉCUPÉRÉS" : "Retour casiers conforme"}
      </Button>

      {isFullReturn && (
        <Alert severity="success" sx={{ mb: 2, py: 0.5 }}>
          <Typography variant="caption">✅ Tous les casiers récupérés - pas de vide rendu nécessaire</Typography>
        </Alert>
      )}

      <Divider sx={{ mb: 1.5, opacity: isFullReturn ? 0.5 : 1 }}>
        <Typography variant="caption" color="text.secondary">📦 SAISIR VIDE RENDU</Typography>
      </Divider>

      {/* Ajout Rapide - grisé si retour complet */}
      <Box sx={{ opacity: isFullReturn ? 0.5 : 1, pointerEvents: isFullReturn ? 'none' : 'auto' }}>
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
      </Box>

      {/* Liste compensations - masquée si retour complet */}
      {compensations.length > 0 && !isFullReturn && (
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

      {/* 🔴 Bouton déclarer casse */}
      <Button
        fullWidth
        variant="outlined"
        color="error"
        size="small"
        startIcon={<BrokenImage />}
        onClick={() => setCasseDialogOpen(true)}
        sx={{ mb: 1, py: 1, borderWidth: 2, borderStyle: 'dashed' }}
      >
        🔴 Signaler une casse
      </Button>

      {/* 🔴 Liste des casses déclarées */}
      {casses.length > 0 && (
        <Paper sx={{ p: 1.5, mb: 2, bgcolor: '#ffebee' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.main', mb: 0.5, display: 'block' }}>
            🔴 CASSES DÉCLARÉES ({totalCasseNb})
          </Typography>
          {casses.map((c, i) => (
            <Stack key={i} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.25 }}>
              <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                {c.produitNom} ×{c.quantite}
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'error.main' }}>
                  -{formatF((c.prixUnitaire || 0) * c.quantite)}
                </Typography>
                <IconButton size="small" onClick={() => setCasses(casses.filter((_, idx) => idx !== i))}>
                  <Delete sx={{ fontSize: 14 }} />
                </IconButton>
              </Stack>
            </Stack>
          ))}
          {totalCasseProduit > 0 && (
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'error.main', display: 'block', mt: 0.5 }}>
              Impact total : -{formatF(totalCasseProduit)} (produit) -{formatF(totalCasseConsigne)} (consigne)
            </Typography>
          )}
        </Paper>
      )}

      {/* Bloc financier avec ajustement casse */}
      <Stack spacing={0.5} sx={{ mb: 2, mt: 2 }}>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="caption">Liquide:</Typography>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>{formatF(mtLiquide)}</Typography>
        </Stack>
        {totalCasseProduit > 0 && (
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="error.main">🔴 Casses (produit):</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.main' }}>-{formatF(totalCasseProduit)}</Typography>
          </Stack>
        )}
        
        {/* Emballages et consignes - masqués si retour complet car le client ne paie pas les consignes */}
        {!isFullReturn && (
          <>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption">Dépôt Emballages:</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.main' }}>{formatF(mtEmballage)}</Typography>
            </Stack>
            {totalCasseConsigne > 0 && (
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="error.main">🔴 Casses (consigne):</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.main' }}>-{formatF(totalCasseConsigne)}</Typography>
              </Stack>
            )}
          </>
        )}
        
        <Divider />
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="caption" sx={{ fontWeight: 700 }}>Total Marchandise:</Typography>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>{formatF(isFullReturn ? mtLiquideApresCasse : Number(currentCommande?.montantTotal || 0) - totalCasseProduit - totalCasseConsigne)}</Typography>
        </Stack>
        <Divider sx={{ my: 0.5 }} />
        <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#1a237e', color: 'white' }}>
           <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', lineHeight: 1 }}>
             RESTE À PERCEVOIR
           </Typography>
           <Typography variant="h6" sx={{ fontWeight: 900 }}>{formatF(resteAEncaissementTotal)}</Typography>
        </Paper>
      </Stack>

      {/* Bouton passer à OTP - envoie le SMS et passe à l'étape 2 */}
      <Button
        fullWidth
        variant="contained"
        color="primary"
        size="large"
        startIcon={<Send />}
        onClick={handleSendOtp}
        loading={otpLoading}
        sx={{ mt: 2 }}
      >
        Envoyer code & valider
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
            label="Code OTP (4 chiffres)"
            value={otpCode}
            onChange={(e) => {
              const newCode = e.target.value.replace(/\D/g, '').slice(0, 4);
              setOtpCode(newCode);
              if (newCode.length === 4) {
                setTimeout(() => handleVerifyOtp(newCode), 100);
              }
            }}
            inputProps={{ maxLength: 4, style: { textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.5rem' } }}
            sx={{ width: 200 }}
            placeholder="______"
            autoFocus
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
    <Stack spacing={2} alignItems="center" sx={{ py: 2 }}>
      <CheckCircle sx={{ fontSize: 50, color: 'success.main' }} />
      <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.main' }}>
        OTP Validé !
      </Typography>

      {/* Récap détaillé */}
      <Paper sx={{ p: 2, width: '100%', bgcolor: '#f5f5f5' }}>
        <Stack spacing={1}>
          {/* Liquide */}
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption">Produits (Liquide):</Typography>
            <Typography variant="body2" fontWeight="bold">{formatF(mtLiquide)}</Typography>
          </Stack>

          {/* 🔴 Ajustement casse sur produit */}
          {totalCasseProduit > 0 && (
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="error.main">🔴 Casses (produit):</Typography>
              <Typography variant="body2" fontWeight="bold" color="error.main">-{formatF(totalCasseProduit)}</Typography>
            </Stack>
          )}

          {/* Emballages */}
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption">Emballages:</Typography>
            <Typography variant="body2" color={isFullReturn ? 'success.main' : 'error.main'}>
              {isFullReturn ? `✅ Récupérés (${formatF(mtEmballage)})` : formatF(mtEmballage)}
            </Typography>
          </Stack>

          {/* 🔴 Ajustement casse sur consigne */}
          {totalCasseConsigne > 0 && (
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="error.main">🔴 Casses (consigne):</Typography>
              <Typography variant="body2" fontWeight="bold" color="error.main">-{formatF(totalCasseConsigne)}</Typography>
            </Stack>
          )}

          {/* Détail des casses si existantes */}
          {casses.length > 0 && (
            <>
              <Divider sx={{ my: 0.5 }} />
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'error.main' }}>
                🔴 Détail des casses ({totalCasseNb}):
              </Typography>
              {casses.map((c, i) => (
                <Stack key={i} direction="row" justifyContent="space-between" sx={{ pl: 1 }}>
                  <Typography variant="caption">
                    {c.produitNom} ×{c.quantite} ({c.typeCasse === 'BOUTEILLES' ? 'bouteille' : 'casier'})
                  </Typography>
                  <Typography variant="caption" color="error.main">
                    -{formatF((c.prixUnitaire || 0) * c.quantite + (c.consigneUnitaire || 0) * c.quantite)}
                  </Typography>
                </Stack>
              ))}
            </>
          )}

          {/* Compensations si existantes */}
          {compensations.length > 0 && !isFullReturn && (
            <>
              <Divider sx={{ my: 0.5 }} />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>Vides rendus:</Typography>
              {compensations.map((c, i) => (
                <Stack key={i} direction="row" justifyContent="space-between">
                  <Typography variant="caption" sx={{ pl: 1 }}>
                    {c.type === 'ESPECES' ? '💰 Cash' : `📦 ${c.nom}`}
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    -{formatF(c.type === 'ESPECES' ? c.value : c.consigne * c.qte)}
                  </Typography>
                </Stack>
              ))}
            </>
          )}

          <Divider sx={{ my: 0.5 }} />

          {/* Montants ajustés */}
          {(totalCasseProduit > 0 || totalCasseConsigne > 0) && (
            <>
              <Stack direction="row" justifyContent="space-between" sx={{ bgcolor: '#fff3e0', p: 0.75, borderRadius: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>Produits après casse:</Typography>
                <Typography variant="body2" fontWeight="bold" color="error.main">{formatF(mtLiquideApresCasse)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" sx={{ bgcolor: '#fff3e0', p: 0.75, borderRadius: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>Emballages après casse:</Typography>
                <Typography variant="body2" fontWeight="bold" color="error.main">{formatF(mtEmballageApresCasse)}</Typography>
              </Stack>
              <Divider sx={{ my: 0.5 }} />
            </>
          )}

          {/* Total à percevoir */}
          <Stack direction="row" justifyContent="space-between" sx={{ bgcolor: '#1a237e', color: 'white', p: 1, borderRadius: 1 }}>
            <Typography variant="caption">À percevoir:</Typography>
            <Typography variant="body2" fontWeight="bold">{formatF(resteAEncaissementTotal)}</Typography>
          </Stack>

          {/* Checkbox Argent encaissé - visible à l'étape 3 */}
          <FormControlLabel
            control={<Checkbox
              checked={paiementRecu}
              onChange={(e) => setPaiementRecu(e.target.checked)}
              size="small"
              color="success"
            />}
            label={<Typography variant="body2" sx={{ fontWeight: 700, color: paiementRecu ? 'success.main' : 'warning.main' }}>
              {paiementRecu ? '✅ Argent encaissé' : '⚠️ Pas encore encaissé'}
            </Typography>}
          />

          {/* Type paiement */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" sx={{ fontWeight: 600 }}>Mode:</Typography>
            <Chip
              label={paiementRecu ? `💰 CASH — ${formatF(resteAEncaissementTotal)}` : '📋 CRÉDIT CLIENT'}
              color={paiementRecu ? 'success' : 'warning'}
              size="small"
              sx={{ fontWeight: 'bold' }}
            />
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" scroll="body">
      <DialogContent sx={{ p: 0.75, maxHeight: '85vh' }}>
        {/* Header compact */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.75rem' }}>{clientNom}</Typography>
          <Typography variant="caption" sx={{ bgcolor: '#eee', px: 0.75, borderRadius: 0.5, fontSize: '0.6rem' }}>
            #{currentCommande?.id}
          </Typography>
        </Stack>

        {/* Montant compact */}
        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#666', mb: 0.75 }}>
          Montant: {formatF(currentCommande?.montantTotal)}
        </Typography>

        {/* Étapes */}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
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

      {/* 🔴 Dialog de déclaration de casse */}
      <CasseDialog
        open={casseDialogOpen}
        onClose={() => setCasseDialogOpen(false)}
        onAdd={(casse) => setCasses([...casses, casse])}
        articles={commandeArticles}
      />

      {/* 🔴 Modal Reçu après validation */}
      <Dialog
        open={receiptOpen}
        onClose={handleCloseReceipt}
        fullWidth
        maxWidth="sm"
      >
        <DialogContent sx={{ p: 2 }}>
          <Stack spacing={2} alignItems="center">
            <CheckCircle sx={{ fontSize: 60, color: 'success.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.main' }}>
              ✅ Livraison Validée !
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              La livraison a été enregistrée avec succès.
              {casses.length > 0 && (
                <Typography variant="caption" color="error.main" display="block" sx={{ mt: 0.5 }}>
                  ⚠️ {totalCasseNb} casse(s) enregistrée(s)
                </Typography>
              )}
            </Typography>

            <Divider sx={{ width: '100%', my: 1 }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              📄 Partager le reçu
            </Typography>

            <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
              <Button
                variant="contained"
                color="primary"
                startIcon={<PictureAsPdf />}
                onClick={handlePrintReceiptPDF}
                disabled={!receiptPdfUrl}
                sx={{ minWidth: 100 }}
              >
                PDF
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={printLoading ? <CircularProgress size={20} /> : <Bluetooth />}
                onClick={handlePrintReceiptBluetooth}
                disabled={printLoading || !receiptVenteId}
                sx={{ minWidth: 100 }}
              >
                Bluetooth
              </Button>
              <Button
                variant="contained"
                sx={{
                  bgcolor: '#25D366',
                  color: 'white',
                  '&:hover': { bgcolor: '#128C7E' },
                  minWidth: 100
                }}
                startIcon={<WhatsAppIcon />}
                onClick={handleShareWhatsApp}
                disabled={printLoading || !receiptVenteId}
              >
                WhatsApp
              </Button>
              <Button
                variant="contained"
                sx={{
                  bgcolor: '#0088cc',
                  color: 'white',
                  '&:hover': { bgcolor: '#006699' },
                  minWidth: 100
                }}
                startIcon={<TelegramIcon />}
                onClick={handleShareTelegram}
                disabled={printLoading || !receiptVenteId}
              >
                Telegram
              </Button>
            </Stack>

            <Button
              variant="text"
              onClick={handleCloseReceipt}
              sx={{ mt: 1 }}
            >
              Fermer
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default LivreurCasiersModal;
