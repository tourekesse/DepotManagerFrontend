import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Button,
  Typography,
  Container,
} from "@mui/material";
import { XCircle } from "lucide-react";

export default function ActivationErrorPage() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(prev - 1, 0));
    }, 1000);

    const timer = setTimeout(() => {
      navigate("/register");
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [navigate]);

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
                bgcolor: "#ffebee",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 3,
              }}
            >
              <XCircle size={40} color="#c62828" />
            </Box>

            <Typography variant="h4" sx={{ fontWeight: 700, color: "#c62828", mb: 2 }}>
              Activation échouée ❌
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8 }}>
              Le lien d'activation est invalide ou expiré.
              <br />
              Veuillez recommencer votre inscription.
            </Typography>

            <Typography variant="body1" sx={{ fontWeight: 600, color: "#c62828", mb: 4 }}>
              Redirection dans {countdown} secondes...
            </Typography>

            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={() => navigate("/register")}
              sx={{
                bgcolor: "#c62828",
                py: 1.5,
                fontWeight: 700,
                "&:hover": { bgcolor: "#b71c1c" },
              }}
            >
              Aller à l'inscription
            </Button>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
