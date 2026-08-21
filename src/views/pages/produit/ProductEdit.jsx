import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import PageContainer from "../../../crud-dashboard/components/PageContainer";
import useNotifications from "../../../crud-dashboard/hooks/useNotifications/useNotifications";
import { fetchProduitById, updateProduit } from "../../../api/produitsApi";
import { createReferentielProduit, fetchReferentielsProduits } from "../../../api/referentielsProduitsApi";
import { fetchUnites } from "../../../api/unitesApi";
import ProductForm from "./form/ProductForm";

const INITIAL_VALUES = {
  designation: "",
  marque: "",
  variante: "",
  format: "",
  groupeLiquide: "",
  nbreBouteillesParCasier: 0,
  prixAchatHt: 0,
  prixVenteHt: 0,
  consigneBouteille: 0,
  consigneCasier: 0,
  coutCasierNeuf: 0,
  stockInitial: 0,
  stockVideInitial: 0,
  stockMinimum: 0,
  uniteVenteParDefautId: "",
};

const buildFinalDesignation = (values, unites) => {
  const marque = (values.marque || "").trim();
  const variante = (values.variante || "").trim();
  const format = (values.format || "").trim();
  const unite = unites.find((item) => String(item.id) === String(values.uniteVenteParDefautId))?.libelle || "";
  return [unite, marque, variante, format].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
};

export default function ProductEdit() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const notifications = useNotifications();

  const [values, setValues] = React.useState(INITIAL_VALUES);
  const [errors, setErrors] = React.useState({});
  const [referentiels, setReferentiels] = React.useState({ marques: [], formats: [], groupesLiquides: [] });
  const [unites, setUnites] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    Promise.all([fetchProduitById(productId), fetchReferentielsProduits(), fetchUnites()])
      .then(([data, refs, unitesData]) => {
        if (!mounted) return;
        setValues({
          designation: data.designation || "",
          marque: data.marque || "",
          variante: data.variante || "",
          format: data.format || "",
          groupeLiquide: data.groupeLiquide || "",
          nbreBouteillesParCasier: data.nbBouteillesParCasier || 0,
          prixAchatHt: data.prixAchatHt || 0,
          prixVenteHt: data.prixVenteHt || 0,
          consigneBouteille: data.consigneBouteille || 0,
          consigneCasier: data.consigneCasier || 0,
          coutCasierNeuf: data.coutCasierNeuf || 0,
          stockInitial: data.stockInitial || 0,
          stockVideInitial: 0,
          stockMinimum: data.stockMinimum || 0,
          uniteVenteParDefautId: data.uniteVenteParDefautId || "",
        });
        setReferentiels({
          marques: refs.marques || [],
          formats: refs.formats || [],
          groupesLiquides: refs.groupesLiquides || [],
        });
        setUnites(unitesData || []);
        setLoading(false);
      })
      .catch(() => {
        notifications.show("Impossible de charger le produit", { severity: "error" });
        navigate("/accueil/produits");
      });
    return () => {
      mounted = false;
    };
  }, [productId, navigate, notifications]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setValues((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleCreateReferentiel = async (type, libelle) => {
    const item = await createReferentielProduit(type, libelle);
    const keyByType = {
      marque: "marques",
      format: "formats",
      groupeLiquide: "groupesLiquides",
    };
    const key = keyByType[type];
    setReferentiels((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []).filter((existing) => existing.id !== item.id), item]
        .sort((a, b) => a.libelle.localeCompare(b.libelle)),
    }));
    setValues((prev) => ({ ...prev, [type]: item.libelle }));
    setErrors((prev) => ({ ...prev, [type]: null }));
    return item;
  };

  const validate = () => {
    const required = ["marque", "format", "groupeLiquide", "prixVenteHt", "stockInitial", "nbreBouteillesParCasier"];
    required.push("uniteVenteParDefautId");
    const nextErrors = {};
    required.forEach((field) => {
      if (!values[field] || (typeof values[field] === "string" && values[field].trim() === "")) {
        nextErrors[field] = "Ce champ est requis";
      }
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await updateProduit(productId, { ...values, designation: buildFinalDesignation(values, unites) });
      notifications.show("Modification enregistrée", { severity: "success" });
      navigate("/accueil/produits");
    } catch (err) {
      notifications.show("Erreur lors de la mise à jour", { severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}><CircularProgress /></Box>;
  }

  return (
    <PageContainer
      title={`Modifier : ${values.designation}`}
      breadcrumbs={[
        { title: "Produits", path: "/accueil/produits" },
        { title: "Modifier" },
      ]}
    >
      <ProductForm
        values={values}
        errors={errors}
        onChange={handleChange}
        previewDesignation={buildFinalDesignation(values, unites)}
        referentiels={referentiels}
        unites={unites}
        onCreateReferentiel={handleCreateReferentiel}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/accueil/produits")}
        submitLabel="Enregistrer les modifications"
        loading={saving}
      />
    </PageContainer>
  );
}
