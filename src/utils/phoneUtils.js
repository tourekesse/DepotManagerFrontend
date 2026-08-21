import { DEFAULT_COUNTRY, getCountryByCode, getCountries } from "../config/countries";

/**
 * Strip all non-digits from a phone string.
 */
export function stripPhone(value = "") {
  return value.replace(/\D/g, "");
}

/**
 * Format for DataGrid display: "07-08-40-40-50" (CI) or "77-123-45-67" (SN).
 * Uses dashes for table columns.
 */
export function formatPhoneInput(value = "", countryCode) {
  const country = getCountryByCode(countryCode);
  const digits = stripPhone(value).slice(-country.phoneDigits);
  return digits.replace(/(\d{2})(?=\d)/g, "$1-");
}

/**
 * Normalize for DataGrid: just digits, correct length.
 */
export function normalizePhoneInput(value = "", countryCode) {
  const country = getCountryByCode(countryCode);
  return stripPhone(value).slice(-country.phoneDigits);
}

/**
 * Format local display: "07 08 40 40 50" (CI) or "77 123 45 67" (SN).
 * Uses the country's phoneDigits to know how many digits to keep.
 */
export function formatPhoneLocal(value = "", countryCode) {
  const country = getCountryByCode(countryCode);
  const digits = stripPhone(value).slice(-country.phoneDigits);
  return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}

/**
 * Normalize to international format without +: "2250708404050"
 * Input can be local ("07 08 40 40 50") or already international ("+225 07 08 40 40 50").
 */
export function normalizePhoneInternational(value = "", countryCode) {
  const country = getCountryByCode(countryCode);
  const digits = stripPhone(value);
  const dialDigits = country.dialCode.replace("+", "");

  // Already starts with dial code (e.g. "2250708404050")
  if (digits.startsWith(dialDigits)) {
    return digits;
  }

  // Local format with or without leading zero
  if (digits.length === country.phoneDigits) {
    return dialDigits + digits;
  }

  // Already correct length with dial code
  if (digits.length === country.phoneDigits + dialDigits.length) {
    return digits;
  }

  // Fallback: strip leading 0, prepend dial code
  const local = digits.startsWith("0") ? digits.slice(1) : digits;
  return dialDigits + local;
}

/**
 * Format for display with + prefix: "+225 07 08 40 40 50"
 */
export function formatPhoneDisplay(value = "", countryCode) {
  const country = getCountryByCode(countryCode);
  const local = formatPhoneLocal(value, countryCode);
  return `${country.dialCode} ${local}`;
}

/**
 * Validate phone: must have correct number of digits for the country.
 */
export function validatePhone(value = "", countryCode) {
  const country = getCountryByCode(countryCode);
  const digits = stripPhone(value);
  return digits.length >= country.phoneDigits;
}

/**
 * Get the country from a phone number by detecting the dial code prefix.
 * Returns { country, localNumber } or null.
 */
export function detectCountryFromPhone(value = "") {
  const digits = stripPhone(value);

  for (const country of COUNTRIES) {
    const dialDigits = country.dialCode.replace("+", "");
    if (digits.startsWith(dialDigits)) {
      const local = digits.slice(dialDigits.length);
      return { country, localNumber: local };
    }
  }
  return null;
}

/**
 * Get InputMask pattern for a country: "99 99 99 99 99" (CI) or "99 99 99 99 9" (SN).
 */
export function getPhoneMask(countryCode) {
  const country = getCountryByCode(countryCode);
  return country.phoneMask;
}

/**
 * Get a random example number for placeholders.
 */
export function getPhoneExample(countryCode) {
  const country = getCountryByCode(countryCode);
  return `${country.dialCode} ${country.phoneExample}`;
}
