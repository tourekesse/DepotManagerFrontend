import { Box, Typography, Paper } from "@mui/material";

export default function CommandeMobileList() {
  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight={600} mb={2}>
        Commandes Mobiles
      </Typography>
      <Paper sx={{ p: 2 }}>
        <Typography color="text.secondary">
          Liste des commandes mobiles à venir (placeholder). À connecter à l'API commande mobile.
        </Typography>
      </Paper>
    </Box>
  );
}
