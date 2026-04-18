import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Grid,
  Divider,
  Paper,
  Chip,
  IconButton,
  Autocomplete,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import AssessmentIcon from "@mui/icons-material/Assessment";
import { privateApi } from "../../../api/axios";
import useNotifications from "../../../crud-dashboard/hooks/useNotifications/useNotifications";
import { useUser } from "../../../context/UserContext";
import UpgradeIcon from "@mui/icons-material/TrendingUp";
import { setCache, getCache, enqueue, flushQueue } from "../../../utils/offline";

const formatAmount = (v) =>
  (v || 0).toLocaleString("fr-FR", { minimumFractionDigits: 0 }) + " FCFA";

export default function BarVente() {
  const notifications = useNotifications();
  const { user } = useUser();
  const role = (user?.role || "").replace(/\s+/g, "_").toUpperCase();
  const canSeeBenefice =
    role.startsWith("PROPRIETAIRE") || role.startsWith("ADMIN");
  const [needsUpgrade, setNeedsUpgrade] = React.useState(false);
  const [upgrading, setUpgrading] = React.useState(false);

  const [produits, setProduits] = React.useState([]);
  const [loadingProduits, setLoadingProduits] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [lignes, setLignes] = React.useState([{ produit: null, quantite: "" }]);
  const [resume, setResume] = React.useState({
    totalVente: 0,
    totalCout: 0,
    benefice: 0,
    lignes: [],
  });

  const CATALOG_CACHE_KEY = "barCatalogCache";
  const OFFLINE_QUEUE_KEY = "barOfflineSales";
  const OFFLINE_RESUME_KEY = "barOfflineResume";

  const cacheCatalog = (data) => setCache(CATALOG_CACHE_KEY, data || []);
  const loadCatalogCache = () => getCache(CATALOG_CACHE_KEY, []);
  const enqueueOfflineSale = (payload) => enqueue(OFFLINE_QUEUE_KEY, payload);
  const flushOfflineQueue = async () => {
    const synced = await flushQueue(OFFLINE_QUEUE_KEY, (payload) =>
      privateApi.post("/api/bar/ventes", payload)
    );
    if (synced) {
      notifications.show("Ventes hors ligne synchronisées", { severity: "success" });
      loadResume();
    }
  };

  const loadProduits = React.useCallback(async () => {
    try {
      setLoadingProduits(true);
      const endpoint =
        role === "CLIENT_BAR"
          ? "/api/produits/client/catalogue"
          : "/api/produits";
      const res = await privateApi.get(endpoint);
      setProduits(res.data || []);
      cacheCatalog(res.data || []);
    } catch (e) {
      const msg =
        e.response?.data?.message ||
        e.response?.data?.error ||
        "Erreur de chargement des produits";
      notifications.show(msg, { severity: "error" });
      if (e.response?.status === 401 || e.response?.status === 403) {
        setNeedsUpgrade(true);
      } else {
        const cached = loadCatalogCache();
        if (cached.length) {
          setProduits(cached);
          notifications.show("Catalogue chargé depuis le cache (offline)", {
            severity: "info",
          });
        }
      }
    } finally {
      setLoadingProduits(false);
    }
  }, [notifications, role]);

  const loadResume = React.useCallback(async () => {
    try {
      const res = await privateApi.get("/api/bar/ventes/jour");
      setResume(res.data || { totalVente: 0, totalCout: 0, benefice: 0, lignes: [] });
      try {
        localStorage.setItem(OFFLINE_RESUME_KEY, JSON.stringify(res.data || {}));
      } catch (_e) {}
    } catch (e) {
      const cached = localStorage.getItem(OFFLINE_RESUME_KEY);
      if (cached) {
        setResume(JSON.parse(cached));
        notifications.show("Résumé chargé depuis le cache (offline)", {
          severity: "info",
        });
      } else {
        notifications.show("Erreur lors du chargement du résumé", {
          severity: "error",
        });
      }
    }
  }, [notifications]);

  React.useEffect(() => {
    loadProduits();
    loadResume();
  }, [loadProduits, loadResume]);

  React.useEffect(() => {
    const handler = () => {
      if (navigator.onLine) {
        flushOfflineQueue();
      }
    };
    window.addEventListener("online", handler);
    return () => window.removeEventListener("online", handler);
  }, []);

  const handleAddLigne = () => {
    setLignes((prev) => [...prev, { produit: null, quantite: "" }]);
  };

  const handleRemoveLigne = (index) => {
    setLignes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChangeProduit = (index, value) => {
    setLignes((prev) =>
      prev.map((ligne, i) => (i === index ? { ...ligne, produit: value } : ligne))
    );
  };

  const handleChangeQuantite = (index, value) => {
    if (value === "") {
      setLignes((prev) =>
        prev.map((ligne, i) => (i === index ? { ...ligne, quantite: "" } : ligne))
      );
      return;
    }

    const numeric = parseInt(value, 10);
    const qty = Number.isNaN(numeric) ? "" : Math.max(1, numeric);
    setLignes((prev) =>
      prev.map((ligne, i) => (i === index ? { ...ligne, quantite: qty } : ligne))
    );
  };

  const handleSubmit = async () => {
    try {
      const payloadLignes = lignes
        .filter((l) => l.produit && l.quantite > 0)
        .map((l) => ({
          produitId: l.produit.id,
          quantite: Number(l.quantite),
        }));

      if (!payloadLignes.length) {
        notifications.show("Ajoute au moins un produit et une quantité", {
          severity: "warning",
        });
        return;
      }

      const payload = { lignes: payloadLignes };
      setSaving(true);
      if (!navigator.onLine) {
        enqueueOfflineSale(payload);
        notifications.show("Vente stockée offline, synchro dès retour réseau", {
          severity: "info",
        });
      } else {
        await privateApi.post("/api/bar/ventes", payload);
        notifications.show("Vente bar enregistrée", { severity: "success" });
      }

      setLignes([{ produit: null, quantite: "" }]);
      loadResume();
    } catch (e) {
      const msg =
        e.response?.data?.message ||
        e.message ||
        "Impossible d'enregistrer la vente bar";
      notifications.show(msg, { severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={2}>
        <ShoppingCartIcon color="primary" />
        <Typography variant="h5" fontWeight={800}>
          Vente Bar (détail)
        </Typography>
        <Chip label="Saisie rapide" color="primary" variant="outlined" />
      </Stack>

      {needsUpgrade ? (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Upgrade requis pour vendre
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Passe en point de vente pour activer la vente bar et ton inventaire.
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<UpgradeIcon />}
              onClick={handleUpgrade}
              disabled={upgrading}
            >
              {upgrading ? "Upgrade..." : "Upgrade en PV"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12} md={7}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                  <Typography variant="h6" fontWeight={700}>
                    Saisie des lignes
                  </Typography>
                  <Chip label="Unité auto: Bouteille/Canette" size="small" />
                </Stack>
                <Stack spacing={2}>
                  {lignes.map((ligne, index) => (
                    <Paper
                      key={index}
                      variant="outlined"
                      sx={{ p: 2, borderRadius: 2, position: "relative" }}
                    >
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <Autocomplete
                          fullWidth
                          options={produits}
                          loading={loadingProduits}
                          getOptionLabel={(option) =>
                            option?.nomProduit || option?.designation || ""
                          }
                          value={ligne.produit}
                          onChange={(_, value) => handleChangeProduit(index, value)}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Produit"
                              placeholder="Rechercher une boisson"
                            />
                          )}
                        />
                        <TextField
                          type="number"
                          label="Quantité"
                          value={ligne.quantite}
                          onChange={(e) => handleChangeQuantite(index, e.target.value)}
                          sx={{ width: { xs: "100%", sm: 140 } }}
                          inputProps={{ min: 1 }}
                          placeholder="Ex: 1"
                        />
                        <IconButton
                          color="error"
                          onClick={() => handleRemoveLigne(index)}
                          disabled={lignes.length === 1}
                          sx={{ alignSelf: { xs: "flex-end", sm: "center" } }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    </Paper>
                  ))}
                  <Button
                    startIcon={<AddIcon />}
                    onClick={handleAddLigne}
                    variant="text"
                    size="small"
                  >
                    Ajouter une ligne
                  </Button>
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mt={3}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSubmit}
                    disabled={saving}
                    startIcon={<ShoppingCartIcon />}
                    sx={{ flex: 1 }}
                  >
                    {saving ? "Enregistrement..." : "Enregistrer la vente"}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={5}>
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                  <AssessmentIcon color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    Résumé du jour
                  </Typography>
                </Stack>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 1.5, borderRadius: 2 }} variant="outlined">
                      <Typography variant="caption" color="text.secondary">
                        Ventes
                      </Typography>
                      <Typography variant="h6">{formatAmount(resume.totalVente)}</Typography>
                    </Paper>
                  </Grid>
                  {canSeeBenefice && (
                    <Grid item xs={12} sm={6}>
                      <Paper sx={{ p: 1.5, borderRadius: 2 }} variant="outlined">
                        <Typography variant="caption" color="text.secondary">
                          Bénéfice
                        </Typography>
                        <Typography variant="h6">{formatAmount(resume.benefice)}</Typography>
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>

            <Card>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} mb={1}>
                  Lignes du jour
                </Typography>
                <Divider sx={{ mb: 1 }} />
                {resume.lignes && resume.lignes.length ? (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Heure</TableCell>
                        <TableCell>Produit</TableCell>
                        <TableCell align="right">Qté</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {resume.lignes.map((l, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{l.heure}</TableCell>
                          <TableCell>{l.produitNom}</TableCell>
                          <TableCell align="right">{l.quantite}</TableCell>
                          <TableCell align="right">
                            {formatAmount(l.totalLigne)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Aucune vente enregistrée aujourd'hui.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
  const decodeJwt = () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return null;
      const payload = token.split(".")[1];
      return JSON.parse(atob(payload));
    } catch (_e) {
      return null;
    }
  };

  const handleUpgrade = async () => {
    const payload = decodeJwt();
    const clientId = payload?.clientId;
    if (!clientId) {
      notifications.show("Impossible de trouver le clientId (token manquant ou invalide)", {
        severity: "error",
      });
      return;
    }
    try {
      setUpgrading(true);
      const res = await privateApi.post("/api/clients/upgrade-to-pv", {
        clientId,
      });
      const pvId = res.data?.pointDeVenteId;
      if (pvId) {
        localStorage.setItem(
          "activePV",
          JSON.stringify({ id: pvId, nom: res.data?.pointDeVenteNom })
        );
        notifications.show("Upgrade effectué. PV actif défini, rechargement...", {
          severity: "success",
        });
        setTimeout(() => window.location.reload(), 800);
      } else {
        notifications.show("Upgrade réalisé, mais PV non retourné", { severity: "warning" });
      }
    } catch (e) {
      const msg =
        e.response?.data?.message ||
        e.response?.data?.error ||
        "Impossible d'effectuer l'upgrade";
      notifications.show(msg, { severity: "error" });
    } finally {
      setUpgrading(false);
    }
  };
