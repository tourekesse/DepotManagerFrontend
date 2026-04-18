import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Stack, Box, Divider, TextField } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

export default function LivraisonSaisieManuelleModal({ open, onClose, vente, onValider }) {
  const [quantites, setQuantites] = useState(() =>
    vente && vente.details ? vente.details.map(art => art.quantite) : []
  );

  React.useEffect(() => {
    setQuantites(vente && vente.details ? vente.details.map(art => art.quantite) : []);
  }, [vente]);

  if (!vente) return null;

  const handleChange = (idx, value) => {
    const q = [...quantites];
    q[idx] = value === '' ? '' : Math.max(0, parseInt(value, 10) || 0);
    setQuantites(q);
  };

  const handleValider = () => {
    onValider(quantites);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <LocalShippingIcon />
          <span>LIVRAISON - Saisie manuelle</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Issue drop • {vente.totalGeneral ? parseFloat(vente.totalGeneral).toLocaleString('fr-FR') + ' F' : ''}
        </Typography>
        <Divider sx={{ mb: 1 }} />
        <Box sx={{ mb: 2 }}>
          {vente.details && vente.details.map((art, idx) => (
            <Stack direction="row" alignItems="center" spacing={1} key={idx} sx={{ mb: 1 }}>
              <Typography sx={{ minWidth: 120 }}>{art.nomProduit}</Typography>
              <TextField
                type="number"
                size="small"
                value={quantites[idx]}
                onChange={e => handleChange(idx, e.target.value)}
                inputProps={{ min: 0, max: art.quantite }}
                sx={{ width: 70 }}
              />
              <Typography variant="caption">/ {art.quantite}</Typography>
            </Stack>
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
        <Button variant="contained" color="primary" onClick={handleValider} sx={{ minWidth: 120 }}>Valider</Button>
        <Button variant="outlined" color="inherit" onClick={onClose} sx={{ minWidth: 120 }}>Annuler</Button>
      </DialogActions>
    </Dialog>
  );
}
