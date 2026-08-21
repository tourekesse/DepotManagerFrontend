import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Alert, CircularProgress,
  Chip, Divider, IconButton, Paper
} from '@mui/material';
import {
  Send, CheckCircle, Phone, Person, Close, ContentCopy, Warning
} from '@mui/icons-material';
import { privateApi } from '../api/axios';

export default function InvitationLivreurModal({ open, onClose, onSuccess, livreur }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);

  React.useEffect(() => {
    if (open) {
      setError('');
      setSuccessData(null);
    }
  }, [open]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleSubmit = async () => {
    if (!livreur) return;
    setLoading(true);
    setError('');
    setSuccessData(null);

    try {
      const response = await privateApi.post(`/api/utilisateur/renvoyer-invitation/${livreur.id}`);

      if (response.data.success) {
        setSuccessData(response.data);
        if (onSuccess) onSuccess(response.data);
      } else {
        setError(response.data.message || 'Erreur lors de l\'envoi de l\'invitation');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'envoi de l\'invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError('');
      setSuccessData(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 2, boxShadow: 3 } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Send color="primary" />
          <Typography variant="h6">Inviter un livreur</Typography>
        </Box>
        <IconButton onClick={handleClose} disabled={loading}><Close /></IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
        )}

        {livreur && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Person color="primary" />
              Livreur destinataire
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              {livreur.firstName} {livreur.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Phone sx={{ fontSize: 16 }} />
              {livreur.phoneNumber}
            </Typography>
          </Box>
        )}

        {successData && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: '#e8f5e9', border: '1px solid #4caf50' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: '#2e7d32', display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle fontSize="small" />
              Invitation envoyée !
            </Typography>

            {successData.otp && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: '100px' }}>
                  Code OTP :
                </Typography>
                <Chip label={successData.otp}
                  sx={{ fontSize: '1.1rem', fontWeight: 'bold', bgcolor: '#fff', border: '1px dashed #4caf50' }}
                />
                <IconButton size="small" onClick={() => copyToClipboard(successData.otp)}>
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Box>
            )}

            {successData.lienActivation && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, p: 1, bgcolor: '#fff', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                  Lien :
                </Typography>
                <Typography variant="caption" sx={{ flex: 1, wordBreak: 'break-all', fontSize: '0.75rem' }}>
                  {successData.lienActivation}
                </Typography>
                <IconButton size="small" onClick={() => copyToClipboard(successData.lienActivation)}>
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Box>
            )}

            {successData.warning ? (
              <Alert severity="warning" sx={{ mt: 1, fontSize: '0.8rem' }}>
                <Warning fontSize="small" sx={{ mr: 0.5 }} />
                WhatsApp non envoyé. Communiquez l'OTP et le lien manuellement.
              </Alert>
            ) : (
              <Alert severity="success" sx={{ mt: 1, fontSize: '0.8rem' }}>
                Message envoyé par WhatsApp avec l'OTP et le lien d'activation.
              </Alert>
            )}
          </Paper>
        )}

        {!successData && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.50', borderRadius: 1, border: '1px solid', borderColor: 'warning.200' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: 'warning.dark' }}>
              Comment ça marche ?
            </Typography>
            <Typography variant="body2" color="warning.dark">
              1. Le livreur reçoit un message <strong>WhatsApp</strong> avec un code OTP et un lien d'activation<br/>
              2. Il ouvre le lien, saisit l'OTP pour vérifier son identité<br/>
              3. Il crée <strong>son propre mot de passe</strong> (alphanumérique)<br/>
              4. Il se connecte avec son téléphone et son mot de passe
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={handleClose} disabled={loading} variant="outlined">
          {successData ? 'Fermer' : 'Annuler'}
        </Button>
        {!successData && (
          <Button onClick={handleSubmit} disabled={loading} variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <Send />}
          >
            {loading ? 'Envoi en cours...' : 'Envoyer l\'invitation'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
