import * as React from "react";
import {
  Box, Button, Typography, Alert, CircularProgress, Chip, Stack,
  Dialog, DialogContent, Paper, Divider, Switch, FormControlLabel,
} from "@mui/material";
import { InputMask } from "primereact/inputmask";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CheckIcon from "@mui/icons-material/Check";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import PageContainer from "../../../crud-dashboard/components/PageContainer";
import useNotifications from "../../../crud-dashboard/hooks/useNotifications/useNotifications";
import { privateApi } from "../../../api/axios";
import { getUserCountry } from "../../../config/countries";
import { normalizePhoneInternational, formatPhoneDisplay, validatePhone as validatePhoneUtil, getPhoneMask } from "../../../utils/phoneUtils";

const HOSTINGER_PURPLE = "#673DE6";
const HOSTINGER_PURPLE_DARK = "#5025D1";
const TEAL = "#1ABC9C";

const formatF = (n) => {
  if (n === null || n === undefined) return "0 F";
  const num = typeof n === "string" ? parseFloat(n) : n;
  const country = getUserCountry();
  return isNaN(num) ? "0 F" : num.toLocaleString(country.locale) + " " + country.currencySymbol;
};

const getLocalTenDigits = (phone) => {
  if (!phone) return "";
  const digits = phone.toString().replace(/\D/g, "");
  const country = getUserCountry();
  const len = country.phoneDigits;
  return digits.length >= len ? digits.slice(-len) : digits;
};

const formatDate = (dateValue) => {
  if (!dateValue) return "-";
  if (Array.isArray(dateValue) && dateValue.length >= 3) {
    const [year, month, day] = dateValue;
    return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
  }
  if (typeof dateValue === "string") {
    const d = new Date(dateValue);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("fr-CI", { day: "2-digit", month: "2-digit", year: "numeric" });
    }
  }
  return "-";
};

const daysUntil = (dateValue) => {
  if (!dateValue) return 0;
  let end;
  if (Array.isArray(dateValue) && dateValue.length >= 3) {
    const [year, month, day] = dateValue;
    end = new Date(year, month - 1, day);
  } else {
    end = new Date(dateValue);
  }
  const today = new Date();
  return Math.ceil((end - today) / (1000 * 60 * 60 * 24));
};

const getTypeLabel = (type) => {
  const mapping = { BAR: "Bar", MAQUIS: "Maquis", SOUS_DEPOT: "Sous-dépôt" };
  return mapping[type] || type;
};

const PLAN_FEATURES = {
  SOUS_DEPOT: [
    "Gestion stock & casiers consignés",
    "Commandes clients bar en temps réel",
    "Caisse mobile & encaissement dettes",
    "Livraisons, livreurs & suivi GPS",
    "Approvisionnement & fournisseurs",
    "Support prioritaire Abidjan",
  ],
  BAR: [
    "Catalogue produits & commandes",
    "Ventes bar & inventaire",
    "Paiement Mobile Money intégré",
    "Historique & rapports",
    "Application mobile PWA",
  ],
  MAQUIS: [
    "Gestion complète maquis / restaurant",
    "Stock, ventes & dettes clients",
    "Commandes & livraisons",
    "Multi-utilisateurs",
    "Support dédié",
  ],
};

function FeatureList({ features }) {
  return (
    <Stack spacing={1.5} sx={{ mt: 2 }}>
      {features.map((f) => (
        <Stack key={f} direction="row" spacing={1.5} alignItems="flex-start">
          <CheckIcon sx={{ fontSize: 20, color: TEAL, mt: 0.2 }} />
          <Typography variant="body2" sx={{ color: "#3B3B3B", lineHeight: 1.5 }}>{f}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}

function PeriodToggle({ periode, onChange, economiePct }) {
  const isAnnual = periode === "annuel";
  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2, mb: 4 }}>
      <Typography sx={{ fontWeight: isAnnual ? 500 : 700, color: isAnnual ? "#888" : "#1A1A1A" }}>
        Mensuel
      </Typography>
      <Switch
        checked={isAnnual}
        onChange={(e) => onChange(e.target.checked ? "annuel" : "mensuel")}
        sx={{
          "& .MuiSwitch-switchBase.Mui-checked": { color: HOSTINGER_PURPLE },
          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: HOSTINGER_PURPLE },
        }}
      />
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography sx={{ fontWeight: isAnnual ? 700 : 500, color: isAnnual ? "#1A1A1A" : "#888" }}>
          Annuel
        </Typography>
        {economiePct > 0 && (
          <Chip
            label={`Économisez ${economiePct}%`}
            size="small"
            sx={{ bgcolor: "#E8F5E9", color: "#2E7D32", fontWeight: 700, fontSize: 11 }}
          />
        )}
      </Stack>
    </Box>
  );
}

export default function MonAbonnementPage() {
  const userCountry = getUserCountry();
  const notifications = useNotifications();
  const [abonnements, setAbonnements] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showCheckout, setShowCheckout] = React.useState(false);
  const [selectedAbonnement, setSelectedAbonnement] = React.useState(null);
  const [telephone, setTelephone] = React.useState("");
  const [userSavedPhone, setUserSavedPhone] = React.useState("");
  const [payLoading, setPayLoading] = React.useState(false);
  const [openSuccess, setOpenSuccess] = React.useState(false);
  const [periode, setPeriode] = React.useState("annuel");
  const [tarif, setTarif] = React.useState(null);
  const [typeEtablissement, setTypeEtablissement] = React.useState(null);
  const [pointDeVenteId, setPointDeVenteId] = React.useState(null);
  const [pointDeVenteNom, setPointDeVenteNom] = React.useState("");

  const user = JSON.parse(localStorage.getItem("dmUser") || "{}");

  const resolvePvId = React.useCallback(() => {
    try {
      const activePV = JSON.parse(localStorage.getItem("activePV") || "null");
      if (activePV?.id) return activePV.id;
    } catch { /* ignore */ }
    return user?.pointDeVenteActifId || user?.defaultPointDeVenteId || null;
  }, [user]);

  React.useEffect(() => {
    const initData = async () => {
      setLoading(true);
      const pvId = resolvePvId();
      setPointDeVenteId(pvId);
      const userId = user?.userId || user?.id;

      if (pvId) {
        try {
          const typeRes = await privateApi.get(`/api/points-vente/${pvId}/type-etablissement`);
          const typeEtab = typeRes.data?.typeEtablissement;
          setTypeEtablissement(typeEtab);
          setPointDeVenteNom(typeRes.data?.nom || "");
        } catch (e) {
          console.error("Erreur type établissement", e);
        }
      }

      if (userId) {
        try {
          const res = await privateApi.get(`/api/users/${userId}`);
          if (res.data?.phoneNumber) {
            const clean = getLocalTenDigits(res.data.phoneNumber);
            setUserSavedPhone(clean);
            setTelephone(formatPhoneDisplay(res.data.phoneNumber, userCountry.code));
          }
        } catch (e) {
          console.error("Erreur fetch user", e);
        }
      }

      await loadAbonnements(pvId);
      setLoading(false);
    };
    initData();
  }, []);

  const loadAbonnements = async (pvId) => {
    const id = pvId || pointDeVenteId || resolvePvId();
    if (!id) return;
    try {
      const res = await privateApi.get(`/api/abonnements/point-de-vente/${id}`);
      if (res.data && !res.data.message) {
        setAbonnements([res.data]);
        loadTarif(res.data.type);
      } else {
        setAbonnements([]);
        const typeFromEtab = typeEtablissement === "SOUS_DEPOT" ? "SOUS_DEPOT"
          : typeEtablissement === "BAR" ? "BAR" : "MAQUIS";
        if (typeFromEtab) loadTarif(typeFromEtab);
      }
    } catch {
      setAbonnements([]);
    }
  };

  const loadTarif = async (type) => {
    try {
      const res = await privateApi.get(`/api/abonnements/tarif/${type}?pays=${userCountry.code}`);
      if (res.data) setTarif(res.data);
    } catch { /* ignore */ }
  };

  const planType = selectedAbonnement?.type
    || (typeEtablissement === "SOUS_DEPOT" ? "SOUS_DEPOT"
      : typeEtablissement === "BAR" ? "BAR" : "MAQUIS");

  const montant = tarif
    ? (periode === "annuel" ? tarif.prixAnnuel : tarif.prixMensuel)
    : 0;

  const economiePct = tarif?.prixMensuel && tarif?.prixAnnuel
    ? Math.round((1 - tarif.prixAnnuel / (tarif.prixMensuel * 12)) * 100)
    : 17;

  const handleOpenCheckout = async (abonnement = null) => {
    setSelectedAbonnement(abonnement);
    const type = abonnement?.type || planType;
    await loadTarif(type);
    const phoneToSet = getLocalTenDigits(abonnement?.telephonePaiement) || userSavedPhone;
    setTelephone(formatPhoneDisplay(phoneToSet, userCountry.code));
    setShowCheckout(true);
  };

  const handleSubscribe = async () => {
    const normalizedPhone = normalizePhoneInternational(telephone, userCountry.code);
    const localDigits = normalizedPhone.slice(userCountry.dialCode.replace("+", "").length);
    if (localDigits.length < userCountry.phoneDigits) {
      notifications.show(`Numéro incomplet (${userCountry.phoneDigits} chiffres requis)`, { severity: "error" });
      return;
    }
    const finalPhone = normalizedPhone;
    const pvId = pointDeVenteId || resolvePvId();
    if (!pvId) {
      notifications.show("Point de vente non identifié", { severity: "error" });
      return;
    }

    setPayLoading(true);
    try {
      const isRenewal = !!selectedAbonnement;
      const payload = {
        pointDeVenteId: parseInt(pvId, 10),
        type: planType,
        telephone: finalPhone,
        periode,
        pays: getUserCountry().code,
      };
      const endpoint = isRenewal ? "/api/abonnements/renouveler" : "/api/abonnements/payer";
      const res = await privateApi.post(endpoint, payload);
      if (res.data.success) {
        setOpenSuccess(true);
      } else {
        notifications.show(res.data.message || "Échec du paiement", { severity: "error" });
      }
    } catch (err) {
      notifications.show(err.response?.data?.message || "Erreur de connexion", { severity: "error" });
    } finally {
      setPayLoading(false);
    }
  };

  if (loading) {
    return (
      <PageContainer title="Mon abonnement">
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress sx={{ color: HOSTINGER_PURPLE }} /></Box>
      </PageContainer>
    );
  }

  /* ── CHECKOUT HOSTINGER ─────────────────────────────────────────── */
  if (showCheckout) {
    const features = PLAN_FEATURES[planType] || PLAN_FEATURES.SOUS_DEPOT;
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#FAFAFA", pb: 10 }}>
        <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 2, md: 4 }, py: { xs: 3, md: 5 } }}>
          <Button
            onClick={() => setShowCheckout(false)}
            sx={{ mb: 3, color: "#666", textTransform: "none", fontWeight: 600 }}
          >
            ← Retour
          </Button>

          <Typography variant="h4" sx={{ fontWeight: 800, textAlign: "center", color: "#1A1A1A", mb: 1 }}>
            Choisissez votre formule
          </Typography>
          <Typography variant="body1" sx={{ textAlign: "center", color: "#666", mb: 3 }}>
            {pointDeVenteNom ? `Établissement : ${pointDeVenteNom}` : "DepotManager — Abidjan"}
          </Typography>

          <PeriodToggle periode={periode} onChange={setPeriode} economiePct={economiePct} />

          <Box sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 380px" },
            gap: 3,
            alignItems: "start",
          }}>
            {/* Plan card — style Hostinger */}
            <Paper
              elevation={0}
              sx={{
                border: `2px solid ${HOSTINGER_PURPLE}`,
                borderRadius: 3,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <Box sx={{ bgcolor: HOSTINGER_PURPLE, color: "#fff", py: 1, textAlign: "center", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
                FORMULE RECOMMANDÉE
              </Box>
              <Box sx={{ p: { xs: 3, md: 4 } }}>
                <Typography variant="overline" sx={{ color: HOSTINGER_PURPLE, fontWeight: 700 }}>
                  {getTypeLabel(planType)}
                </Typography>
                <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 1, mb: 2 }}>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: "#1A1A1A" }}>
                    {formatF(montant)}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    / {periode === "annuel" ? "an" : "mois"}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {tarif?.description || "Accès complet à DepotManager"}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Inclus dans votre plan :</Typography>
                <FeatureList features={features} />
              </Box>
            </Paper>

            {/* Order summary — sticky Hostinger */}
            <Paper
              elevation={0}
              sx={{
                border: "1px solid #E8E8E8",
                borderRadius: 3,
                p: 3,
                position: { md: "sticky" },
                top: 24,
                bgcolor: "#fff",
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Récapitulatif</Typography>

              <Stack spacing={2} sx={{ mb: 3 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Plan</Typography>
                  <Typography variant="body2" fontWeight={600}>{getTypeLabel(planType)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Période</Typography>
                  <Typography variant="body2" fontWeight={600}>{periode === "annuel" ? "12 mois" : "1 mois"}</Typography>
                </Stack>
                <Divider />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle1" fontWeight={700}>Total</Typography>
                  <Typography variant="h5" fontWeight={900} sx={{ color: HOSTINGER_PURPLE }}>
                    {formatF(montant)}
                  </Typography>
                </Stack>
              </Stack>

              <Typography variant="caption" sx={{ fontWeight: 700, color: "#666", display: "block", mb: 1 }}>
                Numéro Mobile Money
              </Typography>
              <InputMask
                mask={`+${userCountry.dialCode.replace("+", "")} ${getPhoneMask(userCountry.code)}`}
                value={telephone}
                onChange={(e) => setTelephone(e.value)}
                placeholder={getPhoneExample(userCountry.code)}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  fontSize: "1rem",
                  border: "2px solid #E8E8E8",
                  borderRadius: "12px",
                  marginBottom: 16,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />

              <Button
                fullWidth
                size="large"
                onClick={handleSubscribe}
                disabled={payLoading || !validatePhoneUtil(telephone, userCountry.code)}
                sx={{
                  py: 1.75,
                  fontWeight: 800,
                  fontSize: "1rem",
                  borderRadius: 2,
                  textTransform: "none",
                  bgcolor: HOSTINGER_PURPLE,
                  "&:hover": { bgcolor: HOSTINGER_PURPLE_DARK },
                  boxShadow: "0 4px 14px rgba(103,61,230,0.4)",
                }}
              >
                {payLoading ? <CircularProgress size={24} color="inherit" /> : `Payer ${formatF(montant)}`}
              </Button>

              <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2, justifyContent: "center" }}>
                <ShieldOutlinedIcon sx={{ fontSize: 18, color: TEAL }} />
                <Typography variant="caption" color="text.secondary">
                  Paiement sécurisé · Orange · MTN · Moov
                </Typography>
              </Stack>
            </Paper>
          </Box>
        </Box>

        <Dialog open={openSuccess} onClose={() => setOpenSuccess(false)} PaperProps={{ sx: { borderRadius: 3, maxWidth: 400 } }}>
          <DialogContent sx={{ textAlign: "center", p: 4 }}>
            <CheckCircleIcon sx={{ fontSize: 72, color: TEAL, mb: 2 }} />
            <Typography variant="h5" fontWeight={800}>Paiement lancé</Typography>
            <Typography sx={{ mt: 1, color: "#666" }}>
              Validez sur votre téléphone :<br /><b>{telephone}</b>
            </Typography>
            <Button
              variant="contained"
              fullWidth
              sx={{ mt: 3, bgcolor: HOSTINGER_PURPLE, "&:hover": { bgcolor: HOSTINGER_PURPLE_DARK } }}
              onClick={() => { setOpenSuccess(false); setShowCheckout(false); loadAbonnements(); }}
            >
              J&apos;ai compris
            </Button>
          </DialogContent>
        </Dialog>
      </Box>
    );
  }

  /* ── DASHBOARD ABONNEMENT ─────────────────────────────────────── */
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#FAFAFA" }}>
      <Box sx={{ maxWidth: 900, mx: "auto", px: { xs: 2, md: 3 }, py: { xs: 3, md: 5 } }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: "#1A1A1A", mb: 0.5 }}>
          Mon abonnement
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          {pointDeVenteNom || "Votre établissement"} · DepotManager
        </Typography>

        {abonnements.length === 0 ? (
          <Paper elevation={0} sx={{ border: "1px solid #E8E8E8", borderRadius: 3, p: { xs: 4, md: 6 }, textAlign: "center" }}>
            <Box sx={{
              width: 80, height: 80, borderRadius: "50%", bgcolor: "#F3E8FF",
              display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 3,
            }}>
              <SmartphoneIcon sx={{ fontSize: 40, color: HOSTINGER_PURPLE }} />
            </Box>
            <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>
              Activez DepotManager
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: "auto" }}>
              Souscrivez en 2 minutes via Mobile Money. Gérez votre dépôt depuis votre téléphone à Abidjan.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => handleOpenCheckout()}
              sx={{
                px: 5, py: 1.5, fontWeight: 800, borderRadius: 2, textTransform: "none",
                bgcolor: HOSTINGER_PURPLE, "&:hover": { bgcolor: HOSTINGER_PURPLE_DARK },
              }}
            >
              Voir les formules
            </Button>
          </Paper>
        ) : (
          abonnements.map((abo) => {
            const daysLeft = daysUntil(abo.dateFin);
            const isExpired = daysLeft < 0;
            const isExpiringSoon = daysLeft >= 0 && daysLeft <= 7;
            const isPending = ["EN_ATTENTE", "EN_COURS"].includes(abo.statut);

            return (
              <Paper key={abo.id} elevation={0} sx={{ border: "1px solid #E8E8E8", borderRadius: 3, overflow: "hidden", mb: 3 }}>
                <Box sx={{
                  background: isPending
                    ? "linear-gradient(90deg, #FFF8E1, #fff)"
                    : `linear-gradient(90deg, ${HOSTINGER_PURPLE}18, #fff)`,
                  px: 3, py: 2,
                  display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1,
                }}>
                  <Box>
                    <Typography variant="overline" sx={{ color: HOSTINGER_PURPLE, fontWeight: 700 }}>
                      {getTypeLabel(abo.type)}
                    </Typography>
                    <Typography variant="h6" fontWeight={800}>{formatF(abo.montant)}</Typography>
                  </Box>
                  <Chip
                    label={abo.statut === "EN_COURS" ? "Paiement en cours" : abo.statut === "ACTIF" ? "Actif" : abo.statut}
                    color={abo.statut === "ACTIF" ? "success" : isPending ? "warning" : "default"}
                    sx={{ fontWeight: 700 }}
                  />
                </Box>
                <Box sx={{ p: 3 }}>
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                    <AccessTimeIcon color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Expire le</Typography>
                      <Typography fontWeight={700}>{formatDate(abo.dateFin)}</Typography>
                    </Box>
                  </Stack>

                  {isExpired && <Alert severity="error" sx={{ mb: 2 }}>Expiré depuis {Math.abs(daysLeft)} jours</Alert>}
                  {isExpiringSoon && !isExpired && (
                    <Alert severity="warning" sx={{ mb: 2 }}>Expire dans {daysLeft} jour{daysLeft > 1 ? "s" : ""}</Alert>
                  )}
                  {!isExpired && !isExpiringSoon && abo.statut === "ACTIF" && (
                    <Alert severity="success" sx={{ mb: 2 }}>{daysLeft} jours restants</Alert>
                  )}
                  {isPending && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Confirmez le paiement sur {abo.telephonePaiement || "votre Mobile Money"}
                    </Alert>
                  )}

                  {(daysLeft <= 15 || isExpired || isPending) && (
                    <Button
                      variant="contained"
                      onClick={() => handleOpenCheckout(abo)}
                      sx={{
                        mt: 1, fontWeight: 700, borderRadius: 2, textTransform: "none",
                        bgcolor: HOSTINGER_PURPLE, "&:hover": { bgcolor: HOSTINGER_PURPLE_DARK },
                      }}
                    >
                      {isPending ? "Relancer le paiement" : "Renouveler"}
                    </Button>
                  )}
                </Box>
              </Paper>
            );
          })
        )}
      </Box>
    </Box>
  );
}