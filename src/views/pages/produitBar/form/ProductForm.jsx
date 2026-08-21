// src/views/pages/produit/form/ProductForm.jsx
import * as React from "react";
import {
  Box,
  Card,
  CardContent,
  Autocomplete,
  TextField,
  Typography,
  Divider,
  Stack,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
} from "@mui/material";
import { Plus } from "lucide-react";

export default function ProductForm({
  values,
  errors = {},
  warnings = {},
  onChange,
  previewDesignation = "",
  onSubmit,
  onCancel,
  referentiels = { marques: [], formats: [], groupesLiquides: [] },
  unites = [],
  onCreateReferentiel,
  submitLabel = "Enregistrer",
  loading = false,
}) {
  const [dialog, setDialog] = React.useState(null);
  const [newLibelle, setNewLibelle] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState("");

  const openDialog = (type, label) => {
    setDialog({ type, label });
    setNewLibelle("");
    setCreateError("");
  };

  const closeDialog = () => {
    if (creating) return;
    setDialog(null);
    setNewLibelle("");
    setCreateError("");
  };

  const normalizeText = (value = "") => value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const levenshtein = (a, b) => {
    if (a === b) return 0;
    if (!a) return b.length;
    if (!b) return a.length;
    const row = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i += 1) {
      let previous = row[0];
      row[0] = i;
      for (let j = 1; j <= b.length; j += 1) {
        const current = row[j];
        row[j] = Math.min(
          row[j] + 1,
          row[j - 1] + 1,
          previous + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
        previous = current;
      }
    }
    return row[b.length];
  };

  const findCloseMarque = (value) => {
    const normalized = normalizeText(value);
    if (normalized.length < 3) return null;
    const marques = (referentiels.marques || []).map((option) => option.libelle).filter(Boolean);
    return marques.find((marque) => {
      const candidate = normalizeText(marque);
      if (!candidate || candidate === normalized) return false;
      if (candidate.includes(normalized) || normalized.includes(candidate)) return true;
      return levenshtein(candidate, normalized) <= (normalized.length <= 6 ? 1 : 2);
    }) || null;
  };

  const closeMarque = dialog?.type === "marque" ? findCloseMarque(newLibelle) : null;

  const createItem = async () => {
    if (!dialog || !newLibelle.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      await onCreateReferentiel(dialog.type, newLibelle.trim());
      setDialog(null);
      setNewLibelle("");
    } catch (error) {
      setCreateError(error?.message || "Impossible d'ajouter cette valeur.");
    } finally {
      setCreating(false);
    }
  };

  const sectionSx = {
    p: 1.5,
    border: "1px solid",
    borderColor: "divider",
    borderRadius: 2,
    bgcolor: "background.paper",
  };

  const sectionTitleSx = {
    mb: 1.25,
    color: "text.secondary",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  };

  const sectionGridSx = {
    display: "grid",
    gap: 1.25,
    gridTemplateColumns: {
      xs: "1fr",
      md: "repeat(2, minmax(220px, 1fr))",
    },
    alignItems: "start",
  };

  const renderReferentielSelect = ({ name, label, options, required = false, helperText }) => (
    <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 40px", gap: 1, alignItems: "start", minWidth: 0 }}>
      <TextField
        select
        label={label}
        name={name}
        value={values[name] || ""}
        onChange={onChange}
        error={!!errors[name]}
        helperText={errors[name] || helperText}
        fullWidth
        required={required}
        size="small"
      >
        {(options || []).map((option) => (
          <MenuItem key={option.id || `${option.source || "option"}-${option.libelle}`} value={option.libelle}>
            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, width: "100%" }}>
              <span>{option.libelle}</span>
              {option.source && (
                <Typography component="span" variant="caption" color="text.secondary">
                  {option.source === "CATALOGUE" ? "Catalogue" : "Local"}
                </Typography>
              )}
            </Box>
          </MenuItem>
        ))}
      </TextField>
      <IconButton
        aria-label={`Ajouter ${label}`}
        onClick={() => openDialog(name, label)}
        size="small"
        sx={{ width: 40, height: 40 }}
        disabled={loading || !onCreateReferentiel}
      >
        <Plus size={20} />
      </IconButton>
    </Box>
  );

  const renderMarqueAutocomplete = () => (
    <Autocomplete
      freeSolo
      size="small"
      options={referentiels.marques || []}
      value={values.marque || ""}
      inputValue={values.marque || ""}
      getOptionLabel={(option) => (typeof option === "string" ? option : option?.libelle || "")}
      isOptionEqualToValue={(option, value) => {
        const optionLabel = typeof option === "string" ? option : option?.libelle;
        const valueLabel = typeof value === "string" ? value : value?.libelle;
        return optionLabel === valueLabel;
      }}
      filterOptions={(options, state) => {
        const input = normalizeText(state.inputValue);
        if (!input) return options.slice(0, 20);
        return options
          .filter((option) => normalizeText(option.libelle).includes(input))
          .slice(0, 20);
      }}
      onChange={(_, option) => {
        const value = typeof option === "string" ? option : option?.libelle || "";
        onChange({ target: { name: "marque", value } });
      }}
      onInputChange={(_, value, reason) => {
        if (reason !== "reset") {
          onChange({ target: { name: "marque", value } });
        }
      }}
      renderOption={(props, option) => (
        <Box component="li" {...props} sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
          <span>{option.libelle}</span>
          {option.source && (
            <Typography component="span" variant="caption" color="text.secondary">
              {option.source === "CATALOGUE" ? "Catalogue" : "Local"}
            </Typography>
          )}
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Marque"
          required
          error={!!errors.marque}
          helperText={errors.marque || "Tapez pour rechercher une marque"}
          fullWidth
        />
      )}
    />
  );

  const renderFormatAutocomplete = () => (
    <Autocomplete
      freeSolo
      size="small"
      options={referentiels.formats || []}
      value={values.format || ""}
      inputValue={values.format || ""}
      getOptionLabel={(option) => (typeof option === "string" ? option : option?.libelle || "")}
      isOptionEqualToValue={(option, value) => {
        const optionLabel = typeof option === "string" ? option : option?.libelle;
        const valueLabel = typeof value === "string" ? value : value?.libelle;
        return optionLabel === valueLabel;
      }}
      filterOptions={(options, state) => {
        const input = normalizeText(state.inputValue);
        if (!input) return options.slice(0, 20);
        return options
          .filter((option) => normalizeText(option.libelle).includes(input))
          .slice(0, 20);
      }}
      onChange={(_, option) => {
        const value = typeof option === "string" ? option : option?.libelle || "";
        onChange({ target: { name: "format", value } });
      }}
      onInputChange={(_, value, reason) => {
        if (reason !== "reset") {
          onChange({ target: { name: "format", value } });
        }
      }}
      renderOption={(props, option) => (
        <Box component="li" {...props} sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
          <span>{option.libelle}</span>
          {option.source && (
            <Typography component="span" variant="caption" color="text.secondary">
              {option.source === "CATALOGUE" ? "Catalogue" : "Local"}
            </Typography>
          )}
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Format"
          required
          error={!!errors.format}
          helperText={errors.format || "Tapez pour rechercher un format"}
          fullWidth
        />
      )}
    />
  );

  return (
    <Card>
      <CardContent>
        {/* ================= IDENTIFICATION ================= */}
        <Typography variant="subtitle1" fontWeight="bold">
          Identification
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Box sx={sectionGridSx}>
          <Box sx={sectionSx}>
            <Typography sx={sectionTitleSx}>Marque</Typography>
            {renderMarqueAutocomplete()}
          </Box>

          <Box sx={sectionSx}>
            <Typography sx={sectionTitleSx}>Format</Typography>
            {renderFormatAutocomplete()}
          </Box>

          <Box sx={sectionSx}>
            <Typography sx={sectionTitleSx}>Groupe liquide</Typography>
            {renderReferentielSelect({
              name: "groupeLiquide",
              label: "Groupe liquide",
              options: referentiels.groupesLiquides,
              required: true,
              helperText: "Ex: BIERE, GAZEUSE, EAU, VIN...",
            })}
          </Box>

          <Box sx={sectionSx}>
            <Typography sx={sectionTitleSx}>Unité de vente</Typography>
            <TextField
              select
              label="Unité de vente"
              name="uniteVenteParDefautId"
              value={values.uniteVenteParDefautId || ""}
              onChange={onChange}
              error={!!errors.uniteVenteParDefautId}
              helperText={errors.uniteVenteParDefautId}
              fullWidth
              size="small"
            >
              {(unites || []).map((unite) => (
                <MenuItem key={unite.id} value={unite.id}>
                  {unite.libelle}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Box sx={sectionSx}>
            <Typography sx={sectionTitleSx}>Variante / Saveur</Typography>
            <TextField
              label="Variante / Saveur"
              name="variante"
              value={values.variante || ""}
              onChange={onChange}
              error={!!errors.variante}
              helperText={errors.variante}
              fullWidth
              size="small"
            />
          </Box>

          <Box sx={sectionSx}>
            <Typography sx={sectionTitleSx}>Bouteilles par casier</Typography>
            <TextField
              label="Bouteilles par casier"
              name="nbreBouteillesParCasier"
              type="number"
              value={values.nbreBouteillesParCasier}
              onChange={onChange}
              error={!!errors.nbreBouteillesParCasier}
              helperText={errors.nbreBouteillesParCasier}
              fullWidth
              required
              size="small"
            />
          </Box>
        </Box>

        {/* ================= PRIX ================= */}
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 4 }}>
          Prix
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Box sx={sectionGridSx}>
          <Box sx={sectionSx}>
            <Typography sx={sectionTitleSx}>Prix achat HT</Typography>
            <TextField
              label="Prix achat HT"
              name="prixAchatHt"
              type="number"
              value={values.prixAchatHt}
              onChange={onChange}
              fullWidth
              size="small"
            />
          </Box>

          <Box sx={sectionSx}>
            <Typography sx={sectionTitleSx}>Prix vente HT</Typography>
            <TextField
              label="Prix vente HT"
              name="prixVenteHt"
              type="number"
              value={values.prixVenteHt}
              onChange={onChange}
              error={!!errors.prixVenteHt}
              helperText={errors.prixVenteHt}
              fullWidth
              required
              size="small"
            />
          </Box>
        </Box>

        {/* ================= CONSIGNES ================= */}
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 4 }}>
          Consignes
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Box sx={sectionGridSx}>
          <Box sx={sectionSx}>
            <Typography sx={sectionTitleSx}>Consigne bouteille</Typography>
            <TextField
              label="Consigne bouteille"
              name="consigneBouteille"
              type="number"
              value={values.consigneBouteille}
              onChange={onChange}
              fullWidth
              size="small"
            />
          </Box>

          <Box sx={sectionSx}>
            <Typography sx={sectionTitleSx}>Consigne casier</Typography>
            <TextField
              label="Consigne casier"
              name="consigneCasier"
              type="number"
              value={values.consigneCasier}
              onChange={onChange}
              fullWidth
              size="small"
            />
          </Box>

          <Box sx={sectionSx}>
            <Typography sx={sectionTitleSx}>Coût casier neuf</Typography>
            <TextField
              label="Coût casier neuf"
              name="coutCasierNeuf"
              type="number"
              value={values.coutCasierNeuf}
              onChange={onChange}
              fullWidth
              size="small"
            />
          </Box>
        </Box>

        {/* ================= STOCK ================= */}
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 4 }}>
          Stock
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Box sx={sectionGridSx}>
          <Box sx={sectionSx}>
            <Typography sx={sectionTitleSx}>Quantité en stock</Typography>
            <TextField
              label="Quantité en stock"
              name="stockInitial"
              type="number"
              value={values.stockInitial}
              onChange={onChange}
              error={!!errors.stockInitial}
              helperText={errors.stockInitial}
              fullWidth
              required
              size="small"
            />
          </Box>

          <Box sx={sectionSx}>
            <Typography sx={sectionTitleSx}>Stock minimum</Typography>
            <TextField
              label="Stock minimum"
              name="stockMinimum"
              type="number"
              value={values.stockMinimum}
              onChange={onChange}
              fullWidth
              size="small"
            />
          </Box>
        </Box>

        {/* ================= ACTIONS ================= */}
        <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 4 }}>
          {onCancel && (
            <Button variant="outlined" onClick={onCancel} disabled={loading}>
              Annuler
            </Button>
          )}
          <Button
            variant="contained"
            onClick={onSubmit}
            disabled={loading}
          >
            {submitLabel}
          </Button>
        </Stack>

        {/* ================= DIALOGUE AJOUT RÉFÉRENTIEL ================= */}
        <Dialog open={!!dialog} onClose={closeDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            Ajouter {dialog?.label}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label={dialog?.label}
              fullWidth
              variant="outlined"
              value={newLibelle}
              onChange={(e) => setNewLibelle(e.target.value)}
              error={!!createError}
              helperText={createError || (closeMarque && `Voulez-vous dire "${closeMarque}" ?`)}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog} disabled={creating}>
              Annuler
            </Button>
            <Button onClick={createItem} variant="contained" disabled={creating || !newLibelle.trim()}>
              {creating ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}
