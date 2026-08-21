import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
} from "@mui/material";
import { RefreshCw, Package } from "lucide-react";
import { privateApi } from "../api/axios";
import { formatCurrency } from "../utils/currencyUtils";

const formatF = (n) => formatCurrency(n);

export default function EmballageTracker() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await privateApi.get("/api/emballages/resume");
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <Paper sx={{ p: 3, borderRadius: 2, textAlign: "center" }}>
        <CircularProgress size={24} />
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2.5, borderRadius: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Package size={20} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Suivi des emballages
          </Typography>
        </Box>
        <IconButton size="small" onClick={fetchData} disabled={loading}>
          <RefreshCw size={16} />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {data && (
        <>
          {/* Cartes résumé */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
              gap: 1.5,
              mb: 2.5,
            }}
          >
            <Paper sx={{ p: 2, bgcolor: "#e8f5e8", textAlign: "center" }}>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                Solde caisse
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#2e7d32" }}>
                {formatF(data.soldeCaisse)}
              </Typography>
            </Paper>

            <Paper sx={{ p: 2, bgcolor: "#fff3e0", textAlign: "center" }}>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                Valeur emballages manquants
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#e65100" }}>
                {formatF(data.totalValeurManquante)}
              </Typography>
            </Paper>

            <Paper sx={{ p: 2, bgcolor: "#e3f2fd", textAlign: "center" }}>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                Trésorerie réelle
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: data.tresorerieReelle >= 0 ? "#1565c0" : "#c62828",
                }}
              >
                {formatF(data.tresorerieReelle)}
              </Typography>
            </Paper>
          </Box>

          {/* Tableau des casiers */}
          {data.details && data.details.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Type casier</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Sortis</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Vides dispo</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Manquants</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Valeur</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.details.map((row) => (
                    <TableRow key={row.casier_id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {row.casier}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">{row.casiers_sortis}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={row.stock_vides_disponibles}
                          size="small"
                          color={row.stock_vides_disponibles > 0 ? "success" : "default"}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        {row.casiers_manquants > 0 ? (
                          <Chip
                            label={row.casiers_manquants}
                            size="small"
                            color="warning"
                          />
                        ) : (
                          <Chip label="0" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {formatF(row.valeur_manquante)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="success" icon={<Package size={18} />}>
              Aucun emballage manquant. Tous les casiers sont équilibrés.
            </Alert>
          )}
        </>
      )}
    </Paper>
  );
}
