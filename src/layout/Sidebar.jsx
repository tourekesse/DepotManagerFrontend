import { Link, useLocation } from "react-router-dom";
import "./sidebar.css";

export default function Sidebar({ className }) {

  const location = useLocation();
  const isActive = (path) => (location.pathname === path ? "active" : "");

  return (
    <div className={`sidebar ${className}`}>

      {/* HEADER */}
      <div className="sidebar-header">
        <img src="/logo.svg" alt="Dépôt Manager" style={{ height: '50px', width: 'auto', borderRadius: '50%' }} />
      </div>

      {/* TITRE SECTION */}
      <div className="sidebar-section-title">Opérations</div>

      {/* NAVIGATION */}
      <nav className="sidebar-nav">

        <Link to="/dashboard" className={`sidebar-item ${isActive("/dashboard")}`}>
          <i className="pi pi-home"></i>
          <span>Dashboard</span>
        </Link>

        <Link to="/caisse" className={`sidebar-item ${isActive("/caisse")}`}>
          <i className="pi pi-calculator"></i>
          <span>Caisse</span>
        </Link>

        <Link to="/accueil/commandes" className={`sidebar-item ${isActive("/accueil/commandes")}`}>
          <i className="pi pi-shopping-cart"></i>
          <span>Commandes</span>
        </Link>

        <Link to="/accueil/commandes/historique" className={`sidebar-item ${isActive("/accueil/commandes/historique")}`}>
          <i className="pi pi-history"></i>
          <span>Historique commandes</span>
        </Link>

        <Link to="/accueil/mes-commandes" className={`sidebar-item ${isActive("/accueil/mes-commandes")}`}>
          <i className="pi pi-shopping-bag"></i>
          <span>Mes commandes</span>
        </Link>

      </nav>

      {/* TITRE SECTION */}
      <div className="sidebar-section-title">Paramétrage</div>

      {/* NAVIGATION */}
      <nav className="sidebar-nav">

        <Link to="/types" className={`sidebar-item ${isActive("/types")}`}>
          <i className="pi pi-list"></i>
          <span>Types de boisson</span>
        </Link>

        <Link to="/marques" className={`sidebar-item ${isActive("/marques")}`}>
          <i className="pi pi-tags"></i>
          <span>Marques</span>
        </Link>

        <Link to="/articles" className={`sidebar-item ${isActive("/articles")}`}>
          <i className="pi pi-box"></i>
          <span>Articles / Formats</span>
        </Link>

        <Link to="/prices" className={`sidebar-item ${isActive("/prices")}`}>
          <i className="pi pi-money-bill"></i>
          <span>Prix & Tarifs</span>
        </Link>

        <Link to="/staff" className={`sidebar-item ${isActive("/staff")}`}>
          <i className="pi pi-users"></i>
          <span>Personnel</span>
        </Link>

        <Link to="/accueil/livreurs" className={`sidebar-item ${isActive("/accueil/livreurs")}`}>
          <i className="pi pi-truck"></i>
          <span>Livreurs</span>
        </Link>

      </nav>
    </div>
  );
}
