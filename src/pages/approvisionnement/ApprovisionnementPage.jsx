import React from 'react';
import { Box, Paper, Typography, Grid, Button } from '@mui/material';
import { LocalShipping, Receipt, Inventory } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const ApprovisionnementPage = () => {
  const navigate = useNavigate();

  const menuItems = [
    {
      title: 'Fournisseurs',
      description: 'Gérer la liste des fournisseurs',
      icon: <LocalShipping sx={{ fontSize: 60 }} />,
      path: '/accueil/approvisionnement/fournisseurs',
      color: '#1976d2'
    },
    {
      title: 'Bons de Réception',
      description: 'Gérer les bons de réception',
      icon: <Receipt sx={{ fontSize: 60 }} />,
      path: '/accueil/approvisionnement/bons',
      color: '#2e7d32'
    },
    {
      title: 'Nouveau Bon',
      description: 'Créer un bon de réception',
      icon: <Inventory sx={{ fontSize: 60 }} />,
      path: '/accueil/approvisionnement/bons/nouveau',
      color: '#ed6c02'
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 4 }}>
        Approvisionnement
      </Typography>

      <Grid container spacing={3}>
        {menuItems.map((item, index) => (
          <Grid item xs={12} md={4} key={index}>
            <Paper
              sx={{
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: 6
                }
              }}
              onClick={() => navigate(item.path)}
            >
              <Box sx={{ color: item.color, mb: 2 }}>
                {item.icon}
              </Box>
              <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                {item.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {item.description}
              </Typography>
              <Button variant="contained" sx={{ bgcolor: item.color }}>
                Accéder
              </Button>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ApprovisionnementPage;
