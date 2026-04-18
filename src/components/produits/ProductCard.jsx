import React from "react";
import { Card, CardContent, Typography } from "@mui/material";

export default function ProductCard({ produit }) {
  return (
    <Card sx={{ p: 1 }}>
      <CardContent>
        <Typography variant="h6" fontWeight="bold">
          {produit.designation}
        </Typography>

        <Typography variant="body2" color="text.secondary">
          {produit.marque} — {produit.format}
        </Typography>

        <Typography variant="body2" sx={{ mt: 1 }}>
          Prix vente : {produit.prixVenteHt} FCFA
        </Typography>
      </CardContent>
    </Card>
  );
}
