import * as React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Typography,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import PaymentIcon from "@mui/icons-material/Payment";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import PageContainer from "../../../crud-dashboard/components/PageContainer";
import useNotifications from "../../../crud-dashboard/hooks/useNotifications/useNotifications";
import { publicApi } from "../../../api/axios";
import { getUserCountry } from "../../../config/countries";
import { normalizePhoneInternational, formatPhoneDisplay, validatePhone as validatePhoneUtil, getPhoneExample } from "../../../utils/phoneUtils";

const formatF = (n) => {
  if (n === null || n === undefined) return "0 F";
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num)) return "0 F";
  const country = getUserCountry();
  return num.toLocaleString(country.locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " " + country.currencySymbol;
};

export default function AbonnementPaymentPage() {
  const notifications = useNotifications();
  const userCountry = getUserCountry();
  
  // États
  const [prix, setPrix] = React.useState(null);
  const [loadingPrix, setLoadingPrix] = React.useState(true);
  const [telephone, setTelephone] = React.useState("");
  const [typeAbonnement, setTypeAbonnement] = React.useState("BAR");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [openSuccess, setOpenSuccess] = React.useState(false);
  const [clientInfo, setClientInfo] = React.useState(null);

  // Charger les prix et infos client au montage
  React.useEffect(() => {
    loadPrix();
    loadClientInfo();
  }, []);

  const loadPrix = async () => {
    try {
      const res = await publicApi.get("/api/abonnements/prix?pays=" + userCountry.code);
      setPrix(res.data);
    } catch (err) {
      notifications.show("Erreur lors du chargement des prix", { severity: "error" });
    } finally {
      setLoadingPrix(false);
    }
  };

  const loadClientInfo = async () => {
    // Récupérer clientId depuis localStorage ou contexte
    const clientId = localStorage.getItem("clientId");
    if (clientId) {
      try {
        const res = await publicApi.get(`/api/clients/${clientId}`);
        setClientInfo(res.data);
        setTelephone(res.data.telephone || "");
        // Détecter le type selon la catégorie
        if (res.data.categorieClient === "MAQUIS") {
          setTypeAbonnement("MAQUIS");
        }
      } catch (err) {
        console.log("Impossible de charger les infos client");
      }
    }
  };

  const handlePayment = async () => {
    if (!telephone.trim()) {
      notifications.show("Veuillez saisir un numéro de téléphone", { severity: "error" });
      return;
    }

    // Nettoyer le numéro
    const cleanedPhone = normalizePhoneInternational(telephone, userCountry.code);

    const clientId = localStorage.getItem("clientId");
    if (!clientId) {
      notifications.show("Vous devez être connecté pour payer", { severity: "error" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await publicApi.post("/api/abonnements/payer", {
        clientId: parseInt(clientId),
        type: typeAbonnement,
        telephone: cleanedPhone,
        pays: getUserCountry().code,
      });

      setResult(res.data);

      if (res.data.success) {
        setOpenSuccess(true);
        notifications.show("Paiement initié ! Vérifiez votre téléphone", { severity: "success" });
      } else {
        notifications.show(res.data.message || "Échec du paiement", { severity: "error" });
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors du paiement";
      notifications.show(msg, { severity: "error" });
      setResult({ success: false, message: msg });
    } finally {
      setLoading(false);
    }
  };

  if (loadingPrix) {
    return (
      <PageContainer title="Abonnement">
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Abonnement - Paiement">
      <Stack spacing={3} sx={{ maxWidth: 600, mx: "auto" }}>
        {/* En-tête */}
        <Typography variant="h5" sx={{ fontWeight: 700, textAlign: "center" }}>
          Payer mon abonnement
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ textAlign: "center" }}>
          Choisissez votre type d'abonnement et payez par Mobile Money
        </Typography>

        {/* Cartes de prix */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
          {/* Carte BAR */}
          <Card 
            sx={{ 
              flex: 1, 
              cursor: "pointer",
              border: typeAbonnement === "BAR" ? "3px solid #4caf50" : "1px solid #ddd",
              transition: "all 0.2s",
              "&:hover": { transform: "translateY(-4px)", boxShadow: 4 }
            }}
            onClick={() => setTypeAbonnement("BAR")}
          >
            <CardContent sx={{ textAlign: "center", py: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                🍺 BAR
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "#4caf50", mb: 1 }}>
                {formatF(prix?.bar?.montant || 5000)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {prix?.bar?.description || "Abonnement pour bars et petits établissements"}
              </Typography>
              <Chip 
                label="/mois" 
                size="small" 
                sx={{ mt: 1 }} 
                variant="outlined"
              />
            </CardContent>
            {typeAbonnement === "BAR" && (
              <CardActions sx={{ justifyContent: "center", pb: 2 }}>
                <CheckCircleIcon color="success" />
              </CardActions>
            )}
          </Card>

          {/* Carte MAQUIS */}
          <Card 
            sx={{ 
              flex: 1, 
              cursor: "pointer",
              border: typeAbonnement === "MAQUIS" ? "3px solid #ff9800" : "1px solid #ddd",
              transition: "all 0.2s",
              "&:hover": { transform: "translateY(-4px)", boxShadow: 4 }
            }}
            onClick={() => setTypeAbonnement("MAQUIS")}
          >
            <CardContent sx={{ textAlign: "center", py: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                🎵 MAQUIS
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "#ff9800", mb: 1 }}>
                {formatF(prix?.maquis?.montant || 10000)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {prix?.maquis?.description || "Abonnement pour maquis et restaurants"}
              </Typography>
              <Chip 
                label="/mois" 
                size="small" 
                sx={{ mt: 1 }} 
                variant="outlined"
              />
            </CardContent>
            {typeAbonnement === "MAQUIS" && (
              <CardActions sx={{ justifyContent: "center", pb: 2 }}>
                <CheckCircleIcon color="warning" />
              </CardActions>
            )}
          </Card>
        </Stack>

        {/* Formulaire de paiement */}
        <Card sx={{ mt: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: "flex", alignItems: "center", gap: 1 }}>
              <PaymentIcon />
              Informations de paiement
            </Typography>

            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Numéro de téléphone Mobile Money"
                placeholder={`Ex: ${getPhoneExample(userCountry.code)}`}
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <SmartphoneIcon sx={{ color: "action.active", mr: 1 }} />
                  ),
                }}
                helperText="Vous recevrez une notification sur ce numéro pour confirmer le paiement"
              />

              {result && !result.success && (
                <Alert severity="error" icon={<ErrorIcon />}>
                  {result.message}
                </Alert>
              )}

              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handlePayment}
                disabled={loading || !telephone.trim()}
                sx={{ 
                  py: 1.5, 
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  backgroundColor: typeAbonnement === "BAR" ? "#4caf50" : "#ff9800",
                  "&:hover": {
                    backgroundColor: typeAbonnement === "BAR" ? "#45a049" : "#f57c00"
                  }
                }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  <>Payer {formatF(prix?.[typeAbonnement.toLowerCase()]?.montant || (typeAbonnement === "BAR" ? 5000 : 10000))}</>
                )}
              </Button>

              <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
                Paiement sécurisé par PawaPay (Orange Money / MTN Mobile Money)
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* Dialog de succès */}
      <Dialog open={openSuccess} onClose={() => setOpenSuccess(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, textAlign: "center" }}>
          <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 1, display: "block", mx: "auto" }} />
          Paiement initié !
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ textAlign: "center", mb: 2 }}>
            Une notification vous a été envoyée sur votre téléphone
            <strong> {telephone} </strong>
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Instructions :</strong>
            <ol style={{ margin: "8px 0", paddingLeft: "20px" }}>
              <li>Vérifiez votre téléphone</li>
              <li>Confirmez le paiement</li>
              <li>Votre abonnement sera activé automatiquement</li>
            </ol>
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
            ID Transaction : {result?.depositId}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 2 }}>
          <Button 
            variant="contained" 
            onClick={() => setOpenSuccess(false)}
            sx={{ fontWeight: 700 }}
          >
            Compris
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
