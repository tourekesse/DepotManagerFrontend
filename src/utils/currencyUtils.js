import { DEFAULT_COUNTRY, getCountryByCode, getUserCountry } from "../config/countries";

/**
 * Format a number as currency for the given country.
 * If countryCode is omitted, uses the user's country from localStorage.
 * formatCurrency(25000) → "25 000 FCFA" (uses user country)
 * formatCurrency(25000, "CI") → "25 000 FCFA"
 * formatCurrency(25000, "SN") → "25 000 FCFA"
 */
export function formatCurrency(amount = 0, countryCode) {
  const country = getCountryByCode(countryCode || getUserCountry().code);
  const formatted = Number(amount || 0).toLocaleString(country.locale);
  return `${formatted} ${country.currencySymbol}`;
}

/**
 * Format short currency (with F suffix).
 * formatCurrencyShort(25000, "CI") → "25 000 F"
 */
export function formatCurrencyShort(amount = 0, countryCode) {
  const country = getCountryByCode(countryCode || getUserCountry().code);
  return Number(amount || 0).toLocaleString(country.locale) + " F";
}

/**
 * Format with Intl.NumberFormat for currency style.
 */
export function formatCurrencyIntl(amount = 0, countryCode) {
  const country = getCountryByCode(countryCode || getUserCountry().code);
  return new Intl.NumberFormat(country.locale, {
    style: "currency",
    currency: country.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

/**
 * Get the currency symbol for a country (or user's country by default).
 */
export function getCurrencySymbol(countryCode) {
  const country = getCountryByCode(countryCode || getUserCountry().code);
  return country.currencySymbol;
}
