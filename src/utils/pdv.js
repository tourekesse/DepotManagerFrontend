// Utility to resolve the active Point de Vente ID dynamically
// Priority: localStorage.activePV.id -> dmUser.pointDeVenteActifId -> dmUser.defaultPointDeVenteId

export const getActivePointDeVenteId = () => {
  // 1) Try activePV stored by UserContext
  try {
    const activePVRaw = localStorage.getItem("activePV");
    if (activePVRaw) {
      const activePV = JSON.parse(activePVRaw);
      if (activePV && activePV.id) return activePV.id;
    }
  } catch (_) {}

  // 2) Fallback: user payload from login
  try {
    const dmUserRaw = localStorage.getItem("dmUser");
    if (dmUserRaw) {
      const dmUser = JSON.parse(dmUserRaw);
      // Accepte camelCase et snake_case
      if (dmUser?.pointDeVenteActifId) return dmUser.pointDeVenteActifId;
      if (dmUser?.point_de_vente_actif_id) return dmUser.point_de_vente_actif_id;
      if (dmUser?.defaultPointDeVenteId) return dmUser.defaultPointDeVenteId;
      if (dmUser?.default_point_de_vente_id) return dmUser.default_point_de_vente_id;
    }
  } catch (_) {}

  return null;
};
