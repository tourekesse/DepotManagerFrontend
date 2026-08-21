// src/components/AssignerLivreurModal.jsx
import * as React from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Stack,
  Typography,
  CircularProgress,
  Box,
  Avatar,
  Divider,
  Fade,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { privateApi } from '../api/axios';
import useNotifications from '../crud-dashboard/hooks/useNotifications/useNotifications';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

export default function AssignerLivreurModal({ commandeId, open, onClose, onSuccess }) {
  const [livreurs, setLivreurs] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedLivreur, setSelectedLivreur] = React.useState(null);
  const notifications = useNotifications();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchLivreurs = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await privateApi.get('/api/livreurs?actif=true');
      setLivreurs(res.data || []);
    } catch (err) {
      notifications.show("Impossible de charger les livreurs", { severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [notifications]);

  React.useEffect(() => {
    if (open) {
      fetchLivreurs();
      setSelectedLivreur(null);
    }
  }, [open, fetchLivreurs]);

  const handleAssigner = async () => {
    if (!selectedLivreur) return;
    
    try {
      // Utiliser l'endpoint correct pour assigner un livreur
      await privateApi.post(`/api/commandes/${commandeId}/changer-mode-livraison`, {
        livreurId: selectedLivreur.id,
        modeRetrait: 'LIVRAISON' // ou REtrait selon le cas
      });
      notifications.show("✅ Livreur assigné avec succès", { severity: 'success' });
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Erreur assignation:", err);
      notifications.show("❌ Erreur lors de l'assignation", { severity: 'error' });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      transitionDuration={300}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <LocalShippingIcon color="primary" />
          <Typography variant="h6">Assigner un livreur</Typography>
        </Stack>
      </DialogTitle>

      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
          color: theme.palette.grey[500],
        }}
      >
        <CloseIcon />
      </IconButton>

      <Divider />

      <DialogContent sx={{ pt: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : livreurs.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="textSecondary">
              Aucun livreur disponible
            </Typography>
          </Box>
        ) : (
          <List sx={{ width: '100%' }}>
            {livreurs.map((livreur) => (
              <ListItem key={livreur.id} disablePadding>
                <ListItemButton
                  selected={selectedLivreur?.id === livreur.id}
                  onClick={() => setSelectedLivreur(livreur)}
                  sx={{
                    borderRadius: 2,
                    mb: 0.5,
                    '&.Mui-selected': {
                      bgcolor: 'primary.light',
                      border: '2px solid',
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.light' }}>
                      <PersonIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography fontWeight="bold">
                        {livreur.nom} {livreur.prenom}
                      </Typography>
                    }
                    secondary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <PhoneIcon fontSize="small" />
                        <Typography variant="body2">
                          {livreur.telephone}
                        </Typography>
                      </Stack>
                    }
                  />
                  <Chip 
                    label="Disponible" 
                    size="small" 
                    color="success" 
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2 }}>
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={handleAssigner}
          disabled={!selectedLivreur || loading}
          sx={{ borderRadius: 2, textTransform: 'none' }}
        >
          Assigner
        </Button>
      </DialogActions>
    </Dialog>
  );
}