/**
 * Carte de tracking GPS des livreurs en temps réel.
 * Utilise Leaflet + OpenStreetMap (gratuit, pas de clé API).
 * 
 * Ce composant est ISOLÉ - il n'impacte aucun code existant.
 */
import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Box, Paper, Typography, Chip, Stack, CircularProgress } from '@mui/material';
import { privateApi } from '../../api/axios';
import 'leaflet/dist/leaflet.css';

// Fix pour les icônes Leaflet dans React
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/**
 * @typedef {Object} Position
 * @property {number} id
 * @property {number} livreurId
 * @property {string} livreurNom
 * @property {number} latitude
 * @property {number} longitude
 * @property {number} vitesse
 * @property {number} batterie
 * @property {string} timestamp
 * @property {number|null} commandeId
 */

/**
 * Composant pour centrer la carte sur les positions
 */
function MapBounds({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [positions, map]);

  return null;
}

/**
 * Icône personnalisée selon le statut du livreur
 */
function getLivreurIcon(position) {
  const enLivraison = position.commandeId !== null;
  const color = enLivraison ? '#4CAF50' : '#FF9800'; // Vert si en livraison, orange sinon
  const batteryLevel = position.batterie > 50 ? '#4CAF50' : position.batterie > 20 ? '#FF9800' : '#f44336';

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position: relative; width: 40px; height: 40px;">
        <div style="
          position: absolute;
          top: 0; left: 0;
          width: 40px; height: 40px;
          background: ${color};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        "></div>
        <div style="
          position: absolute;
          top: 8px; left: 8px;
          width: 24px; height: 24px;
          display: flex; align-items: center; justify-content: center;
        ">
          <span style="transform: rotate(45deg); font-size: 14px;">🛵</span>
        </div>
        <div style="
          position: absolute;
          bottom: -8px; right: -4px;
          width: 16px; height: 16px;
          background: ${batteryLevel};
          border-radius: 50%;
          border: 2px solid white;
          font-size: 8px;
          display: flex; align-items: center; justify-content: center;
          color: white; font-weight: bold;
        ">${position.batterie}%</div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
}

/**
 * Composant principal de la carte GPS
 */
export default function GpsTrackingMap() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const intervalRef = useRef(null);

  // Charger les positions
  const fetchPositions = async () => {
    try {
      const res = await privateApi.get('/api/gps/positions-recentes');
      if (Array.isArray(res.data)) {
        setPositions(res.data);
      }
      setLastUpdate(new Date());
    } catch (e) {
      console.error('Erreur chargement positions GPS:', e);
    } finally {
      setLoading(false);
    }
  };

  // Polling toutes les 10 secondes
  useEffect(() => {
    fetchPositions();
    intervalRef.current = setInterval(fetchPositions, 10000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Position par défaut (Abidjan)
  const defaultCenter = [5.3600, -4.0083];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', minHeight: 500 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1, px: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          📍 Tracking en temps réel ({positions.length} livreurs)
        </Typography>
        <Stack direction="row" spacing={1}>
          <Chip
            label={`Mis à jour: ${lastUpdate.toLocaleTimeString('fr-FR')}`}
            size="small"
            variant="outlined"
          />
          <Chip
            label="🔄 Auto-refresh 10s"
            size="small"
            color="success"
            variant="outlined"
          />
        </Stack>
      </Stack>

      {/* Carte */}
      <Paper sx={{ height: 450, borderRadius: 2, overflow: 'hidden', border: '2px solid #e0e0e0' }}>
        <MapContainer
          center={defaultCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Ajuster les bounds automatiquement */}
          {positions.length > 0 && <MapBounds positions={positions} />}

          {/* Marqueurs des livreurs */}
          {positions.map((pos) => (
            <Marker
              key={pos.livreurId}
              position={[pos.latitude, pos.longitude]}
              icon={getLivreurIcon(pos)}
            >
              <Popup maxWidth={250}>
                <Box sx={{ p: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    🛵 {pos.livreurNom}
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    🆔 Livreur #{pos.livreurId}
                  </Typography>
                  <Typography variant="caption" display="block">
                    📍 {pos.latitude.toFixed(6)}, {pos.longitude.toFixed(6)}
                  </Typography>
                  <Typography variant="caption" display="block">
                    🚀 Vitesse: {pos.vitesse} km/h
                  </Typography>
                  <Typography variant="caption" display="block">
                    🔋 Batterie: {pos.batterie}%
                  </Typography>
                  {pos.commandeId && (
                    <Chip
                      label={`📦 Livraison #${pos.commandeId}`}
                      size="small"
                      color="success"
                      sx={{ mt: 0.5 }}
                    />
                  )}
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                    🕐 {new Date(pos.timestamp).toLocaleString('fr-FR')}
                  </Typography>
                </Box>
              </Popup>
            </Marker>
          ))}

          {positions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Typography>Aucun livreur en ligne actuellement</Typography>
            </div>
          )}
        </MapContainer>
      </Paper>

      {/* Légende */}
      <Stack direction="row" spacing={2} sx={{ mt: 1, px: 1 }} justifyContent="center">
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#4CAF50' }} />
          <Typography variant="caption">En livraison</Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#FF9800' }} />
          <Typography variant="caption">En transit</Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
