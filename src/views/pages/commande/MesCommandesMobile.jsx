import { useEffect, useState } from "react";
import {
  Box, Typography, Card, CardContent, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Chip, Alert, CircularProgress
} from "@mui/material";
import { Edit, Trash2, Package, ShoppingCart, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function MesCommandesMobile() {
  const navigate = useNavigate();
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState({ open: false, commande: null });
  const [quantites, setQuantites] = useState({});

  useEffect(() => {
    fetchCommandes();
  }, []);

  const fetchCommandes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/commandes/client/mes-commandes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCommandes(response.data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const modifierLigne = async (commandeId, ligneId, nouvelleQte) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/commandes/${commandeId}/lignes/${ligneId}`, {
        quantite: nouvelleQte
      }, { headers: { Authorization: `Bearer ${token}` } });

      fetchCommandes();
      setEditDialog({ open: false, commande: null });
    } catch (error) {
      alert('Erreur: ' + (error.response?.data?.error || error.message));
    }
  };

  const changerModeRetrait = async (commande, mode) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/commandes/${commande.id}/lignes/modify`, {
        modeRetrait: mode
      }, { headers: { Authorization: `Bearer ${token}` } });

      fetchCommandes();
    } catch (error) {
      alert('Erreur: ' + (error.response?.data?.error || error.message));
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowLeft />
        </IconButton>
        <Typography variant="h6" fontWeight={900}>
          Mes Commandes
        </Typography>
      </Box>

      {commandes.length === 0 ? (
        <Alert severity="info">Aucune commande trouvée</Alert>
      ) : (
        commandes.map(commande => (
          <Card key={commande.id} sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography fontWeight={700}>
                  Commande #{commande.id}
                </Typography>
                <Chip
                  label={commande.statut || 'ENREGISTREE'}
                  color={commande.statut === 'VALIDEE' ? 'success' : 'warning'}
                  size="small"
                />
              </Box>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Mode: {commande.modeRetrait === 'LIVRAISON' ? '🚚 Livraison' : '🏪 Retrait agence'}
              </Typography>

              {/* Lignes */}
              {commande.lignes?.map(ligne => (
                <Box key={ligne.id} sx={{ display: "flex", justifyContent: "space-between", py: 1, borderBottom: "1px solid #eee" }}>
                  <Box>
                    <Typography>{ligne.produit?.designation}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {ligne.prixUnitaire} F × {ligne.quantite}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setEditDialog({ open: true, commande, ligne });
                      setQuantites({ ...quantites, [ligne.id]: ligne.quantite });
                    }}
                  >
                    <Edit size={16} />
                  </IconButton>
                </Box>
              ))}

              <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                {commande.statut !== 'VALIDEE' && (
                  <>
                    {commande.modeRetrait === 'LIVRAISON' ? (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => changerModeRetrait(commande, 'RETRAIT')}
                      >
                        Passer en Retrait
                      </Button>
                    ) : (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => changerModeRetrait(commande, 'LIVRAISON')}
                      >
                        Passer en Livraison
                      </Button>
                    )}
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        ))
      )}

      {/* Dialog modifier quantité */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, commande: null })}>
        <DialogTitle>Modifier la quantité</DialogTitle>
        <DialogContent>
          <TextField
            type="number"
            label="Quantité"
            value={quantites[editDialog.ligne?.id] || 1}
            onChange={(e) => setQuantites({ ...quantites, [editDialog.ligne?.id]: parseInt(e.target.value) || 1 })}
            fullWidth
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, commande: null })}>
            Annuler
          </Button>
          <Button
            onClick={() => modifierLigne(editDialog.commande?.id, editDialog.ligne?.id, quantites[editDialog.ligne?.id])}
            variant="contained"
          >
            Valider
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}