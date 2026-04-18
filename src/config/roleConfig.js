/**
 * Configuration des rôles et leurs permissions de navigation
 * Définit quels liens chaque rôle peut voir
 */

export const ROLES = {
  ADMINISTRATEUR_GENERAL: 'Administrateur Général',
  ADMINISTRATEUR: 'Administrateur',
  LIVREUR: 'Livreur',
  CLIENT_BAR: 'CLIENT_BAR'
};

/**
 * Configuration des menus par rôle
 * Chaque rôle a une liste de liens qu'il peut voir
 */
export const roleMenuConfig = {
  [ROLES.PROPRIETAIRE]: [
    { label: 'Tableau de bord', path: '/accueil', icon: 'Dashboard' },
    { label: 'Bar - Ventes', path: '/accueil/bar/ventes', icon: 'ShoppingCart' },
    { label: 'Bar - Catalogue', path: '/accueil/bar/catalogue', icon: 'Add' },
    { label: 'Créer un gérant bar', path: '/accueil/bar/gerants/nouveau', icon: 'PersonAdd' },
    { label: 'Clients', path: '/accueil/clients', icon: 'People' },
    { label: 'Produits', path: '/accueil/produits', icon: 'Inventory' },
    { label: 'Approvisionnement', path: '/accueil/approvisionnement', icon: 'LocalShipping' },
    { label: 'Commandes Dépôt', path: '/accueil/commandes-depot', icon: 'ShoppingCart' },
    { label: 'Livraisons', path: '/accueil/livraisons', icon: 'LocalShipping' },
    { label: '📍 Suivi GPS', path: '/accueil/gps-tracking', icon: 'MyLocation' },
    { label: 'Caisse', path: '/accueil/caisse/journal', icon: 'AccountBalanceWallet' },
  ],
  [ROLES.GERANT_DEPOT]: [
    { label: 'Tableau de bord', path: '/accueil', icon: 'Dashboard' },
    { label: 'Clients', path: '/accueil/clients', icon: 'People' },
    { label: 'Produits', path: '/accueil/produits', icon: 'Inventory' },
    { label: 'Approvisionnement', path: '/accueil/approvisionnement', icon: 'LocalShipping' },
    { label: 'Commandes Dépôt', path: '/accueil/commandes-depot', icon: 'ShoppingCart' },
    { label: 'Commandes Mobiles', path: '/accueil/commandes-mobiles', icon: 'ShoppingCart' },
    { label: 'Livraisons', path: '/accueil/livraisons', icon: 'LocalShipping' },
    { label: '📍 Suivi GPS', path: '/accueil/gps-tracking', icon: 'MyLocation' },
    { label: 'Livreurs', path: '/accueil/livreurs', icon: 'LocalShipping' },
    { label: 'Caisse', path: '/accueil/caisse/journal', icon: 'AccountBalanceWallet' },
  ],
  [ROLES.GERANT_BAR]: [
    { label: 'Bar - Ventes', path: '/accueil/bar/ventes', icon: 'ShoppingCart' },
    { label: 'Bar - Catalogue', path: '/accueil/bar/catalogue', icon: 'Add' },
  ],
  [ROLES.CLIENT_BAR]: [
    { label: 'Tableau de bord', path: '/accueil', icon: 'Dashboard' },
    { label: 'Nouvelle commande', path: '/accueil/commandes/nouvelle', icon: 'Add' },
    { label: 'Mes commandes', path: '/accueil/mes-commandes', icon: 'History' },
    { label: 'Mes casiers', path: '/accueil/casiers', icon: 'Inventory2' },
    { label: 'Vente Bar', path: '/accueil/bar/ventes', icon: 'ShoppingCart' },
    { label: 'Ajouter Produit', path: '/accueil/bar/catalogue', icon: 'Add' },
    // Les entrées Vente/Inventaire bar seront ajoutées dynamiquement si upgrade PV
  ],
  [ROLES.PROPRIETAIRE_SOUS_DEPOT_BAR]: [
    { label: 'Tableau de bord', path: '/accueil', icon: 'Dashboard' },
    { label: 'Bar - Ventes', path: '/accueil/bar/ventes', icon: 'ShoppingCart' },
    { label: 'Bar - Catalogue', path: '/accueil/bar/catalogue', icon: 'Add' },
    { label: 'Créer un gérant bar', path: '/accueil/bar/gerants/nouveau', icon: 'PersonAdd' },
    { label: 'Clients', path: '/accueil/clients', icon: 'People' },
    { label: 'Produits', path: '/accueil/produits', icon: 'Inventory' },
    { label: 'Approvisionnement', path: '/accueil/approvisionnement', icon: 'LocalShipping' },
    { label: 'Commandes Dépôt', path: '/accueil/commandes-depot', icon: 'ShoppingCart' },
    { label: 'Livraisons', path: '/accueil/livraisons', icon: 'LocalShipping' },
    { label: '📍 Suivi GPS', path: '/accueil/gps-tracking', icon: 'MyLocation' },
    { label: 'Caisse', path: '/accueil/caisse/journal', icon: 'AccountBalanceWallet' },
  ],
  [ROLES.PROPRIETAIRE_BAR]: [
    { label: 'Tableau de bord', path: '/accueil', icon: 'Dashboard' },
    { label: 'Nouvelle commande', path: '/accueil/commandes/nouvelle', icon: 'Add' },
    { label: 'Mes commandes', path: '/accueil/mes-commandes', icon: 'History' },
    { label: 'Mes casiers', path: '/accueil/casiers', icon: 'Inventory2' },
    { label: 'Vente Bar', path: '/accueil/bar/ventes', icon: 'ShoppingCart' },
    { label: 'Ajouter Produit', path: '/accueil/bar/catalogue', icon: 'Add' },
  ],
  [ROLES.PROPRIETAIRE_DEPOT]: [
    { label: 'Tableau de bord', path: '/accueil', icon: 'Dashboard' },
    { label: 'Bar - Ventes', path: '/accueil/bar/ventes', icon: 'ShoppingCart' },
    { label: 'Bar - Catalogue', path: '/accueil/bar/catalogue', icon: 'Add' },
    { label: 'Créer un gérant bar', path: '/accueil/bar/gerants/nouveau', icon: 'PersonAdd' },
    { label: 'Clients', path: '/accueil/clients', icon: 'People' },
    { label: 'Produits', path: '/accueil/produits', icon: 'Inventory' },
    { label: 'Approvisionnement', path: '/accueil/approvisionnement', icon: 'LocalShipping' },
    { label: 'Commandes Dépôt', path: '/accueil/commandes-depot', icon: 'ShoppingCart' },
    { label: 'Livraisons', path: '/accueil/livraisons', icon: 'LocalShipping' },
    { label: '📍 Suivi GPS', path: '/accueil/gps-tracking', icon: 'MyLocation' },
    { label: 'Caisse', path: '/accueil/caisse/journal', icon: 'AccountBalanceWallet' },
  ],
  [ROLES.PROPRIETAIRE_SOUS_DEPOT]: [
    { label: 'Tableau de bord', path: '/accueil', icon: 'Dashboard' },
    { label: 'Bar - Ventes', path: '/accueil/bar/ventes', icon: 'ShoppingCart' },
    { label: 'Bar - Catalogue', path: '/accueil/bar/catalogue', icon: 'Add' },
    { label: 'Créer un gérant bar', path: '/accueil/bar/gerants/nouveau', icon: 'PersonAdd' },
    { label: 'Clients', path: '/accueil/clients', icon: 'People' },
    { label: 'Produits', path: '/accueil/produits', icon: 'Inventory' },
    { label: 'Approvisionnement', path: '/accueil/approvisionnement', icon: 'LocalShipping' },
    { label: 'Commandes Dépôt', path: '/accueil/commandes-depot', icon: 'ShoppingCart' },
    { label: 'Livraisons', path: '/accueil/livraisons', icon: 'LocalShipping' },
    { label: '📍 Suivi GPS', path: '/accueil/gps-tracking', icon: 'MyLocation' },
    { label: 'Caisse', path: '/accueil/caisse/journal', icon: 'AccountBalanceWallet' },
  ],
  [ROLES.LIVREUR]: [
    { label: 'Mes livraisons', path: '/accueil/livraisons/mes-livraisons', icon: 'LocalShipping' },
    { label: 'Historique', path: '/accueil/livraisons/historique', icon: 'History' },
  ]
};

/**
 * Récupère le rôle de l'utilisateur connecté
 */
export const getUserRole = () => {
  // Vérifier si c'est un admin
  const dmUser = localStorage.getItem('dmUser');
  if (dmUser) {
    try {
      const user = JSON.parse(dmUser);
      if (user.role) return user.role;
    } catch (e) {
      console.error('Erreur parsing dmUser', e);
    }
  }

  // Vérifier si c'est un client
  const clientId = localStorage.getItem('clientId');
  if (clientId) {
    return ROLES.CLIENT_BAR;
  }

  // Vérifier si c'est un livreur (à ajouter plus tard)
  const role = localStorage.getItem('role');
  if (role) {
    return role;
  }

  return ROLES.CLIENT_BAR;
};

/**
 * Retourne les liens de navigation pour le rôle actuel
 */
export const getMenuForCurrentRole = () => {
  const role = getUserRole();
  return roleMenuConfig[role] || [];
};

/**
 * Retourne la page d'accueil par défaut selon le rôle
 */
export const getDefaultHomePageForRole = (role) => {
  switch (role) {
    case ROLES.GERANT_DEPOT:
      return '/accueil';
    case ROLES.CLIENT_BAR:
      return '/accueil';
    case ROLES.LIVREUR:
      return '/accueil/livraisons/mes-livraisons';
    default:
      return '/accueil';
  }
};
