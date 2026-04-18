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
  InputAdornment,
  useMediaQuery,
  Modal,
  Backdrop,
  Fade
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
  Printer,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { publicApi } from "../../../api/axios";
import { getActivePointDeVenteId } from "../../../utils/pdv";
import { envoyerReleveWhatsApp } from "../../../api/releveApi";
import { messaging, getToken } from '../../../firebase';
// Ajoutez ces imports
import { CartNotification, CartBubble, SuccessConfirmation } from "./CartComponents";
// VAPID KEY à personnaliser avec ta vraie clé Firebase
// Remplace 'VOTRE_VAPID_KEY' ci-dessous par ta vraie clé (commence par BJ...)
const VAPID_KEY = 'VOTRE_VAPID_KEY';
// (supprimé : déclaration en double de VAPID_KEY)

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
  // ...existing code...
  // (Suppression du bouton pushToken, retour à l'UI d'origine)
  // Place ici le return principal d'origine de BoissonApp
  // ...existing code...
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
   MOBILE LAYOUT (NO WIZARD - FULL PAGE)
  ========================= */
  const [cartExpanded, setCartExpanded] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

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
  const [openLivreurModal, setOpenLivreurModal] = useState(false);
  const [livreurForm, setLivreurForm] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: ""
  });

  /* =========================
   TYPE VENTE & PAIEMENT
  ========================= */
  const [typeVente, setTypeVente] = useState("VENTE_CASH");
  const [typeVentePending, setTypeVentePending] = useState(null);
  const [showConfirmTypeVente, setShowConfirmTypeVente] = useState(false);
  const [montantVidesRendus, setMontantVidesRendus] = useState(0);

  const handleTypeVenteChange = (newType) => {
    if (cart.length > 0 && newType !== typeVente) {
      // Si panier contient des articles, demander confirmation
      setTypeVentePending(newType);
      setShowConfirmTypeVente(true);
    } else {
      // Changement direct si panier vide
      setTypeVente(newType);
      if (newType !== "CASH_ECHANGE") setMontantVidesRendus(0);
    }
  };

  const confirmTypeVenteChange = () => {
    setTypeVente(typeVentePending);
    if (typeVentePending !== "CASH_ECHANGE") setMontantVidesRendus(0);
    setShowConfirmTypeVente(false);
    setTypeVentePending(null);
    showNotification(`Mode changé: ${typeVentePending === "VENTE_CASH" ? "Cash" : typeVentePending === "CASH_ECHANGE" ? "Échange" : "Crédit"}`, "info");
  };

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

  /* =========================
   FIREBASE PUSH TOKEN
  ========================= */
  const [pushToken, setPushToken] = useState(null);
  
  const handleShowPushToken = async () => {
    try {
      const token = await getToken();
      setPushToken(token);
      showNotification("PushToken récupéré avec succès", "success");
    } catch (error) {
      console.error("Erreur récupération PushToken:", error);
      showNotification("Erreur lors de la récupération du PushToken", "error");
    }
  };

  /* =========================
   POST-VALIDATION (moved earlier for new layout)
  ========================= */
  const [venteResultat, setVenteResultat] = useState(null);
  const [showPostValidation, setShowPostValidation] = useState(false);

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
   LOAD ALL DATA (PRODUITS, CLIENTS, LIVREURS)
   - Chargement unique avec gestion d'erreur centralisée
   - Évite les multiples snackbars empilés
  ========================= */
  useEffect(() => {
    const loadAllData = async () => {
      const token = getToken();
      if (!token) return;

      const pvId = getActivePointDeVenteId();
      if (!pvId) {
        setErrorProduits("Point de vente introuvable. Veuillez sélectionner un point de vente.");
        setLoadingProduits(false);
        showNotification("Point de vente introuvable", "error");
        return;
      }

      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
      const errors = [];

      try {
        // Charger produits
        const produitsRes = await fetch(`/api/produits?pointDeVenteId=${pvId}`, { headers });
        if (produitsRes.ok) {
          const produitsData = await produitsRes.json();
          setBoissons(Array.isArray(produitsData) ? produitsData : []);
        } else {
          errors.push("produits");
          console.error("Erreur produits:", await produitsRes.text());
        }
      } catch (err) {
        errors.push("produits");
        console.error("Erreur produits:", err);
      }

      try {
        // Charger clients
        const clientsRes = await fetch(`/api/clients?pointDeVenteId=${pvId}`, { headers });
        if (clientsRes.ok) {
          const clientsData = await clientsRes.json();
          setClientsExistants(Array.isArray(clientsData) ? clientsData : []);
        } else {
          errors.push("clients");
          console.error("Erreur clients:", await clientsRes.text());
        }
      } catch (err) {
        errors.push("clients");
        console.error("Erreur clients:", err);
      }

      try {
        // Charger livreurs
        const livreursRes = await fetch(`/api/livreurs?pointDeVenteId=${pvId}`, { headers });
        if (livreursRes.ok) {
          const livreursData = await livreursRes.json();
          setLivreurs(Array.isArray(livreursData) ? livreursData : []);
        } else {
          errors.push("livreurs");
          console.error("Erreur livreurs:", await livreursRes.text());
        }
      } catch (err) {
        errors.push("livreurs");
        console.error("Erreur livreurs:", err);
      }

      // Notification unique pour toutes les erreurs
      if (errors.length > 0) {
        const errorMsg = `Erreur chargement: ${errors.join(", ")}`;
        setErrorProduits(errorMsg);
        showNotification(errorMsg, "error");
      }

      setLoadingProduits(false);
    };

    loadAllData();
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
   LIVREUR: CRÉATION RAPIDE
  ========================= */
  const validerEtChoisirLivreur = async () => {
    if (!livreurForm.firstName.trim() || !livreurForm.lastName.trim()) {
      showNotification("Le nom et prénom du livreur sont obligatoires", "error");
      return;
    }

    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch("/api/utilisateur/creer-livreur", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: livreurForm.firstName.trim(),
          lastName: livreurForm.lastName.trim(),
          phoneNumber: livreurForm.phoneNumber || "",
          password: "default123" // Mot de passe par défaut requis par le backend
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }

      const nouveauLivreur = await res.json();
      setOpenLivreurModal(false);
      setLivreurSelectionne(nouveauLivreur);

      // Ajouter le livreur à la liste s'il n'y est pas déjà
      setLivreurs((prev) => {
        const exists = prev.some((l) => String(l.id) === String(nouveauLivreur.id));
        return exists ? prev : [nouveauLivreur, ...prev];
      });

      setLivreurForm({ firstName: "", lastName: "", phoneNumber: "" });

      showNotification(`Livreur "${nouveauLivreur.firstName} ${nouveauLivreur.lastName}" créé`, "success");
    } catch (e) {
      console.error(e);
      showNotification("Échec création livreur: " + e.message, "error");
    }
  };

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
   RECEIPT & RECEIPT DATA
  ========================= */
  const getReceiptData = () => ({
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

  const [showConfirmVente, setShowConfirmVente] = useState(false);

  /* =========================
   VALIDER VENTE
  ========================= */
  const validerVente = async () => {
    if (!clientSelectionne) return showNotification("Veuillez sélectionner un client", "error");
    if (cart.length === 0) return showNotification("Le panier est vide", "error");
    if (typeVente === "CASH_ECHANGE" && Number(montantVidesRendus || 0) < 0)
      return showNotification("Le montant des vides doit être positif", "error");

    // Show confirmation dialog instead of direct validation
    setShowConfirmVente(true);
  };

  const confirmerVente = async () => {
    setShowConfirmVente(false);

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
      const res = await fetch(`/api/ventes/${venteResultat.venteId}/recu`, {
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
      closePostValidation();
    } catch (e) {
      console.error(e);
      showNotification("Erreur impression: " + e.message, "error");
    }
  };

  const handleWhatsAppShare = () => {
    sendWhatsAppReceipt(venteResultat);
    closePostValidation();
  };

  const handleSendReleveWhatsApp = async () => {
    if (!venteResultat?.client?.id) {
      showNotification("Données client manquantes", "error");
      return;
    }

    try {
      showNotification("Envoi du relevé en cours...", "info");
      const result = await envoyerReleveWhatsApp(venteResultat.client.id, true);
      
      if (result.success) {
        showNotification(`✓ Relevé envoyé à ${result.phoneNumber}`, "success");
      } else {
        showNotification(`Erreur: ${result.error}`, "error");
      }
    } catch (error) {
      console.error("Erreur envoi relevé:", error);
      showNotification(`Erreur: ${error.message}`, "error");
    }
  };

  const closePostValidation = () => {
    setShowPostValidation(false);
    setCart([]);
    setSearchTerm("");
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
      {/* FULL PAGE LAYOUT - MOBILE FIRST */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          bgcolor: "#f5f5f5",
          overflow: "hidden"
        }}
      >
        {/* ===== STICKY HEADER ===== */}
        <Paper
          elevation={0}
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            p: { xs: 1.5, md: 2 },
            bgcolor: "white",
            borderBottom: "1px solid #e0e0e0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
            🛒 Nouvelle vente
          </Typography>

          {/* Client Row */}
          <Box sx={{ display: "flex", gap: 1, mb: 1, alignItems: "center" }}>
            <TextField
              select
              size="small"
              value={clientSelectionne ? clientSelectionne.id : ""}
              onChange={(e) => {
                const id = e.target.value;
                const client = clientsExistants.find((c) => String(c.id) === String(id));
                setClientSelectionne(client || null);
              }}
              SelectProps={{ native: true }}
              placeholder="Sélectionner un client..."
              sx={{
                flex: 1,
                "& .MuiOutlinedInput-root": {
                  borderColor: "#1976d2",
                  "& fieldset": { borderColor: "#1976d2" }
                }
              }}
            >
              <option value="">👤 Sélectionner un client...</option>
              {clientsExistants.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.raisonsociale} {client.telephone ? `(${client.telephone})` : ""}
                </option>
              ))}
            </TextField>

            <IconButton
              size="small"
              onClick={() => setOpenClientModal(true)}
              sx={{
                bgcolor: "#4caf50",
                color: "white",
                "&:hover": { bgcolor: "#45a049" }
              }}
            >
              <Plus size={20} />
            </IconButton>
          </Box>

          {/* Livreur Select */}
          <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
            <TextField
              select
              fullWidth
              size="small"
              value={livreurSelectionne ? livreurSelectionne.id : ""}
              onChange={(e) => {
                const id = e.target.value;
                const livreur = livreurs.find((l) => String(l.id) === String(id));
                setLivreurSelectionne(livreur || null);
              }}
              SelectProps={{ native: true }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderColor: "#9c27b0"
                }
              }}
            >
              <option value="">🚚 Aucun livreur</option>
              {livreurs.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.firstName} {l.lastName} {l.phoneNumber ? `(${l.phoneNumber})` : ""}
                </option>
              ))}
            </TextField>

            <IconButton
              size="small"
              onClick={() => setOpenLivreurModal(true)}
              sx={{
                bgcolor: "#9c27b0",
                color: "white",
                "&:hover": { bgcolor: "#7b1fa2" }
              }}
            >
              <Plus size={20} />
            </IconButton>
          </Box>

          {/* Type Vente Buttons */}
          <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
            {[
              { value: "VENTE_CASH", label: "💵 CASH", color: "#4caf50", border: "#2e7d32", hint: "Paie tout" },
              { value: "CASH_ECHANGE", label: "🔄 ÉCHANGE", color: "#fb8c00", border: "#e65100", hint: "Vides = neufs" },
              { value: "VENTE_CREDIT", label: "💳 CRÉDIT", color: "#f44336", border: "#c62828", hint: "Dette" }
            ].map((t) => {
              const isSelected = typeVente === t.value;
              return (
                <Button
                  key={t.value}
                  size="medium"
                  onClick={() => handleTypeVenteChange(t.value)}
                  sx={{
                    flex: 1,
                    fontSize: "0.85rem",
                    fontWeight: isSelected ? 900 : 700,
                    p: 1.5,
                    border: `3px solid ${isSelected ? t.border : t.color}`,
                    color: isSelected ? "white" : t.color,
                    bgcolor: isSelected ? t.color : "white",
                    textTransform: "uppercase",
                    lineHeight: 1.3,
                    boxShadow: isSelected ? 4 : 1,
                    transition: "all 0.3s ease",
                    "&:hover": {
                      bgcolor: isSelected ? t.border : "#f5f5f5",
                      transform: "scale(1.05)",
                      boxShadow: 3
                    }
                  }}
                >
                  {t.label}
                  <br />
                  <span style={{ fontSize: "0.7rem", opacity: 0.9, fontWeight: 600 }}>{t.hint}</span>
                </Button>
              );
            })}
          </Box>

          {/* Info Box */}
          <Alert
            severity={typeVente === "VENTE_CREDIT" ? "warning" : "info"}
            sx={{ fontSize: "0.85rem", py: 0.75 }}
          >
            {typeVente === "VENTE_CASH" && (
              "💵 Client paie TOUT (produits + emballages)"
            )}
            {typeVente === "CASH_ECHANGE" && (
              "🔄 Client échange casiers vides = casiers pleins. Paie uniquement les produits"
            )}
            {typeVente === "VENTE_CREDIT" && (
              "💳 Vente à crédit - Dette ajoutée au compte client"
            )}
          </Alert>
        </Paper>

        {/* ===== PRODUCTS LIST (SCROLLABLE) ===== */}
        <Box
          sx={{
            flex: 1,
            overflow: "auto",
            p: { xs: 1.5, md: 2 },
            pb: "200px" // Space for floating cart
          }}
        >
          {/* Search Bar */}
          <TextField
            fullWidth
            placeholder="🔍 Rechercher un produit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{
              mb: 1.5,
              "& .MuiOutlinedInput-root": {
                borderRadius: 1.5,
                bgcolor: "white"
              }
            }}
            InputProps={{
              endAdornment: searchTerm ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchTerm("")}>
                    <X size={16} />
                  </IconButton>
                </InputAdornment>
              ) : null
            }}
          />

          {/* Quick Add Button */}
          <Button
            fullWidth
            variant="contained"
            onClick={() => setShowQuickAdd(true)}
            sx={{
              mb: 2,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              fontWeight: 700,
              py: 1.5,
              fontSize: "1rem"
            }}
          >
            📝 SAISIE RAPIDE
          </Button>

          {/* Products */}
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

        {/* ===== FLOATING CART ===== */}
        <Paper
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 200,
            maxWidth: "100vw",
            m: 0,
            borderRadius: cartExpanded ? 0 : "16px 16px 0 0",
            boxShadow: "0 -4px 12px rgba(0,0,0,0.1)",
            transition: "all 0.3s ease",
            "@media (min-width: 1200px)": {
              left: "auto",
              width: "calc(100% - 256px)" // Ajuste selon la largeur du drawer
            }
          }}
        >
          {/* Cart Summary (Always Visible) */}
          <Box
            onClick={() => setCartExpanded(!cartExpanded)}
            sx={{
              p: 1.5,
              bgcolor: "#e3f2fd",
              border: "2px solid #2196f3",
              boxShadow: "0 2px 8px rgba(33,150,243,0.2)",
              cursor: "pointer",
              userSelect: "none",
              transition: "all 0.2s ease",
              "&:hover": {
                bgcolor: "#bbdefb",
                boxShadow: "0 4px 12px rgba(33,150,243,0.3)"
              }
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
              <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", color: "#1565c0" }}>
                🛒 Panier
              </Typography>
              <Chip
                label={cart.length}
                size="small"
                sx={{ bgcolor: "#f44336", color: "white" }}
              />
              <Typography sx={{ fontWeight: 600, fontSize: "0.9rem", color: "#666", ml: "auto" }}>
                Mode: {typeVente === "VENTE_CASH" ? "Cash" : typeVente === "CASH_ECHANGE" ? "Échange" : "Crédit"}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Typography sx={{ fontWeight: 900, fontSize: "1.2rem", color: "#4caf50", mr: 1 }}>
                  {formatF(typeVente === "VENTE_CREDIT" ? 0 : netCash)}
                </Typography>
                {cartExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
              </Box>
            </Box>
          </Box>

          {/* Cart Details (Expandable) */}
          {cartExpanded && (
            <Box sx={{ 
              maxHeight: "calc(60vh - 140px)", 
              overflow: "auto", 
              bgcolor: "white",
              borderTop: "3px solid #673ab7",
              boxShadow: "inset 0 4px 8px rgba(103,58,183,0.1)"
            }}>
              {/* Cart Items */}
              <Box sx={{ p: 1.5 }}>
                {cart.length === 0 ? (
                  <Typography color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
                    Panier vide
                  </Typography>
                ) : (
                  cart.map((item) => {
                    const consigneU = calcConsigne(item);
                    return (
                      <Paper
                        key={item.id}
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          mb: 1.5,
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          bgcolor: "#f3e5f5",
                          border: "2px solid #9c27b0",
                          borderRadius: 2,
                          boxShadow: "0 2px 6px rgba(156,39,176,0.15)"
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#6a1b9a" }}>
                            {item.nom}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#7b1fa2", fontWeight: 600 }}>
                            {formatF(item.prix)} + {formatF(consigneU)} emb
                          </Typography>
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={() => modifierQuantitePanier(item.id, -1)}
                            disabled={item.quantite <= 1}
                            sx={{ 
                              bgcolor: "white", 
                              border: "1px solid #9c27b0",
                              "&:hover": { bgcolor: "#f3e5f5" }
                            }}
                          >
                            <Minus size={14} />
                          </IconButton>
                          <Typography sx={{ 
                            width: 32, 
                            textAlign: "center", 
                            fontWeight: 900,
                            fontSize: "1rem",
                            color: "#6a1b9a"
                          }}>
                            {item.quantite}
                          </Typography>
                          <IconButton 
                            size="small" 
                            onClick={() => modifierQuantitePanier(item.id, 1)}
                            sx={{ 
                              bgcolor: "white", 
                              border: "1px solid #9c27b0",
                              "&:hover": { bgcolor: "#f3e5f5" }
                            }}
                          >
                            <Plus size={14} />
                          </IconButton>
                        </Box>

                        <Typography sx={{ 
                          minWidth: 80, 
                          textAlign: "right", 
                          fontWeight: 900,
                          fontSize: "1.05rem",
                          color: "#6a1b9a"
                        }}>
                          {formatF((item.prix + consigneU) * item.quantite)}
                        </Typography>

                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => retirerDuPanier(item.id)}
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      </Paper>
                    );
                  })
                )}
              </Box>

              {/* Cart Recap */}
              {cart.length > 0 && (
                <Box sx={{ p: 1.5, bgcolor: "#f5f5f5", borderTop: "2px solid #e0e0e0" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75, fontSize: "0.9rem" }}>
                    <span>Produits:</span>
                    <strong>{formatF(totalProduits)}</strong>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75, fontSize: "0.9rem" }}>
                    <span>Emballages:</span>
                    <strong>{formatF(totalConsigne)}</strong>
                  </Box>
                  {typeVente === "CASH_ECHANGE" && (
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1, fontSize: "0.9rem", color: "#fb8c00", fontWeight: 600 }}>
                      <span>Vides rendus:</span>
                      <strong>- {formatF(montantVidesRendus || 0)}</strong>
                    </Box>
                  )}

                  {/* Vides Rendus Input */}
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
                      size="small"
                      sx={{ mb: 1 }}
                      inputProps={{ inputMode: "numeric" }}
                    />
                  )}

                  {/* Total Line */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: 900,
                      fontSize: "1.1rem",
                      pt: 1,
                      borderTop: "2px dashed #ccc",
                      color: typeVente === "VENTE_CASH" ? "#4caf50" : typeVente === "CASH_ECHANGE" ? "#fb8c00" : "#f44336"
                    }}
                  >
                    <span>À PAYER:</span>
                    <span>{formatF(typeVente === "VENTE_CREDIT" ? 0 : netCash)}</span>
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {/* Validate Button */}
          {cart.length > 0 && (
            <Box sx={{ mt: 3, mb: 2 }}> {/* Add spacing container */}
              <Button
                fullWidth
                variant="contained"
                onClick={validerVente}
                disabled={venteEnCours || !clientSelectionne}
                sx={{
                  py: 2.5,
                  fontWeight: 900,
                  fontSize: "1.2rem",
                  bgcolor: "#673ab7",
                  color: "white",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  boxShadow: "0 4px 12px rgba(103,58,183,0.4)",
                  border: "3px solid #5e35b1",
                  "&:hover": {
                  bgcolor: "#5e35b1",
                  boxShadow: "0 6px 16px rgba(103,58,183,0.6)",
                  transform: "translateY(-2px)"
                },
                "&:disabled": {
                  bgcolor: "#ccc",
                  color: "#666"
                },
                transition: "all 0.3s ease"
              }}
            >
              {venteEnCours ? (
                <>
                  <CircularProgress size={22} color="inherit" sx={{ mr: 1 }} />
                  Traitement…
                </>
              ) : (
                `✓ VALIDER LA VENTE (${formatF(typeVente === "VENTE_CREDIT" ? 0 : netCash)})`
              )}
            </Button>
            </Box> {/* Close spacing container */}
          )}
        </Paper>
      </Box>

      {/* ===== MODAL: CONFIRMATION CHANGEMENT MODE PAIEMENT ===== */}
      <Dialog
        open={showConfirmTypeVente}
        onClose={() => {
          setShowConfirmTypeVente(false);
          setTypeVentePending(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 1 }}>
          ⚠️ Confirmation
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Vous allez changer le mode de paiement alors que le panier contient déjà des articles.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Mode actuel: <strong>{typeVente === "VENTE_CASH" ? "💵 Cash" : typeVente === "CASH_ECHANGE" ? "🔄 Échange" : "💳 Crédit"}</strong>
            <br />
            Nouveau mode: <strong>{typeVentePending === "VENTE_CASH" ? "💵 Cash" : typeVentePending === "CASH_ECHANGE" ? "🔄 Échange" : "💳 Crédit"}</strong>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setShowConfirmTypeVente(false); setTypeVentePending(null); }}>
            Annuler
          </Button>
          <Button variant="contained" color="primary" onClick={confirmTypeVenteChange}>
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== MODAL: CONFIRMATION VENTE ===== */}
      <Dialog
        open={showConfirmVente}
        onClose={() => setShowConfirmVente(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 1 }}>
          💰 Confirmer la vente
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Vous êtes sur le point de valider cette vente. Vérifiez les informations ci-dessous.
          </Alert>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            <strong>Client:</strong> {clientSelectionne?.raisonsociale || "Client sélectionné"}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            <strong>Articles:</strong> {cart.length} article(s)
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            <strong>Mode de paiement:</strong> {typeVente === "VENTE_CASH" ? "💵 Cash" : typeVente === "CASH_ECHANGE" ? "🔄 Échange" : "💳 Crédit"}
          </Typography>
          
          <Typography variant="h6" color="primary" sx={{ fontWeight: 900, mt: 2 }}>
            Total: {formatF(typeVente === "VENTE_CREDIT" ? 0 : netCash)}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmVente(false)}>
            Annuler
          </Button>
          <Button 
            variant="contained" 
            color="success" 
            onClick={confirmerVente}
            disabled={venteEnCours}
          >
            {venteEnCours ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                Traitement...
              </>
            ) : (
              "✓ Confirmer la vente"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== MODAL: NOUVEAU CLIENT ===== */}
      <Dialog
        open={openClientModal}
        onClose={() => {
          setOpenClientModal(false);
          setClientForm({ raisonsociale: "", telephone: "", categorieClient: "BAR", nomGerant: "" });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 900 }}>
          <UserPlus size={20} />
          Nouveau client
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Le client sera automatiquement sélectionné.
          </Alert>

          {/* Mobile 3x2 Grid Layout */}
          <Box sx={{ 
            display: { xs: 'grid', md: 'block' }, 
            gridTemplateColumns: '1fr 1fr', 
            gap: 1.5,
            mb: 2
          }}>
            {/* Ligne 1: Nom / Téléphone */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, mb: 0.5, display: 'block' }}>Nom / Raison sociale *</Typography>
              <TextField
                fullWidth
                required
                value={clientForm.raisonsociale}
                onChange={(e) => setClientForm({ ...clientForm, raisonsociale: e.target.value })}
                size="small"
                autoFocus
              />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, mb: 0.5, display: 'block' }}>Téléphone</Typography>
              <TextField
                fullWidth
                value={clientForm.telephone}
                onChange={(e) => setClientForm({ ...clientForm, telephone: e.target.value })}
                size="small"
              />
            </Box>

            {/* Ligne 2: Type client / Nom du gérant */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, mb: 0.5, display: 'block' }}>Type client</Typography>
              <TextField
                fullWidth
                select
                SelectProps={{ native: true }}
                value={clientForm.categorieClient}
                onChange={(e) => setClientForm({ ...clientForm, categorieClient: e.target.value })}
                size="small"
              >
                <option value="BAR">Bar / Maquis</option>
                <option value="PERSONNE">Personne</option>
              </TextField>
            </Box>
            <Box>
              {clientForm.categorieClient === "BAR" ? (
                <>
                  <Typography variant="caption" sx={{ fontWeight: 800, mb: 0.5, display: 'block' }}>Nom du gérant</Typography>
                  <TextField
                    fullWidth
                    value={clientForm.nomGerant}
                    onChange={(e) => setClientForm({ ...clientForm, nomGerant: e.target.value })}
                    size="small"
                  />
                </>
              ) : (
                <Box sx={{ height: '40px' }} />
              )}
            </Box>
          </Box>

          {/* Desktop Layout (unchanged) */}
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
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
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenClientModal(false)}>Annuler</Button>
          <Button variant="contained" onClick={validerEtChoisirClient} disabled={!clientForm.raisonsociale.trim()}>
            Créer et sélectionner
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== MODAL: NOUVEAU LIVREUR ===== */}
      <Dialog
        open={openLivreurModal}
        onClose={() => {
          setOpenLivreurModal(false);
          setLivreurForm({ firstName: "", lastName: "", phoneNumber: "" });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 900 }}>
          <UserPlus size={20} />
          Nouveau livreur
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Le livreur sera automatiquement sélectionné.
          </Alert>

          {/* Mobile Layout - 2x1 Grid */}
          <Box sx={{ 
            display: { xs: 'grid', md: 'none' }, 
            gridTemplateColumns: '1fr 1fr', 
            gap: 1.5,
            mb: 2
          }}>
            {/* Ligne 1: Prénom / Nom */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, mb: 0.5, display: 'block' }}>Prénom *</Typography>
              <TextField
                fullWidth
                required
                value={livreurForm.firstName}
                onChange={(e) => setLivreurForm({ ...livreurForm, firstName: e.target.value })}
                size="small"
                autoFocus
              />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, mb: 0.5, display: 'block' }}>Nom *</Typography>
              <TextField
                fullWidth
                required
                value={livreurForm.lastName}
                onChange={(e) => setLivreurForm({ ...livreurForm, lastName: e.target.value })}
                size="small"
              />
            </Box>
          </Box>

          {/* Mobile - Téléphone sur toute la largeur */}
          <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, mb: 0.5, display: 'block' }}>Téléphone</Typography>
            <TextField
              fullWidth
              value={livreurForm.phoneNumber}
              onChange={(e) => setLivreurForm({ ...livreurForm, phoneNumber: e.target.value })}
              size="small"
            />
          </Box>

          {/* Desktop Layout - Stacked fields */}
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <TextField
              fullWidth
              label="Prénom *"
              required
              value={livreurForm.firstName}
              onChange={(e) => setLivreurForm({ ...livreurForm, firstName: e.target.value })}
              sx={{ mb: 2 }}
              autoFocus
            />

            <TextField
              fullWidth
              label="Nom *"
              required
              value={livreurForm.lastName}
              onChange={(e) => setLivreurForm({ ...livreurForm, lastName: e.target.value })}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Téléphone"
              value={livreurForm.phoneNumber}
              onChange={(e) => setLivreurForm({ ...livreurForm, phoneNumber: e.target.value })}
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenLivreurModal(false)}>Annuler</Button>
          <Button variant="contained" onClick={validerEtChoisirLivreur} disabled={!livreurForm.firstName.trim() || !livreurForm.lastName.trim()}>
            Créer et sélectionner
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== MODAL: SAISIE RAPIDE ===== */}
      <Modal
        open={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        closeAfterTransition
        slotProps={{
          backdrop: { timeout: 300 }
        }}
      >
        <Fade in={showQuickAdd}>
          <Paper
            sx={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "90%",
              maxWidth: "400px",
              maxHeight: "80vh",
              overflow: "auto",
              p: 2,
              borderRadius: 2
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Typography sx={{ fontWeight: 900, fontSize: "1.1rem" }}>📝 Saisie rapide</Typography>
              <IconButton size="small" onClick={() => setShowQuickAdd(false)}>
                <X size={20} />
              </IconButton>
            </Box>

            {produitsFiltres.map((p) => (
              <Box
                key={p.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  p: 1.25,
                  mb: 1,
                  bgcolor: "#f9f9f9",
                  borderRadius: 1
                }}
              >
                <Typography sx={{ flex: 1, fontWeight: 600, fontSize: "0.9rem" }}>
                  {p.designation}
                </Typography>
                <TextField
                  type="number"
                  value={itemQuantities[p.id] || 0}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^\d+$/.test(val)) {
                      setItemQuantities((prev) => ({
                        ...prev,
                        [p.id]: val === "" ? 0 : Number(val)
                      }));
                    }
                  }}
                  size="small"
                  inputProps={{
                    inputMode: "numeric",
                    style: { textAlign: "center", fontWeight: 900 }
                  }}
                  sx={{ width: 70 }}
                />
              </Box>
            ))}

            <Button
              fullWidth
              variant="contained"
              onClick={() => {
                produitsFiltres.forEach((p) => {
                  if ((itemQuantities[p.id] || 0) > 0) {
                    for (let i = 0; i < itemQuantities[p.id]; i++) {
                      ajouterAuPanier(p);
                    }
                  }
                });
                setItemQuantities({});
                setShowQuickAdd(false);
              }}
              sx={{ mt: 2, fontWeight: 700 }}
            >
              ✓ AJOUTER AU PANIER
            </Button>
          </Paper>
        </Fade>
      </Modal>

      {/* ===== MODAL: POST-VALIDATION ===== */}
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

      {/* ===== SNACKBAR ===== */}
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
    {/* === BOUTON POUR AFFICHER LE PUSHTOKEN FIREBASE === */}
    <Box sx={{ my: 2, p: 2, border: '1px dashed #1976d2', borderRadius: 2, background: '#f5faff' }}>
      <Button variant="contained" color="primary" onClick={handleShowPushToken}>
        Afficher mon PushToken Firebase
      </Button>
      {pushToken && (
        <Box sx={{ mt: 2, wordBreak: 'break-all', color: '#1976d2', fontWeight: 600 }}>
          <span>PushToken : </span>
          <span>{pushToken}</span>
        </Box>
      )}
    </Box>
    </>
  );
};

export default BoissonApp;
