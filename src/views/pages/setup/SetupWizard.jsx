import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  Box,
  Typography,
  Container,
  Grid,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import {
  Store,
  MapPin,
  Phone,
  Building2,
  CheckCircle,
  ChevronRight,
} from "lucide-react";
import { finalizeSetup } from "./SetupService";

export default function SetupWizard() {
  const navigate = useNavigate();
  const [etablissement, setTypeEtablissement] = useState("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const typesOptions = [
    { label: "Dépôt", value: "DEPOT" },
    { label: "Sous-Dépôt", value: "SOUS_DEPOT" },
    { label: "Bar", value: "BAR" },
    { label: "Sous-Dépôt et Bar", value: "SOUS_DEPOT_BAR" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (submitting) return;

    const dmUser = JSON.parse(localStorage.getItem("dmUser"));
    const phoneCandidate = telephone || dmUser?.phone_number || dmUser?.phone || "";
    const phoneClean = phoneCandidate.replace(/\s/g, "");
    const isValid = etablissement && nom && phoneClean.length >= 8 && adresse;

    const codeBase = nom.normalize("NFD").replace(/[\u0300-\u036f\s-]/g, "").toUpperCase().substring(0, 5);
    const uniqueSuffix = Date.now().toString(36).toUpperCase();
    const codePvUnique = `PV-${codeBase}-${uniqueSuffix}`;

    if (!isValid) {
      setErrorMsg("Tous les champs sont requis avec un téléphone valide.");
      return;
    }

    if (!dmUser?.userId) {
      setErrorMsg("Impossible d'identifier l'utilisateur (userId manquant).");
      return;
    }

    let profil, fonction;
    if (etablissement === 'BAR') {
      profil = 'Administrateur Général';
      fonction = 'Propriétaire';
    } else if (etablissement === 'DEPOT') {
      profil = 'Administrateur Général';
      fonction = 'Propriétaire';
    } else if (etablissement === 'SOUS_DEPOT') {
      profil = 'Administrateur';
      fonction = 'Propriétaire';
    } else if (etablissement === 'SOUS_DEPOT_BAR') {
      profil = 'Administrateur';
      fonction = 'Propriétaire';
    } else {
      profil = 'CLIENT_BAR';
      fonction = 'Client';
    }

    const payload = {
      userId: dmUser.userId,
      nomEtablissement: nom,
      adresseEtablissement: adresse,
      villeEtablissement: "Abidjan",
      nomPv: nom + " - PV Principal",
      codePv: codePvUnique,
      adressePv: adresse,
      villePv: "Abidjan",
      phonePv: phoneClean,
      typeEtablissement: etablissement,
      profil: profil,
      fonction: fonction,
    };

    setSubmitting(true);
    try {
      const res = await finalizeSetup(payload);
      setSuccessMsg(res.message || "Configuration complétée.");

      const pvId = res.pointDeVenteId || res.pvId || res.point_de_vente_id;
      const pvNom = res.pointDeVenteNom || payload.nomPv;

      dmUser.onboardingCompleted = true;
      if (!dmUser.role) {
        dmUser.role = "CLIENT_BAR";
      }
      if (pvId) {
        dmUser.point_de_vente_actif_id = pvId;
        dmUser.pointDeVenteActifId = pvId;
        localStorage.setItem("activePV", JSON.stringify({ id: pvId, nom: pvNom, code: codePvUnique, adresse: payload.adressePv }));
      }
      localStorage.setItem("dmUser", JSON.stringify(dmUser));
      localStorage.setItem("role", dmUser.role);
      localStorage.setItem("activityType", etablissement);

      setTimeout(() => {
        navigate("/accueil");
        window.location.reload();
      }, 800);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Le serveur a refusé la requête.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#FFFFFF",
        py: { xs: 4, md: 8 },
      }}
    >
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ textAlign: "center", mb: 6 }}>
          <Box
            component="img"
            src="/logo.svg"
            alt="DepotManager Logo"
            sx={{ width: 64, height: 64, mb: 2 }}
          />
          <Typography
            variant="h4"
            sx={{ fontWeight: 800, color: "#6A1B9A", mb: 1 }}
          >
            Configure ton dépôt
          </Typography>
          <Typography variant="body1" color="text.secondary">
            On prépare ton point de vente en quelques étapes
          </Typography>
        </Box>

        {/* Stepper */}
        <Stepper activeStep={0} sx={{ mb: 5 }}>
          <Step completed={false}>
            <StepLabel>Informations</StepLabel>
          </Step>
          <Step>
            <StepLabel>Confirmation</StepLabel>
          </Step>
        </Stepper>

        {/* Form Card */}
        <Card
          sx={{
            borderRadius: 3,
            border: "1px solid #e0e0e0",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          }}
        >
          <CardContent sx={{ p: 4 }}>
            {/* Badges */}
            <Box sx={{ display: "flex", gap: 2, mb: 4, flexWrap: "wrap" }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: "#e8f5e9",
                  color: "#2e7d32",
                }}
              >
                <CheckCircle size={16} />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  14 jours gratuit
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: "#f3e5f5",
                  color: "#6A1B9A",
                }}
              >
                <CheckCircle size={16} />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  Sans carte bancaire
                </Typography>
              </Box>
            </Box>

            {errorMsg && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {errorMsg}
              </Alert>
            )}

            {successMsg && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {successMsg}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                {/* Type d'activité */}
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Type d'activité *</InputLabel>
                    <Select
                      value={etablissement}
                      label="Type d'activité *"
                      onChange={(e) => setTypeEtablissement(e.target.value)}
                      required
                      startAdornment={
                        <Box sx={{ pl: 1, pr: 1, display: "flex" }}>
                          <Building2 size={20} color="#6A1B9A" />
                        </Box>
                      }
                    >
                      <MenuItem value="">
                        <em>-- Sélectionnez le type --</em>
                      </MenuItem>
                      {typesOptions.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Nom */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nom de l'établissement *"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    required
                    InputProps={{
                      startAdornment: (
                        <Box sx={{ pl: 1, pr: 1, display: "flex" }}>
                          <Store size={20} color="#6A1B9A" />
                        </Box>
                      ),
                    }}
                  />
                </Grid>

                {/* Téléphone */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Téléphone *"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    placeholder="07 XX XX XX XX"
                    required
                    InputProps={{
                      startAdornment: (
                        <Box sx={{ pl: 1, pr: 1, display: "flex" }}>
                          <Phone size={20} color="#6A1B9A" />
                        </Box>
                      ),
                    }}
                  />
                </Grid>

                {/* Adresse */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Adresse *"
                    value={adresse}
                    onChange={(e) => setAdresse(e.target.value)}
                    placeholder="Quartier, rue..."
                    required
                    InputProps={{
                      startAdornment: (
                        <Box sx={{ pl: 1, pr: 1, display: "flex" }}>
                          <MapPin size={20} color="#6A1B9A" />
                        </Box>
                      ),
                    }}
                  />
                </Grid>

                {/* Submit */}
                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={submitting}
                    endIcon={submitting ? null : <ChevronRight size={20} />}
                    sx={{
                      bgcolor: "#6A1B9A",
                      py: 1.5,
                      fontWeight: 700,
                      "&:hover": { bgcolor: "#7E57C2" },
                    }}
                  >
                    {submitting ? "Création en cours..." : "Créer mon dépôt"}
                  </Button>
                </Grid>

                {/* Help */}
                <Grid item xs={12}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1.5,
                      mt: 2,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Besoin d'aide ?
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "#6A1B9A", fontWeight: 600 }}
                    >
                      supportdepotmanager@gm-soft.ca
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
