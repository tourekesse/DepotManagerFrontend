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
import { CheckCircle } from "lucide-react";

export default function ActivationSuccessPage() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(prev - 1, 0));
    }, 1000);

    const timer = setTimeout(() => {
      navigate("/login");
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

            <Typography variant="h4" sx={{ fontWeight: 700, color: "#2e7d32", mb: 2 }}>
              Activation réussie ✅
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8 }}>
              Votre compte a été activé avec succès.
              <br />
              Vous serez redirigé vers la connexion.
            </Typography>

            <Typography variant="body1" sx={{ fontWeight: 600, color: "#6A1B9A", mb: 4 }}>
              Redirection dans {countdown} secondes...
            </Typography>

            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={() => navigate("/login")}
              sx={{
                bgcolor: "#2e7d32",
                py: 1.5,
                fontWeight: 700,
                "&:hover": { bgcolor: "#388e3c" },
              }}
            >
              Aller à la connexion
            </Button>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
