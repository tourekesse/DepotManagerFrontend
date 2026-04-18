
import * as React from "react";
import { Box, Button, IconButton, Stack, Tooltip, Alert, Typography } from "@mui/material";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useNavigate } from "react-router-dom";
import PageContainer from '../../../crud-dashboard/components/PageContainer';
import useNotifications from '../../../crud-dashboard/hooks/useNotifications/useNotifications';
import { publicApi } from "../../../api/axios";

export default function LivreurPage() {
  const notifications = useNotifications();
  const navigate = useNavigate();
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await publicApi.get("/api/livreurs");
      setRows(res.data || []);
    } catch (err) {
      setError("Erreur lors du chargement des livreurs");
      notifications.show("Erreur lors du chargement des livreurs", { severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [notifications]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (row) => {
    if(window.confirm(`Supprimer ${row.firstName} ${row.lastName} ?`)) {
      try {
        await publicApi.delete(`/api/livreurs/${row.id}`);
        notifications.show('Livreur supprimé', { severity: 'success' });
        loadData();
      } catch (err) {
        notifications.show('Erreur lors de la suppression', { severity: 'error' });
      }
    }
  };

  const columns = [
    { field: 'firstName', headerName: 'Prénom', flex: 1 },
    { field: 'lastName', headerName: 'Nom', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1 },
    { field: 'phoneNumber', headerName: 'Téléphone', flex: 1 },
    {
      field: 'actions',
      type: 'actions',
      width: 100,
      getActions: ({ row }) => [
        <GridActionsCellItem icon={<DeleteIcon />} label="Supprimer" onClick={() => handleDelete(row)} color="error" />
      ],
    },
  ];

  return (
    <PageContainer
      title={
        <Stack spacing={0.2} direction="row" alignItems="center">
          <LocalShippingIcon sx={{ fontSize: 22 }} />
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            Gestion des Livreurs
          </Typography>
        </Stack>
      }
      actions={
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Actualiser">
            <IconButton onClick={loadData} disabled={loading}><RefreshIcon /></IconButton>
          </Tooltip>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => navigate('/accueil/livreurs/nouveau')}
            sx={{ bgcolor: '#1a237e', '&:hover': { bgcolor: '#0d1440' }, px: { xs: 1, sm: 2 } }}
          >
            Nouveau Livreur
          </Button>
        </Stack>
      }
    >
      <Box sx={{ width: '100%', mt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ height: 500, width: '100%' }}>
          <DataGrid 
            rows={rows} 
            columns={columns} 
            loading={loading} 
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            sx={{ 
              border: 'none', boxShadow: 1, borderRadius: 2, bgcolor: 'background.paper',
              '& .MuiDataGrid-columnHeaders': { backgroundColor: '#f8f9fa' }
            }}
          />
        </Box>
      </Box>

    </PageContainer>
  );
}
