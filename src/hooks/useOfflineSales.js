// Hook pour les ventes hors ligne
// src/hooks/useOfflineSales.js

import { useState, useCallback } from 'react';
import { usePWA } from './usePWA';

export const useOfflineSales = () => {
  const [pendingSales, setPendingSales] = useState([]);
  const { isOnline, saveOfflineData, getOfflineData, syncOfflineData } = usePWA();

  // Charger les ventes en attente au démarrage
  const loadPendingSales = useCallback(async () => {
    const sales = await getOfflineData('pendingSales') || [];
    setPendingSales(sales);
    return sales;
  }, [getOfflineData]);

  // Sauvegarder une vente hors ligne
  const saveOfflineSale = useCallback(async (saleData) => {
    try {
      const newSale = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        ...saleData,
        status: 'pending'
      };

      const updatedSales = [...pendingSales, newSale];
      setPendingSales(updatedSales);
      
      await saveOfflineData('pendingSales', updatedSales);
      
      console.log('💾 Sale saved offline:', newSale);
      return newSale;
    } catch (error) {
      console.error('❌ Failed to save offline sale:', error);
      throw error;
    }
  }, [pendingSales, saveOfflineData]);

  // Synchroniser une vente spécifique
  const syncSale = useCallback(async (saleId) => {
    try {
      const sale = pendingSales.find(s => s.id === saleId);
      if (!sale) return false;

      const response = await fetch('/api/ventes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(sale)
      });

      if (response.ok) {
        // Retirer la vente synchronisée de la liste
        const updatedSales = pendingSales.filter(s => s.id !== saleId);
        setPendingSales(updatedSales);
        await saveOfflineData('pendingSales', updatedSales);
        
        console.log('✅ Sale synced successfully:', saleId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to sync sale:', saleId, error);
      return false;
    }
  }, [pendingSales, saveOfflineData]);

  // Synchroniser toutes les ventes en attente
  const syncAllSales = useCallback(async () => {
    if (!isOnline || pendingSales.length === 0) return 0;

    let syncedCount = 0;
    
    for (const sale of pendingSales) {
      const success = await syncSale(sale.id);
      if (success) syncedCount++;
    }

    console.log(`🔄 Synced ${syncedCount}/${pendingSales.length} sales`);
    return syncedCount;
  }, [isOnline, pendingSales, syncSale]);

  // Supprimer une vente en attente
  const deletePendingSale = useCallback(async (saleId) => {
    try {
      const updatedSales = pendingSales.filter(s => s.id !== saleId);
      setPendingSales(updatedSales);
      await saveOfflineData('pendingSales', updatedSales);
      
      console.log('🗑️ Pending sale deleted:', saleId);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete pending sale:', error);
      return false;
    }
  }, [pendingSales, saveOfflineData]);

  // Calculer le total des ventes en attente
  const getPendingTotal = useCallback(() => {
    return pendingSales.reduce((total, sale) => {
      return total + (sale.total || 0);
    }, 0);
  }, [pendingSales]);

  // Vérifier s'il y a des ventes en attente
  const hasPendingSales = pendingSales.length > 0;

  return {
    pendingSales,
    hasPendingSales,
    pendingCount: pendingSales.length,
    pendingTotal: getPendingTotal(),
    loadPendingSales,
    saveOfflineSale,
    syncSale,
    syncAllSales,
    deletePendingSale
  };
};
