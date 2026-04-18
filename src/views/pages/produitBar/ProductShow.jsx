import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageContainer from "../../../crud-dashboard/components/PageContainer";
import useNotifications from "../../../crud-dashboard/hooks/useNotifications/useNotifications";

import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  Stack,
  Typography,
  CircularProgress,
} from "@mui/material";

import { fetchProduitById } from "../../../api/produitsApi";

export default function ProductShow() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const notifications = useNotifications();

  const [produit, setProduit] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  // 🔹 Chargement du produit
  React.useEffect(() => {
    const loadProduit = async () => {
      try {
        const data = await fetchProduitById(productId);
        setProduit(data);
      } catch (err) {
        notifications.show(
          "Impossible de charger le produit",
          { severity: "error" }
        );
        navigate("/accueil/produits");
      } finally {
        setLoading(false);
      }
    };

    loadProduit();
  }, [productId, navigate, notifications]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!produit) return null;

  return (
    <PageContainer
      title="Détail du produit"
      breadcrumbs={[
        { title: "Produits", path: "/accueil/produits" },
        { title: produit.designation },
      ]}
    >
      <Card sx={{ maxWidth: 900 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">
              Informations générales
            </Typography>

            <Divider />

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Désignation
                </Typography>
                <Typography>{produit.designation}</Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Marque
                </Typography>
                <Typography>{produit.marque || "-"}</Typography>
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  Prix vente HT
                </Typography>
                <Typography>
                  {produit.prixVenteHt} FCFA
                </Typography>
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  Stock minimum
                </Typography>
                <Typography>
                  {produit.stockMinimum}
                </Typography>
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  Actif
                </Typography>
                <Typography>
                  {produit.actif ? "Oui" : "Non"}
                </Typography>
              </Grid>
            </Grid>

            <Divider />

            <Stack
              direction="row"
              spacing={2}
              justifyContent="flex-end"
            >
              <Button
                variant="outlined"
                onClick={() => navigate("/accueil/produits")}
              >
                Retour
              </Button>

              <Button
                variant="contained"
                onClick={() =>
                  navigate(`/accueil/produits/${produit.id}/edit`)
                }
              >
                Modifier
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
