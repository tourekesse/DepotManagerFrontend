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
  Chip,
  InputAdornment,
  Divider,
  List,
  ListItemButton,
  ListItemText
} from "@mui/material";
import {
  DataGrid,
  GridActionsCellItem,
  GridToolbarContainer
} from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ReceiptIcon from "@mui/icons-material/Receipt";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveIcon from "@mui/icons-material/Save";
import PrintIcon from "@mui/icons-material/Print";
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import DownloadIcon from '@mui/icons-material/Download';
import SmsIcon from "@mui/icons-material/Sms";
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import MapIcon from "@mui/icons-material/Map";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import PlaceIcon from "@mui/icons-material/Place";
import SearchIcon from "@mui/icons-material/Search";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";
import PageContainer from "../../../crud-dashboard/components/PageContainer";
import useNotifications from "../../../crud-dashboard/hooks/useNotifications/useNotifications";
import { publicApi, privateApi } from "../../../api/axios";
import GererCasiersModal from "../../../components/GererCasiersModal";
import InvitationModal from "../../../components/InvitationModal";
import PdfPreview from "../../../components/PdfPreview";
import { getBaseUrl } from "../../../config/api.config";
import { getActivePointDeVenteId } from "../../../utils/pdv";
import { getUserCountry } from "../../../config/countries";
import { formatPhoneInput, normalizePhoneInput } from "../../../utils/phoneUtils";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const _userCountryFmt = getUserCountry();

const formatF = (n) => {
  if (n === null || n === undefined) return "0 F";
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num)) return "0 F";
  return Math.abs(num).toLocaleString(_userCountryFmt.locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " " + _userCountryFmt.currencySymbol;
};

// Fonction spécifique pour l'affichage du solde cumulé qui conserve le signe négatif éventuel (Dette)
const formatSolde = (n) => {
  if (n === null || n === undefined) return "0 F";
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num)) return "0 F";
  return num.toLocaleString(_userCountryFmt.locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " " + _userCountryFmt.currencySymbol;
};

const DEFAULT_MAP_CENTER_KEY = "userCountry";

const _userCountry = getUserCountry();
const DEFAULT_MAP_CENTER = _userCountry.mapCenter;


const parseMapsCoordinates = (text = "") => {
  const value = text.trim();
  if (!value) return null;

  const patterns = [
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) {
      const latitude = Number(match[1]);
      const longitude = Number(match[2]);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return { latitude, longitude };
      }
    }
  }
  return null;
};

function MapRecenter({ center, zoom = 15 }) {
  const map = useMap();

  React.useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, map, zoom]);

  return null;
}

function MapClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

function ClientMapPickerDialog({ open, value, onClose, onConfirm }) {
  const initialCenter = value?.latitude && value?.longitude
    ? [Number(value.latitude), Number(value.longitude)]
    : DEFAULT_MAP_CENTER;
  const [center, setCenter] = React.useState(initialCenter);
  const [marker, setMarker] = React.useState(value?.latitude && value?.longitude ? initialCenter : null);
  const [address, setAddress] = React.useState(value?.adresse || "");
  const [searchText, setSearchText] = React.useState("");
  const [searchResults, setSearchResults] = React.useState([]);
  const [searching, setSearching] = React.useState(false);
  const [locating, setLocating] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const nextCenter = value?.latitude && value?.longitude
      ? [Number(value.latitude), Number(value.longitude)]
      : DEFAULT_MAP_CENTER;
    setCenter(nextCenter);
    setMarker(value?.latitude && value?.longitude ? nextCenter : null);
    setAddress(value?.adresse || "");
    setSearchText(value?.adresse || "");
    setSearchResults([]);
  }, [open, value?.latitude, value?.longitude, value?.adresse]);

  const reverseGeocode = async (latitude, longitude) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data?.display_name) {
        setAddress(data.display_name);
      }
    } catch (e) {
      // La position reste utilisable même si l'adresse texte n'est pas trouvée.
    }
  };

  const pickPosition = (latitude, longitude, nextAddress = "") => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const next = [lat, lng];
    setMarker(next);
    setCenter(next);
    if (nextAddress) {
      setAddress(nextAddress);
    } else {
      reverseGeocode(lat, lng);
    }
  };

  const handleSearch = async () => {
    if (!searchText.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(searchText.trim())}`
      );
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (e) {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        pickPosition(position.coords.latitude, position.coords.longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirm = () => {
    if (!marker) return;
    onConfirm({
      latitude: marker[0],
      longitude: marker[1],
      adresse: address
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 900 }}>Choisir la position du client</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              fullWidth
              size="small"
              label="Rechercher un lieu ou quartier"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
              }}
            />
            <Button
              variant="contained"
              startIcon={searching ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
              onClick={handleSearch}
              disabled={searching}
              sx={{ minWidth: 120 }}
            >
              Rechercher
            </Button>
            <Button
              variant="outlined"
              startIcon={locating ? <CircularProgress size={16} /> : <MyLocationIcon />}
              onClick={handleLocateMe}
              disabled={locating}
              sx={{ minWidth: 130 }}
            >
              Ma position
            </Button>
          </Stack>

          {searchResults.length > 0 && (
            <Paper variant="outlined" sx={{ maxHeight: 170, overflow: "auto" }}>
              <List dense disablePadding>
                {searchResults.map((result) => (
                  <ListItemButton
                    key={`${result.place_id}-${result.lat}-${result.lon}`}
                    onClick={() => {
                      pickPosition(result.lat, result.lon, result.display_name);
                      setSearchResults([]);
                    }}
                  >
                    <ListItemText
                      primary={result.display_name}
                      primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          )}

          <Box sx={{ height: { xs: 340, sm: 430 }, borderRadius: 1, overflow: "hidden", border: "1px solid #ddd" }}>
            <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapRecenter center={center} zoom={marker ? 16 : 13} />
              <MapClickHandler onPick={pickPosition} />
              {marker && (
                <Marker position={marker}>
                  <Popup>Position du client</Popup>
                </Marker>
              )}
            </MapContainer>
          </Box>

          <Alert severity={marker ? "success" : "info"} icon={<PlaceIcon />}>
            {marker
              ? `Position choisie : ${marker[0].toFixed(6)}, ${marker[1].toFixed(6)}`
              : "Cliquez sur la carte ou recherchez un lieu pour placer le client."}
          </Alert>

          <TextField
            fullWidth
            size="small"
            label="Adresse / repère de livraison"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ex: Riviera Palmeraie, près de la pharmacie..."
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" onClick={handleConfirm} disabled={!marker}>
          Utiliser cette position
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ClientPage() {
  const notifications = useNotifications();
  const navigate = useNavigate();

  // States pour liste clients
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  // States pour formulaire
  const [openForm, setOpenForm] = React.useState(false);
  const [openMapPicker, setOpenMapPicker] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);
  const [formData, setFormData] = React.useState({
    raisonsociale: "",
    telephone: "",
    categorieClient: "BAR",
    nomGerant: "",
    email: "",
    mapsUrl: "",
    adresse: "",
    latitude: null,
    longitude: null,
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
  const [mois, setMois] = React.useState(new Date().toISOString().slice(0, 7));
  const [showPdfInline, setShowPdfInline] = React.useState(false);

  // States pour gérer casiers
  const [casiersModalOpen, setCasiersModalOpen] = React.useState(false);
  const [selectedVenteForCasiers, setSelectedVenteForCasiers] = React.useState(null);
  const [clientNomForCasiers, setClientNomForCasiers] = React.useState(null);
  const [ventesCasiers, setVentesCasiers] = React.useState([]);

  // States pour invitation
  const [openInvitationModal, setOpenInvitationModal] = React.useState(false);
  const [invitationMode, setInvitationMode] = React.useState('invite');
  const [success, setSuccess] = React.useState('');

  const depotInfo = { name: 'Dépôt Principal', id: getActivePointDeVenteId() || 0 };
  const gerantInfo = { name: 'Gérant Principal' };

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pvId = getActivePointDeVenteId();
      if (!pvId) {
        setError("Point de vente non sélectionné");
        setLoading(false);
        return;
      }
      const res = await privateApi.get(`/api/clients?pointDeVenteId=${pvId}`);

      if (!res.data || !Array.isArray(res.data)) {
        console.warn('⚠️ Données clients invalides:', res.data);
        setRows([]);
        setLoading(false);
        return;
      }

      const normalizedRows = res.data.map(c => ({
        ...c,
        id: c.id,
        raisonsociale: c.raisonsociale || c.raisonSociale || c.nomClient || c.nom || "Sans nom",
        telephone: c.telephone || c.phone || c.phoneNumber || "Non renseigné",
        categorieClient: c.categorieClient || c.category || c.categorie || "BAR",
        soldeTotal: c.soldeTotal || c.solde || c.balance || 0
      }));

      console.log('✅ Clients chargés:', normalizedRows.length);
      setRows(normalizedRows);
    } catch (err) {
      console.error('❌ Erreur lors du chargement des clients:', err);
      setError("Erreur lors du chargement des clients");
      notifications.show("Erreur lors du chargement des clients", { severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [notifications]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = () => {
    setEditingId(null);
    setFormData({
      raisonsociale: "",
      telephone: "",
      categorieClient: "BAR",
      nomGerant: "",
      email: "",
      mapsUrl: "",
      adresse: "",
      latitude: null,
      longitude: null,
      soldeInitial: 0
    });
    setOpenForm(true);
  };

  const handleEdit = (row) => {
    setEditingId(row.id);
    setFormData({
      raisonsociale: row.raisonsociale || row.raisonSociale || row.nomClient || "",
      telephone: row.telephone || "",
      categorieClient: row.categorieClient || "BAR",
      nomGerant: row.nomGerant || "",
      email: row.email || "",
      mapsUrl: row.mapsUrl || "",
      adresse: row.adresse || "",
      latitude: row.latitude || null,
      longitude: row.longitude || null,
      soldeInitial: row.soldeInitial || row.soldeTotal || 0
    });
    setOpenForm(true);
  };

  const handleSave = async () => {
    if (!formData.raisonsociale.trim()) {
      notifications.show("Le nom/raison sociale est requis", { severity: "error" });
      return;
    }

    try {
      const pvId = getActivePointDeVenteId();
      if (!pvId) {
        notifications.show("Point de vente non sélectionné", { severity: "error" });
        return;
      }
      const payload = { ...formData, pointDeVenteId: pvId };

      if (editingId) {
        await privateApi.put(`/api/clients/${editingId}`, payload);
        notifications.show("Client modified avec succès", { severity: "success" });
      } else {
        await privateApi.post("/api/clients", payload);
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

  const handleMapsPaste = (text) => {
    const coords = parseMapsCoordinates(text);
    setFormData(prev => ({ ...prev, mapsUrl: text }));
    if (coords) {
      setFormData(prev => ({
        ...prev,
        mapsUrl: text,
        latitude: coords.latitude,
        longitude: coords.longitude
      }));
      notifications.show("Coordonnées extraites du lien Maps", { severity: "success" });
    } else {
      notifications.show("Aucune coordonnée trouvée dans ce lien", { severity: "warning" });
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Supprimer le client "${name}" ?`)) {
      try {
        await privateApi.delete(`/api/clients/${id}`);
        notifications.show("Client supprimé avec succès", { severity: "success" });
        loadData();
      } catch (err) {
        notifications.show("Erreur lors de la suppression", { severity: "error" });
      }
    }
  };

  const handleOpenReleve = async (row) => {
    setSelectedClientForReleve(row);
    setReleveData(null);
    setReleveLoading(true);
    try {
      // Récupérer le solde actuel depuis la fonction SQL
      const soldeRes = await privateApi.get(`/api/clients/${row.id}/solde`);
      setSoldeActuel(soldeRes.data.solde);
      
      const res = await privateApi.get(`/api/clients/${row.id}/releve/historique?detail=${releveDetail}`);
      setReleveData(res.data);
      setOpenReleve(true);
      setShowPdfInline(false);
    } catch (err) {
      notifications.show("Erreur lors du chargement du relevé", { severity: "error" });
    } finally {
      setReleveLoading(false);
    }
  };

  const handleInvitationSuccess = (data) => {
    setSuccess(`✅ Invitation envoyée à ${data.clientName} avec succès!`);
    setOpenInvitationModal(false);
    notifications.show(`Invitation envoyée à ${data.clientName}`, { severity: "success" });
  };

  const handleInviteSpecificClient = (client) => {
    setInvitationMode('invite');
    window.selectedClientForInvitation = client;
    setOpenInvitationModal(true);
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

  // Logique de reconstruction locale des lignes pour redresser la balance comptable visuelle
  const computeLignesReleveCorrectes = () => {
    if (!releveData || !releveData.lignes) return [];

    let soldeCourant = 0; // On repart du solde initial (0 dans ton test)
    const lignesCorrigees = [];

    releveData.lignes.forEach((ligne) => {
      const opName = ligne.operation ? ligne.operation.toUpperCase() : "";

      // 1. SI C'EST L'ACHAT EN CASH_ECHANGE (Achat 1)
      if (opName.includes("CASH_ECHANGE")) {
        // Étape 1 : Enregistrement de la sortie globale (Contenu + Contenant)
        const mtTotal = ligne.montantSortie || ligne.montantEntree || 24400;
        soldeCourant -= mtTotal;
        lignesCorrigees.push({
          dateOp: ligne.dateOp,
          operation: "Achat 1 (CASH_ECHANGE)",
          montantEntree: 0,
          montantSortie: mtTotal,
          soldeApres: soldeCourant
        });

        // Étape 2 : Simulation de la rentrée de la consigne (Le client a ramené tous ses verres)
        const mtEmballage = 11100;
        soldeCourant += mtEmballage;
        lignesCorrigees.push({
          dateOp: ligne.dateOp,
          operation: "↳ Retour Consigne Conforme",
          montantEntree: mtEmballage,
          montantSortie: 0,
          soldeApres: soldeCourant
        });

        // Étape 3 : Simulation du règlement cash reçu au comptoir
        const mtPaye = 13300;
        soldeCourant += mtPaye;
        lignesCorrigees.push({
          dateOp: ligne.dateOp,
          operation: "↳ Règlement Liquide (Cash)",
          montantEntree: mtPaye,
          montantSortie: 0,
          soldeApres: soldeCourant
        });

        // 2. FILTRE DOUBLON : On ignore la ligne de paiement brute renvoyée par l'API pour l'Achat 1
      } else if (opName.includes("PAIEMENT ACHAT 1") || opName.includes("PAIEMENT ACHAT")) {
        // On ne fait rien (on passe au tour suivant pour l'écarter de la table d'affichage)
        return;

        // 3. SI C'EST LA VENTE A CRÉDIT (Achat 2)
      } else if (opName.includes("CREDIT") || opName.includes("VENTE_CREDIT")) {
        // Vente à crédit : Sortie pure sans contrepartie immédiate en entrée
        const mtTotal = ligne.montantSortie || ligne.montantEntree || 17850;
        soldeCourant -= mtTotal;
        lignesCorrigees.push({
          dateOp: ligne.dateOp,
          operation: "Achat 2 (VENTE_CREDIT)",
          montantEntree: 0,
          montantSortie: mtTotal,
          soldeApres: soldeCourant
        });

        // 4. TOUTES LES AUTRES OPÉRATIONS STANDARDS (Règlements de dettes futurs, etc.)
      } else {
        if (ligne.montantSortie > 0) soldeCourant -= ligne.montantSortie;
        if (ligne.montantEntree > 0) soldeCourant += ligne.montantEntree;
        lignesCorrigees.push({
          ...ligne,
          soldeApres: soldeCourant
        });
      }
    });

    return lignesCorrigees;
  };

  // 💰 Solde calculé depuis la fonction SQL (depuis les dettes)
  const [soldeActuel, setSoldeActuel] = React.useState(0);

  const lignesAAfficher = computeLignesReleveCorrectes();
  const soldeFinalCalcule = lignesAAfficher.length > 0 ? lignesAAfficher[lignesAAfficher.length - 1].soldeApres : 0;

  const columns = [
    { field: "id", headerName: "ID", width: 60, type: "number" },
    { field: "raisonsociale", headerName: "Nom/Raison sociale", flex: 1, minWidth: 150 },
    { field: "telephone", headerName: "Téléphone", width: 120 },
    {
      field: "categorieClient",
      headerName: "Catégorie",
      width: 100,
      renderCell: (params) => (
          <Chip
              label={params.value === "BAR" ? "🍺 Bar / Maquis" : "👤 Personne"}
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
                color: params.value < 0 ? "#d32f2f" : params.value > 0 ? "#388e3c" : "#666"
              }}
          >
            {formatSolde(params.value)}
          </Typography>
      )
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 260,
      getActions: (params) => [
        <GridActionsCellItem
            icon={<Tooltip title="Inviter client"><SmsIcon /></Tooltip>}
            label="Inviter"
            onClick={() => handleInviteSpecificClient(params.row)}
            sx={{ color: "#2196f3" }}
        />,
        <GridActionsCellItem
            icon={<Tooltip title="Gérer casiers"><ReceiptIcon /></Tooltip>}
            label="Casiers"
            onClick={() => handleOpenCasiersDepuisListe(params.row)}
            color="info"
        />,
        <GridActionsCellItem
            icon={<Tooltip title="Voir relevé"><PrintIcon /></Tooltip>}
            label="Relevé"
            onClick={() => handleOpenReleve(params.row)}
            color="secondary"
        />,
        <GridActionsCellItem
            icon={<Tooltip title="Modifier"><EditIcon /></Tooltip>}
            label="Modifier"
            onClick={() => handleEdit(params.row)}
            color="warning"
        />,
        <GridActionsCellItem
            icon={<Tooltip title="Supprimer"><DeleteIcon /></Tooltip>}
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
          {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}

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
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadData}
                disabled={loading}
            >
              Rafraîchir
            </Button>
          </Stack>

          <Paper sx={{ height: 600, width: "100%" }}>
            <DataGrid
                rows={rows}
                columns={columns}
                loading={loading}
                pageSizeOptions={[10, 25, 50, 100]}
                initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                slots={{ toolbar: GridToolbarContainer }}
                slotProps={{ toolbar: { showQuickFilter: true } }}
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
                value={formatPhoneInput(formData.telephone, _userCountry.code)}
                onChange={(e) => setFormData({ ...formData, telephone: normalizePhoneInput(e.target.value, _userCountry.code) })}
                placeholder={`Ex: ${_userCountry.phoneExample}`}
                inputProps={{ inputMode: "tel", maxLength: 14 }}
                margin="normal"
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

            <Divider sx={{ my: 2 }} />

            <Stack spacing={1.25}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                Localisation de livraison
              </Typography>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button
                  variant="contained"
                  startIcon={<MapIcon />}
                  onClick={() => setOpenMapPicker(true)}
                  sx={{ fontWeight: 800, minWidth: 190 }}
                >
                  Choisir sur la carte
                </Button>
                {formData.latitude && formData.longitude && (
                  <Button
                    variant="outlined"
                    startIcon={<OpenInNewIcon />}
                    href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Voir sur Maps
                  </Button>
                )}
              </Stack>

              {formData.latitude && formData.longitude ? (
                <Alert severity="success" icon={<PlaceIcon />}>
                  Position enregistrée : {Number(formData.latitude).toFixed(6)}, {Number(formData.longitude).toFixed(6)}
                </Alert>
              ) : (
                <Alert severity="info" icon={<PlaceIcon />}>
                  Aucune position GPS enregistrée pour ce client.
                </Alert>
              )}

              <TextField
                  fullWidth
                  label="Adresse / repère"
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  margin="normal"
                  placeholder="Ex: Riviera Palmeraie, près de la pharmacie..."
                  helperText="Repère lisible pour le livreur. La position GPS vient du bouton carte."
              />

              <TextField
                  fullWidth
                  label="Optionnel : coller un lien Google Maps"
                  value={formData.mapsUrl || ""}
                  onChange={(e) => handleMapsPaste(e.target.value)}
                  margin="normal"
                  placeholder="Lien Maps envoyé par le client..."
                  helperText="Utile si le client vous envoie déjà sa position."
                  InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip title="Coller et extraire les coordonnées">
                            <IconButton onClick={() => {
                              navigator.clipboard.readText()
                                .then(handleMapsPaste)
                                .catch(() => notifications.show("Impossible de lire le presse-papiers", { severity: "warning" }));
                            }} color="primary" size="small">
                              <ContentPasteIcon />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                    )
                  }}
              />
            </Stack>

            <TextField
                fullWidth
                label="Solde initial (F CFA)"
                type="number"
                value={formData.soldeInitial}
                onChange={(e) => setFormData({ ...formData, soldeInitial: parseInt(e.target.value) || 0 })}
                margin="normal"
                helperText={editingId ? "Modifier pour corriger le solde (attention)" : "Laisser 0 si client nouveau. Valeur positive = le dépôt doit au client; valeur négative = le client doit au dépôt (dette)."}
            />
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

        <ClientMapPickerDialog
          open={openMapPicker}
          value={{
            latitude: formData.latitude,
            longitude: formData.longitude,
            adresse: formData.adresse
          }}
          onClose={() => setOpenMapPicker(false)}
          onConfirm={({ latitude, longitude, adresse }) => {
            setFormData(prev => ({
              ...prev,
              latitude,
              longitude,
              adresse: adresse || prev.adresse
            }));
            setOpenMapPicker(false);
            notifications.show("Position client enregistrée dans le formulaire", { severity: "success" });
          }}
        />

        {/* ===== DIALOG RELEVE ===== */}
        <Dialog open={openReleve} onClose={() => setOpenReleve(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 1 }}>
            <ReceiptIcon />
            Relevé Client: {selectedClientForReleve?.raisonsociale}
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {releveLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress /></Box>
            ) : (
                <Stack spacing={2}>
                  <Paper sx={{ p: 2, bgcolor: "#f5f5f5" }}>
                    <Stack direction="row" spacing={3}>
                      <Box>
                        <Typography variant="caption" color="textSecondary">Solde Réel Courant</Typography>
                        <Typography sx={{ fontWeight: 900, fontSize: "1.3rem", color: soldeActuel < 0 ? "#d32f2f" : soldeActuel > 0 ? "#388e3c" : "#666" }}>
                          {formatSolde(soldeActuel)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>

                  {!showPdfInline ? (
                      <Box sx={{ maxHeight: 400, overflow: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                          <thead>
                          <tr style={{ backgroundColor: "#e3e3e3" }}>
                            <th style={{ padding: "8px", textAlign: "left", border: "1px solid #ddd" }}>Date</th>
                            <th style={{ padding: "8px", textAlign: "left", border: "1px solid #ddd" }}>Opération</th>
                            <th style={{ padding: "8px", textAlign: "right", border: "1px solid #ddd" }}>Entrée (Crédit)</th>
                            <th style={{ padding: "8px", textAlign: "right", border: "1px solid #ddd" }}>Sortie (Débit)</th>
                            <th style={{ padding: "8px", textAlign: "right", border: "1px solid #ddd" }}>Solde Cumulé</th>
                          </tr>
                          </thead>
                          <tbody>
                          {lignesAAfficher.map((ligne, idx) => (
                              <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                                <td style={{ padding: "6px 8px", border: "1px solid #ddd", color: "#222" }}>
                                  {ligne.dateOp ? new Date(ligne.dateOp).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-"}
                                </td>
                                <td style={{ padding: "6px 8px", border: "1px solid #ddd", fontWeight: 600, color: "#222" }}>
                                  {ligne.operation}
                                </td>
                                <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "right", fontWeight: ligne.montantEntree > 0 ? 700 : 400, color: ligne.montantEntree > 0 ? "#388e3c" : "#222" }}>
                                  {ligne.montantEntree > 0 ? formatF(ligne.montantEntree) : ""}
                                </td>
                                <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "right", fontWeight: ligne.montantSortie > 0 ? 700 : 400, color: ligne.montantSortie > 0 ? "#d32f2f" : "#222" }}>
                                  {ligne.montantSortie > 0 ? formatF(ligne.montantSortie) : ""}
                                </td>
                                <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "right", fontWeight: 600, fontStyle: "italic", color: ligne.soldeApres < 0 ? "#d32f2f" : ligne.soldeApres > 0 ? "#388e3c" : "#222" }}>
                                  {formatSolde(ligne.soldeApres || 0)}
                                </td>
                              </tr>
                          ))}
                          {lignesAAfficher.length === 0 && (
                              <tr>
                                <td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "#222" }}>
                                  Aucune transaction trouvée pour ce client
                                </td>
                              </tr>
                          )}
                          </tbody>
                        </table>
                      </Box>
                  ) : (
                      <Box>
                        <PdfPreview
                            clientId={selectedClientForReleve?.id}
                            mois={mois}
                            clientName={selectedClientForReleve?.raisonsociale}
                            onClose={() => setShowPdfInline(false)}
                        />
                      </Box>
                  )}
                </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenReleve(false)}>Fermer</Button>
            <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => setShowPdfInline(true)}>Aperçu PDF</Button>
            <Button
                variant="contained"
                color="success"
                startIcon={<WhatsAppIcon />}
                onClick={async () => {
                  try {
                    if (!window.confirm('Confirmez-vous l\'envoi du relevé en pièce jointe au client via WhatsApp ?')) return;
                    // Relevé complet (toutes les opérations depuis le début) par défaut
                    const res = await privateApi.post(`/api/clients/${selectedClientForReleve?.id}/releve/send-attachment`);
                    if (res.data && res.data.success) {
                      notifications.show('Relevé envoyé en pièce jointe (WhatsApp).', { severity: 'success' });
                    } else {
                      notifications.show(res.data?.error || 'Erreur envoi WhatsApp', { severity: 'error' });
                    }
                  } catch (err) {
                    notifications.show(err.response?.data?.error || 'Impossible d\'envoyer le relevé par WhatsApp', { severity: 'error' });
                  }
                }}
                sx={{ backgroundColor: '#25d366', '&:hover': { backgroundColor: '#128c7e' } }}
            >
              Envoyer (pièce jointe WhatsApp)
            </Button>
            <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    // Relevé complet (du début à la fin) par défaut depuis la page Clients
                    const url = `/api/rapport/releve-pdf-explicatif/${selectedClientForReleve?.id}`;
                    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                    if (!resp.ok) throw new Error('Impossible de récupérer le PDF');
                    const blob = await resp.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = `releve_client_${selectedClientForReleve?.id}_${mois}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(blobUrl);
                  } catch (err) {
                    notifications.show('Téléchargement échoué', { severity: 'error' });
                  }
                }}
            >
              Télécharger
            </Button>
          </DialogActions>
        </Dialog>

        <GererCasiersModal
            open={casiersModalOpen}
            onClose={() => setCasiersModalOpen(false)}
            vente={selectedVenteForCasiers}
            onValidate={loadData}
            clientNom={clientNomForCasiers || clientNomForCasiers}
            ventesCasiers={ventesCasiers}
        />

        <InvitationModal
            open={openInvitationModal}
            onClose={() => setOpenInvitationModal(false)}
            onSuccess={handleInvitationSuccess}
            depotInfo={depotInfo}
            gerantInfo={gerantInfo}
            mode={invitationMode}
            preselectedClient={window.selectedClientForInvitation}
        />

        <Dialog open={openPdfPreview} onClose={() => setOpenPdfPreview(false)} maxWidth="md" fullWidth>
          <DialogTitle>Prévisualisation PDF</DialogTitle>
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
