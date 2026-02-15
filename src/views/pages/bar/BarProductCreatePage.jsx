import ProductCreatePage from "../produitBar/ProductCreatePage";

export default function BarProductCreatePage() {
  return (
    <ProductCreatePage
      title="Catalogue Bar"
      breadcrumbs={[
        { title: "Bar", path: "/accueil/bar/ventes" },
        { title: "Catalogue" },
      ]}
      defaultTab={0} // Ajout classique par défaut (formulaire complet)
    />
  );
}

