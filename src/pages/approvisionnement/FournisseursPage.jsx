import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Alert,
  IconButton,
  Chip,
  InputAdornment,
  Stack,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add, Edit, Delete, Wallet, Map, MyLocation, Place, Search } from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { privateApi } from '../../api/axios';
import { getUserCountry } from '../../config/countries';
import { formatPhoneInput } from '../../utils/phoneUtils';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const TYPE_FOURNISSEUR = {
  BRASSERIE: 'BRASSERIE',
  GROSSISTE: 'GROSSISTE',
  DISTRIBUTEUR: 'DISTRIBUTEUR',
  AUTRE: 'AUTRE'
};

const _fournUserCountry = getUserCountry();
const DEFAULT_MAP_CENTER = _fournUserCountry.mapCenter;

const formatPhoneInputLocal = (value = '') =>
  formatPhoneInput(value, _fournUserCountry.code);

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

function FournisseurMapPickerDialog({ open, value, onClose, onConfirm }) {
  const [center, setCenter] = React.useState(DEFAULT_MAP_CENTER);
  const [marker, setMarker] = React.useState(null);
  const [address, setAddress] = React.useState(value?.adresse || '');
  const [searchText, setSearchText] = React.useState(value?.adresse || '');
  const [searchResults, setSearchResults] = React.useState([]);
  const [searching, setSearching] = React.useState(false);
  const [locating, setLocating] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setCenter(DEFAULT_MAP_CENTER);
    setMarker(null);
    setAddress(value?.adresse || '');
    setSearchText(value?.adresse || '');
    setSearchResults([]);
  }, [open, value?.adresse]);

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

  const pickPosition = (latitude, longitude, nextAddress = '') => {
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

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 900 }}>Choisir la position du fournisseur</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              fullWidth
              size="small"
              label="Rechercher un lieu ou quartier"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
              }}
            />
            <Button
              variant="contained"
              startIcon={searching ? <CircularProgress size={16} color="inherit" /> : <Search />}
              onClick={handleSearch}
              disabled={searching}
              sx={{ minWidth: 120 }}
            >
              Rechercher
            </Button>
            <Button
              variant="outlined"
              startIcon={locating ? <CircularProgress size={16} /> : <MyLocation />}
              onClick={handleLocateMe}
              disabled={locating}
              sx={{ minWidth: 130 }}
            >
              Ma position
            </Button>
          </Stack>

          {searchResults.length > 0 && (
            <Paper variant="outlined" sx={{ maxHeight: 170, overflow: 'auto' }}>
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

          <Box sx={{ height: { xs: 340, sm: 430 }, borderRadius: 1, overflow: 'hidden', border: '1px solid #ddd' }}>
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapRecenter center={center} zoom={marker ? 16 : 13} />
              <MapClickHandler onPick={pickPosition} />
              {marker && (
                <Marker position={marker}>
                  <Popup>Position du fournisseur</Popup>
                </Marker>
              )}
            </MapContainer>
          </Box>

          <Alert severity={marker ? 'success' : 'info'} icon={<Place />}>
            {marker
              ? `Position choisie : ${marker[0].toFixed(6)}, ${marker[1].toFixed(6)}`
              : 'Cliquez sur la carte ou recherchez un lieu pour placer le fournisseur.'}
          </Alert>

          <TextField
            fullWidth
            size="small"
            label="Adresse / repère"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ex: Zone industrielle, près du dépôt..."
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" onClick={() => onConfirm(address)} disabled={!address.trim() && !marker}>
          Utiliser cette position
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const FournisseursPage = () => {
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openMapPicker, setOpenMapPicker] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentFournisseur, setCurrentFournisseur] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // États pour le dépôt de fonds
  const [openDepotDialog, setOpenDepotDialog] = useState(false);
  const [selectedFournisseur, setSelectedFournisseur] = useState(null);
  const [depotMontant, setDepotMontant] = useState('');
  const [depotCommentaire, setDepotCommentaire] = useState('');

  const [formData, setFormData] = useState({
    raisonsociale: '',
    telephone: '',
    email: '',
    adresse: '',
    type: TYPE_FOURNISSEUR.GROSSISTE,
    notes: '',
    actif: true
  });

  useEffect(() => {
    loadFournisseurs();
  }, []);

  const loadFournisseurs = async () => {
    try {
      setLoading(true);
      const response = await privateApi.get('/api/fournisseurs', {
        params: { page: 0, size: 100 }
      });
      setFournisseurs(response.data.content || []);
    } catch (err) {
      setError('Erreur lors du chargement des fournisseurs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (fournisseur = null) => {
    if (fournisseur) {
      setEditMode(true);
      setCurrentFournisseur(fournisseur);
      setFormData({
        raisonsociale: fournisseur.raisonsociale,
        telephone: fournisseur.telephone,
        email: fournisseur.email || '',
        adresse: fournisseur.adresse || '',
        type: fournisseur.type,
        notes: fournisseur.notes || '',
        actif: fournisseur.actif
      });
    } else {
      setEditMode(false);
      setCurrentFournisseur(null);
      setFormData({
        raisonsociale: '',
        telephone: '',
        email: '',
        adresse: '',
        type: TYPE_FOURNISSEUR.GROSSISTE,
        notes: '',
        actif: true
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'telephone' ? formatPhoneInputLocal(value) : value
    }));
  };

  const handleSubmit = async () => {
    try {
      setError('');
      
      if (!formData.raisonsociale || !formData.telephone) {
        setError('La raison sociale et le téléphone sont obligatoires');
        return;
      }

      if (editMode && currentFournisseur) {
        await privateApi.put(`/api/fournisseurs/${currentFournisseur.id}`, formData);
        setSuccess('Fournisseur modifié avec succès');
      } else {
        await privateApi.post('/api/fournisseurs', formData);
        setSuccess('Fournisseur créé avec succès');
      }

      handleCloseDialog();
      loadFournisseurs();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Voulez-vous vraiment désactiver ce fournisseur ?')) {
      return;
    }

    try {
      await privateApi.delete(`/api/fournisseurs/${id}`);
      setSuccess('Fournisseur désactivé avec succès');
      loadFournisseurs();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Erreur lors de la suppression');
      console.error(err);
    }
  };

  // Ouvrir le dialog de dépôt de fonds
  const handleOpenDepotDialog = (fournisseur) => {
    setSelectedFournisseur(fournisseur);
    setDepotMontant('');
    setDepotCommentaire('');
    setOpenDepotDialog(true);
  };

  // Fermer le dialog de dépôt
  const handleCloseDepotDialog = () => {
    setOpenDepotDialog(false);
    setSelectedFournisseur(null);
  };

  // Effectuer le dépôt de fonds
  const handleDepotFonds = async () => {
    if (!depotMontant || depotMontant <= 0) {
      setError('Le montant à déposer est requis et doit être positif');
      return;
    }

    try {
      await privateApi.post(`/api/fournisseurs/${selectedFournisseur.id}/deposer`, {
        montant: depotMontant,
        commentaire: depotCommentaire
      });
      
      setSuccess(`Dépôt de ${Number(depotMontant).toLocaleString("fr-CI")} F effectué avec succès`);
      handleCloseDepotDialog();
      loadFournisseurs();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du dépôt');
      console.error(err);
    }
  };

  const columns = [
    {
      field: 'raisonsociale',
      headerName: 'Raison sociale',
      flex: 1,
      minWidth: 200
    },
    {
      field: 'telephone',
      headerName: 'Téléphone',
      width: 130
    },
    {
      field: 'email',
      headerName: 'Email',
      width: 180
    },
    {
      field: 'solde',
      headerName: 'Solde',
      width: 120,
      renderCell: (params) => (
        <Typography
          sx={{
            fontWeight: 700,
            color: params.value > 0 ? "#388e3c" : "#666"
          }}
        >
          {params.value?.toLocaleString("fr-CI") || 0} F
        </Typography>
      )
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color="primary"
          variant="outlined"
        />
      )
    },
    {
      field: 'actif',
      headerName: 'Statut',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Actif' : 'Inactif'}
          size="small"
          color={params.value ? 'success' : 'default'}
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            color="primary"
            onClick={() => handleOpenDepotDialog(params.row)}
            title="Déposer des fonds"
          >
            <Wallet />
          </IconButton>
          <IconButton
            size="small"
            color="primary"
            onClick={() => handleOpenDialog(params.row)}
          >
            <Edit />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDelete(params.row.id)}
            disabled={!params.row.actif}
          >
            <Delete />
          </IconButton>
        </Box>
      )
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Fournisseurs
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Nouveau Fournisseur
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Paper>
        <DataGrid
          rows={fournisseurs}
          columns={columns}
          loading={loading}
          autoHeight
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          disableSelectionOnClick
          sx={{ border: 'none' }}
        />
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editMode ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Raison sociale *"
            name="raisonsociale"
            value={formData.raisonsociale}
            onChange={handleChange}
            margin="normal"
          />

          <TextField
            fullWidth
            label="Téléphone *"
            name="telephone"
            value={formData.telephone}
            onChange={handleChange}
            margin="normal"
            placeholder="00-00-00-00-00"
            inputProps={{ inputMode: 'numeric', maxLength: 14 }}
          />

          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            margin="normal"
          />

          <Stack spacing={1.25} sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
              Localisation du fournisseur
            </Typography>

            <Button
              variant="contained"
              startIcon={<Map />}
              onClick={() => setOpenMapPicker(true)}
              sx={{ alignSelf: 'flex-start', fontWeight: 800, minWidth: 190 }}
            >
              Choisir sur la carte
            </Button>

            <Alert severity={formData.adresse ? 'success' : 'info'} icon={<Place />}>
              {formData.adresse || 'Aucune adresse/position enregistrée pour ce fournisseur.'}
            </Alert>

            <TextField
              fullWidth
              label="Adresse / repère"
              name="adresse"
              value={formData.adresse}
              onChange={handleChange}
              margin="normal"
              placeholder="Ex: Zone industrielle, près du dépôt..."
              helperText="Repère lisible. Utilisez le bouton carte pour rechercher ou choisir la position."
            />
          </Stack>

          <TextField
            fullWidth
            select
            label="Type *"
            name="type"
            value={formData.type}
            onChange={handleChange}
            margin="normal"
          >
            {Object.values(TYPE_FOURNISSEUR).map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            label="Notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            margin="normal"
            variant="filled" // Ou variant="standard"
            rows={3}
          />

          {editMode && (
            <TextField
              fullWidth
              select
              label="Statut"
              name="actif"
              value={formData.actif}
              onChange={(e) => setFormData(prev => ({ ...prev, actif: e.target.value === 'true' }))}
              margin="normal"
            >
              <MenuItem value={true}>Actif</MenuItem>
              <MenuItem value={false}>Inactif</MenuItem>
            </TextField>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editMode ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      <FournisseurMapPickerDialog
        open={openMapPicker}
        value={{ adresse: formData.adresse }}
        onClose={() => setOpenMapPicker(false)}
        onConfirm={(adresse) => {
          setFormData(prev => ({
            ...prev,
            adresse: adresse || prev.adresse
          }));
          setOpenMapPicker(false);
        }}
      />

      {/* ===== DIALOG DÉPÔT FONDS ===== */}
      <Dialog open={openDepotDialog} onClose={handleCloseDepotDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>
          Dépôt chez {selectedFournisseur?.raisonsociale || 'Fournisseur'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Montant à déposer *"
            type="number"
            value={depotMontant}
            onChange={(e) => setDepotMontant(e.target.value)}
            margin="normal"
            InputProps={{
              endAdornment: <InputAdornment position="end">F</InputAdornment>
            }}
            inputProps={{ min: 0, step: 100 }}
            autoFocus
          />

          <TextField
            fullWidth
            label="Commentaire"
            value={depotCommentaire}
            onChange={(e) => setDepotCommentaire(e.target.value)}
            margin="normal"
            placeholder="Motif du dépôt..."
          />

          {selectedFournisseur?.solde !== undefined && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Solde actuel : <strong>{selectedFournisseur.solde?.toLocaleString("fr-CI") || 0} F</strong>
              </Typography>
              {depotMontant && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Nouveau solde : <strong>{(Number(selectedFournisseur.solde || 0) + Number(depotMontant)).toLocaleString("fr-CI")} F</strong>
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDepotDialog}>Annuler</Button>
          <Button 
            onClick={handleDepotFonds} 
            variant="contained" 
            color="primary"
            disabled={!depotMontant || depotMontant <= 0}
          >
            Déposer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FournisseursPage;
