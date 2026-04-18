import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  Box, 
  Typography, 
  Chip 
} from '@mui/material';
import { DeliveryDining, Store } from '@mui/icons-material';
import LivraisonSimple from './LivraisonSimple';
import GererCasiersModal from './GererCasiersModal';
import { useUser } from '../context/UserContext';

const LivraisonRoleBasedModal = ({ 
  open, 
  onClose, 
  livraison, 
  vente, 
  ventesCasiers, 
  clientNom, 
  onValidate 
}) => {
  const { user } = useUser();
  
  // Déterminer le rôle et le mode
  const isLivreur = user?.role?.toUpperCase() === 'LIVREUR';
  const isGerant = user?.role?.toUpperCase() === 'GERANT';
  
  // Props pour LivraisonSimple (livreur)
  const livraisonSimpleProps = {
    livraison,
    onValidate,
    onClose
  };
  
  // Props pour GererCasiersModal (gerant)
  const gererCasiersProps = {
    open,
    onClose,
    vente,
    ventesCasiers,
    clientNom,
    onValidate
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: '60vh'
        }
      }}
    >
      {/* En-tête avec indicateur de mode */}
      <DialogTitle sx={{ 
        pb: 1, 
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: isLivreur ? 'primary.50' : 'secondary.50'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isLivreur ? (
            <>
              <DeliveryDining color="primary" />
              <Typography variant="h6" sx={{ fontSize: '1rem' }}>
                Mode Livreur
              </Typography>
              <Chip 
                label="Validation livraison" 
                size="small" 
                color="primary" 
                variant="outlined"
              />
            </>
          ) : (
            <>
              <Store color="secondary" />
              <Typography variant="h6" sx={{ fontSize: '1rem' }}>
                Mode Dépôt
              </Typography>
              <Chip 
                label="Régularisation casiers" 
                size="small" 
                color="secondary" 
                variant="outlined"
              />
            </>
          )}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Afficher le bon composant selon le rôle */}
        {isLivreur && <LivraisonSimple {...livraisonSimpleProps} />}
        {isGerant && <GererCasiersModal {...gererCasiersProps} />}
        
        {/* Fallback si rôle non reconnu */}
        {!isLivreur && !isGerant && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="error">
              Rôle non reconnu : {user?.role}
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LivraisonRoleBasedModal;
