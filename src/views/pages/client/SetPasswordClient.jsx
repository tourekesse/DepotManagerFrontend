import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
  LinearProgress,
  InputAdornment,
  IconButton,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  CheckCircle,
  Lock,
  LockOpen,
  ArrowBack,
} from '@mui/icons-material';
import { privateApi } from '../../../api/axios';

export default function SetPasswordClient() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [validation, setValidation] = useState({
    length: false,
    hasUpper: false,
    hasNumber: false,
    hasSpecial: false,
    match: false,
  });

  React.useEffect(() => {
    if (newPassword) {
      setValidation({
        length: newPassword.length >= 8,
        hasUpper: /[A-Z]/.test(newPassword),
        hasNumber: /[0-9]/.test(newPassword),
        hasSpecial: /[!@#$%^&*]/.test(newPassword),
        match: confirmPassword && newPassword === confirmPassword,
      });
    } else {
      setValidation({
        length: false,
        hasUpper: false,
        hasNumber: false,
        hasSpecial: false,
        match: false,
      });
    }
  }, [newPassword, confirmPassword]);

  const isValid = Object.values(validation).every(v => v === true);
  const score = Object.values(validation).filter(v => v === true).length;
  const totalCriteria = 5;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isValid) {
      setError('Veuillez remplir tous les critères de sécurité');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await privateApi.post('/api/auth/client/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      localStorage.setItem('token', response.data.token);

      const dmUser = JSON.parse(localStorage.getItem('dmUser') || '{}');
      dmUser.onboardingRequired = true;
      dmUser.onboardingCompleted = false;
      dmUser.passwordMustChange = false;
      localStorage.setItem('dmUser', JSON.stringify(dmUser));

      navigate('/espace-client');
    } catch (err) {
      console.error('Erreur changement mot de passe:', err);
      setError(err.response?.data?.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  };

  const token = localStorage.getItem('token');
  if (!token) {
    navigate('/login-client', { replace: true });
    return null;
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      p: 2,
    }}>
      <Card sx={{ maxWidth: 480, width: '100%', elevation: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6A1B9A 0%, #7E57C2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
            }}>
              <LockOpen sx={{ fontSize: 32, color: 'white' }} />
            </Box>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Bienvenue !
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Créez votre mot de passe personnel pour sécuriser votre compte
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Mot de passe actuel (temporaire)"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock fontSize="small" sx={{ color: 'primary.main' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowCurrent(!showCurrent)} edge="end" disabled={loading}>
                        {showCurrent ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Nouveau mot de passe"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                placeholder="8 caractères min, 1 majuscule, 1 chiffre, 1 spécial"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock fontSize="small" sx={{ color: 'primary.main' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowNew(!showNew)} edge="end" disabled={loading}>
                        {showNew ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Confirmer le mot de passe"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                error={confirmPassword !== '' && newPassword !== confirmPassword}
                helperText={confirmPassword !== '' && newPassword !== confirmPassword ? 'Les mots de passe ne correspondent pas' : ''}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock fontSize="small" sx={{ color: 'primary.main' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowConfirm(!showConfirm)} edge="end" disabled={loading}>
                        {showConfirm ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {newPassword && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Force du mot de passe
                    </Typography>
                    <Typography variant="caption" fontWeight="bold" color={
                      score <= 2 ? 'error.main' : score <= 3 ? 'warning.main' : 'success.main'
                    }>
                      {score === totalCriteria ? 'Excellent' : score >= 3 ? 'Bon' : 'Faible'}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(score / totalCriteria) * 100}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: score <= 2 ? '#f44336' : score <= 3 ? '#ff9800' : '#4caf50',
                      },
                    }}
                  />
                </Box>
              )}

              {newPassword && (
                <Paper sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Critères de sécurité:
                  </Typography>
                  <Stack spacing={0.5}>
                    {[
                      { key: 'length', label: 'Au moins 8 caractères' },
                      { key: 'hasUpper', label: 'Une majuscule (A-Z)' },
                      { key: 'hasNumber', label: 'Un chiffre (0-9)' },
                      { key: 'hasSpecial', label: 'Un caractère spécial (!@#$%^&*)' },
                    ].map(({ key, label }) => (
                      <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircle sx={{ fontSize: 16, color: validation[key] ? 'success.main' : 'action.disabled' }} />
                        <Typography variant="caption">{label}</Typography>
                      </Box>
                    ))}
                    {confirmPassword && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircle sx={{ fontSize: 16, color: validation.match ? 'success.main' : 'error.main' }} />
                        <Typography variant="caption">Les mots de passe correspondent</Typography>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              )}

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleSubmit}
                disabled={!isValid || !currentPassword || loading}
                sx={{
                  background: 'linear-gradient(135deg, #6A1B9A 0%, #7E57C2 100%)',
                  py: 1.5,
                  fontWeight: 'bold',
                }}
                startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
              >
                {loading ? 'Enregistrement...' : 'Créer mon mot de passe'}
              </Button>

              <Button
                fullWidth
                variant="text"
                startIcon={<ArrowBack />}
                onClick={() => navigate('/login-client')}
                disabled={loading}
                sx={{ color: 'text.secondary' }}
              >
                Retour à la connexion
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
