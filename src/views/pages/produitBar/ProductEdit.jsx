import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Button, Card, Grid, TextField, CircularProgress } from "@mui/material";
import PageContainer from "../../../crud-dashboard/components/PageContainer";
import useNotifications from "../../../crud-dashboard/hooks/useNotifications/useNotifications";
import { fetchProduitById, updateProduit } from "../../../api/produitsApi";

export default function ProductEdit() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const notifications = useNotifications();
  
  const [productName, setProductName] = React.useState("");
  const [formData, setFormData] = React.useState({
    prixAchatHt: 0,
    prixVenteHt: 0,
    consigneBouteille: 0,
    consigneCasier: 0,
    stockInitial: 0,
    stockMinimum: 0
  });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetchProduitById(productId)
      .then(data => {
        setProductName(data.designation);
        setFormData({
          prixAchatHt: data.prixAchatHt || 0,
        prixVenteHt: data.prixVenteHt || 0,
        consigneBouteille: data.consigneBouteille || 0, // Maintenant rempli par le casier !
        consigneCasier: data.consigneCasier || 0,       // Maintenant rempli par le casier !
        stockInitial: data.stockInitial || 0,           // Mappé depuis quantiteStock
        stockMinimum: data.stockMinimum || 0
        });
        setLoading(false);
      })
      .catch(() => navigate("/accueil/produits"));
  }, [productId, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ 
      ...prev, 
      [name]: value === "" ? 0 : Number(value) 
    }));
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <PageContainer title={`Modifier : ${productName}`}>
      <Card sx={{ p: 4, maxWidth: 700, mx: "auto", borderRadius: 3 }}>
        <form onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          try {
            // 🚀 ON ENVOIE UNIQUEMENT LES 6 CHAMPS DU DTO
            await updateProduit(productId, formData);
            notifications.show("Modification enregistrée", { severity: "success" });
            navigate("/accueil/produits");
          } catch (err) {
            notifications.show("Erreur lors de la mise à jour", { severity: "error" });
          } finally { setSaving(false); }
        }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField label="Prix Achat HT" name="prixAchatHt" type="number" value={formData.prixAchatHt} onChange={handleChange} fullWidth />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Prix Vente HT" name="prixVenteHt" type="number" value={formData.prixVenteHt} onChange={handleChange} fullWidth />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Prix Bouteille" name="consigneBouteille" type="number" value={formData.consigneBouteille} onChange={handleChange} fullWidth />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Prix Casier Nu" name="consigneCasier" type="number" value={formData.consigneCasier} onChange={handleChange} fullWidth />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Quantité en stock" name="stockInitial" type="number" value={formData.stockInitial} onChange={handleChange} fullWidth />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Stock Alerte" name="stockMinimum" type="number" value={formData.stockMinimum} onChange={handleChange} fullWidth />
            </Grid>

            <Grid item xs={12} sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button onClick={() => navigate("/accueil/produits")}>Annuler</Button>
              <Button type="submit" variant="contained" disabled={saving} sx={{ bgcolor: '#1a237e' }}>
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Card>
    </PageContainer>
  );
}
