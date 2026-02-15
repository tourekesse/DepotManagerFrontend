// src/views/pages/produit/ProductCreatePage.jsx
import * as React from "react";
import PageContainer from "../../../crud-dashboard/components/PageContainer";
import { Tabs, Tab, Box, Card } from "@mui/material";



import ProductCreateClassique from "./ProductCreateClassique";
import ProductCreateRapide from "./ProductCreateRapide";


export default function ProductCreatePage() {
  const [mode, setMode] = React.useState(0);

  return (
    <PageContainer
      title="Nouveau produit"
      breadcrumbs={[
        { title: "Produits", path: "/accueil/produits" },
        { title: "Nouveau" },
      ]}
    >
      <Card sx={{ mb: 1 }}>
        <Tabs
          value={mode}
          onChange={(_, newValue) => setMode(newValue)}
          variant="fullWidth"
        >
          <Tab label="Ajout classique" />
          <Tab label="Ajout rapide (catalogue)" />
        </Tabs>
      </Card>

      <Box sx={{ mt: 1 }}>
        {mode === 0 && <ProductCreateClassique />}
        {mode === 1 && <ProductCreateRapide />}
      </Box>
    </PageContainer>
  );
}
