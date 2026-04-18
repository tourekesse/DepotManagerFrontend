import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Divider,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { privateApi } from "../api/axios";

export default function ConvertirCommandeModal({ open, onClose, commande, onSuccess }) {
  const [livreurs, setLivreurs] = useState([]);
  const [selectedLivreur, setSelectedLivreur] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingLivreurs, setLoadingLivreurs] = useState(false);
  const [lignesAjustees, setLignesAjustees] = useState([]);
  const [notifierClient, setNotifierClient] = useState(true);

  useEffect(() => {
    if (open && commande?.modeRetrait === "LIVRAISON") {
      loadLivreurs();
    }
    if (open && commande?.lignes) {
      setLignesAjustees(commande.lignes.map(l => ({ ...l })));
    }
  }, [open, commande]);

  const loadLivreurs = async () => {
    setLoadingLivreurs(true);
    try {
      const pvId = JSON.parse(localStorage.getItem("activePV"))?.id;
      const res = await privateApi.get(`/api/livreurs?pointDeVenteId=${pvId}`);
      setLivreurs(res.data || []);
    } catch (err) {
      console.error("Erreur chargement livreurs:", err);
    } finally {
      setLoadingLivreurs(false);
    }
  };

  const handleQuantiteChange = (index, newQuantite) => {
    const updated = [...lignesAjustees];
    updated[index].quantite = Math.max(0, parseInt(newQuantite) || 0);
    setLignesAjustees(updated);
  };

  const hasModifications = () => {
    return lignesAjustees.some((ligne, idx) => 
      ligne.quantite !== commande.lignes[idx].quantite
    );
  };

  const calculateTotal = () => {
    return lignesAjustees.reduce((sum, ligne) => 
      sum + (ligne.quantite * ligne.prixUnitaire), 0
    );
  };

  const handleConvertir = async () => {
    if (!commande) return;

    const isLivraison = commande.modeRetrait === "LIVRAISON";
    if (isLivraison && !selectedLivreur) {
      alert("Veuillez sélectionner un livreur");
      return;
    }

    const lignesValides = lignesAjustees.filter(l => l.quantite > 0);
    if (lignesValides.length === 0) {
      alert("Erreur: La commande doit contenir au moins un article");
      return;
    }

    setLoading(true);
    try {
      const dmUser = JSON.parse(localStorage.getItem("dmUser"));
      const gerantId = dmUser?.userId;
      
      if (!gerantId) {
        alert("Erreur: Impossible de récupérer l'ID utilisateur");
        return;
      }
      
      const payload = {
        commandeId: commande.id,
        clientId: commande.clientId,
        pointDeVenteId: commande.pointDeVenteId,
        gerantId: gerantId,
        modeLivraison: isLivraison ? "A_LIVRER" : "SUR_PLACE",
        livreurId: isLivraison ? selectedLivreur : null,
        articlesLivres: lignesValides.map(ligne => ({
          produitId: ligne.produitId,
          quantiteLivree: ligne.quantite,
          prixUnitaire: ligne.prixUnitaire,
          typeCasierId: null
        })),
        emballagesRendus: { casiers: 0, bouteilles: 0 },
        montantPaye: 0,
        typePaiement: "CREDIT",
        typeVente: "VENTE_CREDIT",
        notifierClient: hasModifications() && notifierClient
      };

      const response = await privateApi.post(`/api/commandes/${commande.id}/convertir-en-vente`, payload);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Erreur conversion:", err);
      alert("Erreur lors de la conversion: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (!commande) return null;

  const isLivraison = commande.modeRetrait === "LIVRAISON";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Convertir en vente - {isLivraison ? "À livrer" : "Retrait sur place"}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" gutterBottom>
            <strong>Client:</strong> {commande.clientNom}
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>Montant:</strong> {parseFloat(commande.montantTotal || 0).toLocaleString("fr-FR")} FCFA
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>Mode:</strong> {isLivraison ? "Livraison" : "Retrait"}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" gutterBottom>
            Produits commandés:
          </Typography>
          <Table size="small" sx={{ mt: 1 }}>
            <TableHead>
              <TableRow>
                <TableCell>Produit</TableCell>
                <TableCell align="center">Qté</TableCell>
                <TableCell align="right">Prix U.</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lignesAjustees.map((ligne, idx) => (
                <TableRow key={idx}>
                  <TableCell>{ligne.produitNom}</TableCell>
                  <TableCell align="center">
                    <TextField
                      type="number"
                      size="small"
                      value={ligne.quantite}
                      onChange={(e) => handleQuantiteChange(idx, e.target.value)}
                      inputProps={{ min: 0, style: { textAlign: 'center' } }}
                      sx={{ width: 70 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {ligne.prixUnitaire.toLocaleString("fr-FR")}
                  </TableCell>
                  <TableCell align="right">
                    {(ligne.quantite * ligne.prixUnitaire).toLocaleString("fr-FR")}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3} align="right"><strong>Total:</strong></TableCell>
                <TableCell align="right">
                  <strong>{calculateTotal().toLocaleString("fr-FR")} FCFA</strong>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {hasModifications() && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="warning">
                Vous avez modifié les quantités. Le client sera informé des changements.
              </Alert>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={notifierClient}
                    onChange={(e) => setNotifierClient(e.target.checked)}
                  />
                }
                label="Notifier le client par SMS"
                sx={{ mt: 1 }}
              />
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          {isLivraison && (
            <FormControl fullWidth sx={{ mt: 3 }}>
              <InputLabel>Sélectionner un livreur *</InputLabel>
              <Select
                value={selectedLivreur}
                onChange={(e) => setSelectedLivreur(e.target.value)}
                disabled={loadingLivreurs}
              >
                {livreurs.map((l) => (
                  <MenuItem key={l.id} value={l.id}>
                    {l.firstName} {l.lastName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Alert severity="info" sx={{ mt: 2 }}>
            {isLivraison
              ? "La commande sera convertie en vente avec statut À LIVRER et assignée au livreur sélectionné."
              : "La commande sera convertie en vente avec statut SUR PLACE (retrait au dépôt)."}
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Annuler
        </Button>
        <Button
          onClick={handleConvertir}
          variant="contained"
          disabled={loading || (isLivraison && !selectedLivreur)}
        >
          {loading ? <CircularProgress size={24} /> : "Valider"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
