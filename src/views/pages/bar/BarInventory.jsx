import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Stack,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import useNotifications from "../../../crud-dashboard/hooks/useNotifications/useNotifications";
import { privateApi } from "../../../api/axios";
import UpgradeIcon from "@mui/icons-material/TrendingUp";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { useUser } from "../../../context/UserContext";

export default function BarInventory() {
  const notifications = useNotifications();
  const { user } = useUser();
  const role = (user?.role || "").toUpperCase();
  const [produits, setProduits] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [savingId, setSavingId] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [upgrading, setUpgrading] = React.useState(false);
  const [needsUpgrade, setNeedsUpgrade] = React.useState(false);

  const loadProduits = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await privateApi.get("/api/produits");
      setProduits(res.data || []);
    } catch (e) {
      const msg =
        e.response?.data?.message ||
        e.response?.data?.error ||
        "Impossible de charger les produits";
      setError(msg);
      notifications.show(msg, { severity: "error" });
      if (e.response?.status === 401 || e.response?.status === 403) {
        setNeedsUpgrade(true);
      }
    } finally {
      setLoading(false);
    }
  }, [notifications]);

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

  React.useEffect(() => {
    loadProduits();
  }, [loadProduits]);

  const handleChange = (id, field, value) => {
    setProduits((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleSave = async (prod) => {
    setSavingId(prod.id);
    try {
      await privateApi.put(`/api/produits/${prod.id}`, {
        prixAchatHt: prod.prixAchatHt,
        prixVenteHt: parseFloat(prod.prixVenteHt || 0),
        consigneBouteille: prod.consigneBouteille,
        consigneCasier: prod.consigneCasier,
        stockInitial: parseInt(prod.stockInitial || 0, 10),
        stockMinimum: prod.stockMinimum,
        uniteVenteParDefautId: prod.uniteVenteParDefautId || prod.unite_vente_defaut_id,
      });
      notifications.show("Produit mis à jour", { severity: "success" });
    } catch (e) {
      const msg =
        e.response?.data?.message ||
        e.response?.data?.error ||
        "Échec de la mise à jour";
      notifications.show(msg, { severity: "error" });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={800}>
          Inventaire initial (Bar)
        </Typography>
        <Button
          size="small"
          startIcon={<RefreshIcon />}
          onClick={loadProduits}
          disabled={loading || needsUpgrade}
        >
          Rafraîchir
        </Button>
        <Button
          size="small"
          startIcon={<UpgradeIcon />}
          onClick={handleUpgrade}
          disabled={upgrading}
          color="secondary"
          variant="contained"
        >
          {upgrading ? "Upgrade..." : "Upgrade en PV"}
        </Button>
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {needsUpgrade && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Upgrade requis : crée ton point de vente via le bouton "Upgrade en PV".
        </Alert>
      )}
      <Card>
        <CardContent>
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : produits && produits.length ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Produit</TableCell>
                  <TableCell align="right">Prix achat</TableCell>
                  <TableCell align="right">Prix vente</TableCell>
                  <TableCell align="right">Stock</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {produits.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.nomProduit || p.designation}</TableCell>
                    <TableCell align="right">
                      {p.prixAchatHt || 0}
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={p.prixVenteHt || ""}
                        onChange={(e) =>
                          handleChange(p.id, "prixVenteHt", e.target.value)
                        }
                        inputProps={{ min: 0 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={p.stockInitial || 0}
                        onChange={(e) =>
                          handleChange(p.id, "stockInitial", e.target.value)
                        }
                        inputProps={{ min: 0 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        startIcon={
                          savingId === p.id ? (
                            <CircularProgress size={14} color="inherit" />
                          ) : (
                            <SaveIcon />
                          )
                        }
                        onClick={() => handleSave(p)}
                        disabled={savingId === p.id}
                      >
                        Sauver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Aucun produit trouvé. Assure-toi d’avoir un point de vente actif et des produits importés.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
