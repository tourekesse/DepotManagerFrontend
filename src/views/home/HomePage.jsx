import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
} from "@mui/material";
import { Store, User, PlayCircle, Package, Truck, Wallet, ChevronRight } from "lucide-react";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#FFFFFF" }}>
      {/* Hero Section */}
      <Box
        sx={{
          py: { xs: 8, md: 8 },
          px: 2,
          textAlign: "center",
          background: "linear-gradient(180deg, #f8f5ff 0%, #FFFFFF 100%)",
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              color: "#6A1B9A",
              mb: 3,
              fontSize: { xs: "2rem", md: "3rem" },
            }}
          >
            L'œil du patron sur votre dépôt de boissons
          </Typography>
          <Typography
            variant="h5"
            sx={{
              color: "#424242",
              fontWeight: 400,
              maxWidth: 800,
              mx: "auto",
              lineHeight: 1.6,
            }}
          >
            Suivez vos stocks de bouteilles, casiers consignés, livraisons et caisse en temps réel — même à distance.
          </Typography>
        </Container>
      </Box>

      {/* Sections d'accès */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Grid container spacing={4}>
          {/* Card 1 : Accès Entreprise */}
          <Grid item xs={12} md={4}>
            <Card
              onClick={() => navigate("/login")}
              sx={{
                height: "100%",
                cursor: "pointer",
                borderRadius: 3,
                border: "1px solid #e0e0e0",
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-8px)",
                  boxShadow: "0 20px 60px rgba(106, 27, 154, 0.15)",
                  borderColor: "#6A1B9A",
                },
              }}
            >
              <CardContent sx={{ p: 4.5, textAlign: "center" }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    bgcolor: "#f3e5f5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mx: "auto",
                    mb: 3,
                  }}
                >
                  <Store size={40} color="#6A1B9A" strokeWidth={1.5} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: "#1a1a2e" }}>
                  Accès Entreprise
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.8 }}>
                  Gérants, livreurs et propriétaires de dépôts : connexion sécurisée à votre espace de gestion.
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  endIcon={<ChevronRight size={20} />}
                  sx={{
                    bgcolor: "#6A1B9A",
                    py: 1.5,
                    fontWeight: 700,
                    "&:hover": { bgcolor: "#7E57C2" },
                  }}
                >
                  Continuer
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Card 2 : Espace Client */}
          <Grid item xs={12} md={4}>
            <Card
              onClick={() => navigate("/login-client")}
              sx={{
                height: "100%",
                cursor: "pointer",
                borderRadius: 3,
                border: "1px solid #e0e0e0",
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-8px)",
                  boxShadow: "0 20px 60px rgba(106, 27, 154, 0.15)",
                  borderColor: "#6A1B9A",
                },
              }}
            >
              <CardContent sx={{ p: 4.5, textAlign: "center" }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    bgcolor: "#f3e5f5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mx: "auto",
                    mb: 3,
                  }}
                >
                  <User size={40} color="#6A1B9A" strokeWidth={1.5} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: "#1a1a2e" }}>
                  Espace Client
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.8 }}>
                  Suivez vos commandes, livraisons et validations en temps réel depuis votre téléphone.
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  endIcon={<ChevronRight size={20} />}
                  sx={{
                    bgcolor: "#6A1B9A",
                    py: 1.5,
                    fontWeight: 700,
                    "&:hover": { bgcolor: "#7E57C2" },
                  }}
                >
                  Continuer
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Card 3 : Version d'essai */}
          <Grid item xs={12} md={4}>
            <Card
              onClick={() => navigate("/essai")}
              sx={{
                height: "100%",
                cursor: "pointer",
                borderRadius: 3,
                border: "1px solid #e0e0e0",
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-8px)",
                  boxShadow: "0 20px 60px rgba(106, 27, 154, 0.15)",
                  borderColor: "#6A1B9A",
                },
              }}
            >
              <CardContent sx={{ p: 4.5, textAlign: "center" }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    bgcolor: "#f3e5f5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mx: "auto",
                    mb: 3,
                  }}
                >
                  <PlayCircle size={40} color="#6A1B9A" strokeWidth={1.5} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5, color: "#1a1a2e" }}>
                  Version d'essai 14 jours
                </Typography>
                <Chip
                  label="Sans carte bancaire"
                  size="small"
                  sx={{
                    bgcolor: "#e8f5e9",
                    color: "#2e7d32",
                    fontWeight: 600,
                    mb: 2,
                  }}
                />
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.8 }}>
                  Testez DepotManager gratuitement pendant 14 jours sans engagement.
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  endIcon={<ChevronRight size={20} />}
                  sx={{
                    bgcolor: "#6A1B9A",
                    py: 1.5,
                    fontWeight: 700,
                    "&:hover": { bgcolor: "#7E57C2" },
                  }}
                >
                  Commencer
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Section Aperçu */}
      <Box sx={{ py: 8, bgcolor: "#fafafa" }}>
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            sx={{ fontWeight: 800, mb: 2, color: "#1a1a2e", textAlign: "center" }}
          >
            Aperçu de DepotManager
          </Typography>
          <Typography
            variant="h6"
            sx={{ color: "#616161", mb: 6, textAlign: "center", fontWeight: 400 }}
          >
            Découvrez l'interface simple et puissante
          </Typography>

          <Grid container spacing={4}>
            {/* Card 1 : Gestion des stocks */}
            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: 3, overflow: "hidden" }}>
                <Box
                  component="img"
                  src="https://images.unsplash.com/photo-1553413077-190dd305871c?w=600&h=300&fit=crop"
                  alt="Gestion des stocks"
                  sx={{
                    width: "100%",
                    height: 240,
                    objectFit: "cover",
                  }}
                />
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "#1a1a2e" }}>
                    Gestion des stocks et casiers
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Suivez vos bouteilles et casiers consignés en temps réel.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Card 2 : Validation des livraisons */}
            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: 3, overflow: "hidden" }}>
                <Box
                  component="img"
                  src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&h=300&fit=crop"
                  alt="Validation des livraisons"
                  sx={{
                    width: "100%",
                    height: 240,
                    objectFit: "cover",
                  }}
                />
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "#1a1a2e" }}>
                    Validation des livraisons
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Confirmez les livraisons avec code OTP et suivi client.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Card 3 : Rapport de caisse */}
            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: 3, overflow: "hidden" }}>
                <Box
                  component="img"
                  src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=300&fit=crop"
                  alt="Rapport de caisse"
                  sx={{
                    width: "100%",
                    height: 240,
                    objectFit: "cover",
                  }}
                />
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "#1a1a2e" }}>
                    Rapport de caisse
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Visualisez vos ventes et encaissements par période.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ py: 5, textAlign: "center", borderTop: "1px solid #e0e0e0" }}>
        <Typography variant="body1" color="text.secondary">
          © 2026 DepotManager — Logiciel de gestion pour dépôts de boissons en Côte d'Ivoire
        </Typography>
      </Box>
    </Box>
  );
}
