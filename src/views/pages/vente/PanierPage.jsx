import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  IconButton,
  Button,
  Grid,
  Paper,
  Divider,
  Chip,
  Alert,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  CreditCard,
  Store,
  ChevronLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const PanierPage = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientSelectionne, setClientSelectionne] = useState(null);
  const [livreurSelectionne, setLivreurSelectionne] = useState(null);
  const [clients, setClients] = useState([]);
  const [livreurs, setLivreurs] = useState([]);
  const [typeVente, setTypeVente] = useState("VENTE_CASH");
  const [montantVidesRendus, setMontantVidesRendus] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [venteEnCours, setVenteEnCours] = useState(false);

  // Charger le panier depuis localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem("panier");
    console.log("PanierPage - Chargement du panier depuis localStorage:", savedCart);
    if (savedCart) {
      const parsedCart = JSON.parse(savedCart);
      console.log("PanierPage - Panier parsé:", parsedCart);
      setCart(parsedCart);
    }
    setLoading(false);
  }, []);

  // Sauvegarder le panier dans localStorage
  useEffect(() => {
    localStorage.setItem("panier", JSON.stringify(cart));
  }, [cart]);

  // Charger clients et livreurs
  useEffect(() => {
    fetchClients();
    fetchLivreurs();
  }, []);

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/clients", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (e) {
      console.error("Erreur chargement clients:", e);
    }
  };

  const fetchLivreurs = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/livreurs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLivreurs(data);
      }
    } catch (e) {
      console.error("Erreur chargement livreurs:", e);
    }
  };

  const modifierQuantite = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id
            ? { ...item, quantite: Math.max(1, item.quantite + delta) }
            : item
        )
        .filter((item) => item.quantite > 0)
    );
  };

  const retirerArticle = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const viderPanier = () => {
    setCart([]);
    // Le useEffect va automatiquement sauvegarder [] dans localStorage
  };

  // Calculs
  const totalProduits = cart.reduce(
    (sum, item) => sum + item.prix * item.quantite,
    0
  );
  const totalConsigne = cart.reduce(
    (sum, item) => sum + (item.consigneCasier + item.consigneBouteille) * item.quantite,
    0
  );
  const total = totalProduits + totalConsigne;
  const netCash = typeVente === "CASH_ECHANGE" 
    ? total - Number(montantVidesRendus || 0)
    : total;

  const formatF = (nombre) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XOF",
      minimumFractionDigits: 0,
    }).format(nombre);

  const validerCommande = () => {
    if (!clientSelectionne) {
      alert("Veuillez sélectionner un client");
      return;
    }
    if (cart.length === 0) {
      alert("Votre panier est vide");
      return;
    }
    setShowConfirmDialog(true);
  };

  const confirmerCommande = async () => {
    setShowConfirmDialog(false);
    setVenteEnCours(true);

    try {
      const token = localStorage.getItem("token");
      const payload = {
        clientId: clientSelectionne.id,
        articles: cart.map((item) => ({
          produitId: item.id,
          uniteId: 1,
          quantite: item.quantite,
          prixUnitaire: item.prix,
        })),
        montantPaye: typeVente === "VENTE_CREDIT" ? 0 : netCash,
        montantVidesRendus: typeVente === "CASH_ECHANGE" ? Number(montantVidesRendus || 0) : 0,
        typeVente,
        livreurId: livreurSelectionne ? livreurSelectionne.id : null,
      };

      const res = await fetch("/api/ventes/directe", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erreur lors de la validation");

      const venteData = await res.json();
      alert(`Vente validée ! ID: ${venteData.id}`);
      
      // Vider le panier après succès
      viderPanier();
      navigate("/accueil/ventes/nouveau");
    } catch (e) {
      console.error(e);
      alert("Erreur: " + e.message);
    } finally {
      setVenteEnCours(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto", p: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <IconButton onClick={() => navigate("/accueil/ventes/nouveau")}>
          <ChevronLeft />
        </IconButton>
        <Typography variant="h4" fontWeight="bold">
          <ShoppingCart sx={{ mr: 1, verticalAlign: "middle" }} />
          Mon Panier
        </Typography>
        <Chip
          label={`${cart.length} article${cart.length > 1 ? "s" : ""}`}
          color="primary"
          variant="outlined"
        />
      </Box>

      {cart.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <ShoppingCart sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            Votre panier est vide
          </Typography>
          <Button
            variant="contained"
            startIcon={<Store />}
            onClick={() => navigate("/accueil/ventes/nouveau")}
          >
            Commencer mes achats
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {/* Articles du panier */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  Articles ({cart.length})
                </Typography>
                <Button
                  size="small"
                  color="error"
                  onClick={viderPanier}
                  startIcon={<Trash2 size={16} />}
                >
                  Vider le panier
                </Button>
              </Box>

              {cart.map((item) => (
                <Card key={item.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={2}>
                        <Box
                          sx={{
                            width: 80,
                            height: 80,
                            bgcolor: "grey.200",
                            borderRadius: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Store size={32} color="text.secondary" />
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} sm={4}>
                        <Typography variant="h6" fontWeight="bold">
                          {item.nom}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.description || "Produit"}
                        </Typography>
                        <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                          {formatF(item.prix)}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} sm={3}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => modifierQuantite(item.id, -1)}
                            disabled={item.quantite <= 1}
                          >
                            <Minus size={16} />
                          </IconButton>
                          <TextField
                            value={item.quantite}
                            size="small"
                            sx={{ width: 60 }}
                            inputProps={{ textAlign: "center", readOnly: true }}
                          />
                          <IconButton
                            size="small"
                            onClick={() => modifierQuantite(item.id, 1)}
                          >
                            <Plus size={16} />
                          </IconButton>
                        </Box>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Sous-total: {formatF(item.prix * item.quantite)}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} sm={3}>
                        <Typography variant="h6" fontWeight="bold" align="right">
                          {formatF(item.prix * item.quantite)}
                        </Typography>
                        <IconButton
                          color="error"
                          onClick={() => retirerArticle(item.id)}
                          sx={{ float: "right" }}
                        >
                          <Trash2 size={18} />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Paper>
          </Grid>

          {/* Résumé et validation */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, position: "sticky", top: 20 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                Résumé de la commande
              </Typography>

              {/* Sélection client */}
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Client *</InputLabel>
                <Select
                  value={clientSelectionne?.id || ""}
                  label="Client *"
                  onChange={(e) => {
                    const client = clients.find((c) => c.id === e.target.value);
                    setClientSelectionne(client);
                  }}
                >
                  {clients.map((client) => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.raisonsociale}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Sélection livreur */}
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Livreur (optionnel)</InputLabel>
                <Select
                  value={livreurSelectionne?.id || ""}
                  label="Livreur (optionnel)"
                  onChange={(e) => {
                    const livreur = livreurs.find((l) => l.id === e.target.value);
                    setLivreurSelectionne(livreur);
                  }}
                >
                  <MenuItem value="">Pas de livreur</MenuItem>
                  {livreurs.map((livreur) => (
                    <MenuItem key={livreur.id} value={livreur.id}>
                      {livreur.firstName} {livreur.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Mode de paiement */}
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Mode de paiement</InputLabel>
                <Select
                  value={typeVente}
                  label="Mode de paiement"
                  onChange={(e) => setTypeVente(e.target.value)}
                >
                  <MenuItem value="VENTE_CASH">💵 Cash</MenuItem>
                  <MenuItem value="CASH_ECHANGE">🔄 Échange</MenuItem>
                  <MenuItem value="VENTE_CREDIT">💳 Crédit</MenuItem>
                </Select>
              </FormControl>

              {/* Vides rendus pour échange */}
              {typeVente === "CASH_ECHANGE" && (
                <TextField
                  fullWidth
                  label="Montant vides rendus"
                  value={montantVidesRendus}
                  onChange={(e) => setMontantVidesRendus(e.target.value)}
                  type="number"
                  sx={{ mb: 2 }}
                />
              )}

              <Divider sx={{ my: 2 }} />

              {/* Détails prix */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <span>Produits:</span>
                  <strong>{formatF(totalProduits)}</strong>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <span>Emballages:</span>
                  <strong>{formatF(totalConsigne)}</strong>
                </Box>
                {typeVente === "CASH_ECHANGE" && (
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <span>Vides rendus:</span>
                    <strong style={{ color: "orange" }}>
                      -{formatF(montantVidesRendus || 0)}
                    </strong>
                  </Box>
                )}
                <Divider sx={{ my: 1 }} />
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "1.2rem",
                    fontWeight: "bold",
                  }}
                >
                  <span>Total:</span>
                  <span style={{ color: "primary.main" }}>
                    {formatF(typeVente === "VENTE_CREDIT" ? 0 : netCash)}
                  </span>
                </Box>
              </Box>

              {/* Boutons d'action */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  onClick={() => navigate("/accueil/ventes/nouveau")}
                >
                  Continuer mes achats
                </Button>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<CreditCard />}
                  onClick={validerCommande}
                  disabled={venteEnCours || !clientSelectionne}
                  sx={{ py: 1.5 }}
                >
                  {venteEnCours ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    `Valider la commande (${formatF(typeVente === "VENTE_CREDIT" ? 0 : netCash)})`
                  )}
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Dialog de confirmation */}
      <Dialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)}>
        <DialogTitle>Confirmer la commande</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Vous êtes sur le point de valider cette commande.
          </Alert>
          <Typography>
            <strong>Client:</strong> {clientSelectionne?.raisonsociale}
          </Typography>
          <Typography>
            <strong>Articles:</strong> {cart.length}
          </Typography>
          <Typography>
            <strong>Total:</strong> {formatF(typeVente === "VENTE_CREDIT" ? 0 : netCash)}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={confirmerCommande}
            disabled={venteEnCours}
          >
            {venteEnCours ? (
              <CircularProgress size={16} />
            ) : (
              "Confirmer"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PanierPage;
