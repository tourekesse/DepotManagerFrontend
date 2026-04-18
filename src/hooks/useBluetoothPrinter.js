import { useState } from 'react';
import { privateApi } from '../api/axios';

/**
 * Hook pour impression Bluetooth sur imprimante thermique 58mm
 * Compatible avec imprimantes ESC/POS
 */
export const useBluetoothPrinter = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [device, setDevice] = useState(null);

  /**
   * Connecter à une imprimante Bluetooth
   */
  const connectPrinter = async () => {
    setIsConnecting(true);
    try {
      // Vérifier si Web Bluetooth est supporté
      if (!navigator.bluetooth) {
        throw new Error('Bluetooth non supporté sur ce navigateur');
      }

      // Demander un périphérique Bluetooth
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      });

      setDevice(device);
      return device;
    } catch (error) {
      console.error('Erreur connexion Bluetooth:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Imprimer un reçu de vente
   */
  const printReceipt = async (venteId) => {
    setIsPrinting(true);
    try {
      // 1. Récupérer le reçu texte depuis l'API
      const response = await privateApi.get(`/api/recu/${venteId}/text`);
      const receiptText = response.data;

      // 2. Connecter à l'imprimante si pas déjà connecté
      let printerDevice = device;
      if (!printerDevice) {
        printerDevice = await connectPrinter();
      }

      // 3. Se connecter au serveur GATT
      const server = await printerDevice.gatt.connect();
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

      // 4. Convertir le texte en commandes ESC/POS
      const encoder = new TextEncoder();
      const commands = [
        '\x1B\x40', // Initialiser l'imprimante
        '\x1B\x61\x01', // Centrer le texte
        receiptText,
        '\x1B\x64\x03', // Avancer de 3 lignes
        '\x1D\x56\x00' // Couper le papier
      ].join('');

      // 5. Envoyer à l'imprimante
      await characteristic.writeValue(encoder.encode(commands));

      return true;
    } catch (error) {
      console.error('Erreur impression:', error);
      throw error;
    } finally {
      setIsPrinting(false);
    }
  };

  /**
   * Déconnecter l'imprimante
   */
  const disconnect = () => {
    if (device && device.gatt.connected) {
      device.gatt.disconnect();
    }
    setDevice(null);
  };

  return {
    connectPrinter,
    printReceipt,
    disconnect,
    isConnecting,
    isPrinting,
    isConnected: device && device.gatt.connected
  };
};
