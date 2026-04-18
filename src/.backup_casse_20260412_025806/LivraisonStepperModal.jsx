import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import PropTypes from 'prop-types';
import LivraisonSimple from './LivraisonSimple';

// Modal mobile-first qui affiche le Stepper
const LivraisonStepperModal = ({ open, onClose, vente, onValidate }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          m: 0,
          width: '100%',
          borderRadius: { xs: 0, sm: 2 },
          minHeight: '60vh',
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
        <IconButton onClick={onClose} size="large">
          <CloseIcon />
        </IconButton>
      </Box>
      <DialogContent sx={{ p: 0 }}>
        {vente && (
          <LivraisonSimple
            livraison={vente}
            onValidate={onValidate}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

LivraisonStepperModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  vente: PropTypes.object,
  onValidate: PropTypes.func.isRequired,
};

export default LivraisonStepperModal;
