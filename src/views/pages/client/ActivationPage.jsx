import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Chip,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack,
  Visibility,
  VisibilityOff,
  CheckCircle,
  ErrorOutline,
  Lock,
  LockOpen,
} from '@mui/icons-material';
import { privateApi } from '../../../api/axios';

/**
 * ActivationPage.jsx - Page d'activation et définition du mot de passe client.
 * Accessible via lien dans le message WhatsApp d'activation.
 * 
 * Flow:
 * 1. Client reçoit lien: https://frontend.com/activation?token=XXX
 * 2. Client remplit mot de passe
 * 3. Token envoyé à POST /api/auth/client/set-password
 * 4. JWT retourné → auto-login → redirects vers /accueil
 */
export default function ActivationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // État de validation du mot de passe
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,      // 6+ caractères
    match: false,       // Correspond avec confirmation
  });

  // Vérifier que le token est présent
  useEffect(() => {
    if (!token) {
      setError('Token manquant. Vérifiez votre lien d\'activation.');
    }
  }, [token]);

  // Validation en temps réel du mot de passe
  useEffect(() => {
    if (password) {
      setPasswordValidation({
        length: password.length >= 6,
        match: confirmPassword && password === confirmPassword,
      });
    } else {
      setPasswordValidation({
        length: false,
        match: false,
      });
    }
  }, [password, confirmPassword]);

  const isPasswordValid = Object.values(passwordValidation).every(v => v === true);
  const passwordScore = Object.values(passwordValidation).filter(v => v === true).length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isPasswordValid) {
      setError('Veuillez remplir tous les critères de sécurité du mot de passe');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await privateApi.post('/api/auth/activate', {
        token,
        password,
        confirmPassword,
      });

      // Sauvegarder le token JWT retourné
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userId', response.data.userId);
      localStorage.setItem('email', response.data.email);
      localStorage.setItem('role', response.data.role);

      setSuccess('✨ Compte activé ! Connexion en cours...');
      
      // Rediriger vers l'accueil après 1.5s
      setTimeout(() => {
        navigate('/accueil');
      }, 1500);
    } catch (err) {
      console.error('Erreur activation:', err);
      if (err.response?.status === 400) {
        setError(err.response.data?.message || 'Token invalide ou mot de passe non conforme');
      } else if (err.response?.status === 404) {
        setError('Token d\'activation introuvable ou expiré');
      } else {
        setError(err.response?.data?.message || 'Erreur serveur. Réessayez plus tard.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Si pas de token
  if (!token) {
    return (
      <Box sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
        p: 2,
      }}>
        <Card sx={{ maxWidth: 400, width: '100%' }}>
          <CardContent>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <ErrorOutline sx={{ fontSize: 48, color: 'error.main', mb: 1 }} />
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Lien d'activation invalide
              </Typography>
            </Box>
            <Alert severity="error">
              Le token d'activation est manquant. Vérifiez le lien que vous avez reçu.
            </Alert>
            <Button
              fullWidth
              variant="contained"
              onClick={() => navigate('/login-client')}
              sx={{ mt: 3 }}
            >
              Retour à la connexion
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
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
      <Card sx={{ maxWidth: 450, width: '100%', elevation: 3 }}>
        <CardContent sx={{ p: 4 }}>
          {/* En-tête */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
            }}>
              <LockOpen sx={{ fontSize: 32, color: 'white' }} />
            </Box>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              🔐 Activation de compte
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Créez un mot de passe sécurisé pour votre compte
            </Typography>
          </Box>

          {/* Messages */}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2 }}>{success}</Alert>}

          {/* Formulaire */}
          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              {/* Champ mot de passe */}
              <TextField
                fullWidth
                label="Mot de passe"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                variant="outlined"
                disabled={loading}
                placeholder="Au moins 8 caractères"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock fontSize="small" sx={{ color: 'primary.main' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        disabled={loading}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {/* Champ confirmation */}
              <TextField
                fullWidth
                label="Confirmer le mot de passe"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                variant="outlined"
                disabled={loading}
                error={confirmPassword !== '' && password !== confirmPassword}
                helperText={confirmPassword !== '' && password !== confirmPassword ? 'Les mots de passe ne correspondent pas' : ''}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock fontSize="small" sx={{ color: 'primary.main' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                        disabled={loading}
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {/* Force du mot de passe */}
              {password && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Force du mot de passe
                    </Typography>
                    <Typography
                      variant="caption"
                      fontWeight="bold"
                      color={
                        passwordScore <= 2 ? 'error.main' :
                        passwordScore <= 3 ? 'warning.main' :
                        'success.main'
                      }
                    >
                      {passwordScore === 5 ? '✅ Excellent' : passwordScore >= 3 ? '✓ Bon' : '⚠️ Faible'}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(passwordScore / 5) * 100}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#e0e0e0',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: passwordScore <= 2 ? '#f44336' : passwordScore <= 3 ? '#ff9800' : '#4caf50',
                      },
                    }}
                  />
                </Box>
              )}

              {/* Critères de validation */}
              {password && (
                <Paper sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    📋 Critères de sécurité:
                  </Typography>
                  <Stack spacing={0.5}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircle
                        sx={{
                          fontSize: 16,
                          color: passwordValidation.length ? 'success.main' : 'action.disabled'
                        }}
                      />
                      <Typography variant="caption">
                        Au moins 6 caractères
                      </Typography>
                    </Box>
                    {confirmPassword && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircle
                          sx={{
                            fontSize: 16,
                            color: passwordValidation.match ? 'success.main' : 'error.main'
                          }}
                        />
                        <Typography variant="caption">
                          Les deux mots de passe correspondent
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              )}

              {/* Bouton d'activation */}
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleSubmit}
                disabled={!isPasswordValid || loading}
                sx={{
                  background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                  py: 1.5,
                  fontWeight: 'bold',
                }}
                startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
              >
                {loading ? 'Activation en cours...' : '✨ Activer mon compte'}
              </Button>

              {/* Lien retour */}
              <Button
                fullWidth
                variant="text"
                startIcon={<ArrowBack />}
                onClick={() => navigate('/login-client')}
                disabled={loading}
                sx={{ color: 'text.secondary' }}
              >
                Retour
              </Button>

            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
