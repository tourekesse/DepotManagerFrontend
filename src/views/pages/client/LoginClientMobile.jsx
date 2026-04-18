import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  Container,
  Grid,
  Chip,
} from '@mui/material';
import { Phone, Lock, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { privateApi } from '../../../api/axios';
import { getDefaultHomePageForRole } from '../../../config/roleConfig';

export default function LoginClientMobile() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!phone.trim()) {
      setError('Veuillez entrer votre numéro de téléphone');
      return;
    }

    if (!password) {
      setError('Veuillez entrer votre mot de passe');
      return;
    }

    setLoading(true);

    try {
      const response = await privateApi.post('/api/auth/client/login', {
        phone: phone.trim(),
        password: password
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('clientId', response.data.clientId);
      localStorage.setItem('phone', response.data.phone);
      localStorage.setItem('firstName', response.data.firstName);
      localStorage.setItem('role', 'CLIENT_BAR');

      try {
        const ctx = await privateApi.get('/api/utilisateur/context');
        const pv = ctx.data?.pointDeVenteActif;
        if (pv?.id) {
          localStorage.setItem('activePV', JSON.stringify(pv));
          localStorage.setItem('dmUser', JSON.stringify({ pointDeVenteActifId: pv.id, pointsDeVente: [pv] }));
        }
      } catch (e) {
        console.warn('Contexte utilisateur non récupéré pour le client:', e?.message || e);
      }

      setAttemptCount(0);
      navigate(getDefaultHomePageForRole('CLIENT_BAR'));

    } catch (err) {
      setLoading(false);

      if (err.response?.status === 429) {
        const retryAfter = err.response.data.retryAfter || 900;
        setError(`Trop de tentatives. Réessayez dans ${Math.ceil(retryAfter / 60)} minutes.`);
      } else {
        setError(err.response?.data?.message || 'Erreur de connexion');
        setAttemptCount(prev => prev + 1);
      }
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        py: { xs: 4, md: 0 },
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={6} alignItems="center">
          {/* Section gauche - Branding */}
          <Grid item xs={12} md={6} sx={{ display: { xs: 'none', md: 'block' } }}>
            <Box sx={{ p: 4 }}>
              <Box
                component="img"
                src="/logo.svg"
                alt="DepotManager Logo"
                sx={{ width: 80, height: 80, mb: 4 }}
              />
              <Typography
                variant="h3"
                sx={{ fontWeight: 800, color: '#6A1B9A', mb: 3, lineHeight: 1.2 }}
              >
                Espace Client
              </Typography>
              <Typography variant="h6" sx={{ color: '#616161', fontWeight: 400, mb: 4 }}>
                Commandez vos boissons et suivez vos livraisons en temps réel.
              </Typography>

              <Box sx={{ mt: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: '#f3e5f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Phone size={24} color="#6A1B9A" />
                  </Box>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#1a1a2e' }}>
                      Commandez facilement
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      En quelques clics depuis votre téléphone
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: '#f3e5f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Lock size={24} color="#6A1B9A" />
                  </Box>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#1a1a2e' }}>
                      Sécurisé
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Vos données sont protégées
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Grid>

          {/* Section droite - Formulaire */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                maxWidth: 480,
                mx: 'auto',
                borderRadius: 3,
                border: '1px solid #e0e0e0',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                {/* Header */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  <Box
                    component="img"
                    src="/logo.svg"
                    alt="DepotManager Logo"
                    sx={{ width: 64, height: 64, mb: 2 }}
                  />
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: '#1a1a2e', mb: 1 }}
                  >
                    Connexion Client
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Accédez à votre espace
                  </Typography>
                </Box>

                {/* Badges */}
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 3 }}>
                  <Chip
                    label="Sécurisé"
                    size="small"
                    sx={{
                      bgcolor: '#e8f5e9',
                      color: '#2e7d32',
                      fontWeight: 600,
                    }}
                  />
                  <Chip
                    label="Simple"
                    size="small"
                    sx={{
                      bgcolor: '#f3e5f5',
                      color: '#6A1B9A',
                      fontWeight: 600,
                    }}
                  />
                </Box>

                {error && (
                  <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                    {error}
                  </Alert>
                )}

                {attemptCount >= 3 && attemptCount < 5 && (
                  <Alert severity="warning" sx={{ mb: 3 }}>
                    {5 - attemptCount} tentatives restantes avant blocage
                  </Alert>
                )}

                {/* Form */}
                <form onSubmit={handleLogin}>
                  <TextField
                    fullWidth
                    label="Numéro de téléphone"
                    placeholder="07 XX XX XX XX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                    sx={{ mb: 2.5 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone size={20} color="#6A1B9A" />
                        </InputAdornment>
                      ),
                    }}
                    type="tel"
                    inputProps={{ pattern: '[+0-9\\s\\-]*' }}
                  />

                  <TextField
                    fullWidth
                    type={showPassword ? 'text' : 'password'}
                    label="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    sx={{ mb: 3 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock size={20} color="#6A1B9A" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <Button
                            size="small"
                            onClick={() => setShowPassword(!showPassword)}
                            sx={{ minWidth: 0, p: 0.5 }}
                            disabled={!password}
                          >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </Button>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading || !phone || !password}
                    endIcon={!loading && <ChevronRight size={20} />}
                    sx={{
                      bgcolor: '#6A1B9A',
                      py: 1.5,
                      fontWeight: 700,
                      '&:hover': { bgcolor: '#7E57C2' },
                    }}
                  >
                    {loading ? 'Connexion...' : 'Se connecter'}
                  </Button>
                </form>

                {/* Liens */}
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Pas de compte ?{' '}
                    <Link
                      to="/essai"
                      style={{
                        color: '#6A1B9A',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      Demander un accès
                    </Link>
                  </Typography>
                </Box>

                {/* Support */}
                <Box
                  sx={{
                    mt: 3,
                    pt: 3,
                    borderTop: '1px solid #e0e0e0',
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Besoin d'aide ?{' '}
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{ color: '#6A1B9A', fontWeight: 600 }}
                    >
                      supportdepotmanager@gm-soft.ca
                    </Typography>
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
