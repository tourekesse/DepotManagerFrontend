
import * as React from "react";
import { Box, Button, IconButton, Stack, Tooltip, Alert, Typography, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, Chip } from "@mui/material";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SendIcon from "@mui/icons-material/Send";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useNavigate } from "react-router-dom";
import PageContainer from '../../../crud-dashboard/components/PageContainer';
import useNotifications from '../../../crud-dashboard/hooks/useNotifications/useNotifications';
import { privateApi } from "../../../api/axios";
import InvitationLivreurModal from '../../../components/InvitationLivreurModal';
import { getUserCountry } from "../../../config/countries";
import { formatPhoneLocal } from "../../../utils/phoneUtils";

export default function LivreurPage() {
  const notifications = useNotifications();
  const navigate = useNavigate();
  const userCountry = getUserCountry();
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [openInvitationModal, setOpenInvitationModal] = React.useState(false);
  const [selectedLivreurForInvitation, setSelectedLivreurForInvitation] = React.useState(null);
  const [openEdit, setOpenEdit] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [pointsVente, setPointsVente] = React.useState([]);
  const [form, setForm] = React.useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    role: "LIVREUR",
    pointDeVenteId: "",
  });

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await privateApi.get("/api/livreurs");
      setRows(res.data || []);
    } catch (err) {
      setError("Erreur lors du chargement des collaborateurs");
      notifications.show("Erreur lors du chargement des collaborateurs", { severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [notifications]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    privateApi.get("/api/utilisateur/points-vente-emplacement")
      .then((res) => setPointsVente(res.data || []))
      .catch(() => notifications.show("Impossible de charger les points de vente", { severity: "error" }));
  }, [notifications]);

  const getRowPointDeVenteId = (row) => {
    return row.pointDeVenteActif?.id || row.pointDeVenteActifId || row.pointsVentes?.find((lien) => lien.actif)?.pointDeVente?.id || "";
  };

  const handleEdit = (row) => {
    setEditingId(row.id);
    setForm({
      firstName: row.firstName || "",
      lastName: row.lastName || "",
      phoneNumber: row.phoneNumber || "",
      role: row.role || "LIVREUR",
      pointDeVenteId: getRowPointDeVenteId(row) || pointsVente[0]?.id || "",
    });
    setOpenEdit(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "phoneNumber") {
      const digits = value.replace(/\D/g, "").slice(0, userCountry.phoneDigits);
      const masked = formatPhoneLocal(digits, userCountry.code);
      setForm({ ...form, phoneNumber: masked });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await privateApi.put(`/api/livreurs/${editingId}`, {
        firstName: form.firstName,
        lastName: form.lastName,
        phoneNumber: form.phoneNumber.replace(/\D/g, ""),
        role: form.role,
        pointDeVenteId: form.pointDeVenteId ? Number(form.pointDeVenteId) : null,
      });
      notifications.show("Utilisateur modifié", { severity: "success" });
      setOpenEdit(false);
      loadData();
    } catch (err) {
      notifications.show(err.response?.data?.message || "Erreur lors de la modification", { severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if(window.confirm(`Désactiver ${row.firstName} ${row.lastName} ?`)) {
      try {
        await privateApi.put(`/api/livreurs/${row.id}/desactiver`);
        notifications.show('Collaborateur désactivé', { severity: 'success' });
        loadData();
      } catch (err) {
        notifications.show('Erreur lors de la désactivation', { severity: 'error' });
      }
    }
  };

  const handleSendInvitation = (row) => {
    setSelectedLivreurForInvitation(row);
    setOpenInvitationModal(true);
  };

  const handleInvitationSuccess = () => {
    notifications.show('Invitation envoyée avec succès', { severity: 'success' });
  };

  const handleInvitationClose = () => {
    setOpenInvitationModal(false);
    setSelectedLivreurForInvitation(null);
  };

  const columns = [
    { field: 'firstName', headerName: 'Prénom', flex: 1 },
    { field: 'lastName', headerName: 'Nom', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1 },
    { field: 'phoneNumber', headerName: 'Téléphone', flex: 1 },
    {
      field: 'enabled',
      headerName: 'Statut',
      width: 120,
      renderCell: ({ value }) => <Chip size="small" label={value ? "Actif" : "Inactif"} color={value ? "success" : "default"} />,
    },
    {
      field: 'actions',
      type: 'actions',
      width: 160,
      headerName: 'Actions',
      getActions: ({ row }) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Modifier"
          onClick={() => handleEdit(row)}
          color="warning"
          showInMenu={false}
        />,
        <GridActionsCellItem 
          icon={<SendIcon />} 
          label="Envoyer invitation" 
          onClick={() => handleSendInvitation(row)} 
          color="primary"
          showInMenu={false}
        />,
        <GridActionsCellItem 
          icon={<DeleteIcon />} 
          label="Désactiver" 
          onClick={() => handleDelete(row)} 
          color="error"
          showInMenu={false}
        />
      ],
    },
  ];

  return (
    <PageContainer
      title={
        <Stack spacing={0.2} direction="row" alignItems="center">
          <LocalShippingIcon sx={{ fontSize: 22 }} />
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            Gestion des Utilisateurs
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
            onClick={() => navigate('/accueil/utilisateur/nouveau')}
            sx={{ bgcolor: '#1a237e', '&:hover': { bgcolor: '#0d1440' }, px: { xs: 1, sm: 2 } }}
          >
            Nouveau collaborateur
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

      <InvitationLivreurModal
        open={openInvitationModal}
        onClose={handleInvitationClose}
        onSuccess={handleInvitationSuccess}
        livreur={selectedLivreurForInvitation}
      />

      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Modifier utilisateur</DialogTitle>
        <Box component="form" onSubmit={handleSaveEdit}>
          <DialogContent sx={{ pt: 2 }}>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField label="Prénom" name="firstName" value={form.firstName} onChange={handleChange} required fullWidth />
                <TextField label="Nom" name="lastName" value={form.lastName} onChange={handleChange} required fullWidth />
              </Stack>
              <TextField label="Téléphone" name="phoneNumber" value={form.phoneNumber} onChange={handleChange} required fullWidth inputProps={{ inputMode: "numeric", maxLength: 14 }} />
              <FormControl fullWidth size="small">
                <InputLabel id="edit-role-label">Rôle</InputLabel>
                <Select labelId="edit-role-label" name="role" value={form.role} onChange={handleChange} label="Rôle" required>
                  <MenuItem value="GERANT_DEPOT">Gérant</MenuItem>
                  <MenuItem value="LIVREUR">Livreur</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth size="small" required>
                <InputLabel id="edit-point-vente-label">Point de vente</InputLabel>
                <Select labelId="edit-point-vente-label" name="pointDeVenteId" value={form.pointDeVenteId} onChange={handleChange} label="Point de vente">
                  {pointsVente.map((pv) => (
                    <MenuItem key={pv.id} value={pv.id}>{pv.nom}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpenEdit(false)}>Annuler</Button>
            <Button type="submit" variant="contained" disabled={saving || !form.pointDeVenteId}>Enregistrer</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </PageContainer>
  );
}
