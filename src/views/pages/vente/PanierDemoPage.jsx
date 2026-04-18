import React, { useState } from "react";
import PanierWidget from "./PanierWidget";
import PanierModal from "./PanierModal";
import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
} from "@mui/material";
import { ShoppingCart, Plus } from "lucide-react";

const PanierDemoPage = () => {
  const [showPanierModal, setShowPanierModal] = useState(false);
  
  // Panier de démonstration
  const [cart, setCart] = useState([
    {
      id: 1,
      nom: "Bock 33cl",
      prix: 1000,
      consigneCasier: 1200,
      consigneBouteille: 175,
      quantite: 2
    },
    {
      id: 2,
      nom: "Castel 33cl",
      prix: 800,
      consigneCasier: 1200,
      consigneBouteille: 175,
      quantite: 1
    }
  ]);

  // Données de démonstration
  const clients = [
    { id: 1, raisonsociale: "Bar du Centre" },
    { id: 2, raisonsociale: "Café de la Place" }
  ];

  const livreurs = [
    { id: 1, firstName: "Charles", lastName: "Gonlah" },
    { id: 2, firstName: "Jean", lastName: "Livreur" }
  ];

  const [clientSelectionne, setClientSelectionne] = useState(clients[0]);
  const [livreurSelectionne, setLivreurSelectionne] = useState(null);
  const [typeVente, setTypeVente] = useState("VENTE_CASH");
  const [montantVidesRendus, setMontantVidesRendus] = useState(0);
  const [venteEnCours, setVenteEnCours] = useState(false);

  // Fonctions de gestion du panier
  const handleRemoveItem = (id) => {
    setCart(cart.filter((i) => i.id !== id));
  };

  const handleUpdateQuantity = (id, delta) => {
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

  const handleClearCart = () => {
    setCart([]);
  };

  const handleValidate = () => {
    setVenteEnCours(true);
    setTimeout(() => {
      setVenteEnCours(false);
      setShowPanierModal(false);
      alert("✅ Vente validée avec succès !");
    }, 2000);
  };

  const addDemoItem = () => {
    const newItem = {
      id: Date.now(),
      nom: "Produit démo",
      prix: 500,
      consigneCasier: 1000,
      consigneBouteille: 150,
      quantite: 1
    };
    setCart([...cart, newItem]);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, textAlign: "center" }}>
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          🛒 Démonstration Panier Ebay Style
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Widget flottant + Modal complète - Test des composants
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Produits disponibles
              </Typography>
              <Button
                variant="contained"
                startIcon={<Plus />}
                onClick={addDemoItem}
                sx={{ mb: 2 }}
              >
                Ajouter un produit démo
              </Button>
              
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {cart.map((item) => (
                  <Card key={item.id} variant="outlined">
                    <CardContent sx={{ py: 2 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {item.nom}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.prix} F × {item.quantite}
                          </Typography>
                        </Box>
                        <Typography variant="h6" color="primary">
                          {(item.prix * item.quantite).toLocaleString()} F
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Instructions
              </Typography>
              <Typography variant="body2" paragraph>
                1. Ajoutez des produits avec le bouton ci-dessus
              </Typography>
              <Typography variant="body2" paragraph>
                2. Cliquez sur le widget panier 🛒 en bas à droite
              </Typography>
              <Typography variant="body2" paragraph>
                3. Testez la modal Ebay Style
              </Typography>
              
              <Button
                variant="outlined"
                fullWidth
                startIcon={<ShoppingCart />}
                onClick={() => setShowPanierModal(true)}
                sx={{ mt: 2 }}
              >
                Ouvrir le panier (modal)
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Panier Widget Ebay Style */}
      <PanierWidget cart={cart} onClick={() => setShowPanierModal(true)} />

      {/* Panier Modal */}
      <PanierModal
        open={showPanierModal}
        onClose={() => setShowPanierModal(false)}
        cart={cart}
        onRemoveItem={handleRemoveItem}
        onUpdateQuantity={handleUpdateQuantity}
        onClearCart={handleClearCart}
        onValidate={handleValidate}
        clients={clients}
        livreurs={livreurs}
        clientSelectionne={clientSelectionne}
        setClientSelectionne={setClientSelectionne}
        livreurSelectionne={livreurSelectionne}
        setLivreurSelectionne={setLivreurSelectionne}
        typeVente={typeVente}
        setTypeVente={setTypeVente}
        montantVidesRendus={montantVidesRendus}
        setMontantVidesRendus={setMontantVidesRendus}
        venteEnCours={venteEnCours}
      />
    </Container>
  );
};

export default PanierDemoPage;
