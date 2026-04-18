#!/bin/bash

echo "=============================================="
echo " 🚀 DÉMARRAGE DE DEPOTMANAGER (Backend + Frontend)"
echo "=============================================="
echo ""

# Lancer le backend
echo "[Backend] Démarrage du serveur Spring Boot..."
cd /home/guillaume/NetBeansJDKss/dev2/depotmanager-backend || {
    echo "[Backend] ❌ Impossible de trouver le dossier backend."
    exit 1
}
mvn spring-boot:run &
echo "[Backend] ✔ Le backend est en cours d'exécution."
echo ""

# Lancer le frontend
echo "[Frontend] Démarrage du serveur Vite..."
cd /home/guillaume/NetBeansJDKss/dev2/depotmanager-frontend || {
    echo "[Frontend] ❌ Impossible de trouver le dossier frontend."
    exit 1
}
npm run dev -- --host &
echo "[Frontend] ✔ Le frontend est en cours d'exécution."
echo ""

echo "=============================================="
echo " ✅ DEPOTMANAGER EST LANCÉ AVEC SUCCÈS"
echo "    Backend  : http://localhost:8080"
echo "    Frontend : http://localhost:5173"
echo "=============================================="
