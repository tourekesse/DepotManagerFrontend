import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Snackbar,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { publicApi } from '../../../api/axios';

export default function ActivationLivreurPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const [form, setForm] = useState({
    otp: '',
    nouveauMotDePasse: '',
    confirmationMotDePasse: ''
  });
  
  // États pour afficher/masquer les mots de passe
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Vérifier le token au chargement
  useEffect(() => {
    if (!token) {
      setError('Lien d\'activation invalide. Veuillez demander un nouveau lien.');
      setLoading(false);
      return;
    }

    const verifierToken = async () => {
      try {
        console.log("Vérification token:", token);
        const response = await publicApi.get(`/api/utilisateur/verifier-token-onboarding?token=${token}`);
        console.log("Réponse vérification:", response.data);
        if (response.data.success) {
          setTokenValid(true);
        } else {
          setError('Ce lien a expiré ou est invalide. Veuillez contacter votre gérant.');
        }
      } catch (err) {
        console.error("Erreur vérification token:", err);
        console.error("Détails:", err.response?.data);
        setError('Ce lien a expiré ou est invalide. Veuillez contacter votre gérant.');
      } finally {
        setLoading(false);
      }
    };

    verifierToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (form.nouveauMotDePasse.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (form.nouveauMotDePasse !== form.confirmationMotDePasse) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setValidating(true);

    try {
      const response = await publicApi.post('/api/utilisateur/activer-compte-livreur', {
        token,
        otp: form.otp,
        nouveauMotDePasse: form.nouveauMotDePasse
      });

      if (response.data.success) {
        // Connexion automatique : stocker le token et les infos utilisateur
        const { token: jwtToken, userId, firstName, lastName, phoneNumber, role } = response.data;
        
        localStorage.setItem('token', jwtToken);
        localStorage.setItem('dmUser', JSON.stringify({
          userId,
          firstName,
          lastName,
          phoneNumber,
          role,
          onboardingCompleted: true
        }));
        
        setSnackbar({ open: true, message: 'Compte activé avec succès ! Redirection vers votre dashboard...', severity: 'success' });
        
        // Rediriger vers la page d'accueil du serveur après activation
        setTimeout(() => {
          window.location.href = window.location.origin + '/accueil';
        }, 1500);
      } else {
        setError(response.data.message || 'Échec de l\'activation');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Erreur lors de l\'activation';
      setError(errorMessage);
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2
      }}
    >
      <Card sx={{ maxWidth: 450, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom textAlign="center">
            🚚 DepotManager
          </Typography>
          
          <Typography variant="h5" component="h2" gutterBottom textAlign="center" color="primary">
            Activation du compte Livreur
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {!tokenValid ? (
            <Box textAlign="center" py={4}>
              <Typography color="text.secondary" paragraph>
                {error || 'Lien invalide'}
              </Typography>
              <Button
                variant="outlined"
                onClick={() => navigate('/login')}
                sx={{ mt: 2 }}
              >
                Aller à la page de connexion
              </Button>
            </Box>
          ) : (
            <>
              <Typography variant="body1" paragraph>
                Veuillez saisir le code OTP reçu par SMS et définir votre nouveau mot de passe.
              </Typography>

              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Code OTP"
                  value={form.otp}
                  onChange={(e) => setForm({ ...form, otp: e.target.value })}
                  margin="normal"
                  required
                  placeholder="Ex: 123456"
                  inputProps={{ maxLength: 6 }}
                />

                <TextField
                  fullWidth
                  label="Nouveau mot de passe"
                  type={showPassword ? 'text' : 'password'}
                  value={form.nouveauMotDePasse}
                  onChange={(e) => setForm({ ...form, nouveauMotDePasse: e.target.value })}
                  margin="normal"
                  required
                  helperText="Minimum 6 caractères"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="afficher/masquer le mot de passe"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />

                <TextField
                  fullWidth
                  label="Confirmer le mot de passe"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmationMotDePasse}
                  onChange={(e) => setForm({ ...form, confirmationMotDePasse: e.target.value })}
                  margin="normal"
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="afficher/masquer la confirmation"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={validating}
                  sx={{ mt: 3 }}
                >
                  {validating ? <CircularProgress size={24} /> : 'Activer mon compte'}
                </Button>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
