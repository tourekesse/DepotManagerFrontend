/**
 * Country configuration — loaded from backend DB.
 * NO hardcoded data. Everything comes from /api/config/countries.
 */

let _countries = [];
let _loaded = false;
let _loading = null;

const FALLBACK_COUNTRY = {
  code: "CI",
  name: "Cote d'Ivoire",
  dialCode: "+225",
  phoneDigits: 10,
  phoneMask: "99 99 99 99 99",
  phoneExample: "07 08 40 40 50",
  phonePrefixes: ["07", "01", "05"],
  currency: "XOF",
  currencySymbol: "FCFA",
  locale: "fr-CI",
  mapCenter: [5.359952, -4.008256],
  mapCity: "Abidjan",
  mobileOperators: ["Orange", "MTN", "Moov"],
  pawapayCountry: "CIV",
  pawapayCorrespondents: ["MTN_MOMO_CIV", "ORANGE_CIV"],
  flag: "CI",
};

/**
 * Transform backend DTO into frontend country object.
 */
function dtoToFrontend(dto) {
  return {
    ...dto,
    mapCenter: [dto.mapCenterLat, dto.mapCenterLng],
    phonePrefixes: parseJson(dto.phonePrefixes, []),
    mobileOperators: parseJson(dto.mobileOperators, []),
    pawapayCorrespondents: parseJson(dto.pawapayCorrespondents, []),
  };
}

function parseJson(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

/**
 * Load countries from backend. Called once on app init.
 * Falls back to CI if API fails.
 */
export async function loadCountries() {
  if (_loaded) return _countries;
  if (_loading) return _loading;

  _loading = (async () => {
    try {
      const tempAxios = (await import("axios")).default.create({ baseURL: "" });
      const response = await tempAxios.get("/api/config/countries");
      if (response.data && response.data.length > 0) {
        _countries = response.data.map(dtoToFrontend);
        _loaded = true;
      } else {
        _countries = [FALLBACK_COUNTRY];
        _loaded = true;
      }
    } catch (err) {
      console.warn("Failed to load countries from backend, using fallback:", err);
      _countries = [FALLBACK_COUNTRY];
      _loaded = true;
    }
    return _countries;
  })();

  return _loading;
}

/**
 * Get all countries. Returns [] if not loaded yet.
 */
export function getCountries() {
  return _countries;
}

export const DEFAULT_COUNTRY = FALLBACK_COUNTRY;

/**
 * Get country by code. Falls back to first loaded country or CI.
 */
export function getCountryByCode(code) {
  if (!_loaded && !code) return FALLBACK_COUNTRY;
  return _countries.find((c) => c.code === code) || _countries[0] || FALLBACK_COUNTRY;
}

/**
 * Get country by dial code.
 */
export function getCountryByDialCode(dialCode) {
  return _countries.find((c) => c.dialCode === dialCode) || _countries[0] || FALLBACK_COUNTRY;
}

/**
 * Get user's country from localStorage (set during SetupWizard).
 * Falls back to CI.
 */
export function getUserCountry() {
  const code = localStorage.getItem("userCountry");
  return getCountryByCode(code);
}
