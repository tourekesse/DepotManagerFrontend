import * as React from "react";
import { TextField, InputAdornment } from "@mui/material";
import { getCurrencySymbol } from '../../../utils/currencyUtils';

export default function MoneyField({
  label = "Montant",
  value = 0,
  onChange,
  required = false,
  ...props
}) {
  const [isFocused, setIsFocused] = React.useState(false);

  /**
   * Formate la valeur pour l'affichage (Standard fr-FR)
   */
  const getDisplayValue = () => {
    // Si l'utilisateur clique dans le champ et que c'est 0, on vide pour faciliter la saisie
    if (isFocused && (value === 0 || value === "0")) {
      return "";
    }

    if (value === undefined || value === null || value === "") {
      return "0";
    }

    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "0";

    // Formatage avec séparateur de milliers (ex: 1 250)
    // On retire les décimales si vos prix sont des nombres entiers (FCFA)
    return num.toLocaleString("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const handleChange = (e) => {
    const input = e.target.value;

    // Supprime tout ce qui n'est pas un chiffre
    const cleanValue = input.replace(/\D/g, "");
    const numValue = cleanValue === "" ? 0 : parseInt(cleanValue, 10);

    if (onChange) {
      onChange(numValue);
    }
  };

  return (
    <TextField
      label={label}
      type="text"
      inputMode="numeric"
      value={getDisplayValue()}
      onChange={handleChange}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      required={required}
      fullWidth
      // Ajout de l'unité FCFA à la fin pour plus de clarté
      InputProps={{
        endAdornment: <InputAdornment position="end">{getCurrencySymbol()}</InputAdornment>,
      }}
      {...props}
    />
  );
}