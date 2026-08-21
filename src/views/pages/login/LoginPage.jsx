import { useEffect, useState } from "react";
import { publicApi } from "../../../api/axios";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useUser } from "../../../context/UserContext";
import { getDefaultHomePageForRole } from "../../../config/roleConfig";

import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  Typography,
  Container,
  Grid,
  IconButton,
  InputAdornment,
  Chip,
} from "@mui/material";
import {
  Mail,
  Lock,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notActivated, setNotActivated] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState(null);

  const { login } = useUser();
  const [query] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (query.get("error")) {
      setErrorMsg("Email ou mot de passe incorrect.");
    }
  }, [query]);

  const submit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const res = await publicApi.post(
        "/api/auth/login",
        { login: email, password },
        { withCredentials: true }
      );

      if (res.data.success) {
        const apiResponse = res.data;

        localStorage.setItem("token", apiResponse.token);
        localStorage.setItem("userId", apiResponse.userId);
        localStorage.setItem("role", apiResponse.role);

        const mappedUser = {
          ...apiResponse,
          pointDeVenteActifId:
            apiResponse.pointDeVenteActif?.id ??
            apiResponse.defaultPointDeVenteId,
        };

        localStorage.setItem("dmUser", JSON.stringify(mappedUser));

        login(mappedUser);

        navigate(getDefaultHomePageForRole(apiResponse.role));
        return;
      }

      setErrorMsg(res.data.message || "Connexion échouée.");
    } catch (err) {
      if (err.response && err.response.status === 403 &&
          err.response.data?.code === "ACCOUNT_NOT_ACTIVATED") {
        setNotActivated(true);
        setResendMsg(null);
        setErrorMsg(
          err.response.data.message ||
            "Votre compte n'est pas encore activé. Cliquez sur le lien de vérification reçu par e-mail."
        );
        return;
      }

      if (err.response && err.response.status === 428) {
        const data = err.response.data;
        if (data.token) {
          localStorage.setItem("token", data.token);
        }
        localStorage.setItem(
          "dmUser",
          JSON.stringify({
            userId: data.userId,
            onboardingRequired: true,
          })
        );

        navigate("/setup/wizard");
        return;
      }

      setErrorMsg("Email ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setResendMsg({ type: "error", text: "Saisissez votre e-mail pour renvoyer le lien." });
      return;
    }
    setResending(true);
    setResendMsg(null);
    try {
      await publicApi.post("/api/auth/resend-activation", { email });
      setResendMsg({ type: "success", text: "Un nouveau lien d'activation a été envoyé. Vérifiez votre boîte mail." });
      setNotActivated(false);
      setErrorMsg("");
    } catch (err) {
      setResendMsg({ type: "error", text: err.response?.data?.message || "Impossible de renvoyer le lien." });
    } finally {
      setResending(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        py: { xs: 4, md: 0 },
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={6} alignItems="center">
          {/* Section gauche - Image/Branding */}
          <Grid
            item
            xs={12}
            md={6}
            sx={{ display: { xs: "none", md: "block" } }}
          >
            <Box sx={{ p: 4 }}>
              <Box
                component="img"
                src="/logo.svg"
                alt="DepotManager Logo"
                sx={{ width: 80, height: 80, mb: 4 }}
              />
              <Typography
                variant="h3"
                sx={{ fontWeight: 800, color: "#6A1B9A", mb: 3, lineHeight: 1.2 }}
              >
                L'œil du patron sur votre dépôt
              </Typography>
              <Typography variant="h6" sx={{ color: "#616161", fontWeight: 400, mb: 4 }}>
                Connectez-vous pour piloter ventes, livraisons, casiers et caisse.
              </Typography>

              <Box sx={{ mt: 6 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: "#f3e5f5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Lock size={24} color="#6A1B9A" />
                  </Box>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: "#1a1a2e" }}>
                      Connexion sécurisée
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Vos données sont protégées
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: "#f3e5f5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Mail size={24} color="#6A1B9A" />
                  </Box>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: "#1a1a2e" }}>
                      Support réactif
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      supportdepotmanager@gm-soft.ca
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
                mx: "auto",
                borderRadius: 3,
                border: "1px solid #e0e0e0",
                boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
              }}
            >
              <CardContent sx={{ p: 4 }}>
                {/* Header */}
                <Box sx={{ textAlign: "center", mb: 4 }}>
                  <Box
                    component="img"
                    src="/logo.svg"
                    alt="DepotManager Logo"
                    sx={{ width: 64, height: 64, mb: 2 }}
                  />
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "#1a1a2e", mb: 1 }}
                  >
                    Connexion
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Accédez à votre espace de gestion
                  </Typography>
                </Box>

                {/* Badges */}
                <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mb: 3 }}>
                  <Chip
                    label="Sécurisé"
                    size="small"
                    sx={{
                      bgcolor: "#e8f5e9",
                      color: "#2e7d32",
                      fontWeight: 600,
                    }}
                  />
                  <Chip
                    label="14 jours gratuit"
                    size="small"
                    sx={{
                      bgcolor: "#f3e5f5",
                      color: "#6A1B9A",
                      fontWeight: 600,
                    }}
                  />
                </Box>

                {errorMsg && (
                  <Alert
                    severity="error"
                    sx={{ mb: 3 }}
                    onClose={() => setErrorMsg("")}
                  >
                    {errorMsg}
                    {notActivated && (
                      <Button
                        size="small"
                        variant="text"
                        color="inherit"
                        sx={{ mt: 1, fontWeight: 700, textTransform: "none" }}
                        onClick={handleResend}
                        disabled={resending}
                      >
                        {resending ? "Envoi..." : "Renvoyer le lien d'activation"}
                      </Button>
                    )}
                  </Alert>
                )}

                {resendMsg && (
                  <Alert
                    severity={resendMsg.type}
                    sx={{ mb: 3 }}
                    onClose={() => setResendMsg(null)}
                  >
                    {resendMsg.text}
                  </Alert>
                )}

                {/* Form */}
                <form onSubmit={submit}>
                  <TextField
                    label="Email ou Téléphone"
                    type="text"
                    fullWidth
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    sx={{ mb: 2.5 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Mail size={20} color="#6A1B9A" />
                        </InputAdornment>
                      ),
                    }}
                    placeholder="Ex: 07 XX XX XX XX ou email@exemple.com"
                  />

                  <TextField
                    label="Mot de passe"
                    type={showPassword ? "text" : "password"}
                    fullWidth
                    required
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
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            disabled={!password}
                            size="small"
                          >
                            {showPassword ? (
                              <EyeOff size={20} />
                            ) : (
                              <Eye size={20} />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Box sx={{ mt: -1.5, mb: 2.5, textAlign: "right" }}>
                    <Link
                      to="/forgot-password"
                      style={{
                        color: "#6A1B9A",
                        fontWeight: 600,
                        textDecoration: "none",
                        fontSize: 14,
                      }}
                    >
                      Mot de passe oublié ?
                    </Link>
                  </Box>

                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={loading || !email || !password}
                    endIcon={!loading && <ChevronRight size={20} />}
                    sx={{
                      bgcolor: "#6A1B9A",
                      py: 1.5,
                      fontWeight: 700,
                      "&:hover": { bgcolor: "#7E57C2" },
                    }}
                  >
                    {loading ? "Connexion..." : "Se connecter"}
                  </Button>
                </form>

                {/* Liens */}
                <Box sx={{ mt: 3, textAlign: "center" }}>
                  <Typography variant="body2" color="text.secondary">
                    Pas encore de compte ?{" "}
                    <Link
                      to="/essai"
                      style={{
                        color: "#6A1B9A",
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      Essai gratuit 14 jours
                    </Link>
                  </Typography>
                </Box>

                {/* Support */}
                <Box
                  sx={{
                    mt: 3,
                    pt: 3,
                    borderTop: "1px solid #e0e0e0",
                    textAlign: "center",
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Besoin d'aide ?{" "}
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{ color: "#6A1B9A", fontWeight: 600 }}
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
