#!/bin/bash
# Script de connexion à la base de données distante DepotManager
# Utilisation: ./connect-db.sh

echo "🔗 Connexion à la base de données distante..."
ssh -L 3307:localhost:3306 root@62.72.24.153 << 'EOF'
echo "✅ Connecté au serveur VPS"
echo "💾 Base de données: depotmanagerdb"
echo ""
echo "Pour accéder à MySQL depuis votre machine locale:"
echo "mysql -h 127.0.0.1 -P 3307 -u root -p depotmanagerdb"
echo "Mot de passe: Smlpnr@1305"
echo ""
echo "Gardez cette session ouverte pour maintenir le tunnel SSH"
EOF
