import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  Typography,
  CircularProgress,
  Paper,
  Stack,
} from "@mui/material";
import { Lock, CheckCircle } from "@mui/icons-material";
import { publicApi } from "../../api/axios";

export default function ChangePasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmerMotDePasse, setConfirmerMotDePasse] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Token invalide ou expiré.");
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (nouveauMotDePasse.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (nouveauMotDePasse !== confirmerMotDePasse) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      const res = await publicApi.post("/api/utilisateur/change-password-by-token", {
        token,
        nouveauMotDePasse,
      });

      if (res.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } else {
        setError(res.data.message || "Erreur lors du changement de mot de passe.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors du changement de mot de passe.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
          p: 2,
        }}
      >
        <Card sx={{ maxWidth: 450, p: 2 }}>
          <CardContent sx={{ textAlign: "center" }}>
            <CheckCircle sx={{ fontSize: 64, color: "success.main", mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Mot de passe changé !
            </Typography>
            <Typography color="text.secondary" gutterBottom>
              Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Redirection vers la page de connexion...
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 450, width: "100%" }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={2} alignItems="center" mb={3}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: 2,
                bgcolor: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Lock sx={{ color: "white", fontSize: 32 }} />
            </Box>
            <Typography variant="h5" fontWeight="bold">
              Nouveau mot de passe
            </Typography>
            <Typography color="text.secondary" textAlign="center">
              Créez votre mot de passe personnel
            </Typography>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Nouveau mot de passe"
                type="password"
                fullWidth
                value={nouveauMotDePasse}
                onChange={(e) => setNouveauMotDePasse(e.target.value)}
                disabled={loading || !token}
                placeholder="Minimum 6 caractères"
              />

              <TextField
                label="Confirmer le mot de passe"
                type="password"
                fullWidth
                value={confirmerMotDePasse}
                onChange={(e) => setConfirmerMotDePasse(e.target.value)}
                disabled={loading || !token}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading || !token || !nouveauMotDePasse || !confirmerMotDePasse}
                sx={{ py: 1.5 }}
              >
                {loading ? <CircularProgress size={24} /> : "Changer mon mot de passe"}
              </Button>

              <Button
                variant="text"
                onClick={() => navigate("/login")}
                disabled={loading}
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
