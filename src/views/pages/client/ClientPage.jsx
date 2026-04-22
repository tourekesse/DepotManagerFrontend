import * as React from "react";
import {
  Box,
  Button,
  IconButton,
  Stack,
  Tooltip,
  Alert,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Paper,
  Chip
} from "@mui/material";
import {
  DataGrid,
  GridActionsCellItem,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarDensitySelector
} from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ReceiptIcon from "@mui/icons-material/Receipt";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import PrintIcon from "@mui/icons-material/Print";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SendIcon from "@mui/icons-material/Send";
import SmsIcon from "@mui/icons-material/Sms";
import { useNavigate } from "react-router-dom";
import PageContainer from "../../../crud-dashboard/components/PageContainer";
import useNotifications from "../../../crud-dashboard/hooks/useNotifications/useNotifications";
import { publicApi, privateApi } from "../../../api/axios";
import GererCasiersModal from "../../../components/GererCasiersModal";
import InvitationModal from "../../../components/InvitationModal";
import PdfPreview from "../../../components/PdfPreview";
import { getBaseUrl } from "../../../config/api.config";

const formatF = (n) => {
  if (n === null || n === undefined) return "0 F";
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num)) return "0 F";
  return num.toLocaleString("fr-CI", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " F";
};

export default function ClientPage() {
  const notifications = useNotifications();
  const navigate = useNavigate();

  // States pour liste clients
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  // States pour formulaire
  const [openForm, setOpenForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);
  const [formData, setFormData] = React.useState({
    raisonsociale: "",
    telephone: "",
    categorieClient: "BAR",
    nomGerant: "",
    ville: "",
    email: "",
    soldeInitial: 0
  });

  // States pour releve
  const [openReleve, setOpenReleve] = React.useState(false);
  const [releveData, setReleveData] = React.useState(null);
  const [releveLoading, setReleveLoading] = React.useState(false);
  const [selectedClientForReleve, setSelectedClientForReleve] = React.useState(null);
  const [releveDetail, setReleveDetail] = React.useState(true);

  // States pour preview modal
  const [openPdfPreview, setOpenPdfPreview] = React.useState(false);
  const [mois, setMois] = React.useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // States pour gérer casiers
  const [casiersModalOpen, setCasiersModalOpen] = React.useState(false);
  const [selectedVenteForCasiers, setSelectedVenteForCasiers] = React.useState(null);
  const [clientNomForCasiers, setClientNomForCasiers] = React.useState(null);
  const [ventesCasiers, setVentesCasiers] = React.useState([]);

  // States pour invitation
  const [openInvitationModal, setOpenInvitationModal] = React.useState(false);
  const [invitationMode, setInvitationMode] = React.useState('invite'); // 'invite' ou 'create'
  const [success, setSuccess] = React.useState('');

  // Mock depot info - à remplacer avec les vraies données
  const depotInfo = { name: 'Dépôt Principal', id: 215 };
  const gerantInfo = { name: 'Gérant Principal' };

  // Charger les clients
  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await publicApi.get("/api/clients");
      setRows(res.data || []);
    } catch (err) {
      setError("Erreur lors du chargement des clients");
      notifications.show("Erreur lors du chargement des clients", { severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [notifications]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Ouvrir formulaire création
  const handleAdd = () => {
    setEditingId(null);
    setFormData({
      raisonsociale: "",
      telephone: "",
      categorieClient: "BAR",
      nomGerant: "",
      ville: "",
      email: "",
      soldeInitial: 0
    });
    setOpenForm(true);
  };

  // Ouvrir formulaire édition
  const handleEdit = (row) => {
    setEditingId(row.id);
    setFormData({
      raisonsociale: row.raisonsociale || "",
      telephone: row.telephone || "",
      categorieClient: row.categorieClient || "BAR",
      nomGerant: row.nomGerant || "",
      ville: row.ville || "",
      email: row.email || "",
      soldeInitial: 0
    });
    setOpenForm(true);
  };

  // Sauvegarder client
  const handleSave = async () => {
    if (!formData.raisonsociale.trim()) {
      notifications.show("Le nom/raison sociale est requis", { severity: "error" });
      return;
    }

    try {
      if (editingId) {
        await publicApi.put(`/api/clients/${editingId}`, formData);
        notifications.show("Client modifié avec succès", { severity: "success" });
      } else {
        await publicApi.post("/api/clients", formData);
        notifications.show("Client créé avec succès", { severity: "success" });
      }
      setOpenForm(false);
      loadData();
    } catch (err) {
      notifications.show(err.response?.data?.message || "Erreur lors de la sauvegarde", {
        severity: "error"
      });
    }
  };

  // Supprimer client
  const handleDelete = async (id, name) => {
    if (window.confirm(`Supprimer le client "${name}" ?`)) {
      try {
        await publicApi.delete(`/api/clients/${id}`);
        notifications.show("Client supprimé avec succès", { severity: "success" });
        loadData();
      } catch (err) {
        notifications.show("Erreur lors de la suppression", { severity: "error" });
      }
    }
  };

  // Charger relevé
  const handleOpenReleve = async (row) => {
    setSelectedClientForReleve(row);
    setReleveLoading(true);
    try {
      const res = await privateApi.get(`/api/clients/${row.id}/releve?detail=${releveDetail}`);
      setReleveData(res.data);
      setOpenReleve(true);
    } catch (err) {
      notifications.show("Erreur lors du chargement du relevé", { severity: "error" });
    } finally {
      setReleveLoading(false);
    }
  };

  // Imprimer relevé (PDF) - ouvre modal preview avec le bon client
  const handlePrintReleve = () => {
    setOpenPdfPreview(true);
  };

  // Imprimer directement depuis le modal PDF
  const handlePrintFromPreview = (pdfUrl) => {
    const printWindow = window.open(pdfUrl, '_blank');
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  // Envoyer relevé par WhatsApp - partage le PDF
  const handleSendRelevWhatsApp = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiBase = getBaseUrl();
      const url = `${apiBase}/rapport/releve-pdf/${selectedClientForReleve?.id}?mois=${mois}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch PDF');
      const blob = await response.blob();
      const file = new File([blob], `releve_client_${selectedClientForReleve?.id}_${mois}.pdf`, { type: 'application/pdf' });

      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: 'Relevé Client',
          text: `Relevé de ${selectedClientForReleve?.raisonsociale}`
        });
        notifications.show("Relevé partagé avec succès", { severity: "success" });
      } else {
        // Fallback: télécharger le fichier
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `releve_client_${selectedClientForReleve?.id}_${mois}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
        notifications.show("PDF téléchargé (partage non supporté)", { severity: "info" });
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        notifications.show("Erreur lors du partage du PDF", { severity: "error" });
      }
    }
  };

  const handleInvitationSuccess = (data) => {
    setSuccess(`✅ Invitation envoyée à ${data.clientName} avec succès!`);
    setOpenInvitationModal(false);
    notifications.show(`Invitation envoyée à ${data.clientName}`, { severity: "success" });
  };

  const handleInviteSpecificClient = (client) => {
    // Pré-remplir le formulaire avec les infos du client
    setInvitationMode('invite');
    // On pourrait passer les infos du client à la modal ici
    setSelectedClientForInvitation(client);
    setOpenInvitationModal(true);
  };

  const setSelectedClientForInvitation = (client) => {
    // Stocker le client sélectionné pour l'invitation
    window.selectedClientForInvitation = client;
  };
  const handleOpenCasiersDepuisListe = async (row) => {
    setSelectedVenteForCasiers(null);
    setClientNomForCasiers(row.raisonsociale);
    setVentesCasiers([]);
    try {
      const res = await privateApi.get(`/api/clients/${row.id}/casiers-a-recuperer`);
      const data = res.data || [];
      if (!data.length) {
        notifications.show("Aucun casier en attente pour ce client", { severity: "info" });
        return;
      }
      setVentesCasiers(data);
      // On ouvre directement sur la première vente en attente, mais on passe toute la liste
      const vente = data[0];
      setSelectedVenteForCasiers({
        venteId: vente.venteId,
        dateVente: vente.dateVente,
        mtEmballage: vente.mtEmballage
      });
      setCasiersModalOpen(true);
    } catch (err) {
      notifications.show("Impossible de charger les casiers à récupérer", { severity: "error" });
    }
  };

  // Colonnes DataGrid
  const columns = [
    {
      field: "id",
      headerName: "ID",
      width: 60,
      type: "number"
    },
    {
      field: "raisonsociale",
      headerName: "Nom/Raison sociale",
      flex: 1,
      minWidth: 150
    },
    {
      field: "telephone",
      headerName: "Téléphone",
      width: 120
    },
    {
      field: "categorieClient",
      headerName: "Catégorie",
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value === "BAR" ? "🍺 Bar" : "👤 Personne"}
          size="small"
          variant="outlined"
          color={params.value === "BAR" ? "primary" : "secondary"}
        />
      )
    },
    {
      field: "soldeTotal",
      headerName: "Solde",
      width: 150,
      renderCell: (params) => (
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: "1.1rem",
            color: params.value > 0 ? "#d32f2f" : params.value < 0 ? "#388e3c" : "#666"
          }}
        >
          {formatF(params.value)}
        </Typography>
      )
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 240,
      getActions: (params) => [
        <GridActionsCellItem
          icon={
            <Tooltip title="Casiers en attente">
              <Inventory2Icon />
            </Tooltip>
          }
          label="Casiers"
          onClick={() => handleOpenCasiersDepuisListe(params.row)}
          color="warning"
        />,
        <GridActionsCellItem
          icon={
            <Tooltip title="Voir relevé">
              <ReceiptIcon />
            </Tooltip>
          }
          label="Relevé"
          onClick={() => handleOpenReleve(params.row)}
          color="info"
        />,
        <GridActionsCellItem
          icon={
            <Tooltip title="Inviter client">
              <SmsIcon />
            </Tooltip>
          }
          label="Inviter"
          onClick={() => handleInviteSpecificClient(params.row)}
          sx={{ color: "#2196f3" }}
        />,
        <GridActionsCellItem
          icon={
            <Tooltip title="Modifier">
              <EditIcon />
            </Tooltip>
          }
          label="Modifier"
          onClick={() => handleEdit(params.row)}
          color="warning"
        />,
        <GridActionsCellItem
          icon={
            <Tooltip title="Supprimer">
              <DeleteIcon />
            </Tooltip>
          }
          label="Supprimer"
          onClick={() => handleDelete(params.row.id, params.row.raisonsociale)}
          color="error"
        />
      ]
    }
  ];

  return (
    <PageContainer title="Gestion des Clients">
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}

        {/* Toolbar */}
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            sx={{ backgroundColor: "#4caf50", fontWeight: 700 }}
          >
            Nouveau Client
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<PersonAddIcon />}
            onClick={() => {
              setInvitationMode('invite');
              setOpenInvitationModal(true);
            }}
            sx={{ fontWeight: 700 }}
          >
            Inviter Client
          </Button>
          <Button
            variant="outlined"
            startIcon={<SendIcon />}
            onClick={() => {
              setInvitationMode('create');
              setOpenInvitationModal(true);
            }}
            sx={{ fontWeight: 700 }}
          >
            Créer & Inviter
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            disabled={loading}
          >
            Rafraîchir
          </Button>
        </Stack>

        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {success}
          </Alert>
        )}

        {/* DataGrid */}
        <Paper sx={{ height: 600, width: "100%" }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } }
            }}
            slots={{
              toolbar: GridToolbarContainer
            }}
            slotProps={{
              toolbar: {
                showQuickFilter: true,
                quickFilterProps: { debounceMs: 500 }
              }
            }}
            sx={{
              "& .MuiDataGrid-columnHeader": { fontWeight: 700 },
              "& .MuiDataGrid-cell": { fontSize: "0.9rem" }
            }}
          />
        </Paper>
      </Stack>

      {/* ===== DIALOG FORM ===== */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>
          {editingId ? "✏️ Modifier Client" : "➕ Nouveau Client"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Nom / Raison sociale *"
            required
            value={formData.raisonsociale}
            onChange={(e) => setFormData({ ...formData, raisonsociale: e.target.value })}
            margin="normal"
            autoFocus
          />

          <TextField
            fullWidth
            label="Téléphone"
            value={formData.telephone}
            onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
            margin="normal"
            placeholder="+225 XXX XXX XXX"
          />

          <TextField
            fullWidth
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            margin="normal"
          />

          <TextField
            fullWidth
            label="Ville"
            value={formData.ville}
            onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
            margin="normal"
          />

          <TextField
            fullWidth
            select
            SelectProps={{ native: true }}
            label="Catégorie"
            value={formData.categorieClient}
            onChange={(e) => setFormData({ ...formData, categorieClient: e.target.value })}
            margin="normal"
          >
            <option value="BAR">🍺 Bar / Maquis</option>
            <option value="PERSONNE">👤 Personne</option>
          </TextField>

          {formData.categorieClient === "BAR" && (
            <TextField
              fullWidth
              label="Nom du gérant (optionnel)"
              value={formData.nomGerant}
              onChange={(e) => setFormData({ ...formData, nomGerant: e.target.value })}
              margin="normal"
            />
          )}

          {!editingId && (
            <TextField
              fullWidth
              label="Solde initial (F CFA)"
              type="number"
              value={formData.soldeInitial}
              onChange={(e) => setFormData({ ...formData, soldeInitial: parseInt(e.target.value) || 0 })}
              margin="normal"
              placeholder="0"
              helperText="Laisser 0 si client nouveau sans dette ni crédit"
            />
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Annuler</Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            sx={{ backgroundColor: "#1976d2", fontWeight: 700 }}
          >
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== DIALOG RELEVE ===== */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #releve-print-area, #releve-print-area * {
              visibility: visible;
            }
            #releve-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 58mm;
              font-size: 10px;
            }
            @page {
              size: 58mm auto;
              margin: 0;
            }
          }
        `}
      </style>
      <Dialog open={openReleve} onClose={() => setOpenReleve(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 1 }}>
          <ReceiptIcon />
          Relevé Client: {selectedClientForReleve?.raisonsociale}
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          <Box id="releve-print-area">
          {releveLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : releveData ? (
            <Stack spacing={2}>
              {/* Infos Client */}
              <Paper sx={{ p: 2, bgcolor: "#f5f5f5" }}>
                <Stack direction="row" spacing={3}>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Solde Actuel
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: 900,
                        fontSize: "1.3rem",
                        color: releveData.soldeActuel > 0 ? "#d32f2f" : "#388e3c"
                      }}
                    >
                      {formatF(releveData.soldeActuel)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Total Consommé
                    </Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
                      {formatF(releveData.totalConsomme)}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>

              {/* Alerte Casiers à Récupérer */}
              {/* Lignes Relevé */}
              <Box sx={{ maxHeight: 400, overflow: "auto" }}>
                {releveData.lignes && releveData.lignes.length > 0 ? (
                  releveData.lignes.map((ligne, idx) => (
                    <Paper key={idx} sx={{ p: 1.5, mb: 1, borderLeft: "4px solid #1976d2" }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
                            {ligne.operation}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {new Date(ligne.dateVente).toLocaleDateString("fr-CI")}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                          <Chip
                            label={`${ligne.type === "LIQUIDE" ? "🥤" : "📦"} ${formatF(
                              ligne.montant
                            )}`}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      </Stack>

                      {/* Détails si présents */}
                      {ligne.details && ligne.details.length > 0 && (
                        <Box sx={{ pl: 2, borderLeft: "2px solid #ccc", ml: 1 }}>
                          {ligne.details.map((det, didx) => (
                            <Box key={didx} sx={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", py: 0.3 }}>
                              <span>{det.description}</span>
                              <strong>{formatF(det.montant)}</strong>
                            </Box>
                          ))}
                        </Box>
                      )}

                      <Box sx={{ display: "flex", justifyContent: "flex-end", pt: 1, borderTop: "1px dashed #ddd" }}>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            color: ligne.soldeApres > 0 ? "#d32f2f" : "#388e3c"
                          }}
                        >
                          Solde: {formatF(ligne.soldeApres)}
                        </Typography>
                      </Box>
                    </Paper>
                  ))
                ) : (
                  <Alert severity="info">Aucun mouvement pour cette période</Alert>
                )}
              </Box>
            </Stack>
          ) : (
            <Alert severity="error">Erreur lors du chargement du relevé</Alert>
          )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenReleve(false)}>Fermer</Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => {
              setOpenPdfPreview(true);
              setOpenReleve(false);
            }}
            sx={{ fontWeight: 700, color: "#673ab7", borderColor: "#673ab7" }}
          >
            Aperçu PDF
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== DIALOG GERER CASIERS ===== */}
      <GererCasiersModal
        open={casiersModalOpen}
        onClose={() => {
          setCasiersModalOpen(false);
          setSelectedVenteForCasiers(null);
        }}
        vente={selectedVenteForCasiers}
        onValidate={() => {
          // Recharger le relevé après compensation/retour
          loadData();
          setCasiersModalOpen(false);
          setSelectedVenteForCasiers(null);
          setVentesCasiers([]);
          notifications.show("Casiers gérés avec succès", { severity: "success" });
        }}
        clientNom={clientNomForCasiers}
        ventesCasiers={ventesCasiers}
      />ssh root@62.72.24.153ssh root@62.72.24.153

      {/* ===== INVITATION MODAL ===== */}
      <InvitationModal
        open={openInvitationModal}
        onClose={() => setOpenInvitationModal(false)}
        onSuccess={handleInvitationSuccess}
        depotInfo={depotInfo}
        gerantInfo={gerantInfo}
        mode={invitationMode}
        preselectedClient={window.selectedClientForInvitation}
      />

      {/* ===== PDF PREVIEW MODAL ===== */}
      <Dialog open={openPdfPreview} onClose={() => setOpenPdfPreview(false)} maxWidth="md" fullWidth>
        <DialogTitle>Prévisualisation du Relevé PDF</DialogTitle>
        <DialogContent>
          <PdfPreview
            clientId={selectedClientForReleve?.id}
            mois={mois}
            clientName={selectedClientForReleve?.raisonsociale}
            onClose={() => setOpenPdfPreview(false)}
          />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
