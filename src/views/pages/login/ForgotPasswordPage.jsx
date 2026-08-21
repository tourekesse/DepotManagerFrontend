import { useState } from "react";
import { Link } from "react-router-dom";
import { publicApi } from "../../../api/axios";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import { ChevronRight, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [login, setLogin] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!login.trim()) {
      setError("Veuillez saisir votre email ou votre numéro de téléphone.");
      return;
    }

    setLoading(true);
    try {
      const res = await publicApi.post("/api/utilisateur/forgot-password", {
        login: login.trim(),
      });
      setMessage(res.data?.message || "Lien de réinitialisation envoyé si le compte existe.");
    } catch (err) {
      setError(err.response?.data?.message || "Impossible d'envoyer le lien pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Card
          sx={{
            borderRadius: 3,
            border: "1px solid #e0e0e0",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: "center", mb: 4 }}>
              <Box component="img" src="/logo.svg" alt="DepotManager Logo" sx={{ width: 64, height: 64, mb: 2 }} />
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#1a1a2e", mb: 1 }}>
                Mot de passe oublié
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Saisissez votre email ou votre téléphone. Nous vous enverrons un lien pour créer un nouveau mot de passe.
              </Typography>
            </Box>

            {message && <Alert severity="success" sx={{ mb: 3 }}>{message}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>{error}</Alert>}

            <form onSubmit={submit}>
              <TextField
                label="Email ou Téléphone"
                type="text"
                fullWidth
                required
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                disabled={loading}
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Mail size={20} color="#6A1B9A" />
                    </InputAdornment>
                  ),
                }}
                placeholder="Ex: 07 XX XX XX XX ou email@exemple.com"
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading || !login.trim()}
                endIcon={!loading && <ChevronRight size={20} />}
                sx={{ bgcolor: "#6A1B9A", py: 1.5, fontWeight: 700, "&:hover": { bgcolor: "#7E57C2" } }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Envoyer le lien"}
              </Button>
            </form>

            <Box sx={{ mt: 3, textAlign: "center" }}>
              <Link to="/login" style={{ color: "#6A1B9A", fontWeight: 600, textDecoration: "none" }}>
                Retour à la connexion
              </Link>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
