import * as React from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
} from "@mui/material";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DataGrid, GridActionsCellItem, GridToolbarContainer } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveIcon from "@mui/icons-material/Save";
import MapIcon from "@mui/icons-material/Map";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import PlaceIcon from "@mui/icons-material/Place";
import SearchIcon from "@mui/icons-material/Search";
import PageContainer from "../../../crud-dashboard/components/PageContainer";
import useNotifications from "../../../crud-dashboard/hooks/useNotifications/useNotifications";
import { privateApi } from "../../../api/axios";
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

const _pvUserCountry = getUserCountry();
const DEFAULT_MAP_CENTER = _pvUserCountry.mapCenter;

const emptyForm = {
  nom: "",
  code: "",
  phoneNumber: "",
  situationGeo: "",
  latitude: null,
  longitude: null,
  emplacementId: "",
};

const formatPhoneInputLocal = (value = "") =>
  formatPhoneInput(value, _pvUserCountry.code);

const normalizePhoneInputLocal = (value = "") =>
  normalizePhoneInput(value, _pvUserCountry.code);

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
    },
  });
  return null;
}

function PointVenteMapPickerDialog({ open, value, onClose, onConfirm }) {
  const initialCenter = value?.latitude && value?.longitude
    ? [Number(value.latitude), Number(value.longitude)]
    : DEFAULT_MAP_CENTER;
  const [center, setCenter] = React.useState(initialCenter);
  const [marker, setMarker] = React.useState(value?.latitude && value?.longitude ? initialCenter : null);
  const [situationGeo, setSituationGeo] = React.useState(value?.situationGeo || "");
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
    setSituationGeo(value?.situationGeo || "");
    setSearchText(value?.situationGeo || "");
    setSearchResults([]);
  }, [open, value?.latitude, value?.longitude, value?.situationGeo]);

  const reverseGeocode = async (latitude, longitude) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data?.display_name) setSituationGeo(data.display_name);
    } catch (e) {
      // La position GPS reste utilisable même sans adresse textuelle.
    }
  };

  const pickPosition = (latitude, longitude, nextSituationGeo = "") => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const next = [lat, lng];
    setMarker(next);
    setCenter(next);
    if (nextSituationGeo) setSituationGeo(nextSituationGeo);
    else reverseGeocode(lat, lng);
  };

  const handleSearch = async () => {
    if (!searchText.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(searchText.trim())}`);
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
    onConfirm({ latitude: marker[0], longitude: marker[1], situationGeo });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 900 }}>Choisir la position du point de vente</DialogTitle>
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
            <Button variant="contained" startIcon={searching ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />} onClick={handleSearch} disabled={searching} sx={{ minWidth: 120 }}>
              Rechercher
            </Button>
            <Button variant="outlined" startIcon={locating ? <CircularProgress size={16} /> : <MyLocationIcon />} onClick={handleLocateMe} disabled={locating} sx={{ minWidth: 130 }}>
              Ma position
            </Button>
          </Stack>

          {searchResults.length > 0 && (
            <Paper variant="outlined" sx={{ maxHeight: 170, overflow: "auto" }}>
              {searchResults.map((result) => (
                <Button
                  key={`${result.place_id}-${result.lat}-${result.lon}`}
                  fullWidth
                  onClick={() => {
                    pickPosition(result.lat, result.lon, result.display_name);
                    setSearchResults([]);
                  }}
                  sx={{ justifyContent: "flex-start", textAlign: "left", px: 2, py: 1, fontSize: 13, color: "text.primary" }}
                >
                  {result.display_name}
                </Button>
              ))}
            </Paper>
          )}

          <Box sx={{ height: { xs: 340, sm: 430 }, borderRadius: 1, overflow: "hidden", border: "1px solid #ddd" }}>
            <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapRecenter center={center} zoom={marker ? 16 : 13} />
              <MapClickHandler onPick={pickPosition} />
              {marker && (
                <Marker position={marker}>
                  <Popup>Position du point de vente</Popup>
                </Marker>
              )}
            </MapContainer>
          </Box>

          <Alert severity={marker ? "success" : "info"} icon={<PlaceIcon />}>
            {marker ? `Position choisie : ${marker[0].toFixed(6)}, ${marker[1].toFixed(6)}` : "Clique sur la carte ou recherche un lieu pour placer le point de vente."}
          </Alert>

          <TextField
            fullWidth
            size="small"
            label="Situation géo / repère"
            value={situationGeo}
            onChange={(e) => setSituationGeo(e.target.value)}
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

export default function PointsVentePage() {
  const notifications = useNotifications();
  const [emplacements, setEmplacements] = React.useState([]);
  const [rows, setRows] = React.useState([]);
  const [form, setForm] = React.useState(emptyForm);
  const [openForm, setOpenForm] = React.useState(false);
  const [openMapPicker, setOpenMapPicker] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);

  const getCurrentEmplacementId = React.useCallback(() => {
    return emplacements[0]?.id || "";
  }, [emplacements]);

  const loadPointsVente = React.useCallback(async (emplacementId) => {
    if (!emplacementId) {
      setRows([]);
      return;
    }

    const res = await privateApi.get(`/api/points-vente/by-emplacement/${emplacementId}`);
    setRows(res.data || []);
  }, []);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const emplacementsRes = await privateApi.get("/api/emplacements/my");
      const nextEmplacements = emplacementsRes.data || [];
      setEmplacements(nextEmplacements);

      const nextEmplacementId = nextEmplacements[0]?.id || "";
      setForm((current) => ({ ...current, emplacementId: nextEmplacementId }));
      await loadPointsVente(nextEmplacementId);
    } catch (err) {
      const message = err.response?.data?.message || "Erreur lors du chargement des points de vente";
      setError(message);
      notifications.show(message, { severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [loadPointsVente, notifications]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = () => {
    setError(null);
    setEditingId(null);
    setForm({ ...emptyForm, emplacementId: getCurrentEmplacementId() });
    setOpenForm(true);
  };

  const handleEdit = (row) => {
    setError(null);
    setEditingId(row.id);
    setForm({
      nom: row.nom || "",
      code: row.code || "",
      phoneNumber: row.phoneNumber || "",
      situationGeo: row.situationGeo || "",
      latitude: row.latitude ?? null,
      longitude: row.longitude ?? null,
      emplacementId: getCurrentEmplacementId(),
    });
    setOpenForm(true);
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Supprimer le point de vente "${row.nom}" ?`)) return;
    setError(null);
    try {
      await privateApi.delete(`/api/points-vente/${row.id}`);
      notifications.show("Point de vente supprimé", { severity: "success" });
      await loadPointsVente(getCurrentEmplacementId());
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data || "Erreur lors de la suppression";
      const text = typeof message === "string" ? message : "Erreur lors de la suppression";
      setError(text);
      notifications.show(text, { severity: "error" });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const emplacementId = getCurrentEmplacementId();
      if (!emplacementId) {
        throw new Error("Aucun emplacement associé à votre compte");
      }

      const payload = {
        nom: form.nom,
        phoneNumber: form.phoneNumber,
        situationGeo: form.situationGeo,
        latitude: form.latitude,
        longitude: form.longitude,
        emplacementId: Number(emplacementId),
        actif: true,
      };

      if (editingId) {
        await privateApi.put(`/api/points-vente/${editingId}`, payload);
      } else {
        await privateApi.post("/api/points-vente", payload);
      }

      notifications.show(editingId ? "Point de vente modifié" : "Point de vente créé", { severity: "success" });
      setOpenForm(false);
      setEditingId(null);
      await loadPointsVente(emplacementId);
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data || "Erreur lors de la création";
      const text = typeof message === "string" ? message : "Erreur lors de la création";
      setError(text);
      notifications.show(text, { severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { field: "nom", headerName: "Nom", flex: 1.2 },
    {
      field: "phoneNumber",
      headerName: "Téléphone",
      flex: 0.8,
      valueFormatter: (value) => formatPhoneInputLocal(value || ""),
    },
    { field: "situationGeo", headerName: "Situation géo", flex: 1.4 },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 120,
      getActions: ({ row }) => [
        <GridActionsCellItem
          key="edit"
          icon={<EditIcon />}
          label="Modifier"
          onClick={() => handleEdit(row)}
          color="warning"
        />,
        <GridActionsCellItem
          key="delete"
          icon={<DeleteIcon />}
          label="Supprimer"
          onClick={() => handleDelete(row)}
          color="error"
        />,
      ],
    },
  ];

  return (
    <PageContainer title="Gestion des Points de vente">
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            sx={{ backgroundColor: "#4caf50", fontWeight: 700 }}
          >
            Nouveau Point de vente
          </Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData} disabled={loading}>
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
            disableRowSelectionOnClick
          />
        </Paper>
      </Stack>

      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>
          {editingId ? "✏️ Modifier Point de vente" : "➕ Nouveau Point de vente"}
        </DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Nom du point de vente *"
              required
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              margin="normal"
              autoFocus
            />

            <TextField
              fullWidth
              label="Téléphone"
              value={formatPhoneInputLocal(form.phoneNumber)}
              onChange={(e) => setForm({ ...form, phoneNumber: normalizePhoneInputLocal(e.target.value) })}
              placeholder="__-__-__-__-__"
              inputProps={{ inputMode: "tel", maxLength: 14 }}
              margin="normal"
            />

            <TextField
              fullWidth
              label="Situation géo"
              value={form.situationGeo}
              onChange={(e) => setForm({ ...form, situationGeo: e.target.value })}
              margin="normal"
              placeholder="Colle le lien GPS ou indique le repère"
              multiline
              minRows={2}
            />
            <Button
              variant="outlined"
              startIcon={<MapIcon />}
              onClick={() => setOpenMapPicker(true)}
              sx={{ mt: 1, fontWeight: 800 }}
            >
              Choisir sur la carte GPS
            </Button>
            {form.latitude && form.longitude && (
              <Alert severity="success" icon={<PlaceIcon />} sx={{ mt: 2 }}>
                GPS sélectionné : {Number(form.latitude).toFixed(6)}, {Number(form.longitude).toFixed(6)}
              </Alert>
            )}
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpenForm(false)}>Annuler</Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={saving ? null : <SaveIcon />}
              disabled={saving || !getCurrentEmplacementId()}
              sx={{ fontWeight: 800 }}
            >
              {saving ? "Enregistrement..." : editingId ? "Modifier" : "Enregistrer"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <PointVenteMapPickerDialog
        open={openMapPicker}
        value={form}
        onClose={() => setOpenMapPicker(false)}
        onConfirm={({ latitude, longitude, situationGeo }) => {
          setForm((current) => ({ ...current, latitude, longitude, situationGeo }));
          setOpenMapPicker(false);
        }}
      />
    </PageContainer>
  );
}
