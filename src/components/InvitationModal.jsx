// src/components/InvitationModal.jsx
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
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  IconButton,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  WhatsApp,
  Sms,
  Send,
  CheckCircle,
  Error,
  Info,
  Phone,
  Person,
  Store,
  Close,
  Email,
  ContentCopy,
} from '@mui/icons-material';
import { privateApi } from '../api/axios';

export default function InvitationModal({
  open,
  onClose,
  onSuccess,
  depotInfo,
  gerantInfo,
  mode = 'invite', // 'invite' ou 'create'
  preselectedClient = null // Client pré-sélectionné pour le mode 'invite'
}) {
  const [formData, setFormData] = useState({
    clientName: preselectedClient?.raisonsociale || '',
    clientPhone: preselectedClient?.telephone || '',
    clientAddress: preselectedClient?.adresse || '',
    invitationType: 'sms', // SMS par défaut - parfait pour CI
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null); // Store result data (temp password)

  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    // Clear errors when user types
    if (error) setError('');
  };

  React.useEffect(() => {
    if (open) {
      setFormData({
        clientName: preselectedClient?.raisonsociale || '',
        clientPhone: preselectedClient?.telephone || '',
        clientAddress: preselectedClient?.adresse || '',
        invitationType: 'sms',
      });
      setError('');
      setSuccessData(null);
    }
  }, [open, preselectedClient]);

  const validateForm = () => {
    // Les informations client sont déjà validées (pré-sélectionnées)
    if (mode === 'invite') {
      return true; // Pas de validation nécessaire pour le mode invite
    }

    if (!formData.clientName.trim()) {
      setError('❌ Veuillez entrer le nom du client');
      return false;
    }

    if (!formData.clientPhone.trim()) {
      setError('❌ Veuillez entrer le numéro de téléphone du client');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccessData(null);

    try {
      // Appel API réel pour inviter le client
      const response = await privateApi.post(`/api/clients/${preselectedClient.id}/invite`);
      
      if (response.data.success) {
        setSuccessData(response.data.data); // { clientName, clientPhone, tempPassword }
        
        if (onSuccess) {
          onSuccess(response.data.data);
        }
      } else {
        setError('❌ ' + (response.data.message || 'Erreur lors de l\'invitation'));
      }

    } catch (err) {
      console.error('Erreur invitation:', err);
      setError('❌ Erreur lors de l\'invitation: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // On pourrait ajouter un petit toast ici
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        clientName: '',
        clientPhone: '',
        clientAddress: '',
        invitationType: 'sms',
      });
      setError('');
      setSuccessData(null);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: 3,
        }
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        pb: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Send color="primary" />
          <Typography variant="h6">
            {mode === 'create' ? 'Créer un client et l\'inviter' : 'Inviter un client'}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} disabled={loading}>
          <Close />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Client Information - Affichage seulement */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Person color="primary" />
            Client destinataire
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
            {formData.clientName}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Phone sx={{ fontSize: 16 }} />
            {formData.clientPhone}
          </Typography>
        </Box>

        {/* Success Result - Display Temporary Password */}
        {successData && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: '#e8f5e9', border: '1px solid #4caf50' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: '#2e7d32', display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle fontSize="small" />
              Invitation réussie !
            </Typography>

            {/* Canal d'envoi utilisé */}
            <Box sx={{ mb: 2 }}>
              {successData.sentViaTelegram ? (
                <Alert severity="success" sx={{ mb: 1 }}>
                  ✅ Identifiants envoyés automatiquement via <strong>Telegram</strong>.
                </Alert>
              ) : successData.sentViaSms ? (
                <Alert severity="success" sx={{ mb: 1 }}>
                  ✅ Identifiants envoyés automatiquement par <strong>SMS (Twilio)</strong>.
                </Alert>
              ) : (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  ⚠️ Envoi automatique échoué. Communiquer les identifiants manuellement.
                </Alert>
              )}
              
              {/* Détails du canal */}
              {successData.canalEnvoi && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Canal : <strong>{successData.canalEnvoi}</strong>
                </Typography>
              )}
            </Box>

            {/* Afficher le mot de passe si envoi non réussi ou pour consultation */}
            {!successData.sentViaTelegram && !successData.sentViaSms && (
              <>
                <Typography variant="body2" sx={{ mb: 1.5 }}>
                  Le client n'est pas inscrit à notre Bot Telegram et le SMS n'a pas pu être envoyé. Voici les informations à lui communiquer manuellement (WhatsApp/SMS) :
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 'bold', minWidth: '120px' }}>
                    Mot de passe :
                  </Typography>
                  <Chip
                    label={successData.tempPassword}
                    sx={{ fontSize: '1.1rem', fontWeight: 'bold', bgcolor: '#fff', border: '1px dashed #4caf50' }}
                  />
                  <IconButton size="small" onClick={() => copyToClipboard(successData.tempPassword)}>
                    <ContentCopy fontSize="small" />
                  </IconButton>
                </Box>
              </>
            )}

            {/* Toujours afficher le mot de passe en lecture seule pour l'admin */}
            {(successData.sentViaTelegram || successData.sentViaSms) && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, p: 1, bgcolor: '#fff', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                  Mdp généré :
                </Typography>
                <Chip
                  label={successData.tempPassword}
                  size="small"
                  sx={{ fontSize: '0.85rem', fontWeight: 'bold', bgcolor: '#f5f5f5' }}
                />
                <IconButton size="small" onClick={() => copyToClipboard(successData.tempPassword)}>
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Box>
            )}

            <Alert severity="info" sx={{ mt: 1, fontSize: '0.8rem' }}>
              💡 Le client devra changer ce mot de passe lors de sa première connexion.
            </Alert>
          </Paper>
        )}

        {mode === 'create' && !successData && (
          <TextField
            fullWidth
            label="Adresse (optionnelle)"
            value={formData.clientAddress}
            onChange={handleInputChange('clientAddress')}
            disabled={loading}
            multiline
            rows={2}
            sx={{ mb: 2 }}
            placeholder="Quartier, ville..."
          />
        )}

        {/* Instructions de connexion */}
        {!successData && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'warning.50', borderRadius: 1, border: '1px solid', borderColor: 'warning.200' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: 'warning.dark' }}>
              📱 Instructions pour le client :
            </Typography>
            <Typography variant="body2" color="warning.dark">
              • Se connecter avec le numéro : <strong>{formData.clientPhone}</strong><br/>
              • Définir un mot de passe lors de la première connexion<br/>
              • Accéder à son relevé et historique des achats
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
          variant="outlined"
        >
          {successData ? 'Fermer' : 'Annuler'}
        </Button>
        {!successData && (
          <Button
            onClick={handleSubmit}
            disabled={loading}
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <Send />}
          >
            {loading ? 'Activation en cours...' : 'Générer l\'accès'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
