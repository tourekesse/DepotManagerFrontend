import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { createProduit } from '../../../api/produitsApi';
import useNotifications from '../../../crud-dashboard/hooks/useNotifications/useNotifications';
import { createReferentielProduit, fetchFormatsReferences, fetchMarquesReferences, fetchReferentielsProduits } from '../../../api/referentielsProduitsApi';
import { fetchUnites } from '../../../api/unitesApi';
import ProductForm from '../produitBar/form/ProductForm';
import { detectProductInfo } from '../../../views/pages/setup/services/detectProductInfo';

const INITIAL_VALUES = {
  designation: "",
  marque: "",
  variante: "",
  format: "",
  groupeLiquide: "",
  nbreBouteillesParCasier: 12,
  prixAchatHt: 0,
  prixVenteHt: 0,
  consigneBouteille: 0,
  consigneCasier: 0,
  coutCasierNeuf: 0,
  stockInitial: 0,
  stockMinimum: 0,
  uniteVenteParDefautId: "",
};

const normalizeText = (value = "") => value
  .toString()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]/g, "");

const mergeMarques = (localMarques = [], catalogMarques = []) => {
  const byKey = new Map();
  catalogMarques.forEach((libelle) => {
    if (!libelle) return;
    byKey.set(normalizeText(libelle), { libelle, source: "CATALOGUE" });
  });
  localMarques.forEach((marque) => {
    if (!marque?.libelle) return;
    const key = normalizeText(marque.libelle);
    byKey.set(key, { ...marque, source: byKey.has(key) ? "CATALOGUE" : "LOCAL" });
  });
  return Array.from(byKey.values()).sort((a, b) => a.libelle.localeCompare(b.libelle));
};

const mergeFormats = (localFormats = [], catalogFormats = []) => {
  const byKey = new Map();
  catalogFormats.forEach((libelle) => {
    if (!libelle) return;
    byKey.set(normalizeText(libelle), { libelle, source: "CATALOGUE" });
  });
  localFormats.forEach((format) => {
    if (!format?.libelle) return;
    const key = normalizeText(format.libelle);
    byKey.set(key, { ...format, source: byKey.has(key) ? "CATALOGUE" : "LOCAL" });
  });
  return Array.from(byKey.values()).sort((a, b) => a.libelle.localeCompare(b.libelle));
};

export default function BarProductCreateClassique() {
    const [values, setValues] = useState(INITIAL_VALUES);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [autoInfo, setAutoInfo] = useState(null);
    const [referentiels, setReferentiels] = useState({ marques: [], formats: [], groupesLiquides: [] });
    const [unites, setUnites] = useState([]);
    const navigate = useNavigate();
    const notifications = useNotifications();

    // 🎯 AUTO-DÉTECTION INTELLIGENTE
    React.useEffect(() => {
      const marque = (values.marque || "").trim();
      const variante = (values.variante || "").trim();
      const format = (values.format || "").trim();
      const unite = unites.find((item) => String(item.id) === String(values.uniteVenteParDefautId))?.libelle || "";
      const source = [unite, marque, variante, format].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
      
      if (source.trim().length >= 3) {
        const info = detectProductInfo(source.trim());
        setAutoInfo(info || null);

        // 🔄 PRÉ-REMPLISSAGE AUTOMATIQUE
        if (info) {
          setValues(prev => ({
            ...prev,
            marque: prev.marque || info.marque || "",
            format: prev.format || info.format || "",
            groupeLiquide: prev.groupeLiquide || info.groupe || "",
            nbreBouteillesParCasier: prev.nbreBouteillesParCasier || info.casierBouteilles || 0,
          }));
        }
      } else {
        setAutoInfo(null);
      }
    }, [values.marque, values.variante, values.format, values.uniteVenteParDefautId, unites]);

    React.useEffect(() => {
      let mounted = true;
      Promise.all([
        fetchReferentielsProduits(),
        fetchUnites(),
        fetchMarquesReferences().catch(() => []),
        fetchFormatsReferences().catch(() => []),
      ])
        .then(([data, unitesData, marquesReferences, formatsReferences]) => {
          if (mounted) {
            setReferentiels({
              marques: mergeMarques(data.marques || [], marquesReferences || []),
              formats: mergeFormats(data.formats || [], formatsReferences || []),
              groupesLiquides: data.groupesLiquides || [],
            });
            setUnites(unitesData || []);
            const bouteille = (unitesData || []).find((unite) => unite.libelle?.toLowerCase() === "bouteille");
            if (bouteille) {
              setValues((prev) => ({ ...prev, uniteVenteParDefautId: prev.uniteVenteParDefautId || bouteille.id }));
            }
          }
        })
        .catch(() => notifications.show("Impossible de charger les référentiels produits", { severity: "warning" }));
      return () => {
        mounted = false;
      };
    }, [notifications]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setValues((prev) => ({
            ...prev,
            [name]: type === "number" ? Number(value) : value,
        }));
        setErrors((prev) => ({ ...prev, [name]: null }));
    };

    const rememberLocalMarque = (libelle) => {
      const cleaned = (libelle || "").trim();
      if (!cleaned) return;
      setReferentiels((prev) => {
        const exists = (prev.marques || []).some((marque) => normalizeText(marque.libelle) === normalizeText(cleaned));
        if (exists) return prev;
        return {
          ...prev,
          marques: [...(prev.marques || []), { libelle: cleaned, source: "LOCAL" }]
            .sort((a, b) => a.libelle.localeCompare(b.libelle)),
        };
      });
    };

    const rememberLocalFormat = (libelle) => {
      const cleaned = (libelle || "").trim();
      if (!cleaned) return;
      setReferentiels((prev) => {
        const exists = (prev.formats || []).some((format) => normalizeText(format.libelle) === normalizeText(cleaned));
        if (exists) return prev;
        return {
          ...prev,
          formats: [...(prev.formats || []), { libelle: cleaned, source: "LOCAL" }]
            .sort((a, b) => a.libelle.localeCompare(b.libelle)),
        };
      });
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
        [key]: [...(prev[key] || []).filter((existing) => existing.id !== item.id), { ...item, source: type === "marque" ? "LOCAL" : undefined }]
          .sort((a, b) => a.libelle.localeCompare(b.libelle)),
      }));
      setValues((prev) => ({ ...prev, [type]: item.libelle }));
      setErrors((prev) => ({ ...prev, [type]: null }));
      return item;
    };

    const validate = () => {
        const required = [
            "marque",
            "format",
            "groupeLiquide",
            "prixVenteHt",
            "stockInitial",
            "nbreBouteillesParCasier",
        ];

        const newErrors = {};
        required.forEach((f) => {
            if (values[f] === "" || values[f] === null) {
                newErrors[f] = "Champ obligatoire";
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            await createProduit(values);
            notifications.show("Produit ajouté avec succès", {
                severity: "success",
                autoHideDuration: 3000,
            });
            navigate('/accueil/bar/ventes');
        } catch (e) {
            notifications.show(
                e.response?.data?.message || "Erreur lors de l'ajout",
                { severity: "error" }
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
                Ajouter un Produit au Catalogue Bar
            </Typography>
            <ProductForm
                values={values}
                errors={errors}
                onChange={handleChange}
                onSubmit={handleSubmit}
                onCancel={() => navigate('/accueil/bar/ventes')}
                submitLabel="Créer le produit"
                loading={loading}
                referentiels={referentiels}
                unites={unites}
                onCreateReferentiel={handleCreateReferentiel}
            />
        </Box>
    );
}
