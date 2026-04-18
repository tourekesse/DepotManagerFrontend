// Script de test pour vérifier que le point d'accès API fonctionne
// Exécutez ce script dans la console du navigateur sur la page d'historique des commandes

async function testOrderHistory() {
  console.log('🧪 Test de l\'historique des commandes...');
  
  // Vérifier si le clientId existe
  const clientId = localStorage.getItem('clientId');
  console.log('🔍 ClientId dans localStorage :', clientId);
  
  if (!clientId) {
    console.error('❌ Aucun clientId trouvé. L\'utilisateur n\'est peut-être pas connecté correctement.');
    return;
  }
  
  // Vérifier si le token existe
  const token = localStorage.getItem('token');
  console.log('🔍 Token dans localStorage :', token ? 'existe' : 'manquant');
  
  try {
    // Faire l'appel API
    const response = await fetch(`/api/commandes?clientId=${clientId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Statut de la réponse :', response.status);
    console.log('📡 En-têtes de la réponse :', [...response.headers.entries()]);
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP ! statut : ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Données de réponse API :', data);
    console.log('📊 Nombre de commandes :', Array.isArray(data) ? data.length : 'Pas un tableau');
    
  } catch (error) {
    console.error('❌ Échec de l\'appel API :', error);
  }
}

// Exécuter le test
testOrderHistory();
