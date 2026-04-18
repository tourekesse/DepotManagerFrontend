import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, Grid, MenuItem } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { createProduit } from '../../../api/produitsApi';
import useNotifications from '../../../crud-dashboard/hooks/useNotifications/useNotifications';

const GROUPES_LIQUIDES = ['BIERE', 'GAZEUSE', 'EAU', 'VIN', 'ALCOOL', 'AUTRE'];

const INITIAL_VALUES = {
  designation: "",
  groupeLiquide: 'BIERE',
  nbreBouteillesParCasier: 12,
  prixVenteHt: 0,
  stockInitial: 0,
};

export default function BarProductCreateClassique() {
    const [values, setValues] = useState(INITIAL_VALUES);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const notifications = useNotifications();

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setValues((prev) => ({
            ...prev,
            [name]: type === "number" ? Number(value) : value,
        }));
        setErrors((prev) => ({ ...prev, [name]: null }));
    };

    const validate = () => {
        const required = ["designation", "groupeLiquide", "prixVenteHt", "stockInitial"];
        const newErrors = {};
        required.forEach((f) => {
            if (values[f] === "" || values[f] === null || values[f] === 0) {
                newErrors[f] = "Champ obligatoire";
            }
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            await createProduit(values);
            notifications.show("Produit ajouté avec succès", {
                severity: "success",
                autoHideDuration: 3000,
            });
            navigate('/accueil/bar/ventes');
        } catch (e) {
            notifications.show(
                e.response?.data?.message || "Erreur lors de l'ajout",
                { severity: "error" }
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
                Ajouter un Produit au Catalogue Bar
            </Typography>
            <Card>
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Désignation"
                                name="designation"
                                value={values.designation}
                                onChange={handleChange}
                                error={!!errors.designation}
                                helperText={errors.designation}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                fullWidth
                                label="Groupe Liquide"
                                name="groupeLiquide"
                                value={values.groupeLiquide}
                                onChange={handleChange}
                                error={!!errors.groupeLiquide}
                                helperText={errors.groupeLiquide}
                                required
                            >
                                {GROUPES_LIQUIDES.map(option => (
                                    <MenuItem key={option} value={option}>
                                        {option}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Bouteilles par Casier"
                                name="nbreBouteillesParCasier"
                                type="number"
                                value={values.nbreBouteillesParCasier}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Prix Vente HT"
                                name="prixVenteHt"
                                type="number"
                                value={values.prixVenteHt}
                                onChange={handleChange}
                                error={!!errors.prixVenteHt}
                                helperText={errors.prixVenteHt}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Stock Initial"
                                name="stockInitial"
                                type="number"
                                value={values.stockInitial}
                                onChange={handleChange}
                                error={!!errors.stockInitial}
                                helperText={errors.stockInitial}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Button
                                variant="contained"
                                onClick={handleSubmit}
                                disabled={loading}
                                fullWidth
                            >
                                {loading ? 'Ajout...' : 'Ajouter Produit'}
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        </Box>
    );
}
