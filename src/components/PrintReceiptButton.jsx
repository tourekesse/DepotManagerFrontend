import React from 'react';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, CircularProgress, Dialog, DialogContent, useMediaQuery, useTheme } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import BluetoothIcon from '@mui/icons-material/Bluetooth';
import CloseIcon from '@mui/icons-material/Close';
import { useBluetoothPrinter } from '../hooks/useBluetoothPrinter';
import useNotifications from '../crud-dashboard/hooks/useNotifications/useNotifications';

export default function PrintReceiptButton({ venteId, size = 'medium' }) {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const { printReceipt, isPrinting } = useBluetoothPrinter();
  const notifications = useNotifications();
  const [loading, setLoading] = React.useState(false);
  const [pdfModalOpen, setPdfModalOpen] = React.useState(false);
  const [pdfUrl, setPdfUrl] = React.useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handlePrintPDF = async () => {
    handleClose();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/recu/${venteId}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        setPdfUrl(url);
        setPdfModalOpen(true);
      } else {
        notifications.show('Erreur génération PDF', { severity: 'error' });
      }
    } catch (e) {
      console.error('Erreur PDF:', e);
      notifications.show('Erreur génération PDF', { severity: 'error' });
    }
  };

  const handlePrintBluetooth = async () => {
    handleClose();
    setLoading(true);
    try {
      await printReceipt(venteId);
      notifications.show('✅ Reçu imprimé avec succès', { severity: 'success' });
    } catch (error) {
      console.error('Erreur impression:', error);
      notifications.show('❌ ' + error.message, { severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        disabled={isPrinting || loading}
        size={size}
        color="primary"
      >
        {(isPrinting || loading) ? <CircularProgress size={20} /> : <PrintIcon />}
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={handlePrintPDF}>
          <ListItemIcon>
            <PictureAsPdfIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Imprimer PDF</ListItemText>
        </MenuItem>
        <MenuItem onClick={handlePrintBluetooth}>
          <ListItemIcon>
            <BluetoothIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Bluetooth 58mm</ListItemText>
        </MenuItem>
      </Menu>
      <Dialog 
        open={pdfModalOpen} 
        onClose={() => setPdfModalOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogContent sx={{ p: 0, height: isMobile ? '100vh' : '80vh' }}>
          <IconButton
            onClick={() => setPdfModalOpen(false)}
            sx={{ 
              position: 'absolute', 
              right: 8, 
              top: 8, 
              zIndex: 1,
              bgcolor: 'rgba(255,255,255,0.8)'
            }}
          >
            <CloseIcon />
          </IconButton>
          {pdfUrl && (
            <iframe
              src={pdfUrl}
              style={{ 
                width: '100%', 
                height: '100%', 
                border: 'none' 
              }}
              title="Reçu PDF"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
