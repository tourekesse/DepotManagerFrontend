import {
  Box,
  Card,
  CardContent,
  Button,
  Typography,
  Container,
} from "@mui/material";
import { Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Page404 = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
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
              component="img"
              src="/logo.svg"
              alt="DepotManager Logo"
              sx={{ width: 80, height: 80, mb: 3 }}
            />

            <Typography
              variant="h1"
              sx={{ fontWeight: 800, color: "#6A1B9A", mb: 2 }}
            >
              404
            </Typography>

            <Typography variant="h4" sx={{ fontWeight: 700, color: "#1a1a2e", mb: 2 }}>
              Page non trouvée
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              La page que vous recherchez n'existe pas ou a été déplacée.
            </Typography>

            <Button
              variant="contained"
              size="large"
              startIcon={<Home size={20} />}
              onClick={() => navigate("/")}
              sx={{
                bgcolor: "#6A1B9A",
                py: 1.5,
                px: 4,
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
};

export default Page404;
