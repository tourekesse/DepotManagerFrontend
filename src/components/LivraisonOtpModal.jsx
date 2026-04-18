import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Stack,
  Chip,
} from '@mui/material';
import { CheckCircle, Send, Refresh } from '@mui/icons-material';
import { privateApi } from '../api/axios';

export default function LivraisonOtpModal({ open, onClose, vente, onValidationSuccess }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpEnvoye, setOtpEnvoye] = useState(false);
  const [smsEnvoye, setSmsEnvoye] = useState(false);

  // Générer et envoyer l'OTP au client
  const handleGenererOtp = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await privateApi.post(`/api/livraisons/otp-sms/generer/${vente.id}`);

      if (response.data.success) {
        setOtpEnvoye(true);
        setSmsEnvoye(response.data.smsEnvoye);
      } else {
        setError(response.data.message || 'Erreur génération OTP');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'envoi du code');
    } finally {
      setLoading(false);
    }
  };

  // Valider le code OTP saisi
  const handleValiderCode = async () => {
    if (!code || code.length !== 4) {
      setError('Code à 4 chiffres requis');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await privateApi.post(`/api/livraisons/otp-sms/valider/${vente.id}`, {
        code: code
      });

      if (response.data.success) {
        // Code valide → Appeler le callback de succès
        onValidationSuccess();
      } else {
        setError(response.data.message || 'Code invalide');
        setCode('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Code invalide ou expiré');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  // Renvoyer un nouveau code
  const handleRenvoyerCode = async () => {
    setLoading(true);
    setError('');
    setCode('');

    try {
      const response = await privateApi.post(`/api/livraisons/otp-sms/generer/${vente.id}`);

      if (response.data.success) {
        setSmsEnvoye(response.data.smsEnvoye);
        setError('');
      } else {
        setError(response.data.message || 'Erreur renvoi code');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du renvoi');
    } finally {
      setLoading(false);
    }
  };

  // Réinitialiser à la fermeture
  const handleClose = () => {
    setCode('');
    setError('');
    setOtpEnvoye(false);
    setSmsEnvoye(false);
    onClose();
  };

  // Auto-générer l'OTP à l'ouverture
  React.useEffect(() => {
    if (open && !otpEnvoye) {
      handleGenererOtp();
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
        🔐 Validation Livraison
      </DialogTitle>
      
      <DialogContent sx={{ mt: 2 }}>
        <Stack spacing={2}>
          {/* Info client */}
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">Client</Typography>
            <Typography variant="body1" fontWeight="bold">
              {vente?.client?.raisonsociale || vente?.nomClient}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              📱 {vente?.client?.telephone}
            </Typography>
          </Box>

          {/* Statut SMS */}
          {otpEnvoye && (
            <Alert 
              severity={smsEnvoye ? "success" : "warning"}
              icon={smsEnvoye ? <CheckCircle /> : <Send />}
            >
              {smsEnvoye 
                ? "✅ Code envoyé par SMS au client" 
                : "⚠️ SMS non envoyé - Demandez le code manuellement"}
            </Alert>
          )}

          {/* Erreur */}
          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* Champ de saisie du code */}
          {otpEnvoye && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                Demandez au client de vous communiquer le code à 4 chiffres reçu par SMS
              </Typography>
              
              <TextField
                fullWidth
                label="Code de validation"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="0000"
                inputProps={{ 
                  maxLength: 4,
                  style: { 
                    fontSize: '2rem', 
                    textAlign: 'center',
                    letterSpacing: '0.5rem'
                  }
                }}
                disabled={loading}
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && code.length === 4) {
                    handleValiderCode();
                  }
                }}
              />

              <Button
                variant="text"
                size="small"
                startIcon={<Refresh />}
                onClick={handleRenvoyerCode}
                disabled={loading}
              >
                Envoyer code de confirmation
              </Button>
            </>
          )}

          {/* Loading */}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={40} />
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={handleValiderCode}
          disabled={!otpEnvoye || code.length !== 4 || loading}
          startIcon={<CheckCircle />}
        >
          Confirmer livraison
        </Button>
      </DialogActions>
    </Dialog>
  );
}
