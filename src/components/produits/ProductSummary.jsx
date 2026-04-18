import React from "react";
import { Grid, Typography } from "@mui/material";

export default function ProductSummary({ produit }) {
  return (
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <Typography><strong>Désignation :</strong> {produit.designation}</Typography>
        <Typography><strong>Marque :</strong> {produit.marque}</Typography>
        <Typography><strong>Format :</strong> {produit.format}</Typography>
        <Typography><strong>Groupe :</strong> {produit.groupeLiquide}</Typography>
      </Grid>

      <Grid item xs={6}>
        <Typography><strong>Prix achat :</strong> {produit.prixAchatHt}</Typography>
        <Typography><strong>Prix vente :</strong> {produit.prixVenteHt}</Typography>
        <Typography><strong>Stock initial :</strong> {produit.stockInitial}</Typography>
        <Typography><strong>Stock minimum :</strong> {produit.stockMinimum}</Typography>
      </Grid>
    </Grid>
  );
}
