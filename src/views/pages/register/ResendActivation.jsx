import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Container,
  Alert,
} from "@mui/material";
import { Mail, Send, ChevronRight } from "lucide-react";
import { publicApi } from "../../../api/axios";

export default function ResendActivationPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submitResend = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await publicApi.post("/api/auth/resend-activation", { email });
      setMessage(response.data.message || "Email envoyé avec succès !");
      setEmail("");
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'envoi.");
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
          <CardContent sx={{ p: 4, textAlign: "center" }}>
            <Box
              component="img"
              src="/logo.svg"
              alt="DepotManager Logo"
              sx={{ width: 64, height: 64, mb: 3 }}
            />

            <Typography variant="h5" sx={{ fontWeight: 700, color: "#1a1a2e", mb: 1 }}>
              Renvoyer l'email d'activation
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Entrez votre adresse email pour recevoir un nouveau lien d'activation.
            </Typography>

            {message && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {message}
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={submitResend}>
              <TextField
                fullWidth
                label="Adresse email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <Box sx={{ pr: 1 }}>
                      <Mail size={20} color="#6A1B9A" />
                    </Box>
                  ),
                }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading || !email}
                endIcon={!loading && <ChevronRight size={20} />}
                sx={{
                  bgcolor: "#6A1B9A",
                  py: 1.5,
                  fontWeight: 700,
                  "&:hover": { bgcolor: "#7E57C2" },
                }}
              >
                {loading ? "Envoi..." : "Renvoyer le lien"}
              </Button>
            </Box>

            <Button
              variant="text"
              onClick={() => navigate("/")}
              sx={{ mt: 3, color: "#6A1B9A", fontWeight: 600 }}
            >
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
