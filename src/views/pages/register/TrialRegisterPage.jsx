import { useState } from "react";
import { publicApi } from "../../../api/axios";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Select,
  MenuItem,
  Button,
  Alert,
  Typography,
  Container,
  Grid,
} from "@mui/material";
import { Store, Package, Truck, BarChart3, Users, Zap } from "lucide-react";

export default function TrialRegisterPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    profile: "",
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const change = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await publicApi.post(
        "/api/auth/trial-register",
        formData,
        { withCredentials: true }
      );

      if (res.data?.success) {
        setSuccessMsg(res.data.message || "Compte créé. Vérifiez votre email.");
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          profile: "",
        });
        setTimeout(() => navigate("/register-success"), 1200);
      } else {
        setErrorMsg(res.data?.message || "Erreur inconnue.");
      }
    } catch (err) {
      if (err.response?.status === 400)
        setErrorMsg(err.response.data?.message || "Données invalides.");
      else if (err.message === "Network Error")
        setErrorMsg("Serveur inaccessible. Réessayez.");
      else setErrorMsg("Erreur inattendue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#FFFFFF", py: { xs: 4, md: 8 } }}>
      <Container maxWidth="lg">
        <Grid container spacing={6} alignItems="center">
          {/* Image/Capture d'écran - Dessus sur mobile, à droite sur desktop */}
          <Grid item xs={12} md={6} sx={{ display: { xs: "block", md: "none" } }}>
            <Box
              sx={{
                bgcolor: "#f5f5f5",
                borderRadius: 3,
                height: 240,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                mb: 4,
                border: "1px solid #e0e0e0",
              }}
            >
              <BarChart3 size={48} color="#6A1B9A" strokeWidth={1.5} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Aperçu du Dashboard
              </Typography>
            </Box>
          </Grid>

          {/* Formulaire */}
          <Grid item xs={12} md={6}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
              <Box
                component="img"
                src="/logo.svg"
                alt="DepotManager Logo"
                sx={{
                  width: 56,
                  height: 56,
                  mb: 2,
                }}
              />
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  color: "#6A1B9A",
                  mb: 1,
                }}
              >
                DepotManager
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  color: "#333",
                  mb: 3,
                }}
              >
                🚀 Essai Gratuit 14 jours
              </Typography>

              {/* Texte descriptif */}
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ lineHeight: 1.8 }}
              >
                Testez DepotManager gratuitement pendant 14 jours.
                <br />
                Le logiciel conçu pour les dépôts de boissons en Côte d'Ivoire : gestion des
                stocks de bouteilles, casiers consignés, livraisons et ventes quotidiennes.
              </Typography>
            </Box>

            {/* Formulaire dans un Paper */}
            <Card
              elevation={2}
              sx={{
                borderRadius: 3,
                border: "1px solid #e8e8e8",
              }}
            >
              <CardContent sx={{ p: 4 }}>
                {successMsg && (
                  <Alert severity="success" sx={{ mb: 3 }}>
                    {successMsg}
                  </Alert>
                )}
                {errorMsg && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {errorMsg}
                  </Alert>
                )}

                <Box component="form" onSubmit={submit}>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Prénom"
                        name="firstName"
                        value={formData.firstName}
                        onChange={change}
                        required
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Nom"
                        name="lastName"
                        value={formData.lastName}
                        onChange={change}
                        required
                        fullWidth
                        size="small"
                      />
                    </Grid>
                  </Grid>

                  <TextField
                    label="Email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={change}
                    required
                    fullWidth
                    sx={{ mb: 2 }}
                    size="small"
                  />

                  <Select
                    name="profile"
                    value={formData.profile}
                    onChange={change}
                    required
                    fullWidth
                    displayEmpty
                    sx={{ mb: 2 }}
                    size="small"
                  >
                    <MenuItem value="">-- Sélectionnez votre profil --</MenuItem>
                    <MenuItem value="PROPRIETAIRE">Propriétaire</MenuItem>
                    <MenuItem value="GERANT_DEPOT">Gérant</MenuItem>
                  </Select>

                  <TextField
                    label="Mot de passe"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={change}
                    required
                    fullWidth
                    sx={{ mb: 3 }}
                    size="small"
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={loading}
                    sx={{
                      bgcolor: "#6A1B9A",
                      py: 1.5,
                      fontWeight: 700,
                      "&:hover": { bgcolor: "#7E57C2" },
                    }}
                  >
                    {loading ? "Création..." : "Créer mon compte"}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Image/Capture d'écran - À droite sur desktop */}
          <Grid item xs={12} md={6} sx={{ display: { xs: "none", md: "flex" } }}>
            <Box
              sx={{
                bgcolor: "#f5f5f5",
                borderRadius: 3,
                height: 400,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #e0e0e0",
              }}
            >
              <BarChart3 size={64} color="#6A1B9A" strokeWidth={1.5} />
              <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                Aperçu du Dashboard DepotManager
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
