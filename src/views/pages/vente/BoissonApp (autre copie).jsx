import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Badge,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Chip,
  Paper,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
  InputAdornment,
  useMediaQuery
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Plus,
  UserPlus,
  Search,
  X,
  ShoppingCart,
  Trash2,
  Minus,
  CheckCircle2,
  Printer
} from "lucide-react";
import { publicApi } from "../../../api/axios";
import { getActivePointDeVenteId } from "../../../utils/pdv";

const formatF = (n) => `${Number(n || 0).toLocaleString("fr-FR")} F`;
const clampInt = (v, min = 1) => {
  const x = parseInt(String(v ?? ""), 10);
  if (Number.isNaN(x)) return min;
  return Math.max(min, x);
};

const steps = ["Produits", "Client & Livreur", "Confirmation"];

const calcConsigne = (p) =>
  (p.consigneBouteille || 0) * (p.nbBouteillesParCasier || 0) + (p.consigneCasier || 0);

/* =========================
   LIGNE PRODUIT (PRO + MOBILE)
   - Quantité EDITABLE avec état local tempQty
   - Bouton Ajouter conservé
========================= */
const ProduitRow = ({ boisson, quantite, setQuantite, onAdd }) => {
  const [tempQty, setTempQty] = useState(String(quantite));
  const consigne = calcConsigne(boisson);

  // Sync tempQty when quantite changes from parent
  useEffect(() => {
    setTempQty(String(quantite));
  }, [quantite]);

  const handleBlur = () => {
    const val = tempQty.trim();
    if (val === '' || val === '0') {
      setQuantite(1);
      setTempQty('1');
    } else {
      const clamped = clampInt(val, 1);
      setQuantite(clamped);
      setTempQty(String(clamped));
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    // Allow only empty string or digits
    if (val === '' || /^\d+$/.test(val)) {
      setTempQty(val);
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.25,
        mb: 1,
        borderRadius: 2,
        display: "flex",
        alignItems: "center",
        gap: 1,
        flexWrap: "wrap" // important mobile
      }}
    >
      {/* Infos */}
      <Box sx={{ flex: 1, minWidth: 220 }}>
        <Typography sx={{ fontWeight: 900 }} noWrap>
          {boisson.designation}
        </Typography>

        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
          Prix: <b>{formatF(boisson.prixVenteHt)}</b>
          {consigne > 0 && (
            <>
              {" "}
              • Emballages (consigne): <b>{formatF(consigne)}</b>
            </>
          )}
        </Typography>
      </Box>

      {/* Quantité (EDITABLE avec état local) */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: "auto" }}>
        <IconButton
          size="small"
          onClick={() => {
            const newQty = Math.max(1, quantite - 1);
            setQuantite(newQty);
            setTempQty(String(newQty));
          }}
          aria-label="Diminuer"
        >
          <Minus size={16} />
        </IconButton>

        <TextField
          value={tempQty}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={(e) => e.target.select()}
          size="small"
          inputProps={{
            inputMode: "numeric",
            pattern: "[0-9]*",
            style: { textAlign: "center" }
          }}
          sx={{
            width: 90,
            "& .MuiInputBase-input": { fontWeight: 900 }
          }}
        />

        <IconButton
          size="small"
          onClick={() => {
            const newQty = quantite + 1;
            setQuantite(newQty);
            setTempQty(String(newQty));
          }}
          aria-label="Augmenter"
        >
          <Plus size={16} />
        </IconButton>

        <Button
          variant="contained"
          size="small"
          onClick={() => {
            handleBlur(); // Ensure quantite is updated before adding
            onAdd();
          }}
          sx={{
            borderRadius: 2,
            fontWeight: 900,
            minWidth: 96,
            height: 40
          }}
        >
          Ajouter
        </Button>
      </Box>
    </Paper>
  );
};

const BoissonApp = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  /* =========================
   ÉTATS GÉNÉRAUX
  ========================= */
  const [boissons, setBoissons] = useState([]);
  const [cart, setCart] = useState([]);
  const [itemQuantities, setItemQuantities] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  const [loadingProduits, setLoadingProduits] = useState(true);
  const [errorProduits, setErrorProduits] = useState(null);
  const [venteEnCours, setVenteEnCours] = useState(false);

  /* =========================
   WIZARD
  ========================= */
  const [openWizard, setOpenWizard] = useState(true); // mets false + bouton d'ouverture si tu veux
  const [activeStep, setActiveStep] = useState(0);

  /* =========================
   CLIENTS
  ========================= */
  const [openClientModal, setOpenClientModal] = useState(false);
  const [clientSelectionne, setClientSelectionne] = useState(null);
  const [clientsExistants, setClientsExistants] = useState([]);
  const [clientForm, setClientForm] = useState({
    raisonsociale: "",
    telephone: "",
    categorieClient: "BAR",
    nomGerant: ""
  });

  /* =========================
   LIVREURS
  ========================= */
  const [livreurs, setLivreurs] = useState([]);
  const [livreurSelectionne, setLivreurSelectionne] = useState(null);

  /* =========================
   TYPE VENTE & PAIEMENT
  ========================= */
  const [typeVente, setTypeVente] = useState("VENTE_CASH");
  const [montantVidesRendus, setMontantVidesRendus] = useState(0);

  /* =========================
   NOTIFICATIONS
  ========================= */
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success"
  });
  const showNotification = (message, severity = "success") =>
    setSnackbar({ open: true, message, severity });

  const getToken = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      showNotification("Veuillez vous reconnecter", "error");
      setTimeout(() => (window.location.href = "/login"), 1500);
      return null;
    }
    return token;
  };

  /* =========================
   LOAD PRODUITS
  ========================= */
  useEffect(() => {
    const loadProduits = async () => {
      const token = getToken();
      if (!token) return;

      const pvId = getActivePointDeVenteId();
      if (!pvId) {
        setErrorProduits("Point de vente introuvable. Veuillez sélectionner un point de vente.");
        setLoadingProduits(false);
        return;
      }

      try {
        const res = await fetch(`/api/produits?pointDeVenteId=${pvId}`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setBoissons(Array.isArray(data) ? data : []);
        setLoadingProduits(false);
      } catch (err) {
        console.error(err);
        setErrorProduits("Erreur chargement produits: " + err.message);
        setLoadingProduits(false);
      }
    };

    loadProduits();
  }, []);

  /* =========================
   LOAD CLIENTS
  ========================= */
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const pvId = getActivePointDeVenteId();
    if (!pvId) {
      showNotification("Point de vente introuvable. Veuillez sélectionner un point de vente.", "error");
      return;
    }

    fetch(`/api/clients?pointDeVenteId=${pvId}`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data) => setClientsExistants(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error(err);
        showNotification("Erreur chargement clients: " + err.message, "error");
      });
  }, []);

  /* =========================
   LOAD LIVREURS
  ========================= */
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const pvId = getActivePointDeVenteId();
    if (!pvId) {
      showNotification("Point de vente introuvable. Veuillez sélectionner un point de vente.", "error");
      return;
    }

    fetch(`/api/livreurs?pointDeVenteId=${pvId}`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data) => setLivreurs(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error(err);
        showNotification("Erreur chargement livreurs: " + err.message, "error");
      });
  }, []);

  /* =========================
   PRODUITS FILTRÉS
  ========================= */
  const produitsFiltres = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    if (!s) return boissons;
    return boissons.filter((b) => (b.designation || "").toLowerCase().includes(s));
  }, [boissons, searchTerm]);

  /* =========================
   PANIER
  ========================= */
  const ajouterAuPanier = (boisson) => {
    const qte = Math.max(1, itemQuantities[boisson.id] || 1);
    const idx = cart.findIndex((i) => i.id === boisson.id);

    const consigne = calcConsigne(boisson);

    if (idx !== -1) {
      const newCart = [...cart];
      newCart[idx] = { ...newCart[idx], quantite: newCart[idx].quantite + qte };
      setCart(newCart);
    } else {
      setCart([
        ...cart,
        {
          id: boisson.id,
          nom: boisson.designation,
          prix: boisson.prixVenteHt,
          consigne,
          consigneBouteille: boisson.consigneBouteille,
          consigneCasier: boisson.consigneCasier,
          nbBouteillesParCasier: boisson.nbBouteillesParCasier,
          quantite: qte
        }
      ]);
    }

    // reset la quantité de cette ligne
    setItemQuantities((prev) => ({ ...prev, [boisson.id]: 1 }));
    showNotification(`${qte} × ${boisson.designation} ajouté`, "success");
  };

  const retirerDuPanier = (id) => setCart(cart.filter((i) => i.id !== id));

  const modifierQuantitePanier = (id, delta) => {
    const next = cart
      .map((item) => {
        if (item.id !== id) return item;
        const q = item.quantite + delta;
        if (q < 1) return null;
        return { ...item, quantite: q };
      })
      .filter(Boolean);
    setCart(next);
  };

  /* =========================
   CALCULS
  ========================= */
  const totalProduits = useMemo(() => cart.reduce((sum, i) => sum + i.prix * i.quantite, 0), [cart]);
  const totalConsigne = useMemo(() => cart.reduce((sum, i) => sum + i.consigne * i.quantite, 0), [cart]);
  const total = totalProduits + totalConsigne;
  const totalArticles = useMemo(() => cart.reduce((sum, i) => sum + i.quantite, 0), [cart]);

  const netCash = useMemo(() => {
    if (typeVente === "VENTE_CREDIT") return 0;
    const vides = Math.max(0, Number(montantVidesRendus) || 0);
    return Math.max(0, total - vides);
  }, [typeVente, montantVidesRendus, total]);

  /* =========================
   CLIENT: CRÉATION RAPIDE
  ========================= */
  const validerEtChoisirClient = async () => {
    if (!clientForm.raisonsociale.trim()) {
      showNotification("Le nom du client est obligatoire", "error");
      return;
    }

    const token = getToken();
    if (!token) return;

    try {
      const pvId = getActivePointDeVenteId();
      if (!pvId) {
        showNotification("Point de vente introuvable. Veuillez sélectionner un point de vente.", "error");
        return;
      }

      const payload = {
        pointDeVenteId: pvId,
        raisonsociale: clientForm.raisonsociale,
        telephone: clientForm.telephone || "",
        categorieClient: clientForm.categorieClient
      };
      if (clientForm.categorieClient === "BAR") payload.nomGerant = clientForm.nomGerant || "";

      const res = await fetch("/api/clients/creer-rapide", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(await res.text());

      const nouveauClient = await res.json();
      setOpenClientModal(false);
      setClientSelectionne(nouveauClient);

      setClientsExistants((prev) => {
        const exists = prev.some((c) => String(c.id) === String(nouveauClient.id));
        return exists ? prev : [nouveauClient, ...prev];
      });

      setClientForm({ raisonsociale: "", telephone: "", categorieClient: "BAR", nomGerant: "" });

      showNotification(`Client "${nouveauClient.raisonsociale}" créé`, "success");
    } catch (e) {
      console.error(e);
      showNotification("Échec création client: " + e.message, "error");
    }
  };

  /* =========================
   POST-VALIDATION DIALOG
  ========================= */
  const [venteResultat, setVenteResultat] = useState(null);
  const [showPostValidation, setShowPostValidation] = useState(false);

  const getReceiptData = () => ({
    venteId: null,
    client: clientSelectionne,
    total,
    totalProduits,
    totalConsigne,
    netCash,
    montantVidesRendus: typeVente === "CASH_ECHANGE" ? Number(montantVidesRendus || 0) : 0,
    typeVente,
    cart
  });

  const sendWhatsAppReceipt = (venteData) => {
    const text = `Reçu N°${venteData.venteId || "-"} - ${venteData.client?.raisonsociale || "Client"} | Total: ${venteData.total || 0} F | Vides: ${venteData.montantVidesRendus || 0} F | NET A PAYER: ${venteData.netCash || 0} F`;
    const waLink = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waLink, "_blank");
  };

  /* =========================
   VALIDER VENTE
  ========================= */
  const validerVente = async () => {
    if (!clientSelectionne) return showNotification("Veuillez sélectionner un client", "error");
    if (cart.length === 0) return showNotification("Le panier est vide", "error");
    if (typeVente === "CASH_ECHANGE" && Number(montantVidesRendus || 0) < 0)
      return showNotification("Le montant des vides doit être positif", "error");

    setVenteEnCours(true);
    const token = getToken();
    if (!token) {
      setVenteEnCours(false);
      return;
    }

    try {
      let montantPayeCalc;
      switch (typeVente) {
        case "VENTE_CASH":
          montantPayeCalc = total;
          break;
        case "CASH_ECHANGE":
          montantPayeCalc = netCash;
          break;
        case "VENTE_CREDIT":
          montantPayeCalc = 0;
          break;
        default:
          montantPayeCalc = total;
      }

      const payload = {
        clientId: clientSelectionne.id,
        articles: cart.map((item) => ({
          produitId: item.id,
          uniteId: 1,
          quantite: item.quantite,
          prixUnitaire: item.prix
        })),
        montantPaye: montantPayeCalc,
        montantVidesRendus: typeVente === "CASH_ECHANGE" ? Number(montantVidesRendus || 0) : 0,
        typeVente,
        livreurId: livreurSelectionne ? livreurSelectionne.id : null
      };

      const res = await fetch("/api/ventes/directe", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(await res.text());

      const venteData = await res.json();
      const venteResultatFinal = {
        ...getReceiptData(),
        venteId: venteData.id
      };
      setVenteResultat(venteResultatFinal);
      setShowPostValidation(true);
      showNotification("Vente enregistrée avec succès", "success");

      setCart([]);
      setSearchTerm("");
    } catch (e) {
      console.error(e);
      showNotification("Erreur vente: " + e.message, "error");
    } finally {
      setVenteEnCours(false);
    }
  };

  const handlePrintReceipt = async () => {
    if (!venteResultat?.venteId) return showNotification("ID vente manquant", "error");
    try {
      const res = await fetch(`/api/ventes/${venteResultat.venteId}/receu`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (!res.ok) throw new Error("Erreur téléchargement PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Recu_${venteResultat.venteId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setShowPostValidation(false);
      setActiveStep(0);
      setOpenWizard(false);
    } catch (e) {
      console.error(e);
      showNotification("Erreur impression: " + e.message, "error");
    }
  };

  const handleWhatsAppShare = () => {
    sendWhatsAppReceipt(venteResultat);
    setShowPostValidation(false);
    setActiveStep(0);
    setOpenWizard(false);
  };

  const closePostValidation = () => {
    setShowPostValidation(false);
    setActiveStep(0);
    setOpenWizard(false);
  };

  /* =========================
   WIZARD NAV
  ========================= */
  const nextDisabled =
    (activeStep === 0 && cart.length === 0) ||
    (activeStep === 1 && !clientSelectionne);

  const next = () => {
    if (nextDisabled) return;
    setActiveStep((s) => Math.min(steps.length - 1, s + 1));
  };
  const back = () => setActiveStep((s) => Math.max(0, s - 1));
  const closeWizard = () => {
    setOpenWizard(false);
    setActiveStep(0);
  };

  /* =========================
   UI: PANIER ITEM + RÉSUMÉ
  ========================= */
  const PanierItem = ({ item }) => {
    const consigneU =
      (item.consigneBouteille || 0) * (item.nbBouteillesParCasier || 0) + (item.consigneCasier || 0);

    return (
      <Paper
        variant="outlined"
        sx={{
          p: 1,
          mb: 1,
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap"
        }}
      >
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography sx={{ fontWeight: 900 }} noWrap>
            {item.nom}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Prix: {formatF(item.prix)} • Emballages: {formatF(consigneU)}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, ml: "auto" }}>
          <IconButton size="small" onClick={() => modifierQuantitePanier(item.id, -1)} disabled={item.quantite <= 1}>
            <Minus size={16} />
          </IconButton>

          <Typography sx={{ width: 26, textAlign: "center", fontWeight: 900 }}>
            {item.quantite}
          </Typography>

          <IconButton size="small" onClick={() => modifierQuantitePanier(item.id, 1)}>
            <Plus size={16} />
          </IconButton>

          <Typography sx={{ minWidth: 92, textAlign: "right", fontWeight: 900 }}>
            {formatF((item.prix + consigneU) * item.quantite)}
          </Typography>

          <IconButton size="small" color="error" onClick={() => retirerDuPanier(item.id)}>
            <Trash2 size={16} />
          </IconButton>
        </Box>
      </Paper>
    );
  };

  const Resume = () => {
    const typeColors = {
      VENTE_CASH: "#1e88e5",
      CASH_ECHANGE: "#fb8c00",
      VENTE_CREDIT: "#e53935"
    };

    return (
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 1.5, md: 2 },
          borderRadius: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
          boxShadow: { md: 1 }
        }}
      >
        <Typography sx={{ fontWeight: 900 }}>Récapitulatif</Typography>

        {/* Liste simplifiée des produits */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          {cart.map((item) => {
            const consigneU = calcConsigne(item);
            const lineTotal = (item.prix + consigneU) * item.quantite;
            return (
              <Box key={item.id} sx={{ display: "flex", alignItems: "center" }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {item.nom}
                </Typography>
                <Box sx={{ flex: 1, borderBottom: "1px dashed", mx: 1, opacity: 0.35 }} />
                <Typography variant="body2" sx={{ fontWeight: 900 }}>
                  {formatF(lineTotal)}
                </Typography>
              </Box>
            );
          })}
        </Box>

        <Divider />

        {/* Type de vente + Vides */}
        <TextField
          select
          fullWidth
          label="Type de vente"
          value={typeVente}
          onChange={(e) => setTypeVente(e.target.value)}
          SelectProps={{ native: true }}
          sx={{
            boxShadow: 1,
            borderRadius: 2,
            border: `1px solid ${typeColors[typeVente] || "#1e88e5"}`,
            "& fieldset": { border: "none" }
          }}
        >
          <option value="VENTE_CASH">Cash</option>
          <option value="CASH_ECHANGE">Cash + Échange</option>
          <option value="VENTE_CREDIT">Crédit</option>
        </TextField>

        {typeVente === "CASH_ECHANGE" && (
          <TextField
            fullWidth
            label="Montant vides rendus"
            value={montantVidesRendus}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "" || /^\d+$/.test(val)) {
                setMontantVidesRendus(val === "" ? 0 : Number(val));
              }
            }}
            placeholder="0"
            InputProps={{
              endAdornment:
                montantVidesRendus > 0 ? (
                  <IconButton size="small" onClick={() => setMontantVidesRendus(0)} title="Effacer">
                    <X size={16} />
                  </IconButton>
                ) : null
            }}
            sx={{
              boxShadow: 1,
              borderRadius: 2,
              border: `1px solid ${typeColors[typeVente] || "#fb8c00"}`,
              "& fieldset": { border: "none" }
            }}
          />
        )}

        <Divider />

        {/* Bloc financier aligné */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography sx={{ fontWeight: 700 }}>Total brut</Typography>
            <Box sx={{ flex: 1, borderBottom: "1px dotted", mx: 1, opacity: 0.4 }} />
            <Typography sx={{ fontWeight: 900 }}>{formatF(total)}</Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", color: totalConsigne > 0 ? "error.main" : "inherit" }}>
            <Typography sx={{ fontWeight: 700 }}>Emballages rendus</Typography>
            <Box sx={{ flex: 1, borderBottom: "1px dotted", mx: 1, opacity: 0.4 }} />
            <Typography sx={{ fontWeight: 900 }}>{formatF(totalConsigne)}</Typography>
          </Box>

          {typeVente === "CASH_ECHANGE" && (
            <Box sx={{ display: "flex", alignItems: "center", color: "error.main" }}>
              <Typography sx={{ fontWeight: 700 }}>Vides rendus</Typography>
              <Box sx={{ flex: 1, borderBottom: "1px dotted", mx: 1, opacity: 0.4 }} />
              <Typography sx={{ fontWeight: 900 }}>{formatF(montantVidesRendus || 0)}</Typography>
            </Box>
          )}

          <Box
            sx={{
              mt: 0.5,
              p: 1.5,
              borderRadius: 2,
              bgcolor: "#e8f5e9",
              border: "2px solid #1b5e20",
              color: "#1b5e20",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: 2
            }}
          >
            <Typography sx={{ fontWeight: 900 }}>NET À PERCEVOIR</Typography>
            <Typography sx={{ fontWeight: 900, fontSize: "1.8rem", lineHeight: 1 }}>
              {formatF(netCash)}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="caption" color="text.secondary">
            Type: {typeVente.replace("_", " + ")}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {totalArticles} article(s)
          </Typography>
        </Box>
      </Paper>
    );
  };

  /* =========================
   LOADING / ERROR
  ========================= */
  if (loadingProduits) {
    return (
      <Box height="100vh" display="flex" flexDirection="column" justifyContent="center" alignItems="center">
        <CircularProgress size={56} />
        <Typography sx={{ mt: 2, fontWeight: 700 }}>Chargement des produits…</Typography>
      </Box>
    );
  }

  if (errorProduits) {
    return (
      <Box height="100vh" display="flex" flexDirection="column" justifyContent="center" alignItems="center" p={3}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorProduits}
        </Alert>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Réessayer
        </Button>
      </Box>
    );
  }

  return (
    <>
      {/* WIZARD */}
      <Dialog
        open={openWizard}
        fullWidth
        maxWidth="md"
        fullScreen={isMobile} // plein écran mobile
        onClose={closeWizard}
        PaperProps={{
          sx: {
            width: "100%",
            m: 0,
            borderRadius: isMobile ? 0 : 2
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ShoppingCart size={18} />
            <Typography sx={{ fontWeight: 900 }}>Nouvelle vente</Typography>

            <Chip
              label={`${cart.length} ligne(s)`}
              size="small"
              variant="outlined"
              sx={{ ml: 1 }}
            />

            <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 900, color: "primary.main" }}>{formatF(total)}</Typography>
              <IconButton onClick={closeWizard} size="small">
                <X size={18} />
              </IconButton>
            </Box>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Stepper activeStep={activeStep} alternativeLabel={true}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            <LinearProgress
              variant="determinate"
              value={((activeStep + 1) / steps.length) * 100}
              sx={{ mt: 1 }}
            />
          </Box>
        </DialogTitle>

        <DialogContent
          sx={{
            pt: 2,
            px: { xs: 1.5, md: 2 },
            // hauteur utile sur mobile (évite que ça "saute")
            pb: 10
          }}
        >
          {/* STEP 1: PRODUITS */}
          {activeStep === 0 && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, width: "100%" }}>
              <Typography sx={{ fontWeight: 900, mb: 1 }}>Choisir les produits</Typography>

              <TextField
                fullWidth
                placeholder="Rechercher un produit…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="medium"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={16} />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm ? (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setSearchTerm("")} size="small">
                        <X size={16} />
                      </IconButton>
                    </InputAdornment>
                  ) : null
                }}
              />

              <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Chip label={`${produitsFiltres.length} produit(s)`} size="small" variant="outlined" />
                <Typography variant="caption" color="text.secondary">
                  Tape la quantité puis "Ajouter"
                </Typography>
              </Box>

              <Box sx={{ mt: 2, maxHeight: isMobile ? "70vh" : "75vh", overflow: "auto" }}>
                {produitsFiltres.map((b) => (
                  <ProduitRow
                    key={b.id}
                    boisson={b}
                    quantite={itemQuantities[b.id] || 1}
                    setQuantite={(q) =>
                      setItemQuantities((prev) => ({
                        ...prev,
                        [b.id]: clampInt(q, 1)
                      }))
                    }
                    onAdd={() => ajouterAuPanier(b)}
                  />
                ))}
              </Box>
            </Paper>
          )}

          {/* STEP 2: CLIENT & LIVREUR */}
          {activeStep === 1 && (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
                width: "100%",
                minHeight: { md: "400px" }
              }}
            >
              <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Typography sx={{ fontWeight: 900 }}>Client</Typography>
                  <Button
                    size="small"
                    startIcon={<UserPlus size={16} />}
                    sx={{ ml: "auto" }}
                    onClick={() => setOpenClientModal(true)}
                  >
                    Nouveau
                  </Button>
                </Box>

                <TextField
                  select
                  fullWidth
                  label="Sélectionner un client"
                  value={clientSelectionne ? clientSelectionne.id : ""}
                  onChange={(e) => {
                    const id = e.target.value;
                    const client = clientsExistants.find((c) => String(c.id) === String(id));
                    setClientSelectionne(client || null);
                  }}
                  SelectProps={{ native: true }}
                  sx={{ mt: 2 }}
                >
                  <option value="">-- Aucun --</option>
                  {clientsExistants.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.raisonsociale} {client.telephone ? `(${client.telephone})` : ""}
                    </option>
                  ))}
                </TextField>

                {clientSelectionne ? (
                  <Box sx={{ mt: 1 }}>
                    <Typography sx={{ fontWeight: 900, color: "success.main" }}>
                      {clientSelectionne.raisonsociale}
                    </Typography>
                    {clientSelectionne.telephone && (
                      <Typography variant="caption">📞 {clientSelectionne.telephone}</Typography>
                    )}
                    <Chip label={clientSelectionne.categorieClient} size="small" sx={{ mt: 1 }} />
                  </Box>
                ) : (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Client obligatoire pour valider.
                  </Alert>
                )}
              </Paper>

              <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
                <Typography sx={{ fontWeight: 900 }}>Livreur (optionnel)</Typography>

                <TextField
                  select
                  fullWidth
                  label="Sélectionner un livreur"
                  value={livreurSelectionne ? livreurSelectionne.id : ""}
                  onChange={(e) => {
                    const id = e.target.value;
                    const livreur = livreurs.find((l) => String(l.id) === String(id));
                    setLivreurSelectionne(livreur || null);
                  }}
                  SelectProps={{ native: true }}
                  sx={{ mt: 2 }}
                >
                  <option value="">-- Aucun --</option>
                  {livreurs.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.firstName} {l.lastName} {l.phoneNumber ? `(${l.phoneNumber})` : ""}
                    </option>
                  ))}
                </TextField>

                {livreurSelectionne ? (
                  <Box sx={{ mt: 1 }}>
                    <Typography sx={{ fontWeight: 900, color: "info.main" }}>
                      {livreurSelectionne.firstName} {livreurSelectionne.lastName}
                    </Typography>
                    {livreurSelectionne.phoneNumber && (
                      <Typography variant="caption">📞 {livreurSelectionne.phoneNumber}</Typography>
                    )}
                  </Box>
                ) : (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                    Tu peux laisser vide si le client vient récupérer.
                  </Typography>
                )}

                <Alert severity="info" sx={{ mt: 2 }}>
                  Valide le client et accède à l'étape de confirmation.
                </Alert>
              </Paper>
            </Box>
          )}

          {/* STEP 3: CONFIRMATION */}
          {activeStep === 2 && (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1.35fr 1fr" },
                gap: 2,
                width: "100%"
              }}
            >
              {/* Panier complet */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
                  <Typography sx={{ fontWeight: 900 }}>Panier</Typography>
                  <Chip label={`${totalArticles} article(s)`} size="small" variant="outlined" />
                  {cart.length > 0 && (
                    <Button size="small" color="error" sx={{ ml: "auto" }} onClick={() => setCart([])}>
                      Vider
                    </Button>
                  )}
                </Box>

                {cart.length === 0 ? (
                  <Alert severity="info">Panier vide.</Alert>
                ) : (
                  <Box sx={{ maxHeight: isMobile ? "65vh" : "75vh", overflow: "auto" }}>
                    {cart.map((item) => (
                      <PanierItem key={item.id} item={item} />
                    ))}
                  </Box>
                )}
              </Paper>

              {/* Résumé + Validation */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography sx={{ fontWeight: 900, mb: 1 }}>Validation</Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Client: <b>{clientSelectionne ? clientSelectionne.raisonsociale : "—"}</b>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Livreur:{" "}
                  <b>
                    {livreurSelectionne
                      ? `${livreurSelectionne.firstName} ${livreurSelectionne.lastName}`
                      : "—"}
                  </b>
                </Typography>

                <Divider sx={{ my: 1.5 }} />

                <Resume />

                <Alert severity="info" sx={{ mt: 2 }}>
                  Vérifie puis valide.
                </Alert>
              </Paper>
            </Box>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            position: isMobile ? "fixed" : "sticky",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1200,
            p: 1.5,
            gap: 1,
            bgcolor: "background.paper",
            borderTop: "1px solid",
            borderColor: "divider"
          }}
        >
          <Button variant="outlined" onClick={closeWizard}>
            Fermer
          </Button>

          {activeStep > 0 && (
            <Button variant="outlined" onClick={back}>
              Retour
            </Button>
          )}

          <Box sx={{ flex: 1 }} />

          {activeStep < 2 ? (
            <Button variant="contained" onClick={next} disabled={nextDisabled} sx={{ fontWeight: 900 }}>
              Suivant
            </Button>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '100%' }}>
              <Button
                variant="contained"
                color="success"
                onClick={validerVente}
                disabled={venteEnCours || cart.length === 0 || !clientSelectionne}
                startIcon={!venteEnCours ? <CheckCircle2 size={18} /> : null}
                fullWidth
                sx={{
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  boxShadow: 4,
                  py: 1.4,
                  letterSpacing: 0.5,
                  transition: 'transform 120ms ease, box-shadow 120ms ease',
                  '&:hover': { boxShadow: 6, transform: 'translateY(-1px)' }
                }}
              >
                {venteEnCours ? (
                  <>
                    <CircularProgress size={18} color="inherit" style={{ marginRight: 8 }} />
                    Traitement…
                  </>
                ) : (
                  `Valider (${formatF(netCash)})`
                )}
              </Button>
              {typeVente === "CASH_ECHANGE" && !venteEnCours && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  Encaisser uniquement le montant Net
                </Typography>
              )}
            </Box>
          )}
        </DialogActions>
      </Dialog>

      {/* MODAL CLIENT */}
      <Dialog
        open={openClientModal}
        onClose={() => {
          setOpenClientModal(false);
          setClientForm({ raisonsociale: "", telephone: "", categorieClient: "BAR", nomGerant: "" });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <UserPlus size={18} />
            <span>Nouveau client</span>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Le client sera automatiquement sélectionné.
          </Alert>

          <TextField
            fullWidth
            label="Nom / Raison sociale *"
            required
            value={clientForm.raisonsociale}
            onChange={(e) => setClientForm({ ...clientForm, raisonsociale: e.target.value })}
            sx={{ mb: 2 }}
            autoFocus
          />

          <TextField
            fullWidth
            label="Téléphone"
            value={clientForm.telephone}
            onChange={(e) => setClientForm({ ...clientForm, telephone: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            select
            SelectProps={{ native: true }}
            label="Type client"
            value={clientForm.categorieClient}
            onChange={(e) => setClientForm({ ...clientForm, categorieClient: e.target.value })}
            sx={{ mb: 2 }}
          >
            <option value="BAR">Bar / Maquis</option>
            <option value="PERSONNE">Personne</option>
          </TextField>

          {clientForm.categorieClient === "BAR" && (
            <TextField
              fullWidth
              label="Nom du gérant (optionnel)"
              value={clientForm.nomGerant}
              onChange={(e) => setClientForm({ ...clientForm, nomGerant: e.target.value })}
            />
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenClientModal(false)}>Annuler</Button>
          <Button variant="contained" onClick={validerEtChoisirClient} disabled={!clientForm.raisonsociale.trim()}>
            Créer et sélectionner
          </Button>
        </DialogActions>
      </Dialog>

      {/* POST-VALIDATION DIALOG */}
      <Dialog open={showPostValidation} onClose={closePostValidation} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 1 }}>
          <CheckCircle2 size={24} color="green" />
          Vente validée !
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ mb: 1, fontSize: "0.9rem", color: "#666" }}>
              <strong>Vente N°:</strong> {venteResultat?.venteId || "-"}
            </Box>
            <Box sx={{ mb: 1, fontSize: "0.9rem", color: "#666" }}>
              <strong>Client:</strong> {venteResultat?.client?.raisonsociale || "-"}
            </Box>
          </Box>

          <Box
            sx={{
              border: "1px solid #ddd",
              borderRadius: 1,
              p: 2,
              backgroundColor: "#f9f9f9",
              mb: 2,
              fontSize: "0.95rem"
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <span>Total :</span>
              <strong>{formatF(venteResultat?.total || 0)}</strong>
            </Box>
            {venteResultat?.typeVente === "CASH_ECHANGE" && (
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1, color: "#f57c00" }}>
                <span>Vides rendus :</span>
                <strong>{formatF(venteResultat?.montantVidesRendus || 0)}</strong>
              </Box>
            )}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                pt: 1,
                borderTop: "1px solid #ccc",
                fontWeight: "bold",
                color: "#1976d2"
              }}
            >
              <span>Net à payer (cash) :</span>
              <span>{formatF(venteResultat?.netCash || 0)}</span>
            </Box>
          </Box>

          <Alert severity="info">
            Que souhaitez-vous faire ? Imprimer le reçu ou le partager par WhatsApp ?
          </Alert>
        </DialogContent>

        <DialogActions>
          <Button onClick={closePostValidation}>Terminer</Button>
          <Button variant="outlined" onClick={handlePrintReceipt} startIcon={<Printer size={18} />}>
            Imprimer
          </Button>
          <Button variant="contained" onClick={handleWhatsAppShare} sx={{ backgroundColor: "#25d366" }}>
            WhatsApp
          </Button>
        </DialogActions>
      </Dialog>

      {/* SNACKBAR */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default BoissonApp;
