import { privateApi } from "../../../../api/axios";

const fallbackReferences = [
  { marque: "CASTEL", format: "66cl", casierBouteilles: 12, consigneBouteille: 200, groupeLiquide: "BIERE", stockMinSuggested: 60, code_interne: "CAS66" },
  { marque: "CASTEL", format: "50cl", casierBouteilles: 12, consigneBouteille: 200, groupeLiquide: "BIERE", stockMinSuggested: 50, code_interne: "CAS50" },
  { marque: "CASTEL", format: "33cl", casierBouteilles: 24, consigneBouteille: 150, groupeLiquide: "BIERE", stockMinSuggested: 40, code_interne: "CAS33" },
  { marque: "BOCK", format: "65cl", casierBouteilles: 12, consigneBouteille: 200, groupeLiquide: "BIERE", stockMinSuggested: 50, code_interne: "BOC65" },
  { marque: "BOCK", format: "50cl", casierBouteilles: 12, consigneBouteille: 200, groupeLiquide: "BIERE", stockMinSuggested: 40, code_interne: "BOC50" },
  { marque: "BEAUFORT", format: "65cl", casierBouteilles: 12, consigneBouteille: 200, groupeLiquide: "BIERE", stockMinSuggested: 40, code_interne: "BEA65" },
  { marque: "FLAG", format: "50cl", casierBouteilles: 12, consigneBouteille: 200, groupeLiquide: "BIERE", stockMinSuggested: 30, code_interne: "FLA50" },
  { marque: "COCA COLA", format: "1.5L", casierBouteilles: 6, consigneBouteille: 300, groupeLiquide: "SODA", stockMinSuggested: 40, code_interne: "COC15" },
  { marque: "FANTA", format: "1.5L", casierBouteilles: 6, consigneBouteille: 300, groupeLiquide: "SODA", stockMinSuggested: 30, code_interne: "FAN15" },
  { marque: "SPRITE", format: "1.5L", casierBouteilles: 6, consigneBouteille: 300, groupeLiquide: "SODA", stockMinSuggested: 30, code_interne: "SPR15" },
  { marque: "EAU MINERALE", format: "1.5L", casierBouteilles: 12, consigneBouteille: 0, groupeLiquide: "EAU", stockMinSuggested: 60, code_interne: "EAU15" },
  { marque: "YOUKI", format: "33cl", casierBouteilles: 24, consigneBouteille: 100, groupeLiquide: "SODA", stockMinSuggested: 50, code_interne: "YOU33" },
];

export async function detectProductInfo(input = "") {
  if (!input || input.trim().length < 2) return [];

  // Découpe la saisie : "CAS 33" devient ["CAS", "33"]
  const searchTerms = input.toUpperCase().trim().split(/\s+/);

  try {
    const res = await privateApi.get(`/api/references/recherche?q=${input}`);
    if (res.data && res.data.length > 0) {
      return res.data.map(p => ({
        ...p,
        groupeLiquide: p.groupeLiquide || p.groupe || p.type_produit || "DIVERS"
      }));
    }
  } catch (err) {
    console.warn("Mode local activé (fallback)");
  }

  // Filtrage local précis : tous les mots tapés doivent être présents dans la marque OU le format
  return fallbackReferences.filter(ref => {
    const combined = `${ref.marque} ${ref.format}`.toUpperCase();
    return searchTerms.every(term => combined.includes(term));
  });
}