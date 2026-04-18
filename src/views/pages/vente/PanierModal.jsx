import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Card,
  CardContent,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Chip,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  ShoppingCart,
  X,
  Plus,
  Minus,
  Trash2,
  CreditCard,
} from "lucide-react";

const PanierModal = ({
  open,
  onClose,
  cart,
  onRemoveItem,
  onUpdateQuantity,
  onClearCart,
  onValidate,
  clients,
  livreurs,
  clientSelectionne,
  setClientSelectionne,
  livreurSelectionne,
  setLivreurSelectionne,
  typeVente,
  setTypeVente,
  montantVidesRendus,
  setMontantVidesRendus,
  venteEnCours,
}) => {
  // Calculs
  const totalProduits = cart.reduce((sum, item) => sum + item.prix * item.quantite, 0);
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

  const handleValidate = () => {
    if (!clientSelectionne) {
      alert("Veuillez sélectionner un client");
      return;
    }
    if (cart.length === 0) {
      alert("Votre panier est vide");
      return;
    }
    onValidate();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { height: "90vh", maxHeight: "90vh" }
      }}
    >
      <DialogTitle sx={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between",
        bgcolor: "#f8f9fa",
        borderBottom: "1px solid #dee2e6"
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ShoppingCart size={24} />
          <Typography variant="h6" fontWeight="bold">
            Mon Panier ({cart.length} article{cart.length > 1 ? "s" : ""})
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: "flex", flexDirection: "column", height: "100%" }}>
        {cart.length === 0 ? (
          <Box sx={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            justifyContent: "center",
            height: "100%",
            p: 4
          }}>
            <ShoppingCart size={64} color="text.secondary" />
            <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
              Votre panier est vide
            </Typography>
            <Button onClick={onClose} sx={{ mt: 2 }}>
              Continuer mes achats
            </Button>
          </Box>
        ) : (
          <Grid container sx={{ height: "100%" }}>
            {/* Articles du panier */}
            <Grid item xs={12} md={7} sx={{ borderRight: { md: "1px solid #dee2e6" } }}>
              <Box sx={{ p: 2, height: "100%", overflow: "auto" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Articles
                  </Typography>
                  <Button
                    size="small"
                    color="error"
                    onClick={onClearCart}
                    startIcon={<Trash2 size={14} />}
                  >
                    Vider
                  </Button>
                </Box>

                {cart.map((item) => (
                  <Card key={item.id} sx={{ mb: 2, border: "1px solid #dee2e6" }}>
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {item.nom}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.prix} F
                          </Typography>
                        </Grid>

                        <Grid item xs={12} sm={3}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => onUpdateQuantity(item.id, -1)}
                              disabled={item.quantite <= 1}
                            >
                              <Minus size={16} />
                            </IconButton>
                            <TextField
                              value={item.quantite}
                              size="small"
                              sx={{ width: 50 }}
                              inputProps={{ textAlign: "center", readOnly: true }}
                            />
                            <IconButton
                              size="small"
                              onClick={() => onUpdateQuantity(item.id, 1)}
                            >
                              <Plus size={16} />
                            </IconButton>
                          </Box>
                        </Grid>

                        <Grid item xs={12} sm={3}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {formatF(item.prix * item.quantite)}
                            </Typography>
                            <IconButton
                              color="error"
                              onClick={() => onRemoveItem(item.id)}
                              size="small"
                            >
                              <Trash2 size={16} />
                            </IconButton>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Grid>

            {/* Résumé et validation */}
            <Grid item xs={12} md={5}>
              <Box sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column" }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                  Résumé
                </Typography>

                {/* Sélection client */}
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Client *</InputLabel>
                  <Select
                    value={clientSelectionne?.id || ""}
                    label="Client *"
                    size="small"
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
                    size="small"
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
                    size="small"
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
                    size="small"
                    sx={{ mb: 2 }}
                  />
                )}

                <Divider sx={{ my: 2 }} />

                {/* Détails prix */}
                <Box sx={{ mb: 2, flexGrow: 1 }}>
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
                      fontSize: "1.1rem",
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
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<ArrowBack size={16} />}
                    onClick={onClose}
                    fullWidth
                  >
                    Continuer mes achats
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<CreditCard size={16} />}
                    onClick={handleValidate}
                    disabled={venteEnCours || !clientSelectionne}
                    fullWidth
                    sx={{ py: 1.5 }}
                  >
                    {venteEnCours ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      `Valider (${formatF(typeVente === "VENTE_CREDIT" ? 0 : netCash)})`
                    )}
                  </Button>
                </Box>
              </Box>
            </Grid>
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PanierModal;
