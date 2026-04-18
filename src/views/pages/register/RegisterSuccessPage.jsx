import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Container,
} from "@mui/material";
import { CheckCircle } from "lucide-react";

export default function RegisterSuccessPage() {
  const navigate = useNavigate();

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
            textAlign: "center",
          }}
        >
          <CardContent sx={{ p: 5 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                bgcolor: "#e8f5e9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 3,
              }}
            >
              <CheckCircle size={40} color="#2e7d32" />
            </Box>

            <Typography variant="h4" sx={{ fontWeight: 700, color: "#1a1a2e", mb: 2 }}>
              Inscription réussie 🎉
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.8 }}>
              Un e-mail de vérification a été envoyé à votre adresse.
              <br />
              Cliquez sur le lien reçu pour activer votre compte.
            </Typography>

            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={() => navigate("/")}
              sx={{
                bgcolor: "#6A1B9A",
                py: 1.5,
                fontWeight: 700,
                "&:hover": { bgcolor: "#7E57C2" },
              }}
            >
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
