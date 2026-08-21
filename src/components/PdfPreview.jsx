import React, { useEffect, useState } from 'react';
import { Button, CircularProgress, Box, Stack, Typography } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';

const PdfPreview = ({ clientId, mois, clientName, onClose }) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPdf = async () => {
      try {
        const token = localStorage.getItem('token');
        // Endpoint /api/rapport/releve-pdf (passe par proxy Vite en dev)
        const url = `/api/rapport/releve-pdf/${clientId}?preview=true&mois=${mois}`;
        console.log('📄 Fetching PDF from:', url);
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch PDF');
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        setPdfUrl(blobUrl);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    fetchPdf();
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [clientId, mois]);

  // Imprimer le PDF
  const handlePrint = () => {
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  // Télécharger le PDF
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `releve_client_${clientId}_${mois}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Partager via WhatsApp (Web Share API ou fallback)
  const handleShareWhatsApp = async () => {
    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const fileName = `releve_client_${clientName || clientId}_${mois}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Relevé Client - ${clientName || clientId}`,
          text: `Voici le relevé de compte pour ${clientName || 'Client ' + clientId}`
        });
      } else {
        // Fallback: télécharger le fichier
        handleDownload();
        alert('Fichier téléchargé. Vous pouvez le partager manuellement sur WhatsApp.');
      }
    } catch (err) {
      console.error('Erreur partage:', err);
      handleDownload();
    }
  };

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" height="400px">
      <CircularProgress />
    </Box>
  );

  if (error) return (
    <Box p={2}>
      <Typography color="error">Erreur: {error}</Typography>
    </Box>
  );

  return (
    <Box>
      {/* Barre d'actions */}
      <Stack direction="row" spacing={2} mb={2} justifyContent="center" flexWrap="wrap">
        <Button
          startIcon={<PrintIcon />}
          onClick={handlePrint}
          variant="contained"
          color="primary"
        >
          Imprimer
        </Button>

        <Button
          startIcon={<WhatsAppIcon />}
          onClick={handleShareWhatsApp}
          variant="contained"
          sx={{ backgroundColor: '#25d366', '&:hover': { backgroundColor: '#128c7e' } }}
        >
          WhatsApp
        </Button>

        <Button
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
          variant="outlined"
        >
          Télécharger
        </Button>

        <Button
          startIcon={<CloseIcon />}
          onClick={onClose}
          variant="outlined"
          color="secondary"
        >
          Fermer
        </Button>
      </Stack>

      {/* Aperçu PDF */}
      <Box
        sx={{
          border: '1px solid #ddd',
          borderRadius: 1,
          overflow: 'hidden',
          height: '500px'
        }}
      >
        <iframe
          src={pdfUrl}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="PDF Preview"
        />
      </Box>
    </Box>
  );
};

export default PdfPreview;