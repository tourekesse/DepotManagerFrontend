# Configuration API - Sans Hardcoding

## 🎯 Fonctionnement (Priorité)

| Priorité | Source | Usage |
|----------|--------|-------|
| **1** | `VITE_API_URL` (env) | Override total |
| **2** | Détection localhost | Auto: `localhost:8085` |
| **3** | DB (`app_endpoint`) | Fallback production |

**Zéro URL en dur dans le code !**

## 🚀 Usage Rapide

### 1. Développement local (défaut)
```bash
npm run dev
# → Utilise automatiquement http://localhost:8085
```

### 2. Pointer vers la production
```bash
VITE_API_URL=https://depotmanager.gm-soft.ca/api npm run dev
# → Utilise l'URL fournie
```

### 3. Build production
```bash
npm run build
# → Utilise l'URL de la DB (app_endpoint)
```

## 📁 Fichiers

- `api.config.js` - Config côté client (helper URLs)
- `vite.config.js` - Proxy Vite dev
- `axios.js` - Initialisation API avec `VITE_API_URL`

## 💻 Dans le code

```javascript
import { buildApiUrl, getBaseUrl } from '@/config/api.config';

// URLs dynamiques selon la config
const url = buildApiUrl('/clients/123');     // → complète
const base = getBaseUrl();                   // → base API
const backend = getBackendUrl();             // → sans /api
```

## 🔧 Configuration Avancée

### Docker / CI / Scripts
```bash
# Fichier .env ou inline
export VITE_API_URL=http://localhost:8085/api
npm run dev
```

### Windows (PowerShell)
```powershell
$env:VITE_API_URL="https://depotmanager.gm-soft.ca/api"
npm run dev
```

## 📊 Matrice des cas

| Cas | Commande | Backend utilisé |
|-----|----------|----------------|
| Dev local classique | `npm run dev` | `http://localhost:8085` (auto) |
| Dev vers prod | `VITE_API_URL=https://.../api npm run dev` | URL fournie |
| Prod (DB) | `npm run build` | Depuis `app_endpoint` |
| Prod forcée | `VITE_API_URL=... npm run build` | URL fournie |
