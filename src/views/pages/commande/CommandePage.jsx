import { Box, Typography, Paper } from "@mui/material";

export default function CommandePage() {
  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight={600} mb={2}>
        Commandes
      </Typography>
      <Paper sx={{ p: 2 }}>
        <Typography color="text.secondary">
          Liste des commandes à venir (placeholder). À connecter à l'API commande.
        </Typography>
      </Paper>
    </Box>
  );
}
