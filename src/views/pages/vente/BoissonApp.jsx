import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
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
  Fade,
  Skeleton
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
import { InputMask } from 'primereact/inputmask';
import { publicApi, privateApi } from "../../../api/axios";
import { getActivePointDeVenteId } from "../../../utils/pdv";
import { messaging, getToken } from '../../../utils/firebase';

// 🚀 PWA & Performance Imports
import { usePWA } from "../../../hooks/usePWA";
import { useOfflineSales } from "../../../hooks/useOfflineSales";
import OptimizedImage from "../../../components/OptimizedImage";
import VirtualizedProductList from "../../../components/VirtualizedProductList";
import { useLazyLoad } from "../../../hooks/useLazyLoad";

// 🚀 Hook debounce personnalisé pour optimiser la recherche
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Ajoutez ces imports
import { CartNotification, CartBubble, SuccessConfirmation } from "./CartComponents";
import CartModal from "./CartModal";
// VAPID KEY à personnaliser avec ta vraie clé Firebase
// Remplace 'VOTRE_VAPID_KEY' ci-dessous par ta vraie clé (commence par BJ...)
const VAPID_KEY = 'BJEB7F2gGSx80pIc6HKpuKJoLd-6TvI-aN4ha-JqAVc11O232aNikxl3Jpy2VMnTikVc1AWAS-zCxUDzJPBVlR0';
// (supprimé : déclaration en double de VAPID_KEY)

const formatF = (n) => `${Number(n || 0).toLocaleString("fr-FR")} F`;
const clamp = (v, min = 1) => {
  const x = parseFloat(String(v ?? ""));
  if (Number.isNaN(x)) return min;
  return Math.max(min, x);
};

const steps = ["Produits", "Client & Livreur", "Confirmation"];

const calcConsigne = (p) =>
  (p.consigneBouteille || 0) * (p.nbBouteillesParCasier || 0) + (p.consigneCasier || 0);

/* =========================
   LIGNE PRODUIT (PRO + MOBILE)
   - Quantité EDITABLE avec état local tempQty
   - Bouton Ajouter avec feedback visuel
========================= */
const ProduitRow = ({ boisson, quantite, setQuantite, onAdd, isAdding }) => {
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
      const clamped = clamp(val, 1);
      setQuantite(clamped);
      setTempQty(String(clamped));
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    // Allow empty string, digits, or decimal numbers like 0.5, 1.5, 3.5
    if (val === '' || /^\d+(\.\d{0,2})?$/.test(val)) {
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
          aria-label={`Diminuer la quantité de ${boisson.designation}`}
          title={`Diminuer la quantité de ${boisson.designation}`}
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
            inputMode: "decimal",
            pattern: "[0-9]*(\\.[0-9]{0,2})?",
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
          aria-label={`Augmenter la quantité de ${boisson.designation}`}
          title={`Augmenter la quantité de ${boisson.designation}`}
        >
          <Plus size={16} />
        </IconButton>

        <Button
          variant="contained"
          size="small"
          disabled={isAdding}
          onClick={() => {
            handleBlur(); // Ensure quantite is updated before adding
            onAdd();
          }}
          aria-label={`Ajouter ${boisson.designation} au panier`}
          title={`Ajouter ${boisson.designation} au panier`}
          sx={{
            borderRadius: 2,
            fontWeight: 900,
            minWidth: { xs: 80, sm: 96 }, // 📱 Plus petit sur mobile
            height: { xs: 44, sm: 40 }, // 📱 Plus grand sur mobile pour les doigts
            fontSize: { xs: '0.8rem', sm: '0.9rem' }, // 📱 Taille de texte adaptée
            bgcolor: isAdding ? "#4caf50" : "primary.main",
            "&:hover": { 
              bgcolor: isAdding ? "#45a049" : "primary.dark",
              transform: isAdding ? "scale(1)" : "scale(1.05)"
            },
            transition: "all 0.2s",
            transform: isAdding ? "scale(0.95)" : "scale(1)"
          }}
        >
          {isAdding ? (
            <>
              <CircularProgress size={16} sx={{ mr: 1, color: "inherit" }} />
              Ajouté!
            </>
          ) : (
            "Ajouter"
          )}
        </Button>
      </Box>
    </Paper>
  );
};

const BoissonApp = () => {
  // 🚀 PWA & Performance Hooks
  const { isOnline, showLocalNotification } = usePWA();
  const { saveOfflineSale, hasPendingSales } = useOfflineSales();
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  /* =========================
   ÉTATS GÉNÉRAUX
  ========================= */
  const [boissons, setBoissons] = useState([]);
  const [cart, setCart] = useState([]);
  const [itemQuantities, setItemQuantities] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [addingProductId, setAddingProductId] = useState(null);
  const [searchError, setSearchError] = useState(null);

  const [loadingProduits, setLoadingProduits] = useState(true);
  const [errorProduits, setErrorProduits] = useState(null);
  const [venteEnCours, setVenteEnCours] = useState(false);
  const [pvId, setPvId] = useState(null);
  const [pvLoading, setPvLoading] = useState(true);

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
   MODE LIVRAISON (SIMPLIFIÉ)
  ========================= */
  const [modeLivraison, setModeLivraison] = useState("SUR_PLACE");

  const handleModeLivraisonChange = (newMode) => {
    if (cart.length > 0 && newMode !== modeLivraison) {
      // Si panier contient des articles, demander confirmation
      setModeLivraisonPending(newMode);
      setShowConfirmTypeVente(true);
    } else {
      // Changement direct si panier vide
      setModeLivraison(newMode);
    }
  };

  /* =========================
   CONFIRMATION CHANGEMENT MODE
  ========================= */
  const [modeLivraisonPending, setModeLivraisonPending] = useState(null);
  const [showConfirmTypeVente, setShowConfirmTypeVente] = useState(false);

  const confirmModeLivraisonChange = () => {
    setModeLivraison(modeLivraisonPending);
    setShowConfirmTypeVente(false);
    setModeLivraisonPending(null);
    showNotification(`Mode changé: ${modeLivraisonPending === "SUR_PLACE" ? "Vente sur place" : "Livraison"}`, "info");
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
   ÉTATS EBAY STYLE
  ========================= */
  const [showCartNotification, setShowCartNotification] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);

  /* =========================
   FIREBASE PUSH TOKEN (masqué pour la production)
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
  const lastReceiptRef = useRef(null);

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
   POINT DE VENTE
   ========================= */
  const resolvePvId = useCallback(async () => {
    // 1) PV déjà en cache
    let pv = getActivePointDeVenteId();
    if (pv) return pv;

    // 2) Tenter de récupérer depuis /api/utilisateur/context
    try {
      const res = await privateApi.get("/api/utilisateur/context");
      const ctxPv = res.data?.pointDeVenteActif;
      if (ctxPv?.id) {
        localStorage.setItem("activePV", JSON.stringify(ctxPv));
        return ctxPv.id;
      }
    } catch (err) {
      console.warn("Impossible de récupérer le contexte PV :", err);
    }

    return null;
  }, []);

  // Au montage : récupérer/initialiser le PV actif
  useEffect(() => {
    (async () => {
      const pv = await resolvePvId();
      if (pv) setPvId(pv);
      setPvLoading(false);
    })();
  }, [resolvePvId]);

  const loadAllData = useCallback(
    async (forcedPvId = null) => {
      const token = getToken();
      if (!token) return;

      const currentPvId = forcedPvId ?? pvId;
      if (!currentPvId) {
        setErrorProduits("Point de vente introuvable. Veuillez sélectionner un point de vente.");
        setLoadingProduits(false);
        showNotification("Point de vente introuvable", "error");
        return;
      }

      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
      const errors = [];

      try {
        // 🚀 Paralléliser tous les appels API pour un chargement plus rapide
        const [produitsResponse, clientsResponse, livreursResponse] = await Promise.allSettled([
          fetch(`/api/produits?pointDeVenteId=${currentPvId}`, { headers }),
          fetch(`/api/clients?pointDeVenteId=${currentPvId}`, { headers }),
          fetch(`/api/livreurs?pointDeVenteId=${currentPvId}`, { headers })
        ]);

        // Traiter la réponse des produits
        if (produitsResponse.status === 'fulfilled' && produitsResponse.value.ok) {
          const produitsData = await produitsResponse.value.json();
          setBoissons(Array.isArray(produitsData) ? produitsData : []);
        } else {
          errors.push("produits");
          console.error("Erreur produits:", produitsResponse.status === 'rejected' ? produitsResponse.reason : await produitsResponse.value.text());
        }

        // Traiter la réponse des clients
        if (clientsResponse.status === 'fulfilled' && clientsResponse.value.ok) {
          const clientsData = await clientsResponse.value.json();
          setClientsExistants(Array.isArray(clientsData) ? clientsData : []);
        } else {
          errors.push("clients");
          console.error("Erreur clients:", clientsResponse.status === 'rejected' ? clientsResponse.reason : await clientsResponse.value.text());
        }

        // Traiter la réponse des livreurs
        if (livreursResponse.status === 'fulfilled' && livreursResponse.value.ok) {
          const livreursData = await livreursResponse.value.json();
          setLivreurs(Array.isArray(livreursData) ? livreursData : []);
        } else {
          errors.push("livreurs");
          console.error("Erreur livreurs:", livreursResponse.status === 'rejected' ? livreursResponse.reason : await livreursResponse.value.text());
        }

      } catch (err) {
        console.error("Erreur générale lors du chargement:", err);
        errors.push("général");
      }

      // Notification unique pour toutes les erreurs
      if (errors.length > 0) {
        const errorMsg = `Erreur chargement: ${errors.join(", ")}`;
        setErrorProduits(errorMsg);
        showNotification(errorMsg, "error");
      }

      setLoadingProduits(false);
    },
    [getToken, showNotification, pvId]
  );

  useEffect(() => {
    if (!pvLoading) {
      loadAllData();
    }
  }, [pvLoading]); // Retiré loadAllData pour éviter les rechargements infinis

  /* =========================
   PRODUITS FILTRÉS AVEC GESTION D'ERREURS ET DEBOUNCE
  ========================= */
  // 🚀 Appliquer le debounce pour optimiser la recherche (300ms de délai)
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // 🚀 Indicateur de chargement pour la recherche
  const isSearching = debouncedSearchTerm !== searchTerm;
  
  const produitsFiltres = useMemo(() => {
    const s = debouncedSearchTerm.trim().toLowerCase();
    
    // Réinitialiser l'erreur de recherche
    if (searchError) setSearchError(null);
    
    if (!s) return boissons;
    
    const filtered = boissons.filter((b) => (b.designation || "").toLowerCase().includes(s));
    
    // 📱 Amélioration 5: Message d'erreur si aucun produit trouvé
    if (filtered.length === 0 && s.length > 2) {
      setSearchError(`Aucun produit trouvé pour "${s}"`);
    }
    
    return filtered;
  }, [boissons, debouncedSearchTerm, searchError]);

  /* =========================
   PANIER
  ========================= */
  const ajouterAuPanier = async (boisson) => {
    // 🎨 Amélioration: Feedback visuel pendant l'ajout
    setAddingProductId(boisson.id);
    
    const qte = Math.max(1, itemQuantities[boisson.id] || 1);
    const token = getToken();
    
    if (!token || !clientSelectionne || !pvId) {
      showNotification("Veuillez sélectionner un client", "error");
      setAddingProductId(null);
      return;
    }

    try {
      // Appel API pour ajouter au panier (table panier)
      const res = await fetch("/api/panier/ajouter", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          clientId: clientSelectionne.id,
          pointVenteId: pvId,
          produitId: boisson.id,
          quantite: qte
        })
      });

      if (!res.ok) throw new Error(await res.text());
      
      await chargerPanierDepuisBase();
      
      // Animation eBay style
      setLastAddedItem({ 
        id: boisson.id, 
        nom: boisson.designation, 
        quantite: qte 
      });
      
      showNotification(`${qte} × ${boisson.designation} ajouté au panier`, "success");
      
    } catch (error) {
      console.error("Erreur ajout panier:", error);
      showNotification("Erreur lors de l'ajout au panier", "error");
    } finally {
      // Reset la quantité de cette ligne
      setItemQuantities((prev) => ({ ...prev, [boisson.id]: 1 }));
      
      // 🎨 Amélioration: Retirer le feedback visuel après 500ms
      setTimeout(() => {
        setAddingProductId(null);
      }, 500);
    }
  };

  /* =========================
   CHARGEMENT PANIER DEPUIS BASE
  ========================= */
  const chargerPanierDepuisBase = useCallback(async () => {
    if (!clientSelectionne || !pvId) return;
    
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`/api/panier/client/${clientSelectionne.id}/point-vente/${pvId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error(await res.text());
      
      const data = await res.json();
      setCart(data.panier || []);
      
      // Mettre à jour les totaux
      setTotalProduits(data.totalProduits || 0);
      setTotalConsigne(data.totalConsigne || 0);
      
    } catch (error) {
      console.error("Erreur chargement panier:", error);
      setCart([]);
      setTotalProduits(0);
      setTotalConsigne(0);
    }
  }, [clientSelectionne, pvId]);

  const retirerDuPanier = async (itemId) => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`/api/panier/supprimer/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error(await res.text());
      
      await chargerPanierDepuisBase();
      showNotification("Article supprimé du panier", "success");
      
    } catch (error) {
      console.error("Erreur suppression panier:", error);
      showNotification("Erreur lors de la suppression", "error");
    }
  };

  const modifierQuantitePanier = async (itemOrId, delta) => {
    const token = getToken();
    if (!token) return;

    try {
      const itemId = typeof itemOrId === 'object' ? itemOrId.id : itemOrId;
      const currentItem = typeof itemOrId === 'object'
        ? itemOrId
        : cart.find(item => Number(item.id || item.produit_id) === Number(itemId));
      if (!currentItem) return;

      const nouvelleQuantite = Number(currentItem.quantite || 0) + delta;
      
      if (nouvelleQuantite <= 0) {
        // Supprimer l'item si quantité = 0
        await retirerDuPanier(itemId);
        return;
      }

      const res = await fetch("/api/panier/modifier-quantite", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          itemId: itemId,
          produitId: currentItem.produit_id || currentItem.produitId,
          clientId: clientSelectionne?.id,
          pointVenteId: pvId,
          quantite: nouvelleQuantite
        })
      });

      if (!res.ok) throw new Error(await res.text());

      setCart(prev => prev.map(item =>
        Number(item.id) === Number(itemId)
          ? { ...item, quantite: nouvelleQuantite, montant_total: Number(item.prix_unitaire || item.prix || 0) * nouvelleQuantite }
          : item
      ));
      
      await chargerPanierDepuisBase();
      
    } catch (error) {
      console.error("Erreur modification quantité:", error);
      showNotification("Erreur lors de la modification", "error");
    }
  };

  const viderPanier = async () => {
    if (!clientSelectionne || !pvId) return;
    
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`/api/panier/vider/${clientSelectionne.id}/${pvId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error(await res.text());
      
      await chargerPanierDepuisBase();
      showNotification("Panier vidé", "success");
      
    } catch (error) {
      console.error("Erreur vidage panier:", error);
      showNotification("Erreur lors du vidage du panier", "error");
    }
  };

  /* =========================
   CALCULS
  ========================= */
  const [totalProduits, setTotalProduits] = useState(0);
  const [totalConsigne, setTotalConsigne] = useState(0);
  const total = totalProduits + totalConsigne;
  const totalArticles = useMemo(() => cart.reduce((sum, i) => sum + (i.quantite || 0), 0), [cart]);

  /* =========================
   CHARGEMENT AUTOMATIQUE DU PANIER
  ========================= */
  // Ne pas charger le panier au montage pour une nouvelle commande
  // Le panier sera chargé uniquement si on veut reprendre une vente existante
  // Pour /accueil/commandes/nouveau, on commence avec un panier vierge
  useEffect(() => {
    // Ligne supprimée: chargerPanierDepuisBase() 
    // pour une nouvelle commande, on garde le panier vide
  }, []); // Sans dépendance - s'exécute une seule fois au montage

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
    client: clientSelectionne,
    montantVidesRendus: 0,
    typeVente: "COMMANDE",
    cart
  });

  const buildReceiptText = (venteData = {}) => {
    const parts = [
      `Commande N°${venteData.venteId || "-"}`,
      venteData.client?.raisonsociale || "Client",
      `Total: ${venteData.total || 0} F`
    ];
    if (Number(venteData.totalConsigne || 0) > 0) {
      parts.push(`Emballages: ${venteData.totalConsigne} F`);
    }
    return parts.join(" | ");
  };

  const getShareData = (overrideData) => {
    if (overrideData) return overrideData;
    if (lastReceiptRef.current) return lastReceiptRef.current;
    return getReceiptData();
  };

  const shareReceiptWhatsApp = async (commandeData = {}) => {
    const data = getShareData(commandeData);
    const text = buildReceiptText(data);
    const commandeId = data.commandeId;
    if (!commandeId) {
      showNotification("ID commande manquant pour partager le reçu", "error");
      return;
    }

    try {
      const res = await privateApi.get(`/api/recu-commande/${commandeId}/pdf`, { responseType: "blob" });
      const blob = res.data;
      const file = new File([blob], `Commande_${commandeId}.pdf`, { type: "application/pdf" });

      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          text,
          title: `Commande ${commandeId}`
        });
        return;
      }

      if (typeof navigator !== "undefined" && navigator.share && !navigator.canShare) {
        // Tentative optimiste si canShare n'est pas exposé
        await navigator.share({
          files: [file],
          text,
          title: `Commande ${commandeId}`
        });
        return;
      }

      throw new Error("Partage de fichier non supporté par ce navigateur");
    } catch (err) {
      console.error("Partage PDF WhatsApp impossible :", err);
      showNotification("Partage direct du PDF non supporté sur cet appareil. Ouvre le PDF puis partage depuis la feuille du navigateur.", "warning");
    }
  };

  const [showConfirmVente, setShowConfirmVente] = useState(false);

  /* =========================
   VALIDER VENTE
  ========================= */
  const validerCommande = async () => {
    if (!clientSelectionne) return showNotification("Veuillez sélectionner un client", "error");
    if (cart.length === 0) return showNotification("Le panier est vide", "error");

    // Show confirmation dialog instead of direct validation
    setShowConfirmVente(true);
  };

  const confirmerCommande = async () => {
    setShowConfirmVente(false);

    setVenteEnCours(true);
    const token = getToken();
    if (!token) {
      setVenteEnCours(false);
      return;
    }

    try {
      console.log("=== DEBUG COMMANDE FRONTEND ===");
      console.log("modeLivraison:", modeLivraison);
      console.log("total:", total);
      console.log("================================");

      // NOUVEAU FLUX : Création d'une commande depuis le panier
      // Récupérer le panier depuis la base
      const panierRes = await fetch(`/api/panier/client/${clientSelectionne.id}/point-vente/${pvId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!panierRes.ok) throw new Error(await panierRes.text());

      const panierData = await panierRes.json();
      const lignesPanier = panierData.panier || [];

      if (lignesPanier.length === 0) {
        showNotification("Le panier est vide", "error");
        setVenteEnCours(false);
        return;
      }

      const payload = {
        clientId: clientSelectionne.id,
        pointDeVenteId: pvId,
        lignes: lignesPanier.map(item => ({
          produitId: item.produit_id,
          quantite: item.quantite,
          prixUnitaire: item.prix_unitaire,
          montantTotal: item.montant_total,
          consigne: item.consigne || 0
        })),
        modeRetrait: modeLivraison === "SUR_PLACE" ? "SUR_PLACE" : "LIVRAISON",
        livreurId: modeLivraison === "A_LIVRER" ? (livreurSelectionne ? livreurSelectionne.id : null) : null,
        montantTotal: total,
        totalConsigne: totalConsigne,
      };

      const res = await fetch("/api/commandes/unifiee", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(await res.text());

      const commandeData = await res.json();
      const commandeId = commandeData?.id || commandeData?.commandeId;
      
      // Préparer les données pour le reçu/bon de commande
      const commandeResultatFinal = {
        ...getReceiptData(),
        commandeId: commandeId,
        client: clientSelectionne,
        statut: "EN_ATTENTE_DE_VALIDATION"
      };
      lastReceiptRef.current = commandeResultatFinal;
      setVenteResultat(commandeResultatFinal);
      
      // 🚀 Vider le panier en base après la commande réussie
      await viderPanier();
      
      // Vider le panier local
      setCart([]);
      setSearchTerm("");
      
      // Forcer le nettoyage du panier dans localStorage au cas où
      try {
        localStorage.removeItem('cart');
        localStorage.removeItem('searchTerm');
      } catch (e) {
        console.warn('⚠️ Erreur nettoyage localStorage:', e);
      }
      
      const cartItemsCount = cart.length;
      
      // 🚀 Notification PWA de succès - COMMANDE créée (pas vente)
      showLocalNotification('📋 Commande créée', {
        body: `${cartItemsCount} produits commandés pour ${formatF(total)}`,
        icon: '/logos/icon-pwa.svg'
      });
      
      // Utiliser le modal de succès avec message adapté
      setShowSuccessModal(true);
      setShowCartModal(false); // Fermer le modal du panier
      showNotification("Commande enregistrée avec succès", "success");
    } catch (e) {
      console.error('❌ Erreur vente en ligne:', e);
      
      // 🚀 Gestion hors ligne en cas d'erreur
      if (!isOnline || e.message.includes('fetch') || e.message.includes('NetworkError')) {
        try {
          // 🚀 Vider le panier immédiatement pour la vente hors ligne
          const cartItemsCount = cart.length; // Sauvegarder le nombre avant de vider
          setCart([]);
          setSearchTerm("");
          
          const venteDataOffline = {
            ...payload,
            timestamp: Date.now(),
            clientId: clientSelectionne?.id,
            clientName: clientSelectionne?.nom || clientSelectionne?.raisonSociale,
            total: total,
            status: 'pending'
          };
          
          await saveOfflineSale(venteDataOffline);
          
          showLocalNotification('💾 Vente sauvegardée hors ligne', {
            body: 'La vente sera synchronisée dès que vous serez en ligne',
            icon: '/logos/icon-pwa.svg'
          });
          
          showNotification("Vente sauvegardée hors ligne", "info");
          setShowCartModal(false); // Fermer le modal du panier
          
        } catch (offlineError) {
          console.error('❌ Erreur sauvegarde hors ligne:', offlineError);
          showNotification("Erreur lors de la sauvegarde hors ligne", "error");
        }
      } else {
        showNotification("Erreur vente: " + e.message, "error");
      }
    } finally {
      setVenteEnCours(false);
    }
  };

  const handlePrintReceipt = async () => {
    if (!venteResultat?.commandeId) return showNotification("ID commande manquant", "error");
    try {
      const token = getToken();
      const response = await fetch(`/api/recu-commande/${venteResultat.commandeId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Erreur génération PDF');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Erreur impression:', err);
      showNotification("Erreur lors de la génération du PDF", "error");
    }
    closePostValidation();
  };

  const handleWhatsAppShare = async () => {
    await shareReceiptWhatsApp(venteResultat);
    closePostValidation();
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
      {/* Modal de confirmation de succès eBay style */}
      <SuccessConfirmation
        open={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          setSearchTerm("");
        }}
        venteResultat={venteResultat}
        handlePrintReceipt={handlePrintReceipt}
        handleWhatsAppShare={() => shareReceiptWhatsApp(venteResultat)}
      />

      {/* Modal du panier */}
      <CartModal
        open={showCartModal}
        onClose={() => setShowCartModal(false)}
        cart={cart}
        totalProduits={totalProduits}
        totalConsigne={totalConsigne}
        total={total}
        modifierQuantitePanier={modifierQuantitePanier}
        retirerDuPanier={retirerDuPanier}
        clientSelectionne={clientSelectionne}
        validerVente={validerCommande}
        venteEnCours={venteEnCours}
      />

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
        {/* ===== STICKY HEADER - VERSION PROGRESSIVE CLAUDE AI ===== */}
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
          {/* LIGNE 1 : Titre + Panier - TOUJOURS VISIBLE */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
              🛒 Vente
            </Typography>
            <Badge 
              badgeContent={cart.length} 
              color="error"
              max={99}
              sx={{
                "& .MuiBadge-badge": {
                  animation: lastAddedItem ? "bounce 0.5s" : "none",
                  "@keyframes bounce": {
                    "0%, 100%": { transform: "scale(1)" },
                    "50%": { transform: "scale(1.3)" }
                  },
                  fontSize: "0.75rem",
                  height: 20,
                  minWidth: 20
                }
              }}
            >
              <Button
                variant="contained"
                startIcon={<ShoppingCart size={18} />}
                onClick={() => setShowCartModal(true)}
                sx={{
                  bgcolor: "#673ab7",
                  "&:hover": { bgcolor: "#5e35b1" },
                  borderRadius: 2,
                  px: 2,
                  fontWeight: 700,
                  fontSize: { xs: '0.85rem', md: '0.95rem' }
                }}
              >
                Panier
              </Button>
            </Badge>
          </Box>

          {/* LIGNE 2 : Client - TOUJOURS VISIBLE */}
          {!clientSelectionne ? (
            /* ========== CLIENT NON SÉLECTIONNÉ - Mode sélection ========== */
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                select
                fullWidth
                size="small"
                SelectProps={{ native: true }}
                onChange={(e) => {
                  const client = clientsExistants.find(c => String(c.id) === String(e.target.value));
                  setClientSelectionne(client || null);
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderColor: "#1976d2",
                    "& fieldset": { borderColor: "#1976d2", borderWidth: 2 }
                  }
                }}
              >
                <option value="">👤 Sélectionner un client...</option>
                {clientsExistants.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.raisonsociale} {c.telephone ? `(${c.telephone})` : ""}
                  </option>
                ))}
              </TextField>

              <IconButton
                size="small"
                onClick={() => setOpenClientModal(true)}
                sx={{
                  bgcolor: "#4caf50",
                  color: "white",
                  width: 40,
                  height: 40,
                  "&:hover": { bgcolor: "#45a049", transform: "scale(1.1)" },
                  transition: "all 0.2s"
                }}
              >
                <Plus size={20} />
              </IconButton>
            </Box>
          ) : (
            /* ========== CLIENT SÉLECTIONNÉ - Mode compact avec options ========== */
            <>
              {/* Client sélectionné - Affichage compact */}
              <Box sx={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 1, 
                p: 1.25, 
                bgcolor: "#e8f5e9", 
                borderRadius: 1.5,
                mb: 1.5,
                border: "2px solid #4caf50"
              }}>
                <Typography sx={{ 
                  flex: 1, 
                  fontWeight: 700, 
                  fontSize: "0.95rem",
                  color: "#2e7d32"
                }}>
                  ✅ {clientSelectionne.raisonsociale}
                </Typography>
                <Button 
                  size="small" 
                  onClick={() => setClientSelectionne(null)}
                  sx={{ 
                    fontSize: "0.75rem", 
                    minWidth: 70,
                    fontWeight: 600,
                    color: "#4caf50",
                    border: "1px solid #4caf50",
                    "&:hover": {
                      bgcolor: "#4caf50",
                      color: "white"
                    }
                  }}
                >
                  Changer
                </Button>
              </Box>

              {/* ========== OPTIONS - Apparaissent progressivement ========== */}
              <Box sx={{ 
                animation: "slideDown 0.4s ease-out",
                "@keyframes slideDown": {
                  "0%": { opacity: 0, transform: "translateY(-15px)" },
                  "100%": { opacity: 1, transform: "translateY(0)" }
                }
              }}>
                
                
                {/* Mode de livraison - NOUVELLE INTERFACE */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#666", textAlign: "center" }}>
                    MODE DE VENTE
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Button
                      fullWidth
                      size="small"
                      onClick={() => handleModeLivraisonChange("SUR_PLACE")}
                      sx={{
                        fontSize: "1.5rem",
                        minWidth: 0,
                        p: 1,
                        bgcolor: modeLivraison === "SUR_PLACE" ? "#2196f3" : "white",
                        border: `3px solid #2196f3`,
                        borderRadius: 1.5,
                        transition: "all 0.3s",
                        position: "relative",
                        "&:hover": { 
                          bgcolor: modeLivraison === "SUR_PLACE" ? "#1976d2" : "#e3f2fd",
                          transform: "scale(1.08)",
                          boxShadow: 2
                        },
                        "&::after": modeLivraison === "SUR_PLACE" ? {
                          content: '""',
                          position: "absolute",
                          bottom: -2,
                          left: "50%",
                          transform: "translateX(-50%)",
                          width: 0,
                          height: 0,
                          borderLeft: "6px solid transparent",
                          borderRight: "6px solid transparent",
                          borderBottom: "6px solid #2196f3" 
                        } : {}
                      }}
                      title="Vente sur place"
                    >
                      🏪
                    </Button>
                    <Button
                      fullWidth
                      size="small"
                      onClick={() => handleModeLivraisonChange("A_LIVRER")}
                      sx={{
                        fontSize: "1.5rem",
                        minWidth: 0,
                        p: 1,
                        bgcolor: modeLivraison === "A_LIVRER" ? "#9c27b0" : "white",
                        border: `3px solid #9c27b0`,
                        borderRadius: 1.5,
                        transition: "all 0.3s",
                        position: "relative",
                        "&:hover": { 
                          bgcolor: modeLivraison === "A_LIVRER" ? "#7b1fa2" : "#f3e5f5",
                          transform: "scale(1.08)",
                          boxShadow: 2
                        },
                        "&::after": modeLivraison === "A_LIVRER" ? {
                          content: '""',
                          position: "absolute",
                          bottom: -2,
                          left: "50%",
                          transform: "translateX(-50%)",
                          width: 0,
                          height: 0,
                          borderLeft: "6px solid transparent",
                          borderRight: "6px solid transparent",
                          borderBottom: "6px solid #9c27b0" 
                        } : {}
                      }}
                      title="Livraison"
                    >
                      🚚
                    </Button>
                  </Box>
                  
                  {/* Option échange - SEULEMENT pour vente sur place */}
                  {modeLivraison === "SUR_PLACE" && (
                    <Button
                      fullWidth
                      size="small"
                      onClick={() => {}}
                      sx={{
                        fontSize: "1.2rem",
                        p: 0.5,
                        bgcolor: "white",
                        border: `2px solid #fb8c00`,
                        borderRadius: 1,
                        transition: "all 0.3s",
                        "&:hover": { 
                          bgcolor: "#fff3e0",
                        }
                      }}
                      title="Échange de casiers"
                    >
                      🔄 Échange casiers
                    </Button>
                  )}
                </Box>

                {/* Livreur - SEULEMENT si livraison */}
                {modeLivraison === "A_LIVRER" && (
                  <Box sx={{ 
                    display: "flex", 
                    gap: 1, 
                    animation: "slideDown 0.3s ease-out"
                  }}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      required
                      SelectProps={{ native: true }}
                      value={livreurSelectionne?.id || ""}
                      onChange={(e) => {
                        const livreur = livreurs.find(l => String(l.id) === String(e.target.value));
                        setLivreurSelectionne(livreur || null);
                      }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderColor: "#9c27b0",
                          "& fieldset": { borderColor: "#9c27b0", borderWidth: 2 }
                        }
                      }}
                    >
                      <option value="">🚛 Sélectionner un livreur</option>
                      {livreurs.map(l => (
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
                        width: 40,
                        height: 40,
                        "&:hover": { bgcolor: "#7b1fa2", transform: "scale(1.1)" },
                        transition: "all 0.2s"
                      }}
                    >
                      <Plus size={18} />
                    </IconButton>
                  </Box>
                )}

                {/* Hint sous les boutons */}
                <Typography 
                  variant="caption" 
                  sx={{ 
                    display: "block", 
                    textAlign: "center", 
                    mt: 0.75,
                    color: "#666",
                    fontSize: "0.7rem",
                    fontWeight: 600
                  }}
                >
                  {modeLivraison === "SUR_PLACE" && "🏪 Vente sur place (paiement complet)"}
                  {modeLivraison === "A_LIVRER" && "🚚 Livraison (paiement à la livraison)"}
                </Typography>

              </Box>
            </>
          )}

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
              endAdornment: isSearching ? (
                <InputAdornment position="end">
                  <CircularProgress size={16} />
                </InputAdornment>
              ) : searchTerm ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchTerm("")}>
                    <X size={16} />
                  </IconButton>
                </InputAdornment>
              ) : null
            }}
          />

          {/* 🚀 Indicateur de statut hors ligne */}
          {!isOnline && (
            <Alert 
              severity="warning" 
              sx={{ mb: 2 }}
              action={
                <Button size="small" color="inherit">
                  Mode Hors Ligne
                </Button>
              }
            >
              Vous êtes actuellement hors ligne. Les ventes seront synchronisées ultérieurement.
            </Alert>
          )}

          {/* Quick Add Button */}
          <Button
            fullWidth
            variant="contained"
            onClick={() => setShowQuickAdd(true)}
            disabled={!clientSelectionne} // Désactivé si pas de client
            sx={{
              mb: 2,
              background: clientSelectionne 
                ? "linear-gradient(135deg, #10b981 0%, #34d399 100%)"
                : "#e0e0e0",
              fontWeight: 900,
              py: 1.75,
              fontSize: "1rem",
              borderRadius: 2,
              boxShadow: clientSelectionne ? 3 : 0,
              "&:hover": {
                boxShadow: clientSelectionne ? 6 : 0,
                transform: clientSelectionne ? "translateY(-2px)" : "none"
              },
              transition: "all 0.3s"
            }}
          >
            ⚡ SAISIE RAPIDE
            {!clientSelectionne && (
              <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', mt: 0.5 }}>
                Sélectionnez d'abord un client
              </Typography>
            )}
          </Button>

          {/* Products avec virtualisation pour meilleures performances */}
          {searchError && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {searchError}
            </Alert>
          )}
          
          {/* 🚀 Utiliser la virtualisation seulement pour les grandes listes */}
          {produitsFiltres.length > 50 ? (
            <VirtualizedProductList
              products={produitsFiltres}
              loading={loadingProduits}
              onProductClick={(boisson) => {
                // Ajouter le produit directement au panier avec quantité par défaut
                ajouterAuPanier(boisson);
              }}
              itemHeight={120}
              containerHeight={window.innerHeight - 300}
            />
          ) : (
            // Rendu normal pour les petites listes
            produitsFiltres.map((b) => (
              <ProduitRow
                key={b.id}
                boisson={b}
                quantite={itemQuantities[b.id] || 1}
                isAdding={addingProductId === b.id}
                setQuantite={(q) =>
                  setItemQuantities((prev) => ({
                    ...prev,
                    [b.id]: clamp(q, 1)
                  }))
                }
                onAdd={() => ajouterAuPanier(b)}
              />
            ))
          )}
        </Box>

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
            Mode actuel: <strong>{modeLivraison === "SUR_PLACE" ? "🏪 Vente sur place" : "🚚 Livraison"}</strong>
            <br />
            Nouveau mode: <strong>{modeLivraisonPending === "SUR_PLACE" ? "🏪 Vente sur place" : "🚚 Livraison"}</strong>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setShowConfirmTypeVente(false); setModeLivraisonPending(null); }}>
            Annuler
          </Button>
          <Button variant="contained" color="primary" onClick={confirmModeLivraisonChange}>
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
            <strong>Mode de vente:</strong> {modeLivraison === "SUR_PLACE" ? "🏪 Vente sur place" : "🚚 Livraison"}
          </Typography>
          
          <Typography variant="h6" color="primary" sx={{ fontWeight: 900, mt: 2 }}>
            {modeLivraison === "A_LIVRER" ? (
              <>
                Montant total: {formatF(total)}<br/>
                <Typography variant="body2" sx={{ fontWeight: 400, color: "#666" }}>
                  Total commande: {formatF(total)} F
                </Typography>
              </>
            ) : (
              <>
                Montant total: {formatF(total)}<br/>
                <Typography variant="body2" sx={{ fontWeight: 400, color: "#666" }}>
                  Total commande: {formatF(total)} F
                </Typography>
              </>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmVente(false)}>
            Annuler
          </Button>
          <Button 
            variant="contained" 
            color="success" 
            onClick={confirmerCommande}
            disabled={venteEnCours}
          >
            {venteEnCours ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                Traitement...
              </>
            ) : (
              "✓ Confirmer la commande"
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
            display: { xs: 'grid', md: 'none' },
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
              <InputMask
                mask="99-99-99-99-99"
                value={clientForm.telephone}
                onChange={(e) => setClientForm({ ...clientForm, telephone: e.target.value })}
                className="w-full p-inputtext-sm p-2"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ccc' }}
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

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Téléphone</Typography>
              <InputMask
                mask="99-99-99-99-99"
                value={clientForm.telephone}
                onChange={(e) => setClientForm({ ...clientForm, telephone: e.target.value })}
                className="w-full"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem' }}
              />
            </Box>

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
          Nouveau collaborateur
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
      <InputMask
        mask="99 99 99 99 99"
        style={{ width: "100%" }}
        value={livreurForm.phoneNumber}
        onChange={(e) => setLivreurForm({ ...livreurForm, phoneNumber: e.value })}
      >
        {(inputProps) => (
          <TextField
            {...inputProps}
            fullWidth
            size="small"
            placeholder="00 00 00 00 00"
            inputProps={{
              ...inputProps.inputProps,
              inputMode: "tel",
              style: { width: '100%' }
            }}
          />
        )}
      </InputMask>
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

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Téléphone</Typography>
              <InputMask
                mask="99 99 99 99 99"
                style={{ width: "100%" }}
                value={livreurForm.phoneNumber}
                onChange={(e) => setLivreurForm({ ...livreurForm, phoneNumber: e.value })}
              >
                {(inputProps) => (
                  <TextField
                    {...inputProps}
                    fullWidth
                    placeholder="00 00 00 00 00"
                    inputProps={{
                      ...inputProps.inputProps,
                      inputMode: "tel",
                      style: { width: '100%' }
                    }}
                  />
                )}
              </InputMask>
            </Box>
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
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <span>Payé :</span>
              <strong>{formatF(venteResultat?.montantPaye || 0)}</strong>
            </Box>
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
              <span>Reste dû :</span>
              <span>{formatF((venteResultat?.total || 0) - (venteResultat?.montantPaye || 0))}</span>
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

      {/* 🚀 Indicateur de ventes en attente */}
      {hasPendingSales && (
        <Alert 
          severity="info" 
          sx={{ mt: 2 }}
          action={
            <Button size="small" href="#offline-sales">
              Voir ({hasPendingSales.pendingCount})
            </Button>
          }
        >
          {hasPendingSales.pendingCount} vente(s) en attente de synchronisation
        </Alert>
      )}
    {/* === BOUTON POUR AFFICHER LE PUSHTOKEN FIREBASE (MASQUÉ EN PRODUCTION) === */}
    {/* Décommenter le sx={{ display: 'block' } pour activer en mode debug */}
    <Box sx={{ 
      my: 2, 
      p: 2, 
      border: '1px dashed #1976d2', 
      borderRadius: 2, 
      background: '#f5faff',
      display: 'none' // Masqué en production
    }}>
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
