import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, IconButton, Chip, Stack,
  CircularProgress, Tooltip, MenuItem, Switch, FormControlLabel
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add, Edit, Delete, AttachMoney, ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { tarifApi, countryConfigApi } from '../../../api/configApi';

const TYPES = ['BAR', 'MAQUIS', 'SOUS_DEPOT'];

const EMPTY_FORM = {
  type: 'BAR',
  pays: 'CI',
  prixMensuel: '',
  reductionAnnuellePct: '17.00',
  description: '',
  actif: true,
};

function formatMontant(val) {
  if (!val) return '—';
  return Number(val).toLocaleString('fr-FR') + ' FCFA';
}

export default function TarifConfigPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterPays, setFilterPays] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tarifsRes, countriesRes] = await Promise.all([
        tarifApi.getAll(),
        countryConfigApi.getActive(),
      ]);
      setRows(tarifsRes.data);
      setCountries(countriesRes.data);
    } catch (e) {
      console.error('Erreur chargement tarifs:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const getCountryFlag = (pays) => {
    const c = countries.find((c) => c.code === pays);
    return c ? c.flag : '';
  };

  const getCountryName = (pays) => {
    const c = countries.find((c) => c.code === pays);
    return c ? c.name : pays;
  };

  const openCreate = () => {
    setEditingRow(null);
    setForm({ ...EMPTY_FORM });
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditingRow(row);
    setForm({
      type: row.type || 'BAR',
      pays: row.pays || 'CI',
      prixMensuel: row.prixMensuel || '',
      reductionAnnuellePct: row.reductionAnnuellePct || '17.00',
      description: row.description || '',
      actif: row.actif !== false,
    });
    setError('');
    setDialogOpen(true);
  };

  const handleField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const computedAnnuel = () => {
    const mensuel = Number(form.prixMensuel) || 0;
    const reduction = Number(form.reductionAnnuellePct) || 0;
    const raw = mensuel * 12;
    const annuel = raw * (1 - reduction / 100);
    return Math.round(annuel);
  };

  const handleSave = async () => {
    setError('');
    if (!form.type) { setError('Le type est requis'); return; }
    if (!form.prixMensuel || Number(form.prixMensuel) <= 0) {
      setError('Le prix mensuel doit être supérieur à 0');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        pays: form.pays.toUpperCase(),
        type: form.type.toUpperCase(),
        prixMensuel: Number(form.prixMensuel),
        reductionAnnuellePct: Number(form.reductionAnnuellePct) || 17,
        prixAnnuel: computedAnnuel(),
      };

      if (editingRow) {
        await tarifApi.update(editingRow.id, payload);
      } else {
        await tarifApi.create(payload);
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
    if (!window.confirm(`Désactiver le tarif ${row.type} — ${row.pays} ?`)) return;
    try {
      await tarifApi.delete(row.id);
      load();
    } catch (e) {
      alert('Erreur: ' + (e.response?.data?.error || e.message));
    }
  };

  const filteredRows = rows.filter((r) => {
    if (filterPays && r.pays !== filterPays) return false;
    if (search) {
      const q = search.toLowerCase();
      return [r.type, r.pays, r.description, getCountryName(r.pays)]
        .some((v) => (v || '').toLowerCase().includes(q));
    }
    return true;
  });

  const columns = [
    {
      field: 'flag',
      headerName: '',
      width: 50,
      renderCell: (p) => {
        const pays = p.row.pays;
        return <span style={{ fontSize: 22 }}>{getCountryFlag(pays)}</span>;
      },
    },
    { field: 'type', headerName: 'Type', width: 130, renderCell: (p) => (
      <Chip label={p.value} color="primary" variant="outlined" size="small" />
    )},
    { field: 'pays', headerName: 'Pays', width: 130, renderCell: (p) => (
      <span>{getCountryFlag(p.value)} {getCountryName(p.value)}</span>
    )},
    { field: 'prixMensuel', headerName: 'Prix mensuel', width: 140, renderCell: (p) => (
      <Typography fontWeight={600}>{formatMontant(p.value)}</Typography>
    )},
    { field: 'reductionAnnuellePct', headerName: 'Réduc. annuelle', width: 130, renderCell: (p) => (
      <span>{p.value}%</span>
    )},
    {
      field: 'prixAnnuel',
      headerName: 'Prix annuel (calculé)',
      width: 170,
      renderCell: (p) => {
        if (!p.row.prixAnnuel && p.row.prixMensuel) {
          return <span style={{ color: '#888' }}>{formatMontant(p.row.prixMensuel * 12 * (1 - (p.row.reductionAnnuellePct || 17) / 100))}</span>;
        }
        return <span style={{ color: '#1976d2' }}>{formatMontant(p.value)}</span>;
      },
    },
    { field: 'description', headerName: 'Description', flex: 1, minWidth: 150 },
    {
      field: 'actif',
      headerName: 'Actif',
      width: 70,
      renderCell: (p) => (
        <Chip label={p.value ? 'Oui' : 'Non'} color={p.value ? 'success' : 'default'} size="small" />
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
        <AttachMoney color="primary" />
        <Typography variant="h5" fontWeight={700}>
          Tarifs d'Abonnement
        </Typography>
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <TextField
            size="small"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          <TextField
            size="small"
            select
            label="Pays"
            value={filterPays}
            onChange={(e) => setFilterPays(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Tous les pays</MenuItem>
            {countries.map((c) => (
              <MenuItem key={c.code} value={c.code}>
                {c.flag} {c.name}
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ flex: 1 }} />
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
            Ajouter un tarif
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ height: 500 }}>
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRow ? `Modifier: ${editingRow.type} — ${editingRow.pays}` : 'Ajouter un tarif'}
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Type d'abonnement"
              value={form.type}
              onChange={(e) => handleField('type', e.target.value)}
              required
              size="small"
            >
              {TYPES.map((t) => (
                <MenuItem key={t} value={t}>{t.replace('_', ' ')}</MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Pays"
              value={form.pays}
              onChange={(e) => handleField('pays', e.target.value)}
              required
              size="small"
            >
              {countries.map((c) => (
                <MenuItem key={c.code} value={c.code}>
                  {c.flag} {c.name} ({c.code})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Prix mensuel (FCFA)"
              type="number"
              value={form.prixMensuel}
              onChange={(e) => handleField('prixMensuel', e.target.value)}
              required
              size="small"
              inputProps={{ min: 0, step: 1000 }}
            />

            <TextField
              label="Réduction annuelle (%)"
              type="number"
              value={form.reductionAnnuellePct}
              onChange={(e) => handleField('reductionAnnuellePct', e.target.value)}
              size="small"
              inputProps={{ min: 0, max: 100, step: 0.5 }}
            />

            {form.prixMensuel > 0 && (
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#f5f5f5' }}>
                <Typography variant="body2" color="text.secondary">
                  Mensuel: <b>{Number(form.prixMensuel).toLocaleString('fr-FR')} FCFA</b>
                  {' — '}
                  Annuel: <b style={{ color: '#1976d2' }}>{computedAnnuel().toLocaleString('fr-FR')} FCFA</b>
                  {' '}({form.reductionAnnuellePct || 17}% réduction)
                </Typography>
              </Paper>
            )}

            <TextField
              label="Description"
              multiline
              rows={2}
              value={form.description}
              onChange={(e) => handleField('description', e.target.value)}
              size="small"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={form.actif}
                  onChange={(e) => handleField('actif', e.target.checked)}
                />
              }
              label="Actif"
            />
          </Stack>
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
