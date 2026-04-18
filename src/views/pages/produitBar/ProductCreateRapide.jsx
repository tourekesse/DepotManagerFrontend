import * as React from "react";
import { 
  Box, Card, Typography, TextField, Checkbox, Grid, 
  Accordion, AccordionSummary, AccordionDetails, Stack, 
  CircularProgress, Divider, Snackbar, Alert, Button 
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

// Tes imports personnalisés
import { privateApi } from "../../../api/axios";
import { createProduit } from "../../../api/produitsApi";
import { useUser } from "../../../context/UserContext"; 
import useNotifications from "../../../crud-dashboard/hooks/useNotifications/useNotifications";
import ProductBulkSummaryBar from "../../../components/ProductBulkSummaryBar";
import { getUserRole } from "../../../config/roleConfig";
import { getActivePointDeVenteId } from "../../../utils/pdv";

const LocalPageContainer = ({ children, title }) => (
  <Box sx={{ p: { xs: 1, md: 2 }, maxWidth: '1600px', margin: '0 auto' }}>
    <Box sx={{ mb: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#1a237e' }}>{title}</Typography>
    </Box>
    {children}
  </Box>
);

export default function ProductCreateRapide() {
  const notifications = useNotifications();
  const { activePointDeVente } = useUser(); 
  
  // États
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState([]);
  const [selected, setSelected] = React.useState([]); 
  const [expandedId, setExpandedId] = React.useState(null); 
  const [loading, setLoading] = React.useState(false);
  const [isSearching, setIsSearching] = React.useState(false);
  const [showToast, setShowToast] = React.useState(false);
  const [role, setRole] = React.useState(getUserRole());
  const [pdvId, setPdvId] = React.useState(null);
  
  // Référence pour le focus automatique
  const searchInputRef = React.useRef(null);

  // Set pdvId based on role
  React.useEffect(() => {
    const currentRole = getUserRole();
    setRole(currentRole);
    if (currentRole === 'CLIENT_BAR') {
      setPdvId(null); // Bars search all references, not limited to supplier
    } else {
      setPdvId(activePointDeVente?.id);
    }
  }, [activePointDeVente]);

  // 1. RECHERCHE CATALOGUE
  React.useEffect(() => {
    if (query.trim().length < 2) { 
      setResults([]); 
      return; 
    }
    
    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await privateApi.get(`/api/references/recherche`, {
          params: { q: query, pdvId: pdvId }
        });
        setResults(res.data);
      } catch (err) {
        console.error("Erreur recherche:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query, pdvId]);

  // 2. SÉLECTION ET PRÉ-REMPLISSAGE
  const handleAccordionToggle = (ref) => {
    const isAlreadySelected = selected.find(s => s.id === ref.id);
    if (!isAlreadySelected) {
      setSelected(prev => [...prev, {
        ...ref,
        prixAchat: ref.prixAchatMoyen || 0, // achat unitaire (inutile ici mais conservé)
        prixCasierAchat: "",               // achat par casier (optionnel)
        prixVente: 0,                      // prix de vente unitaire
        prixVenteCasier: "",               // prix de vente casier
        prixBouteille: 0,
        prixCasierPlastique: 0,
        stockInitial: 0,
        stockMinimum: ref.stockMinSuggere || 0,
        nbreBouteillesParCasier: ref.casierBouteilles || 12
      }]);
      setExpandedId(ref.id);
    } else {
      setExpandedId(expandedId === ref.id ? null : ref.id);
    }
  };

  const updateField = (id, field, value) => {
    setSelected(prev => prev.map(p => {
      if (p.id !== id) return p;
      const raw = value === "" ? "" : Number(value);
      const next = { ...p, [field]: raw };

      // Auto-calcul du prix unitaire d'achat à partir du prix casier
      if (field === "prixCasierAchat" || field === "nbreBouteillesParCasier") {
        const casier = field === "prixCasierAchat" ? raw : p.prixCasierAchat;
        const nb = field === "nbreBouteillesParCasier" ? raw : p.nbreBouteillesParCasier;
        if (casier && nb) {
          next.prixAchat = Number((casier / nb).toFixed(2));
        }
      }
      return next;
    }));
  };

  // 3. ENREGISTREMENT FLUIDE
  const handleAjouterProduits = async () => {
    const pdvId = activePointDeVente?.id || getActivePointDeVenteId();
    if (!pdvId) {
      notifications.show("Sélectionne d'abord un point de vente actif", { severity: "error" });
      return;
    }

    setLoading(true);
    try {
      for (const p of selected) {
          // Calcule le prix d'achat unitaire : priorité au champ unitaire saisi, sinon casier / nb bouteilles
          const prixAchatUnitaire = p.prixAchat !== "" && p.prixAchat !== null
            ? Number(p.prixAchat)
            : (p.prixCasierAchat && p.nbreBouteillesParCasier
                ? Number(p.prixCasierAchat) / Number(p.nbreBouteillesParCasier || 1)
                : 0);

          const payload = {
            designation: `${p.marque} ${p.format}`.trim(),
            marque: p.marque,
            format: p.format,
            groupeLiquide: p.groupeliquideId === 1 ? "BIERE" : p.groupeliquideId === 2 ? "SODA" : "EAU",
            nbreBouteillesParCasier: Number(p.nbreBouteillesParCasier),
            prixAchatHt: prixAchatUnitaire,
            prixVenteHt: Number(p.prixVente),
            consigneBouteille: 0,
            consigneCasier: 0,
            stockInitial: Number(p.stockInitial || 0),
            stockMinimum: Number(p.stockMinimum),
            pointDeVente: { id: pdvId },
            reference: { id: p.id }
          };
        await createProduit(payload);
      }

      // Feedback visuel "Brève confirmation"
      setShowToast(true);
      
      // Nettoyage immédiat pour le produit suivant
      setSelected([]); 
      setQuery("");
      setResults([]);
      
      // Remettre le curseur dans la recherche automatiquement
      setTimeout(() => searchInputRef.current?.focus(), 100);

    } catch (error) {
      notifications.show("Erreur lors de l'enregistrement", { severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const isInvalidSelection = selected.some(p => !p.prixAchat || !p.prixVente);
  const hasSelection = selected.length > 0;

  return (
    <LocalPageContainer title="Catalogue Rapide">
      <Box sx={{ mb: 1, color: '#1a237e', fontWeight: 700 }}>
        Ajout rapide : sélectionne une référence boisson et crée le produit sur ton point de vente actif
      </Box>
      <Typography variant="caption" sx={{ display: 'block', color: '#546e7a', mb: 1 }}>
        Point de vente actif : {activePointDeVente?.nom || "non sélectionné"}
      </Typography>

      <Card sx={{ borderRadius: 2, border: '1px solid #e0e0e0', boxShadow: 'none' }}>
        <ProductBulkSummaryBar 
          products={selected} 
          loading={loading} 
          onSubmit={handleAjouterProduits}
          onReset={() => { setSelected([]); setQuery(""); }}
        />

        <Box sx={{ p: { xs: 1, md: 2 } }}>
          <TextField 
            inputRef={searchInputRef}
            placeholder="Rechercher une boisson" 
            fullWidth size="small" 
            autoFocus
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            sx={{ mb: 1 }} 
            InputProps={{ 
              endAdornment: isSearching && <CircularProgress size={20} />,
              sx: { borderRadius: '8px', bgcolor: '#fcfcfc' }
            }}
          />
          <Typography variant="caption" sx={{ display: 'block', color: '#546e7a', mb: 1 }}>
            {role === 'CLIENT_BAR' ? "Recherche sans filtre PDV (BAR)" : "Catalogue filtré sur le point de vente actif"}
          </Typography>

          <Box>
            {results.map((ref) => {
              const isSelected = selected.find(s => s.id === ref.id);
              const data = isSelected || {};
              const nbBouteilles = data.nbreBouteillesParCasier || ref.casierBouteilles;
              const achatCalc = data.prixAchat && data.prixAchat > 0 ? `${data.prixAchat} FCFA` : "Saisir prix casier";

              return (
                <Accordion 
                  key={ref.id} 
                  expanded={expandedId === ref.id} 
                  onChange={() => handleAccordionToggle(ref)}
                  sx={{ 
                    mb: 0.5, 
                    boxShadow: 'none',
                    border: isSelected ? '2px solid #1a237e' : '1px solid #eee',
                    borderRadius: '8px !important',
                    '&:before': { display: 'none' }
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Checkbox checked={!!isSelected} size="small" color="primary" />
                      <Typography sx={{ fontWeight: 700 }}>
                        {ref.marque} {ref.format}
                        {(() => {
                          const nb = nbBouteilles;
                          return nb ? (
                            <Box component="span" sx={{ color: '#1a237e', fontWeight: 800 }}>
                              {` (${nb} bouteilles)`}
                            </Box>
                          ) : "";
                        })()}
                      </Typography>
                    </Stack>
                  </AccordionSummary>

                  <AccordionDetails sx={{ bgcolor: '#f8f9fa', p: { xs: 1, md: 2 }, borderTop: '1px solid #eee' }}>
                    <Box
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fit, minmax(220px, 1fr))' },
                        gap: 1.5
                      }}
                    >
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 800, mb: 0.5, display: 'block' }}>Prix achat casier</Typography>
                        <TextField 
                          fullWidth 
                          size="small" 
                          type="text" 
                          inputMode="decimal" 
                          value={data.prixCasierAchat ?? ""} 
                          onChange={(e) => updateField(ref.id, "prixCasierAchat", e.target.value)} 
                        />
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 800, mb: 0.5, display: 'block' }}>Prix vente bouteille</Typography>
                        <TextField 
                          fullWidth 
                          size="small" 
                          type="text" 
                          inputMode="decimal" 
                          value={data.prixVente} 
                          onChange={(e) => updateField(ref.id, "prixVente", e.target.value)} 
                        />
                        <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: '#1a237e', fontWeight: 600 }}>
                          Achat unitaire calculé : {achatCalc}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 800, mb: 0.5, display: 'block' }}>Quantité en stock</Typography>
                        <TextField 
                          fullWidth 
                          size="small" 
                          type="number"
                          inputProps={{ min: 0 }}
                          value={data.stockInitial}
                          onChange={(e) => updateField(ref.id, "stockInitial", e.target.value)}
                        />
                        <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: '#546e7a' }}>
                          Stock initial du produit lors de la création
                        </Typography>
                      </Box>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>

          {hasSelection && (
            <Box sx={{ mt: 2, textAlign: 'right' }}>
              {isInvalidSelection && (
                <Typography variant="caption" color="error" sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}>
                  Remplir prix casier et prix vente pour enregistrer.
                </Typography>
              )}
              <Button 
                variant="contained" 
                onClick={handleAjouterProduits} 
                disabled={loading || isInvalidSelection}
                sx={{ 
                  fontWeight: 800, px: 3, py: 1, borderRadius: '8px',
                  background: 'linear-gradient(180deg, #2c3e50 0%, #000000 100%)',
                  '&:hover': { background: '#000' },
                  '&.Mui-disabled': { background: '#ccc', color: '#666' }
                }}
              >
                {loading ? "Enregistrement..." : "Enregistrer les produits"}
              </Button>
            </Box>
          )}
        </Box>
      </Card>

      <Typography variant="caption" sx={{ display: 'block', color: '#546e7a', mt: 1 }}>
        Les produits sont créés sur le point de vente actif avec un stock initial à 0.
      </Typography>

      {/* TOAST DE CONFIRMATION (NON-INTRUSIF) */}
      <Snackbar 
        open={showToast} 
        autoHideDuration={2500} 
        onClose={() => setShowToast(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" sx={{ width: '100%', bgcolor: '#1a237e', borderRadius: '12px' }}>
          Produit(s) enregistré(s) ! ✓
        </Alert>
      </Snackbar>
    </LocalPageContainer>
  );
}
