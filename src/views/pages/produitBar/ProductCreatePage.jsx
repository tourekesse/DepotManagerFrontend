// src/views/pages/produitBar/ProductCreatePage.jsx
import * as React from "react";
import PageContainer from "../../../crud-dashboard/components/PageContainer";
import { Tabs, Tab, Box, Card } from "@mui/material";
import ProductList from "./ProductList";
import ProductCreateClassique from "../produit/ProductCreateClassique";
import ProductCreateRapide from "../produit/ProductCreateRapide";


const DEFAULT_BREADCRUMBS = [
  { title: "Produits", path: "/accueil/bar/catalogue" },
];

export default function ProductCreatePage({
  title = "Catalogue Bar",
  breadcrumbs = DEFAULT_BREADCRUMBS,
  defaultTab = 0,
}) {
  const [tab, setTab] = React.useState(defaultTab);

  return (
    <PageContainer title={title} breadcrumbs={breadcrumbs}>
      <Card sx={{ mb: 1 }}>
        <Tabs
          value={tab}
          onChange={(_, newValue) => setTab(newValue)}
          variant="fullWidth"
        >
          <Tab label="Liste des produits" />
          <Tab label="Ajout classique" />
          <Tab label="Ajout rapide (catalogue)" />
        </Tabs>
      </Card>

      <Box sx={{ mt: 1 }}>
        {tab === 0 && <ProductList />}
        {tab === 1 && <ProductCreateClassique />}
        {tab === 2 && <ProductCreateRapide />}
      </Box>
    </PageContainer>
  );
}