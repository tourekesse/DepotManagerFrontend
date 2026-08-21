import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, IconButton, Chip, Stack,
  CircularProgress, Tooltip, Switch, FormControlLabel
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add, Edit, Delete, Public, ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { countryConfigApi } from '../../../api/configApi';

const EMPTY_FORM = {
  code: '', name: '', dialCode: '', phoneDigits: '',
  phoneMask: '', phoneExample: '', phonePrefixes: '',
  currency: 'XOF', currencySymbol: 'FCFA', locale: 'fr-',
  mapCenterLat: '', mapCenterLng: '', mapCity: '',
  mobileOperators: '', pawapayCountry: '', pawapayCorrespondents: '',
  flag: '', actif: true,
};

const FIELD_CONFIG = [
  { key: 'code', label: 'Code pays', type: 'text', required: true, col: 4, hint: '2-5 lettres: CI, SN, BJ...' },
  { key: 'name', label: 'Nom du pays', type: 'text', required: true, col: 8 },
  { key: 'dialCode', label: 'Indicatif téléphonique', type: 'text', required: true, col: 4, hint: '+225, +221...' },
  { key: 'phoneDigits', label: 'Nombre de chiffres', type: 'number', required: true, col: 4 },
  { key: 'phoneMask', label: 'Masque téléphone', type: 'text', required: true, col: 4, hint: '99 99 99 99 99' },
  { key: 'phoneExample', label: 'Exemple numéro', type: 'text', required: true, col: 6 },
  { key: 'phonePrefixes', label: 'Préfixes mobiles', type: 'text', col: 6, hint: 'JSON: ["07","01","05"]' },
  { key: 'currency', label: 'Devise', type: 'text', required: true, col: 3 },
  { key: 'currencySymbol', label: 'Symbole devise', type: 'text', required: true, col: 3 },
  { key: 'locale', label: 'Locale', type: 'text', required: true, col: 3, hint: 'fr-CI' },
  { key: 'flag', label: 'Drapeau emoji', type: 'text', required: true, col: 3, hint: '🇨🇮' },
  { key: 'mapCenterLat', label: 'Latitude centre', type: 'number', required: true, col: 3 },
  { key: 'mapCenterLng', label: 'Longitude centre', type: 'number', required: true, col: 3 },
  { key: 'mapCity', label: 'Capitale/Ville principale', type: 'text', col: 6 },
  { key: 'mobileOperators', label: 'Opérateurs mobiles', type: 'text', col: 6, hint: 'JSON: ["Orange","MTN","Moov"]' },
  { key: 'pawapayCountry', label: 'Code PawaPay', type: 'text', col: 4, hint: 'CIV, SEN, BEN' },
  { key: 'pawapayCorrespondents', label: 'Correspondants PawaPay', type: 'text', col: 8, hint: 'JSON: ["MTN_MOMO_CIV","ORANGE_CIV"]' },
];

export default function CountryConfigPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await countryConfigApi.getAll();
      setRows(res.data);
    } catch (e) {
      console.error('Erreur chargement pays:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingRow(null);
    setForm({ ...EMPTY_FORM });
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditingRow(row);
    setForm({
      code: row.code || '',
      name: row.name || '',
      dialCode: row.dialCode || '',
      phoneDigits: row.phoneDigits || '',
      phoneMask: row.phoneMask || '',
      phoneExample: row.phoneExample || '',
      phonePrefixes: row.phonePrefixes || '',
      currency: row.currency || 'XOF',
      currencySymbol: row.currencySymbol || 'FCFA',
      locale: row.locale || 'fr-',
      mapCenterLat: row.mapCenterLat ?? '',
      mapCenterLng: row.mapCenterLng ?? '',
      mapCity: row.mapCity || '',
      mobileOperators: row.mobileOperators || '',
      pawapayCountry: row.pawapayCountry || '',
      pawapayCorrespondents: row.pawapayCorrespondents || '',
      flag: row.flag || '',
      actif: row.actif !== false,
    });
    setError('');
    setDialogOpen(true);
  };

  const handleField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setError('');
    const requiredFields = FIELD_CONFIG.filter((f) => f.required);
    const missing = requiredFields.filter((f) => !form[f.key] && form[f.key] !== 0);
    if (missing.length > 0) {
      setError('Champs requis manquants: ' + missing.map((f) => f.label).join(', '));
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.phoneDigits) payload.phoneDigits = Number(payload.phoneDigits);
      if (payload.mapCenterLat) payload.mapCenterLat = Number(payload.mapCenterLat);
      if (payload.mapCenterLng) payload.mapCenterLng = Number(payload.mapCenterLng);

      if (editingRow) {
        await countryConfigApi.update(editingRow.id, payload);
      } else {
        await countryConfigApi.create(payload);
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Désactiver le pays "${row.name}" (${row.code}) ?`)) return;
    try {
      await countryConfigApi.delete(row.id);
      load();
    } catch (e) {
      alert('Erreur: ' + (e.response?.data?.error || e.message));
    }
  };

  const filteredRows = search
    ? rows.filter((r) =>
        [r.code, r.name, r.currency, r.pawapayCountry, r.locale]
          .some((v) => (v || '').toLowerCase().includes(search.toLowerCase()))
      )
    : rows;

  const columns = [
    {
      field: 'flag',
      headerName: '',
      width: 50,
      renderCell: (p) => <span style={{ fontSize: 24 }}>{p.value}</span>,
    },
    { field: 'code', headerName: 'Code', width: 80, fontWeight: 'bold' },
    { field: 'name', headerName: 'Pays', flex: 1, minWidth: 150 },
    { field: 'dialCode', headerName: 'Tél', width: 90 },
    { field: 'phoneDigits', headerName: 'Chiffres', width: 80 },
    { field: 'currency', headerName: 'Devise', width: 80 },
    { field: 'locale', headerName: 'Locale', width: 80 },
    { field: 'mapCity', headerName: 'Ville', width: 120 },
    { field: 'pawapayCountry', headerName: 'PawaPay', width: 90 },
    {
      field: 'actif',
      headerName: 'Actif',
      width: 70,
      renderCell: (p) => (
        <Chip
          label={p.value ? 'Oui' : 'Non'}
          color={p.value ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Modifier">
            <IconButton size="small" onClick={() => openEdit(p.row)}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Désactiver">
            <IconButton size="small" color="error" onClick={() => handleDelete(p.row)}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, maxWidth: 1200, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={() => navigate('/accueil')}>
          <ArrowBack />
        </IconButton>
        <Public color="primary" />
        <Typography variant="h5" fontWeight={700}>
          Configuration des Pays
        </Typography>
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <TextField
            size="small"
            placeholder="Rechercher un pays..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 250 }}
          />
          <Box sx={{ flex: 1 }} />
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
            Ajouter un pays
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ height: 600 }}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          loading={loading}
          pageSize={25}
          rowsPerPageOptions={[10, 25, 50]}
          disableColumnFilter
          sx={{ border: 0 }}
          getRowId={(r) => r.id}
        />
      </Paper>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        <DialogTitle>
          {editingRow ? `Modifier: ${editingRow.name}` : 'Ajouter un pays'}
        </DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: 2,
              mt: 1,
            }}
          >
            {FIELD_CONFIG.map((f) => (
              <Box key={f.key} sx={{ gridColumn: `span ${f.col}` }}>
                {f.key === 'actif' ? (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.actif}
                        onChange={(e) => handleField('actif', e.target.checked)}
                      />
                    }
                    label="Actif"
                  />
                ) : (
                  <TextField
                    fullWidth
                    size="small"
                    label={f.label}
                    type={f.type || 'text'}
                    value={form[f.key] ?? ''}
                    onChange={(e) => handleField(f.key, e.target.value)}
                    required={f.required}
                    placeholder={f.hint || ''}
                    inputProps={
                      f.type === 'number'
                        ? { step: f.key.includes('map') ? 'any' : '1' }
                        : {}
                    }
                  />
                )}
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : editingRow ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
