import React from "react";
import {
  Card,
  CardContent,
  Grid,
  Paper,
  Typography,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import { formatCurrency } from "../../../utils/currencyUtils";

const formatAmount = (v) => formatCurrency(v);

export default function ResumeDuJour({ resume, canSeeBenefice }) {
  return (
    <>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 1.5, borderRadius: 2 }} variant="outlined">
                <Typography variant="caption" color="text.secondary">
                  Ventes
                </Typography>
                <Typography variant="h6">
                  {formatAmount(resume?.totalVente)}
                </Typography>
              </Paper>
            </Grid>
            {canSeeBenefice && (
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 1.5, borderRadius: 2 }} variant="outlined">
                  <Typography variant="caption" color="text.secondary">
                    Bénéfice
                  </Typography>
                  <Typography variant="h6">
                    {formatAmount(resume?.benefice)}
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} mb={1}>
            Lignes du jour
          </Typography>
          <Divider sx={{ mb: 1 }} />
          {resume?.lignes && resume.lignes.length ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Heure</TableCell>
                  <TableCell>Produit</TableCell>
                  <TableCell align="right">Qté</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resume.lignes.map((l, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{l.heure}</TableCell>
                    <TableCell>{l.produitNom}</TableCell>
                    <TableCell align="right">{l.quantite}</TableCell>
                    <TableCell align="right">
                      {formatAmount(l.totalLigne)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Aucune vente enregistrée aujourd'hui.
            </Typography>
          )}
        </CardContent>
      </Card>
    </>
  );
}
