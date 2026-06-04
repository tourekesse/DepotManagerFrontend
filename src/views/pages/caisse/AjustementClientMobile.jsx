import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { privateApi } from '../../../api/axios';
import useActivePointDeVenteId from '../../../hooks/useActivePointDeVenteId';

const fmt = (n) => Math.round(n || 0).toLocaleString("fr-FR");

// ── Styles globaux (light theme, bleu Material-like) ──────────────────────────
const S = {
  page: {
    minHeight: "100vh",
    background: "#f4f6f8",
    fontFamily: "'Segoe UI', sans-serif",
    color: "#1a1a2e",
    fontSize: 14,
  },
  header: {
    background: "#1565c0",
    color: "#fff",
    padding: "0 16px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    height: 60,
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow: "0 2px 12px rgba(21,101,192,0.35)",
  },
  soldeBanner: (color) => ({
    background: color || "#2e7d32",
    color: "#fff",
    padding: "8px 20px",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.02em",
  }),
  card: {
    background: "#fff",
    borderRadius: 14,
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    transition: "all 0.2s ease",
    marginBottom: 14,
    overflow: "hidden",
  },
  cardHeader: (isLiquide) => ({
    background: isLiquide ? "rgba(21, 101, 192, 0.08)" : "rgba(239, 108, 0, 0.06)",
    borderBottom: `1px solid ${isLiquide ? "rgba(21, 101, 192, 0.15)" : "rgba(239, 108, 0, 0.15)"}`,
    padding: "12px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  }),
  pill: (isLiquide) => ({
    background: isLiquide ? "rgba(21, 101, 192, 0.12)" : "rgba(239, 108, 0, 0.1)",
    color: isLiquide ? "#1565c0" : "#ef6c00",
    border: `1px solid ${isLiquide ? "rgba(21, 101, 192, 0.25)" : "rgba(239, 108, 0, 0.25)"}`,
    borderRadius: 20,
    padding: "4px 12px",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.05em",
  }),
  input: (active) => ({
    width: "100%",
    boxSizing: "border-box",
    border: `2px solid ${active ? "#1976d2" : "#e0e0e0"}`,
    borderRadius: 6,
    padding: "10px 60px 10px 12px",
    fontSize: 18,
    fontWeight: 700,
    fontFamily: "monospace",
    color: "#1a1a2e",
    background: "#fafafa",
    outline: "none",
    transition: "border 0.2s",
  }),
  btnOutline: (color) => ({
    background: "transparent",
    color: color || "#1976d2",
    border: `1px solid ${color || "#1976d2"}`,
    borderRadius: 6,
    padding: "8px 16px",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    transition: "all 0.2s",
  }),
  btnGreen: {
    background: "#2e7d32",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "11px 20px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  },
  tab: (active) => ({
    flex: 1,
    padding: "8px 4px",
    border: "none",
    borderBottom: active ? "2px solid #1976d2" : "2px solid transparent",
    background: "transparent",
    color: active ? "#1976d2" : "#888",
    fontWeight: active ? 700 : 400,
    fontSize: 13,
    cursor: "pointer",
    transition: "all 0.15s",
    fontFamily: "inherit",
  }),
  stepperBtn: {
    width: 32, height: 32,
    borderRadius: "50%",
    border: "1px solid #e0e0e0",
    background: "#f5f5f5",
    color: "#333",
    cursor: "pointer",
    fontSize: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
    fontWeight: 700,
  },
  alertInfo: {
    background: "#e3f2fd",
    border: "1px solid #90caf9",
    borderRadius: 6,
    padding: "10px 14px",
    color: "#1565c0",
    fontSize: 13,
    marginBottom: 10,
  },
  alertWarning: {
    background: "#fff8e1",
    border: "1px solid #ffe082",
    borderRadius: 6,
    padding: "10px 14px",
    color: "#f57f17",
    fontSize: 13,
    marginBottom: 10,
  },
  alertSuccess: {
    background: "#e8f5e9",
    border: "1px solid #a5d6a7",
    borderRadius: 6,
    padding: "10px 14px",
    color: "#2e7d32",
    fontSize: 13,
    marginTop: 8,
  },
  tableHead: {
    background: "#f5f5f5",
    padding: "8px 12px",
    fontSize: 11,
    fontWeight: 700,
    color: "#888",
    letterSpacing: "0.08em",
    display: "flex",
    justifyContent: "space-between",
    borderBottom: "1px solid #e8eaf0",
  },
};

// ── Barre de progression ───────────────────────────────────────────────────────
function ProgressBar({ montantTotal, restant }) {
  const percentage = montantTotal > 0 ? ((montantTotal - restant) / montantTotal) * 100 : 0;
  
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{
        height: 6,
        background: "#f0f2f5",
        borderRadius: 3,
        overflow: "hidden",
      }}>
        <div style={{
          width: `${percentage}%`,
          height: "100%",
          background: "linear-gradient(90deg, #1565c0, #26a69a)",
          borderRadius: 3,
          transition: "width 0.4s ease",
        }} />
      </div>
      <div style={{ fontSize: 10, color: "#888", marginTop: 4, textAlign: "right" }}>
        {Math.round(percentage)}% réglé
      </div>
    </div>
  );
}

// ── Carte Résumé Client ───────────────────────────────────────────────────────
function ClientSummaryCard({ dettes }) {
  const liquideDettes = dettes.filter(d => d.type === 'liquide');
  const emballageDettes = dettes.filter(d => d.type === 'emballage');
  
  const totalLiquide = liquideDettes.reduce((sum, d) => sum + (d.restant || 0), 0);
  const totalEmballage = emballageDettes.reduce((sum, d) => sum + (d.restant || 0), 0);
  const totalGeneral = totalLiquide + totalEmballage;

  return (
    <div style={{
      background: "#fff",
      borderRadius: 14,
      boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
      marginBottom: 14,
      padding: 16,
      animation: "slideIn 0.3s ease",
    }}>
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}`}</style>
      
      <div style={{ fontWeight: 800, fontSize: 14, color: "#666", marginBottom: 12, letterSpacing: "0.05em" }}>
        RÉSUMÉ DES DETTES
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Dette liquide */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>💰</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#555" }}>Dette liquide</span>
          </div>
          <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 16, color: "#1565c0" }}>
            {fmt(totalLiquide)} F
          </span>
        </div>
        
        {/* Dette emballage */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>📦</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#555" }}>Dette emballage</span>
          </div>
          <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 16, color: "#ef6c00" }}>
            {fmt(totalEmballage)} F
          </span>
        </div>
        
        {/* Séparateur */}
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #e0e0e0, transparent)" }} />
        
        {/* Total général */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#333" }}>Total général</span>
          <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 18, color: "#c62828" }}>
            {fmt(totalGeneral)} F
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AjustementClientMobile() {
  const navigate = useNavigate();
  const pvId = useActivePointDeVenteId();

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [dettes, setDettes] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingDettes, setLoadingDettes] = useState(false);

  const [cashSaisi, setCashSaisi] = useState({});
  const [animIn, setAnimIn] = useState(false);

  const [availableTypeCasiers, setAvailableTypeCasiers] = useState([]);
  const [returnedCasiers, setReturnedCasiers] = useState({});

  const [retourMode, setRetourMode] = useState({});

  useEffect(() => { setTimeout(() => setAnimIn(true), 60); }, []);

  // Charger la liste des clients
  useEffect(() => {
    const loadClients = async () => {
      try {
        setLoadingClients(true);
        const response = await privateApi.get('/api/clients', {
          params: { pointDeVenteId: pvId || 231 }
        });
        setClients(response.data || []);
      } catch (e) {
        console.error('Erreur chargement clients:', e);
      } finally {
        setLoadingClients(false);
      }
    };
    loadClients();
  }, [pvId]);

  // Charger les dettes réelles du client sélectionné
  useEffect(() => {
    const loadDettes = async () => {
      if (!selectedClient) {
        setDettes([]);
        return;
      }
      try {
        setLoadingDettes(true);
        const res = await privateApi.get(`/api/dettes/client/${selectedClient.id}`);
        let realDettes = (res.data || []).map(d => ({
          id: `dette-${d.id}`,
          originalId: d.id,
          referenceId: d.referenceId,
          type: d.typeDette?.toLowerCase() === 'emballage' ? 'emballage' : 'liquide',
          vente: `#${d.referenceId || d.id}`,
          date: new Date(d.dateCreation).toLocaleDateString('fr-FR'),
          montantTotal: Number(d.montantInitial || 0),
          restant: Number(d.montantRestant || 0),
          originalConsignedItems: [],
        }));

        const emballageDettes = realDettes.filter(d => d.type === 'emballage' && d.referenceId);
        for (const det of emballageDettes) {
          try {
            const venteRes = await privateApi.get(`/api/ventes/${det.referenceId}`);
            const vente = venteRes.data;

            const consigned = (vente.lignes || vente.details || [])
                .filter(l => l.typeCasierId || l.id_type_casier)
                .map(l => ({
                  typeCasierId: l.typeCasierId || l.id_type_casier,
                  produitNom: l.produitNom || l.nom,
                  quantite: l.quantite,
                }));

            det.originalConsignedItems = consigned;
          } catch (e) {
            console.warn('Impossible de charger les détails de la vente pour la dette', det.originalId);
          }
        }

        setDettes(realDettes);
        setCashSaisi({});
      } catch (e) {
        console.error('Erreur chargement dettes client:', e);
        setDettes([]);
      } finally {
        setLoadingDettes(false);
      }
    };
    loadDettes();
  }, [selectedClient]);

  // Charger les types de casiers consignables
  useEffect(() => {
    const loadTypeCasiers = async () => {
      if (!pvId) return;
      try {
        const res = await privateApi.get(`/api/type-casiers/point-de-vente/${pvId}/consignables`);
        setAvailableTypeCasiers(res.data || []);
      } catch (e) {
        console.error('Erreur chargement types casiers:', e);
        setAvailableTypeCasiers([]);
      }
    };
    loadTypeCasiers();
  }, [pvId]);

  // === PAIEMENT DETTE LIQUIDE ===
  const handleToutSolder = async (dette) => {
    if (!selectedClient) return;
    const montant = dette.restant;
    try {
      const clientNom = selectedClient?.raisonsociale || 'Client';
      // On capture la réponse pour cohérence (le backend décide du message)
      const res = await privateApi.post('/api/dettes/paiement', {
        client_id: selectedClient.id,
        pvId: pvId,
        montant: montant,
        type: dette.type,
        libelle: `Paiement dette liquide - ${clientNom} (${dette.vente})`,
      });
      // CORRECTION APPLIQUÉE : on retire l'élément au lieu de modifier son montant
      setDettes(prev => prev.filter(d => d.id !== dette.id));
      setCashSaisi(prev => { const c = { ...prev }; delete c[dette.id]; return c; });
      // Redirection conservée : c'est un vrai paiement avec mouvement caisse
      navigate('/accueil/caisse/journal');
    } catch (err) {
      alert("Erreur : " + (err.response?.data?.message || err.message));
    }
  };

  const handleValiderPartiel = async (dette) => {
    if (!selectedClient) return;
    const cashValue = parseFloat(cashSaisi[dette.id]) || 0;
    if (cashValue <= 0) {
      alert("Veuillez saisir un montant");
      return;
    }
    try {
      const clientNom = selectedClient?.raisonsociale || 'Client';
      // Capture réponse pour utiliser le message du backend (cohérence flow)
      const paiementRes = await privateApi.post('/api/dettes/paiement', {
        client_id: selectedClient.id,
        pvId: pvId,
        montant: cashValue,
        type: dette.type,
        libelle: `Paiement dette liquide - ${clientNom} (${dette.vente})`,
      });
      setDettes(prev => prev.map(d =>
          d.id === dette.id ? { ...d, restant: Math.max(0, d.restant - cashValue) } : d
      ));
      setCashSaisi(prev => { const c = { ...prev }; delete c[dette.id]; return c; });

      // On garde un message détaillé utile pour le partiel (reste à payer sur cette dette)
      // Le backend est quand même appelé de façon cohérente pour tous les paiements
      alert(`✅ ${fmt(cashValue)} F encaissé. Reste : ${fmt(Math.max(0, dette.restant - cashValue))} F`);
    } catch (err) {
      alert("Erreur : " + (err.response?.data?.message || err.message));
    }
  };

  // === GESTION DE LA COMPENSATION / DISPATCH ===
  const getReturnedForDette = (detteId) => returnedCasiers[detteId] || [];

  const getFullConsigneValue = (type) => {
    if (!type) return 0;
    const bouteilles = Number(type.nbre_bouteilles || 0);
    const prixBouteille = Number(type.prix_consigne_bouteille || 0);
    const prixCasier = Number(type.prix_consigne_casier || 0);
    return (bouteilles * prixBouteille) + prixCasier;
  };

  const addCasierLine = (detteId) => {
    setReturnedCasiers(prev => {
      const current = prev[detteId] || [];
      const firstType = availableTypeCasiers[0];
      if (!firstType) return prev;
      const fullValue = getFullConsigneValue(firstType);
      return {
        ...prev,
        [detteId]: [...current, { typeCasierId: firstType.id, qte: 1, valeur: fullValue * 1 }]
      };
    });
  };

  const updateCasierLine = (detteId, index, field, value) => {
    setReturnedCasiers(prev => {
      const lines = [...(prev[detteId] || [])];
      const line = { ...lines[index] };
      if (field === 'typeCasierId') {
        const type = availableTypeCasiers.find(t => t.id === Number(value));
        line.typeCasierId = Number(value);
        line.valeur = getFullConsigneValue(type) * line.qte;
      } else if (field === 'qte') {
        const q = Math.max(0, Number(value) || 0);
        line.qte = q;
        const type = availableTypeCasiers.find(t => t.id === line.typeCasierId);
        line.valeur = getFullConsigneValue(type) * q;
      }
      lines[index] = line;
      return { ...prev, [detteId]: lines };
    });
  };

  const getTotalCasiersValue = (detteId) => {
    return (returnedCasiers[detteId] || []).reduce((sum, line) => sum + (line.valeur || 0), 0);
  };

  const choisirToutRendre = async (dette) => {
    try {
      const res = await privateApi.get(`/api/dettes/${dette.originalId || dette.id}/emballages-originaux`);
      const originalLines = res.data || [];

      if (originalLines.length > 0) {
        const linesForReturn = originalLines.map(line => ({
          typeCasierId: line.idTypeCasier || null,
          qte: line.quantite,
          valeur: line.valeurConsigneTotaleLigne || 0,
          produitNom: line.nomProduit || line.typeEmballage
        }));

        setReturnedCasiers(prev => ({ ...prev, [dette.id]: linesForReturn }));
      } else {
        handleToutRendre(dette);
      }
    } catch (e) {
      console.error("Erreur récupération emballages originaux", e);
      handleToutRendre(dette);
    }

    setRetourMode(prev => ({ ...prev, [dette.id]: 'full' }));
  };

  const choisirCompensation = (dette) => {
    setRetourMode(prev => ({ ...prev, [dette.id]: 'compensation' }));
    if (!returnedCasiers[dette.id] || returnedCasiers[dette.id].length === 0) {
      addCasierLine(dette.id);
    }
  };

  const resetMode = (detteId) => {
    setRetourMode(prev => { const c = { ...prev }; delete c[detteId]; return c; });
    setReturnedCasiers(prev => { const c = { ...prev }; delete c[detteId]; return c; });
    setCashSaisi(prev => { const c = { ...prev }; delete c[detteId]; return c; });
  };

  const handleToutRendre = (dette) => {
    if (dette.originalConsignedItems && dette.originalConsignedItems.length > 0) {
      const lines = dette.originalConsignedItems.map(item => {
        const type = availableTypeCasiers.find(t => t.id === Number(item.typeCasierId));
        const fullValue = type ? getFullConsigneValue(type) : 0;

        return {
          typeCasierId: item.typeCasierId,
          qte: item.quantite,
          valeur: fullValue * item.quantite,
          produitNom: item.produitNom
        };
      });

      setReturnedCasiers(prev => ({ ...prev, [dette.id]: lines }));
    }
  };

  const handleConfirmRetourComplet = async (dette) => {
    if (!selectedClient) return;
    const mode = retourMode[dette.id];
    const casiersVal = getTotalCasiersValue(dette.id);
    const cashVal = (mode === 'full') ? 0 : (parseFloat(cashSaisi[dette.id]) || 0);
    // CORRECTION BUG : Pour le mode 'full' (retour physique), on envoie TOUJOURS 0
    // Un retour physique n'est pas un paiement - pas d'argent en jeu, juste un retour de stock
    const total = (mode === 'full') ? 0 : (casiersVal + cashVal);

    if (mode === 'full' && casiersVal === 0) {
      // Retour physique pur - on vérifie juste que des casiers sont associés
      const casierLines = returnedCasiers[dette.id] || [];
      if (casierLines.length === 0) {
        alert("Rien à valider.");
        return;
      }
    } else if ((mode === 'compensation' || cashVal > 0) && total <= 0) {
      alert("Rien à valider.");
      return;
    }

    try {
      const clientNom = selectedClient?.raisonsociale || 'Client';
      const paiementResponse = await privateApi.post('/api/dettes/paiement', {
        client_id: selectedClient.id,
        pvId: pvId,
        montant: total,
        type: dette.type,
        mode: mode, // NOUVEAU : 'full' pour retour physique, 'compensation' pour règlement cash
        libelle: mode === 'full'
            ? `Retour physique - ${clientNom} (${dette.vente})`
            : `Paiement dette emballage - ${clientNom} (Compensation ${dette.vente})`,
      });

      // CORRECTION APPLIQUÉE : on retire l'élément au lieu de modifier son montant
      setDettes(prev => prev.filter(d => d.id !== dette.id));
      resetMode(dette.id);

      const casierLines = returnedCasiers[dette.id] || [];
      if (casierLines.length > 0 && pvId) {
        const retoursPayload = casierLines.map(line => ({ typeCasierId: line.typeCasierId, quantite: line.qte }));
        try {
          await privateApi.post(`/api/dettes/${dette.originalId}/retour-casiers?pvId=${pvId}`, retoursPayload);
        } catch (stockErr) {
          console.error("Erreur mise à jour stock casiers:", stockErr);
        }
      }

      // === Feedback + navigation contextuels (amélioration du flow sans toucher la logique de paiement/retour) ===
      const res = paiementResponse.data || {};
      const aEuMouvementCaisse = res.mouvementCaisse === true;

      if (mode === 'full' || total === 0 || !aEuMouvementCaisse) {
        // Retour physique pur : aucun mouvement en caisse → on reste sur la page
        // pour pouvoir traiter les autres dettes du même client si besoin.
        alert("✅ Retour physique confirmé. Stock des casiers mis à jour.");
      } else {
        alert(`✅ ${fmt(total)} F encaissé.`);
        navigate('/accueil/caisse/journal');
      }
    } catch (err) {
      alert("Erreur : " + (err.response?.data?.message || err.message));
    }
  };

  const totalDette = dettes.reduce((s, d) => s + (d.restant || 0), 0);

  return (
      <div style={{ ...S.page, opacity: animIn ? 1 : 0, transition: "opacity 0.4s" }}>
        {/* Header */}
        <div style={{ ...S.header, justifyContent: "flex-start", gap: 8 }}>
          <button
              onClick={() => navigate('/accueil/caisse/journal')}
              style={{
                background: "transparent",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.6)",
                borderRadius: 4,
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
          >
            ← Journal
          </button>

          <div style={{ flex: 1 }}>
            {loadingClients ? (
                <div style={{ color: '#fff' }}>Chargement clients...</div>
            ) : (
                <select
                    value={selectedClient?.id || ''}
                    onChange={(e) => {
                      const client = clients.find(c => c.id === Number(e.target.value));
                      setSelectedClient(client || null);
                    }}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: 6, fontSize: 14, fontWeight: 600 }}
                >
                  <option value="">-- Sélectionner un client --</option>
                  {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.raisonsociale || c.nom || `Client ${c.id}`}
                      </option>
                  ))}
                </select>
            )}
          </div>

          <div style={{ textAlign: "right", minWidth: 120 }}>
            <div style={{ fontSize: 10, opacity: 0.7 }}>DETTE TOTALE</div>
            <div style={{ fontWeight: 900, fontSize: 17, fontFamily: "monospace" }}>
              {fmt(totalDette)} F
            </div>
          </div>
        </div>

        {/* Bannière améliorée */}
        <div style={S.soldeBanner("#c62828")}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <span style={{ fontSize: 12, fontWeight: 800 }}>
              {dettes.length} dette{dettes.length > 1 ? 's' : ''} en cours
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.9 }}>
              Total : {fmt(totalDette)} F
            </span>
          </div>
          <span style={{ fontSize: 11 }}>{new Date().toLocaleDateString("fr-FR")}</span>
        </div>

        <div style={{ padding: "14px 14px 100px", maxWidth: 520, margin: "0 auto" }}>
          {!selectedClient && (
              <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
                Sélectionnez un client ci-dessus pour voir ses dettes
              </div>
          )}

          {selectedClient && loadingDettes && (
              <div style={{ textAlign: 'center', padding: 20, color: '#666' }}>
                Chargement des dettes du client...
              </div>
          )}

          {selectedClient && !loadingDettes && dettes.length === 0 && (
              <div style={{ textAlign: 'center', padding: 20, color: '#666' }}>
                Aucune dette en cours pour ce client.
              </div>
          )}

          {/* Carte Résumé Client */}
          {selectedClient && !loadingDettes && dettes.length > 0 && (
            <ClientSummaryCard dettes={dettes} />
          )}

          {dettes.map((dette) => (
              <div key={dette.id} style={S.card}>
                {/* En-tête de la carte */}
                <div style={S.cardHeader(dette.type === "liquide")}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 26 }}>{dette.type === "liquide" ? "💰" : "📦"}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>
                        {dette.vente}
                      </div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 1 }}>{dette.date}</div>
                    </div>
                  </div>
                  <div>
                    <div style={S.pill(dette.type === "liquide")}>{dette.type === "liquide" ? "LIQUIDE" : "EMBALLAGE"}</div>
                    <div style={{ textAlign: "right", marginTop: 4 }}>
                      <span style={{ fontWeight: 900, fontSize: 18, color: "#c62828", fontFamily: "monospace" }}>
                        {fmt(dette.restant)}
                      </span>
                      <span style={{ fontSize: 10, color: "#999", marginLeft: 2 }}>F</span>
                    </div>
                  </div>
                </div>

                {/* Corps carte */}
                <div style={{ padding: 14 }}>
                  {/* Barre de progression */}
                  <ProgressBar montantTotal={dette.montantTotal} restant={dette.restant} />
                  {/* === CAS 1 : TRAITEMENT DETTE LIQUIDE === */}
                  {dette.type === "liquide" && (
                      <div>
                        {dette.restant === 0 ? (
                            <div style={S.alertSuccess}>✅ Dette soldée</div>
                        ) : (
                            <div>
                              <button
                                  onClick={() => handleToutSolder(dette)}
                                  style={{
                                    width: "100%",
                                    padding: "16px 12px",
                                    background: "#2e7d32",
                                    color: "white",
                                    border: "none",
                                    borderRadius: 8,
                                    fontWeight: 800,
                                    fontSize: 17,
                                    marginBottom: 10,
                                    boxShadow: "0 2px 6px rgba(46, 125, 50, 0.2)"
                                  }}
                              >
                                💰 TOUT PAYER<br />
                                <span style={{ fontSize: 15, fontWeight: 400 }}>{fmt(dette.restant)} F</span>
                              </button>

                              <div style={{ marginTop: 8 }}>
                                <div style={{ fontSize: 11, color: "#666", marginBottom: 4, fontWeight: 600 }}>Paiement partiel</div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <input
                                      type="number"
                                      placeholder="Montant"
                                      value={cashSaisi[dette.id] || ""}
                                      onChange={(e) => setCashSaisi((p) => ({ ...p, [dette.id]: e.target.value }))}
                                      style={{ flex: 1, padding: "10px", fontSize: 16, border: "1px solid #ccc", borderRadius: 6 }}
                                  />
                                  <button
                                      onClick={() => handleValiderPartiel(dette)}
                                      style={{ padding: "10px 16px", background: "#1976d2", color: "white", border: "none", borderRadius: 6, fontWeight: 600, whiteSpace: 'nowrap' }}
                                  >
                                    Valider
                                  </button>
                                </div>
                              </div>
                            </div>
                        )}
                      </div>
                  )}

                  {/* === CAS 2 : TRAITEMENT DETTE EMBALLAGE === */}
                  {dette.type === "emballage" && (
                      <div>
                        {dette.restant === 0 ? (
                            <div style={S.alertSuccess}>✅ Dette d'emballage entièrement soldée</div>
                        ) : (
                            <div>
                              {/* SÉLECTEUR DE MODE */}
                              <div style={{ display: "flex", background: "#f4f6f8", borderRadius: 6, padding: 3, marginBottom: 10, border: "1px solid #e0e0e0" }}>
                                <button
                                    onClick={() => choisirToutRendre(dette)}
                                    style={{
                                      flex: 1,
                                      padding: "8px 4px",
                                      border: "none",
                                      borderRadius: 4,
                                      background: retourMode[dette.id] === "full" ? "#fff" : "transparent",
                                      color: retourMode[dette.id] === "full" ? "#ef6c00" : "#666",
                                      fontWeight: retourMode[dette.id] === "full" ? 800 : 500,
                                      boxShadow: retourMode[dette.id] === "full" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                                      fontSize: 12,
                                      cursor: "pointer"
                                    }}
                                >
                                  📦 Tout Rendre (Physique)
                                </button>
                                <button
                                    onClick={() => choisirCompensation(dette)}
                                    style={{
                                      flex: 1,
                                      padding: "8px 4px",
                                      border: "none",
                                      borderRadius: 4,
                                      background: retourMode[dette.id] === "compensation" ? "#2e7d32" : "transparent",
                                      color: retourMode[dette.id] === "compensation" ? "#fff" : "#666",
                                      fontWeight: retourMode[dette.id] === "compensation" ? 800 : 500,
                                      boxShadow: retourMode[dette.id] === "compensation" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                                      fontSize: 12,
                                      cursor: "pointer"
                                    }}
                                >
                                  💵 Règlement Cash
                                </button>
                              </div>

                              {/* MODE : TOUT RENDRE */}
                              {retourMode[dette.id] === "full" && (
                                  <div style={S.alertInfo}>
                                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Mouvement de Stock uniquement :</div>
                                    {getReturnedForDette(dette.id).map((line, idx) => (
                                        <div key={idx} style={{ fontFamily: "monospace", fontSize: 13 }}>
                                          • {line.qte} × {line.produitNom || "Casier d'origine"}
                                        </div>
                                    ))}
                                    <div style={{ fontSize: 11, marginTop: 6, fontStyle: "italic", color: "#555" }}>
                                      Action : Met à jour le stock des vides. Aucun flux d'argent en caisse (0)
                                    </div>
                                  </div>
                              )}

                              {/* MODE : COMPENSATORY CASH */}
                              {retourMode[dette.id] === "compensation" && (
                                  <div style={{ background: "#efebe9", padding: 10, borderRadius: 6, marginBottom: 10, border: "1px solid #d7ccc8" }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: "#4e342e", marginBottom: 6 }}>
                                      Encaisser la caution emballage (Dispatch) :
                                    </div>

                                    {getReturnedForDette(dette.id).map((line, idx) => (
                                        <div key={idx} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                                          <select
                                              value={line.typeCasierId}
                                              onChange={(e) => updateCasierLine(dette.id, idx, "typeCasierId", e.target.value)}
                                              style={{ flex: 1, padding: 6, borderRadius: 4, fontSize: 12 }}
                                          >
                                            {availableTypeCasiers.map(t => (
                                                <option key={t.id} value={t.id}>{t.nom || `Casier ${t.id}`}</option>
                                            ))}
                                          </select>

                                          <input
                                              type="number"
                                              value={line.qte}
                                              onChange={(e) => updateCasierLine(dette.id, idx, "qte", e.target.value)}
                                              style={{ width: 50, padding: 5, textAlign: "center", borderRadius: 4, border: "1px solid #ccc" }}
                                          />

                                          <div style={{ minWidth: 75, textAlign: "right", fontFamily: "monospace", fontWeight: 700, fontSize: 12 }}>
                                            {fmt(line.valeur)} F
                                          </div>
                                        </div>
                                    ))}

                                    <div style={{ borderTop: "1px dashed #d7ccc8", marginTop: 8, paddingTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                      <span style={{ fontSize: 11, fontWeight: 700, color: "#2e7d32" }}>Total à faire entrer en Caisse :</span>
                                      <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 14, color: "#2e7d32" }}>
                              {fmt(getTotalCasiersValue(dette.id))} FCFA
                            </span>
                                    </div>
                                  </div>
                              )}

                              {/* ACTIONS DE VALIDATION */}
                              {retourMode[dette.id] && (
                                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                                    <button
                                        onClick={() => resetMode(dette.id)}
                                        style={{ padding: "10px", background: "#f5f5f5", border: "1px solid #ccc", borderRadius: 6, fontSize: 13, cursor: "pointer" }}
                                    >
                                      Annuler
                                    </button>
                                    <button
                                        onClick={() => handleConfirmRetourComplet(dette)}
                                        style={{
                                          flex: 1,
                                          padding: "10px",
                                          background: retourMode[dette.id] === "full" ? "#ef6c00" : "#2e7d32",
                                          color: "white",
                                          border: "none",
                                          borderRadius: 6,
                                          fontWeight: 700,
                                          fontSize: 13,
                                          cursor: "pointer"
                                        }}
                                    >
                                      {retourMode[dette.id] === "full"
                                          ? "✓ Confirmer le Retour Physique (0 F)"
                                          : `✓ Valider l'Encaissement (${fmt(getTotalCasiersValue(dette.id))} F)`
                                      }
                                    </button>
                                  </div>
                              )}
                            </div>
                        )}
                      </div>
                  )}
                </div>
              </div>
          ))}
        </div>
      </div>
  );
}