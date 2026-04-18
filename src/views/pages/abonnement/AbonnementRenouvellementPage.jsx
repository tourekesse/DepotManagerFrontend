import * as React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Radio,
  RadioGroup,
  FormControlLabel,
  Paper,
  Divider
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import ErrorIcon from "@mui/icons-material/Error";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import PageContainer from "../../../crud-dashboard/components/PageContainer";
import useNotifications from "../../../crud-dashboard/hooks/useNotifications/useNotifications";
import { publicApi } from "../../../api/axios";

const formatF = (n) => {
  if (n === null || n === undefined) return "0 F";
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num)) return "0 F";
  return num.toLocaleString("fr-CI", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " F";
};

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("fr-CI", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
};

const daysUntil = (dateStr) => {
  if (!dateStr) return 0;
  const end = new Date(dateStr);
  const today = new Date();
  const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  return diff;
};

export default function AbonnementRenouvellementPage() {
  const notifications = useNotifications();
  
  const [abonnement, setAbonnement] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [telephone, setTelephone] = React.useState("");
  const [renewLoading, setRenewLoading] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [openSuccess, setOpenSuccess] = React.useState(false);
  const [periode, setPeriode] = React.useState("mensuel");
  const [tarif, setTarif] = React.useState(null);

  const clientId = localStorage.getItem("clientId");
  const user = JSON.parse(localStorage.getItem("dmUser") || "{}");

  React.useEffect(() => {
    loadAbonnement();
  }, []);

  const loadAbonnement = async () => {
    setLoading(true);
    
    console.log("=== DEBUG RENEWAL ===");
    console.log("clientId from localStorage:", clientId);
    console.log("user.userId:", user?.userId);
    
    let currentClientId = clientId;
    
    if (!currentClientId && user?.userId) {
      console.log("Fetching client for user:", user.userId);
      try {
        const clientRes = await publicApi.get(`/api/clients/utilisateur/${user.userId}`);
        console.log("Client response:", clientRes.data);
        if (clientRes.data && clientRes.data.id) {
          currentClientId = clientRes.data.id;
        }
      } catch (e) {
        console.log("Error fetching client:", e);
      }
    }
    
    console.log("Final clientId:", currentClientId);
    
    if (!currentClientId) {
      console.log("No clientId found - showing subscribe option");
      setLoading(false);
      return;
    }
    
    try {
      console.log("Fetching subscription for client:", currentClientId);
      const res = await publicApi.get(`/api/abonnements/client/${currentClientId}`);
      console.log("Subscription response:", res.data);
      if (res.data && !res.data.message) {
        setAbonnement(res.data);
        setTelephone(res.data.telephonePaiement || "");
        // Charger le tarif depuis l'API
        loadTarif(res.data.type);
      } else {
        console.log("No subscription data found");
      }
    } catch (err) {
      console.log("Error fetching subscription:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadTarif = async (type) => {
    try {
      const res = await publicApi.get(`/api/abonnements/tarif/${type}`);
      if (res.data) {
        setTarif(res.data);
      }
    } catch (err) {
      console.log("Erreur chargement tarif:", err);
    }
  };

  const handleRenew = async () => {
    if (!telephone.trim()) {
      notifications.show("Veuillez saisir un numéro de téléphone", { severity: "error" });
      return;
    }

    let cleanedPhone = telephone.replace(/\s/g, "");
    if (!cleanedPhone.startsWith("225")) {
      cleanedPhone = "225" + cleanedPhone;
    }

    // Déterminer le clientId
    let currentClientId = clientId;
    if (!currentClientId && user?.userId) {
      try {
        const clientRes = await publicApi.get(`/api/clients/utilisateur/${user.userId}`);
        if (clientRes.data && clientRes.data.id) {
          currentClientId = clientRes.data.id;
        }
      } catch (e) {
        console.log("Pas de client associé");
      }
    }

    if (!currentClientId) {
      notifications.show("Votre compte n'est pas lié à un client", { severity: "error" });
      return;
    }

    setRenewLoading(true);
    setResult(null);

    try {
      const res = await publicApi.post("/api/abonnements/renouveler", {
        clientId: parseInt(currentClientId),
        telephone: cleanedPhone,
        periode: periode
      });

      setResult(res.data);

      if (res.data.success) {
        setOpenSuccess(true);
        notifications.show("Renouvellement initié !", { severity: "success" });
      } else {
        notifications.show(res.data.message || "Échec du renouvellement", { severity: "error" });
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors du renouvellement";
      notifications.show(msg, { severity: "error" });
      setResult({ success: false, message: msg });
    } finally {
      setRenewLoading(false);
    }
  };

  if (loading) {
    return (
      <PageContainer title="Renouvellement">
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  if (!abonnement) {
    return (
      <PageContainer title="Renouvellement">
        <Box sx={{ maxWidth: 600, mx: "auto", mt: 4 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Aucun abonnement trouvé. Veuillez d'abord souscrire à un abonnement.
          </Alert>
          <Button 
            variant="contained" 
            fullWidth 
            onClick={() => window.location.href = "/accueil/abonnements/payer"}
            sx={{ py: 1.5, fontWeight: 700 }}
          >
            Souscrire un abonnement
          </Button>
        </Box>
      </PageContainer>
    );
  }

  const getBasePrice = () => {
    // Utiliser le tarif depuis l'API si disponible
    if (tarif && tarif.prixMensuel) {
      return parseFloat(tarif.prixMensuel);
    }
    // Fallback sur l'ancien montant ou valeurs par défaut
    return abonnement?.montant || (abonnement?.type === "BAR" ? 5000 : 10000);
  };

  const getRenewalDetails = () => {
    const basePrice = getBasePrice();
    const prixAnnuel = tarif?.prixAnnuel ? parseFloat(tarif.prixAnnuel) : basePrice * 10;
    
    if (periode === "annuel") {
      return {
        montant: prixAnnuel,
        mois: 12,
        economie: (basePrice * 12) - prixAnnuel,
        pourcentage: Math.round(((basePrice * 12) - prixAnnuel) / (basePrice * 12) * 100)
      };
    }
    return {
      montant: basePrice,
      mois: 1,
      economie: 0,
      pourcentage: 0
    };
  };

  const details = getRenewalDetails();

  const daysLeft = abonnement ? daysUntil(abonnement.dateFin) : 0;
  const isExpired = daysLeft < 0;
  const isExpiringSoon = daysLeft >= 0 && daysLeft <= 7;

  return (
    <PageContainer title="Renouvellement d'abonnement">
      <Box sx={{ maxWidth: 700, mx: "auto", py: 2 }}>
        
        {/* Alerte d'expiration style Hostinger */}
        {isExpired && (
          <Alert 
            severity="error" 
            icon={<ErrorIcon />}
            sx={{ mb: 3, borderRadius: 2 }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Votre abonnement a expiré
            </Typography>
            <Typography variant="body2">
              Expiré depuis {Math.abs(daysLeft)} jours. Renouvelez maintenant pour continuer.
            </Typography>
          </Alert>
        )}

        {isExpiringSoon && !isExpired && (
          <Alert 
            severity="warning" 
            icon={<WarningIcon />}
            sx={{ mb: 3, borderRadius: 2 }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Votre abonnement expire bientôt
            </Typography>
            <Typography variant="body2">
              Il vous reste {daysLeft} jours. Renouvelez maintenant pour éviter l'interruption.
            </Typography>
          </Alert>
        )}

        <Card sx={{ borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
          <CardContent sx={{ p: 4 }}>
            
            {/* Titre dynamique */}
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              Renouveler votre abonnement {abonnement.type === "BAR" ? "Bar" : abonnement.type === "MAQUIS" ? "Maquis" : abonnement.type === "SOUS_DEPOT" ? "Sous-dépôt" : abonnement.type}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Vérifiez les détails et procédez au paiement
            </Typography>

            {/* Info abonnement actuel */}
            <Paper sx={{ p: 2, bgcolor: "#f8f9fa", borderRadius: 2, mb: 3 }}>
              <Stack direction="row" spacing={3}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Type d'abonnement
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {abonnement.type === "BAR" ? "🍺 Bar" : abonnement.type === "MAQUIS" ? "🎵 Maquis" : abonnement.type === "SOUS_DEPOT" ? "📦 Sous-dépôt" : abonnement.type}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Expire le
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {formatDate(abonnement.dateFin)}
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            {/* Options de durée - Style Hostinger */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
              Choisir la période :
            </Typography>

            <RadioGroup value={periode} onChange={(e) => setPeriode(e.target.value)}>
              {/* Option Annuelle */}
              <Paper 
                sx={{ 
                  p: 2, 
                  mb: 1.5, 
                  borderRadius: 2,
                  border: periode === "annuel" ? "2px solid #673ab7" : "1px solid #e0e0e0",
                  bgcolor: periode === "annuel" ? "#f3e5f5" : "white",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onClick={() => setPeriode("annuel")}
              >
                <FormControlLabel 
                  value="annuel" 
                  control={<Radio />} 
                  label={
                    <Box sx={{ flex: 1, width: "100%" }}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Box flex={1}>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            12 mois
                          </Typography>
                          <Chip 
                            label="-17%" 
                            size="small" 
                            sx={{ 
                              bgcolor: "#673ab7", 
                              color: "white", 
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              height: "20px"
                            }} 
                          />
                          <Typography variant="caption" color="success.main" sx={{ ml: 1, fontWeight: 600 }}>
                            2 MOIS OFFERTS !
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography variant="body2" color="text.secondary" sx={{ textDecoration: "line-through" }}>
                            {formatF(getBasePrice() * 12)}
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: "#673ab7" }}>
                            {formatF(getBasePrice() * 10)}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  }
                  sx={{ width: "100%", m: 0 }}
                />
              </Paper>

              {/* Option Mensuelle */}
              <Paper 
                sx={{ 
                  p: 2, 
                  borderRadius: 2,
                  border: periode === "mensuel" ? "2px solid #2196f3" : "1px solid #e0e0e0",
                  bgcolor: periode === "mensuel" ? "#e3f2fd" : "white",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onClick={() => setPeriode("mensuel")}
              >
                <FormControlLabel 
                  value="mensuel" 
                  control={<Radio />} 
                  label={
                    <Box sx={{ flex: 1, width: "100%" }}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Box flex={1}>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            1 mois
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {formatF(getBasePrice())}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            /mois
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  }
                  sx={{ width: "100%", m: 0 }}
                />
              </Paper>
            </RadioGroup>

            <Divider sx={{ my: 3 }} />

            {/* Méthode de paiement */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
              Méthode de paiement
            </Typography>
            
            <Paper sx={{ p: 2, borderRadius: 2, border: "1px solid #e0e0e0" }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  bgcolor: "#ff9800", 
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <SmartphoneIcon sx={{ color: "white" }} />
                </Box>
                <Box flex={1}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Mobile Money
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    placeholder="07 XX XX XX XX"
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              </Stack>
            </Paper>

            <Divider sx={{ my: 3 }} />

            {/* Résumé et total */}
            <Stack spacing={1.5} sx={{ mb: 3 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Abonnement {abonnement.type === "BAR" ? "Bar" : abonnement.type === "MAQUIS" ? "Maquis" : abonnement.type === "SOUS_DEPOT" ? "Sous-dépôt" : abonnement.type} ({details.mois} mois)
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatF(details.montant)}
                </Typography>
              </Stack>
              
              {details.economie > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                    Économie ({details.pourcentage}%)
                  </Typography>
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                    -{formatF(details.economie)}
                  </Typography>
                </Stack>
              )}

              <Divider />

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Total
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: "#673ab7" }}>
                  {formatF(details.montant)}
                </Typography>
              </Stack>
            </Stack>

            {result && !result.success && (
              <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 2 }}>
                {result.message}
              </Alert>
            )}

            {/* Boutons d'action */}
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                size="large"
                sx={{ flex: 1, py: 1.5, fontWeight: 600 }}
                onClick={() => window.history.back()}
              >
                Annuler
              </Button>
              <Button
                variant="contained"
                size="large"
                onClick={handleRenew}
                disabled={renewLoading || !telephone.trim()}
                sx={{ 
                  flex: 2, 
                  py: 1.5, 
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  backgroundColor: "#673ab7",
                  "&:hover": { backgroundColor: "#5e35b1" }
                }}
              >
                {renewLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Renouveler maintenant"
                )}
              </Button>
            </Stack>

            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2, textAlign: "center" }}>
              En renouvelant, vous acceptez nos conditions de service. 
              Vous pouvez annuler à tout moment.
            </Typography>

          </CardContent>
        </Card>
      </Box>

      {/* Dialog de succès */}
      <Dialog open={openSuccess} onClose={() => setOpenSuccess(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, textAlign: "center", pt: 4 }}>
          <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 1, display: "block", mx: "auto" }} />
          Renouvellement initié !
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
              <li>Votre abonnement sera prolongé automatiquement</li>
            </ol>
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
            Montant payé : {formatF(details.montant)}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 3 }}>
          <Button 
            variant="contained" 
            onClick={() => {
              setOpenSuccess(false);
              loadAbonnement();
            }}
            sx={{ fontWeight: 700, px: 4 }}
          >
            Compris
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
