import { useMemo } from 'react';
import { useUser } from '../context/UserContext';
import { getActivePointDeVenteId as getPV } from '../utils/pdv';

// React hook to provide a stable active Point de Vente ID
// Prefers UserContext's activePointDeVente, falls back to localStorage via util
export default function useActivePointDeVenteId() {
  const { activePointDeVente } = useUser();
  return useMemo(() => {
    return activePointDeVente?.id ?? getPV();
  }, [activePointDeVente]);
}
