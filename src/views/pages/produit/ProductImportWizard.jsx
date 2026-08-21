import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PageContainer from "../../../crud-dashboard/components/PageContainer";
import useNotifications from "../../../crud-dashboard/hooks/useNotifications/useNotifications";
import { analyzeProduitsImport, confirmProduitsImport, validateProduitsImport } from "../../../api/importProduitsApi";

const FIELD_OPTIONS = [
  { value: "IGNORE", label: "Ignorer cette colonne" },
  { value: "designation", label: "Désignation" },
  { value: "marque", label: "Marque" },
  { value: "format", label: "Format" },
  { value: "groupeLiquide", label: "Groupe liquide" },
  { value: "nbreBouteillesParCasier", label: "Bouteilles par casier" },
  { value: "prixAchatHt", label: "Prix achat" },
  { value: "prixVenteHt", label: "Prix vente" },
  { value: "consigneBouteille", label: "Consigne bouteille" },
  { value: "consigneCasier", label: "Consigne casier" },
  { value: "coutCasierNeuf", label: "Coût casier neuf" },
  { value: "stockInitial", label: "Stock plein initial" },
  { value: "stockVideInitial", label: "Stock vide initial" },
  { value: "stockMinimum", label: "Stock minimum" },
];

const DEFAULT_VALUES = {
  groupeLiquide: "AUTRE",
  nbreBouteillesParCasier: "12",
  prixAchatHt: "0",
  consigneBouteille: "0",
  consigneCasier: "0",
  coutCasierNeuf: "0",
  stockInitial: "0",
  stockVideInitial: "0",
  stockMinimum: "0",
};

export default function ProductImportWizard() {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const [activeStep, setActiveStep] = React.useState(0);
  const [file, setFile] = React.useState(null);
  const [analysis, setAnalysis] = React.useState(null);
  const [mapping, setMapping] = React.useState({});
  const [defaultValues, setDefaultValues] = React.useState(DEFAULT_VALUES);
  const [duplicateStrategy, setDuplicateStrategy] = React.useState("UPDATE");
  const [validation, setValidation] = React.useState(null);
  const [result, setResult] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const analyze = async () => {
    if (!file) {
      setError("Veuillez choisir un fichier CSV.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await analyzeProduitsImport(file);
      setAnalysis(data);
      setMapping(data.suggestedMapping || {});
      setActiveStep(1);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || "Impossible d'analyser le fichier.");
    } finally {
      setLoading(false);
    }
  };

  const validate = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await validateProduitsImport({
        importId: analysis.importId,
        mapping,
        defaultValues,
        duplicateStrategy,
      });
      setValidation(data);
      setActiveStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || "Impossible de valider l'import.");
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await confirmProduitsImport({
        importId: analysis.importId,
        mapping,
        defaultValues,
        duplicateStrategy,
      });
      setResult(data);
      setActiveStep(3);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || "Impossible de confirmer l'import.");
    } finally {
      setLoading(false);
    }
  };

  const renderPreviewTable = (rows = [], columns = []) => (
    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 360 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {columns.map((column) => <TableCell key={column}>{column}</TableCell>)}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={index}>
              {columns.map((column) => <TableCell key={column}>{row[column]}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <PageContainer
      title="Importer plusieurs produits"
      breadcrumbs={[{ title: "Produits", path: "/accueil/produits" }, { title: "Import" }]}
    >
      <Card>
        <CardContent>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {['Fichier', 'Correspondance', 'Validation', 'Résultat'].map((label) => (
              <Step key={label}><StepLabel>{label}</StepLabel></Step>
            ))}
          </Stepper>

          {loading && <LinearProgress sx={{ mb: 2 }} />}
          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

          {activeStep === 0 && (
            <Stack spacing={3}>
              <Alert severity="info">
                Importez votre fichier tel qu'il est. DepotManager reconnaît les colonnes, puis vous confirmez les correspondances avant l'import réel. Première version: CSV.
              </Alert>
              <Button component="label" variant="outlined" startIcon={<UploadFileIcon />} sx={{ alignSelf: "flex-start" }}>
                Choisir un fichier CSV
                <input hidden type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </Button>
              {file && <Typography>Fichier choisi : <strong>{file.name}</strong></Typography>}
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button onClick={() => navigate('/accueil/produits')}>Annuler</Button>
                <Button variant="contained" onClick={analyze} disabled={loading || !file}>Analyser</Button>
              </Stack>
            </Stack>
          )}

          {activeStep === 1 && analysis && (
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6">Colonnes détectées</Typography>
                <Typography color="text.secondary">{analysis.totalRows} lignes détectées. Vérifiez les correspondances.</Typography>
              </Box>

              <Grid container spacing={2}>
                {analysis.columns.map((column) => (
                  <Grid item xs={12} md={6} key={column}>
                    <TextField
                      select
                      fullWidth
                      label={column}
                      value={mapping[column] || "IGNORE"}
                      onChange={(e) => setMapping((prev) => ({ ...prev, [column]: e.target.value }))}
                    >
                      {FIELD_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                    </TextField>
                  </Grid>
                ))}
              </Grid>

              <Divider />
              <Typography variant="h6">Valeurs par défaut si une colonne manque</Typography>
              <Grid container spacing={2}>
                {Object.keys(DEFAULT_VALUES).map((field) => (
                  <Grid item xs={12} md={4} key={field}>
                    <TextField
                      fullWidth
                      size="small"
                      label={FIELD_OPTIONS.find((o) => o.value === field)?.label || field}
                      value={defaultValues[field] || ""}
                      onChange={(e) => setDefaultValues((prev) => ({ ...prev, [field]: e.target.value }))}
                    />
                  </Grid>
                ))}
              </Grid>

              <TextField
                select
                label="Gestion des doublons"
                value={duplicateStrategy}
                onChange={(e) => setDuplicateStrategy(e.target.value)}
                sx={{ maxWidth: 360 }}
              >
                <MenuItem value="UPDATE">Mettre à jour les produits existants</MenuItem>
                <MenuItem value="SKIP">Ignorer les doublons</MenuItem>
              </TextField>

              <Box>
                <Typography variant="h6" sx={{ mb: 1 }}>Aperçu du fichier</Typography>
                {renderPreviewTable(analysis.previewRows, analysis.columns)}
              </Box>

              <Stack direction="row" spacing={2} justifyContent="space-between">
                <Button onClick={() => setActiveStep(0)}>Retour</Button>
                <Button variant="contained" onClick={validate} disabled={loading}>Valider l'import</Button>
              </Stack>
            </Stack>
          )}

          {activeStep === 2 && validation && (
            <Stack spacing={3}>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip color="primary" label={`${validation.validRows} lignes valides`} />
                <Chip color={validation.errorRows ? "error" : "success"} label={`${validation.errorRows} lignes en erreur`} />
                <Chip label={`${validation.newMarques.length} marques à créer`} />
                <Chip label={`${validation.newFormats.length} formats à créer`} />
                <Chip label={`${validation.newGroupesLiquides.length} groupes à créer`} />
              </Stack>

              {(validation.newMarques.length > 0 || validation.newFormats.length > 0 || validation.newGroupesLiquides.length > 0) && (
                <Alert severity="info">
                  Référentiels créés à la confirmation : marques ({validation.newMarques.join(', ') || 'aucune'}), formats ({validation.newFormats.join(', ') || 'aucun'}), groupes ({validation.newGroupesLiquides.join(', ') || 'aucun'}).
                </Alert>
              )}

              {validation.errors.length > 0 && (
                <Alert severity="warning">
                  Certaines lignes seront ignorées si elles restent en erreur. Exemples: {validation.errors.slice(0, 5).map((e) => `Ligne ${e.rowNumber}: ${e.message}`).join(' | ')}
                </Alert>
              )}

              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 360 }}>
                <Table size="small" stickyHeader>
                  <TableHead><TableRow><TableCell>Désignation</TableCell><TableCell>Marque</TableCell><TableCell>Format</TableCell><TableCell>Prix vente</TableCell><TableCell>Erreurs</TableCell></TableRow></TableHead>
                  <TableBody>
                    {validation.previewRows.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{row.designation}</TableCell>
                        <TableCell>{row.marque}</TableCell>
                        <TableCell>{row.format}</TableCell>
                        <TableCell>{row.prixVenteHt}</TableCell>
                        <TableCell>{(row.errors || []).join(', ')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Stack direction="row" spacing={2} justifyContent="space-between">
                <Button onClick={() => setActiveStep(1)}>Corriger le mapping</Button>
                <Button variant="contained" color="success" onClick={confirm} disabled={loading || validation.validRows === 0}>Confirmer l'import</Button>
              </Stack>
            </Stack>
          )}

          {activeStep === 3 && result && (
            <Stack spacing={3}>
              <Alert severity={result.errors ? "warning" : "success"}>Import terminé.</Alert>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}><Chip color="success" label={`${result.created} créés`} /></Grid>
                <Grid item xs={6} md={3}><Chip color="primary" label={`${result.updated} mis à jour`} /></Grid>
                <Grid item xs={6} md={3}><Chip label={`${result.skipped} ignorés`} /></Grid>
                <Grid item xs={6} md={3}><Chip color={result.errors ? "error" : "default"} label={`${result.errors} erreurs`} /></Grid>
              </Grid>
              {result.rowErrors?.length > 0 && <Alert severity="warning">{result.rowErrors.slice(0, 10).map((e) => `Ligne ${e.rowNumber}: ${e.message}`).join(' | ')}</Alert>}
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button onClick={() => navigate('/accueil/produits')}>Voir les produits</Button>
                <Button variant="contained" onClick={() => window.location.reload()}>Importer un autre fichier</Button>
              </Stack>
            </Stack>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
