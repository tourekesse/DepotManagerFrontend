export function safeProductFields(p) {
  return {
    marque: (p.marque || "").trim().toUpperCase() || "INCONNU",
    format: (p.format || "").trim() || "STANDARD",
    groupeLiquide: (
      p.groupeLiquide || 
      p.groupe || 
      p.type_produit || 
      "DIVERS"
    ).toUpperCase().trim()
  };
}