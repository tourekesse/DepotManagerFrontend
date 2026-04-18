import React from 'react';
import { Dialog, DialogTitle, DialogContent, CircularProgress, Typography, Box } from '@mui/material';

export default function AttenteValidationClientModal({ open, status }) {
  return (
    <Dialog open={open} maxWidth="xs" fullWidth>
      <DialogTitle>En attente de confirmation client…</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="body2" color="textSecondary">
            {status === 'pending' && 'Le client doit confirmer la livraison sur son téléphone.'}
            {status === 'accepted' && '✅ Livraison confirmée par le client.'}
            {status === 'refused' && '❌ Livraison refusée par le client.'}
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
