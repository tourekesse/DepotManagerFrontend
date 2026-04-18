import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Stack, Box, Divider } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

export default function LivraisonValidationModal({ open, onClose, vente, onOui, onNon }) {
  if (!vente) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <LocalShippingIcon />
          <span>LIVRAISON</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Issue drop • {vente.totalGeneral ? parseFloat(vente.totalGeneral).toLocaleString('fr-FR') + ' F' : ''}
        </Typography>
        <Divider sx={{ mb: 1 }} />
        <Box sx={{ mb: 2 }}>
          {vente.details && vente.details.map((art, idx) => (
            <Typography key={idx}>
              {art.nomProduit} ×{art.quantite}
            </Typography>
          ))}
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Box sx={{ border: '1px solid #eee', borderRadius: 2, p: 2, bgcolor: '#fafbfc' }}>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              TOUS LES VIDES<br />SONT RENDUS ?
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
        <Button variant="contained" color="success" onClick={onOui} sx={{ minWidth: 90 }}>OUI</Button>
        <Button variant="outlined" color="primary" onClick={onNon} sx={{ minWidth: 90 }}>NON</Button>
      </DialogActions>
    </Dialog>
  );
}
