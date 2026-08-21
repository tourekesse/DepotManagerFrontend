import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { privateApi } from '../../../api/axios';
import useActivePointDeVenteId from '../../../hooks/useActivePointDeVenteId';
import { getCurrencySymbol } from '../../../utils/currencyUtils';

const fmt = (n) => Math.round(n || 0).toLocaleString("fr-FR");

// ── Design mobile-first Abidjan · palette DepotManager tropical ───────────────
const C = {
    teal: "#1ABC9C",
    tealDark: "#16A085",
    orange: "#FF6B35",
    orangeDark: "#E55100",
    green: "#27AE60",
    ink: "#1A1A1A",
    muted: "#6B7280",
    cream: "#F8F9FA",
    card: "#FFFFFF",
};

const S = {
    page: {
        minHeight: "100dvh",
        width: "100%",
        boxSizing: "border-box",
        overflowX: "hidden",
        background: `linear-gradient(180deg, ${C.cream} 0%, #EEF2F0 45%, #F5F0EB 100%)`,
        fontFamily: '"Poppins", "Inter", system-ui, sans-serif',
        color: C.ink,
        fontSize: 15,
        WebkitFontSmoothing: "antialiased",
    },
    header: {
        background: `linear-gradient(135deg, ${C.tealDark} 0%, ${C.teal} 55%, #26D0CE 100%)`,
        color: "#fff",
        padding: "0 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        height: 60,
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 8px 32px rgba(22, 160, 133, 0.35)",
    },
    soldeBanner: (color) => ({
            background: color || C.green,
            color: "#fff",
            padding: "8px 20px",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.02em",
        }),
    card: (isLiquide) => ({
            width: "100%",
            boxSizing: "border-box",
            background: C.card,
            borderRadius: 18,
            boxShadow: "0 4px 20px rgba(26, 26, 26, 0.06), 0 1px 3px rgba(26, 26, 26, 0.04)",
            border: "1px solid rgba(255,255,255,0.8)",
            borderLeft: `5px solid ${isLiquide ? C.teal : C.orange}`,
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            marginBottom: 16,
            overflow: "hidden",
        }),
    cardHeader: (isLiquide) => ({
            background: isLiquide
                    ? "linear-gradient(90deg, rgba(26,188,156,0.1) 0%, transparent 100%)"
                    : "linear-gradient(90deg, rgba(255,107,53,0.1) 0%, transparent 100%)",
            borderBottom: `1px solid ${isLiquide ? "rgba(26,188,156,0.12)" : "rgba(255,107,53,0.12)"}`,
            padding: "14px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            minWidth: 0,
        }),
    pill: (isLiquide) => ({
            background: isLiquide ? "rgba(26,188,156,0.14)" : "rgba(255,107,53,0.12)",
            color: isLiquide ? C.tealDark : C.orangeDark,
            border: `1px solid ${isLiquide ? "rgba(26,188,156,0.3)" : "rgba(255,107,53,0.28)"}`,
            borderRadius: 999,
            padding: "5px 12px",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
        }),
    input: (active) => ({
            width: "100%",
            boxSizing: "border-box",
            border: `2px solid ${active ? C.teal : "#E5E7EB"}`,
            borderRadius: 14,
            padding: "12px 14px",
            fontSize: "clamp(17px, 5vw, 22px)",
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            color: C.ink,
            background: "#FAFBFC",
            outline: "none",
            transition: "border 0.2s, box-shadow 0.2s",
            boxShadow: active ? "0 0 0 4px rgba(26,188,156,0.15)" : "none",
        }),
    btnPrimary: {
        width: "100%",
        minHeight: 52,
        padding: "13px 16px",
        background: `linear-gradient(135deg, ${C.teal} 0%, ${C.tealDark} 100%)`,
        color: "#fff",
        border: "none",
        borderRadius: 14,
        fontWeight: 700,
        fontSize: "clamp(14px, 4.4vw, 16px)",
        cursor: "pointer",
        boxShadow: "0 6px 20px rgba(26, 188, 156, 0.35)",
        letterSpacing: "0.02em",
    },
    btnOutline: (color) => ({
            width: "100%",
            minHeight: 48,
            background: "#fff",
            color: color || C.green,
            border: `2px solid ${color || C.green}`,
            borderRadius: 14,
            padding: "11px 12px",
            fontWeight: 700,
            fontSize: "clamp(13px, 4vw, 15px)",
            cursor: "pointer",
            transition: "all 0.2s",
        }),
    btnGreen: {
        background: `linear-gradient(135deg, ${C.green} 0%, #229954 100%)`,
        color: "#fff",
        border: "none",
        borderRadius: 14,
        padding: "13px 16px",
        minHeight: 52,
        fontWeight: 700,
        fontSize: "clamp(13px, 4vw, 15px)",
        cursor: "pointer",
        boxShadow: "0 6px 20px rgba(39, 174, 96, 0.3)",
    },
    kpiChip: {
        flex: 1,
        textAlign: "center",
        background: "rgba(255,255,255,0.22)",
        backdropFilter: "blur(8px)",
        borderRadius: 12,
        padding: "8px 6px",
        border: "1px solid rgba(255,255,255,0.25)",
    },
    kpiLabel: {
        fontSize: 9,
        fontWeight: 700,
        opacity: 0.85,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        marginBottom: 2,
    },
    kpiValue: {
        fontSize: 13,
        fontWeight: 800,
        fontVariantNumeric: "tabular-nums",
        lineHeight: 1.2,
    },
    selectClient: {
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        padding: "12px 14px",
        borderRadius: 14,
        fontSize: 15,
        fontWeight: 600,
        border: "none",
        background: "rgba(255,255,255,0.95)",
        color: C.ink,
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        outline: "none",
        appearance: "none",
        WebkitAppearance: "none",
    },
    backBtn: {
        background: "rgba(255,255,255,0.18)",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.35)",
        borderRadius: 12,
        padding: "10px 12px",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        flexShrink: 0,
        minHeight: 44,
        minWidth: 44,
    },
    segmentWrap: {
        display: "flex",
        background: "#EEF2F0",
        borderRadius: 14,
        padding: 4,
        marginBottom: 12,
        border: "1px solid #E5E7EB",
    },
    segmentBtn: (active, variant) => ({
            flex: 1,
            minHeight: 48,
            padding: "10px 8px",
            border: "none",
            borderRadius: 11,
            background: active
                    ? variant === "full"
                    ? `linear-gradient(135deg, ${C.orange} 0%, ${C.orangeDark} 100%)`
                    : `linear-gradient(135deg, ${C.green} 0%, #229954 100%)`
                    : "transparent",
            color: active ? "#fff" : C.muted,
            fontWeight: active ? 700 : 500,
            boxShadow: active ? "0 4px 12px rgba(0,0,0,0.12)" : "none",
            fontSize: 12,
            cursor: "pointer",
            transition: "all 0.2s ease",
        }),
    alertInfo: {
        background: "linear-gradient(135deg, #E8F8F5 0%, #D5F5ED 100%)",
        border: "1px solid rgba(26,188,156,0.25)",
        borderRadius: 14,
        padding: "12px 14px",
        color: C.tealDark,
        fontSize: 13,
        marginBottom: 10,
    },
    alertWarning: {
        background: "linear-gradient(135deg, #FFF8F0 0%, #FFEDD5 100%)",
        border: "1px solid rgba(255,107,53,0.25)",
        borderRadius: 14,
        padding: "12px 14px",
        color: C.orangeDark,
        fontSize: 13,
        marginBottom: 10,
    },
    alertSuccess: {
        background: "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)",
        border: "1px solid rgba(39,174,96,0.3)",
        borderRadius: 14,
        padding: "12px 14px",
        color: C.green,
        fontSize: 13,
        marginTop: 8,
        fontWeight: 600,
    },
    emptyState: {
        textAlign: "center",
        padding: "48px 24px",
        color: C.muted,
    },
    emptyIcon: {
        width: 72,
        height: 72,
        borderRadius: "50%",
        background: "linear-gradient(135deg, rgba(26,188,156,0.15) 0%, rgba(255,107,53,0.1) 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 32,
        margin: "0 auto 16px",
    },
    amountHero: {
        fontWeight: 900,
        fontSize: "clamp(17px, 5.5vw, 22px)",
        color: "#DC2626",
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "-0.02em",
    },
};

// ── Barre de progression ───────────────────────────────────────────────────────
function ProgressBar( { montantTotal, restant }) {
    const percentage = montantTotal > 0 ? ((montantTotal - restant) / montantTotal) * 100 : 0;

    return (
            <div style={{marginTop: 12, marginBottom: 4}}>
                <div style={{display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginBottom: 6}}>
                    <span>Progression</span>
                    <span style={{fontWeight: 700, color: C.tealDark}}>{Math.round(percentage)}% réglé</span>
                </div>
                <div style={{height: 8, background: "#EEF2F0", borderRadius: 999, overflow: "hidden"}}>
                    <div style={{
                            width: `${percentage}%`,
                            height: "100%",
                            background: `linear-gradient(90deg, ${C.teal}, #26D0CE)`,
                            borderRadius: 999,
                            transition: "width 0.4s ease",
                             }} />
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
    const [compenseDette, setCompenseDette] = useState(null);
    const [compenseCashAmount, setCompenseCashAmount] = useState(0);
    const [showCompenseHelp, setShowCompenseHelp] = useState(false);

    useEffect(() => {
        setTimeout(() => setAnimIn(true), 60);
    }, []);

    // Charger la liste des clients
    useEffect(() => {
        const loadClients = async () => {
            try {
                setLoadingClients(true);
                const response = await privateApi.get('/api/clients', {
                    params: {pointDeVenteId: pvId || 231}
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
                const modes = {};
                const retours = {};
                for (const d of realDettes) {
                    if (d.type === 'emballage') {
                        modes[d.id] = 'full';
                        const lines = (d.originalConsignedItems || []).map(item => {
                            const type = availableTypeCasiers.find(t => t.id === Number(item.typeCasierId));
                            const fullValue = type ? getFullConsigneValue(type) : 0;
                            return {
                                typeCasierId: item.typeCasierId,
                                qte: item.quantite,
                                valeur: fullValue * item.quantite,
                                produitNom: item.produitNom
                            };
                        });
                        if (lines.length > 0) retours[d.id] = lines;
                    }
                }
                setRetourMode(modes);
                if (Object.keys(retours).length > 0) setReturnedCasiers(prev => ({...prev, ...retours}));
            } catch (e) {
                console.error('Erreur chargement dettes client:', e);
                setDettes([]);
            } finally {
                setLoadingDettes(false);
            }
        };
        loadDettes();
    }, [selectedClient]);

    // Rattrapage des valeurs de consigne quand les types de casiers sont chargés
    useEffect(() => {
        if (!availableTypeCasiers.length) return;
        setReturnedCasiers(prev => {
            let changed = false;
            const next = {};
            for (const detteId of Object.keys(prev)) {
                next[detteId] = prev[detteId].map(line => {
                    if (line.valeur === 0 && line.typeCasierId && line.qte > 0) {
                        const type = availableTypeCasiers.find(t => t.id === Number(line.typeCasierId));
                        if (type) {
                            changed = true;
                            return {...line, valeur: getFullConsigneValue(type) * line.qte};
                        }
                    }
                    return line;
                });
            }
            return changed ? {...prev, ...next} : prev;
        });
    }, [availableTypeCasiers]);

    // Charger les types de casiers consignables
    useEffect(() => {
        const loadTypeCasiers = async () => {
            if (!pvId)
                return;
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
        if (!selectedClient)
            return;
        const montant = dette.restant;
        const confirme = window.confirm(
                `Encaisser ${fmt(montant)} F pour la vente ${dette.vente} ?\n\nCette action soldera la dette liquide en une fois.`
                );
        if (!confirme)
            return;
        try {
            const clientNom = selectedClient?.raisonsociale || 'Client';
            await privateApi.post('/api/dettes/paiement', {
                client_id: selectedClient.id,
                pvId: pvId,
                montant: montant,
                type: dette.type,
                libelle: `Paiement dette liquide - ${clientNom} (${dette.vente})`,
            });
            // CORRECTION APPLIQUÉE : on retire l'élément au lieu de modifier son montant
            setDettes(prev => prev.filter(d => d.id !== dette.id));
            setCashSaisi(prev => {
                const c = {...prev};
                delete c[dette.id];
                return c;
            });
            navigate('/accueil/caisse/journal');
        } catch (err) {
            alert("Erreur : " + (err.response?.data?.message || err.message));
        }
    };

    const handleValiderPartiel = async (dette) => {
        if (!selectedClient)
            return;
        const cashValue = parseFloat(cashSaisi[dette.id]) || 0;
        if (cashValue <= 0) {
            alert("Veuillez saisir un montant");
            return;
        }
        try {
            const clientNom = selectedClient?.raisonsociale || 'Client';
            await privateApi.post('/api/dettes/paiement', {
                client_id: selectedClient.id,
                pvId: pvId,
                montant: cashValue,
                type: dette.type,
                libelle: `Paiement dette liquide - ${clientNom} (${dette.vente})`,
            });
            setDettes(prev => prev.map(d =>
                    d.id === dette.id ? {...d, restant: Math.max(0, d.restant - cashValue)} : d
                ));
            setCashSaisi(prev => {
                const c = {...prev};
                delete c[dette.id];
                return c;
            });
            alert(`✅ ${fmt(cashValue)} F encaissé. Reste : ${fmt(Math.max(0, dette.restant - cashValue))} F`);
        } catch (err) {
            alert("Erreur : " + (err.response?.data?.message || err.message));
        }
    };

    // === GESTION DE LA COMPENSATION / DISPATCH ===
    const getReturnedForDette = (detteId) => returnedCasiers[detteId] || [];

    const getFullConsigneValue = (type) => {
        if (!type) return 0;

        const totalDirect = Number(
            type.consigneTotaleParCasier ||
            type.consigne_totale_par_casier ||
            type.consigneTotale ||
            type.consigne ||
            0
        );

        if (totalDirect > 0) {
            return totalDirect;
        }

        const bouteilles = Number(
            type.nbre_bouteilles ||
            type.nbreBouteilles ||
            type.nombreBouteilles ||
            0
        );

        const prixBouteille = Number(
            type.prix_consigne_bouteille ||
            type.prixConsigneBouteille ||
            type.consigneBouteille ||
            0
        );

        const prixCasier = Number(
            type.prix_consigne_casier ||
            type.prixConsigneCasier ||
            type.consigneCasier ||
            0
        );

        return (bouteilles * prixBouteille) + prixCasier;
    };

    const addCasierLine = (detteId) => {
        setReturnedCasiers(prev => {
            const current = prev[detteId] || [];
            const firstType = availableTypeCasiers[0];
            if (!firstType)
                return prev;
            const fullValue = getFullConsigneValue(firstType);
            const nom = firstType.nomDisplay || firstType.nom;
            return {
                ...prev,
                [detteId]: [...current, {typeCasierId: firstType.id, qte: 1, valeur: fullValue * 1, produitNom: nom}]
            };
        });
    };

    const updateCasierLine = (detteId, index, field, value) => {
        setReturnedCasiers(prev => {
            const lines = [...(prev[detteId] || [])];
            const line = {...lines[index]};
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
            return {...prev, [detteId]: lines};
        });
    };

    const getLineConsigneValue = (line) => {
        if (line.valeur > 0) return line.valeur;
        let type = availableTypeCasiers.find(t => t.id === Number(line.typeCasierId));
        if (!type && line.produitNom) {
            type = availableTypeCasiers.find(t => (t.nomDisplay || t.nom) === line.produitNom);
        }
        return type ? getFullConsigneValue(type) * (line.qte || 0) : 0;
    };

    const getTotalCasiersValue = (detteId) => {
        return (returnedCasiers[detteId] || []).reduce((sum, line) => sum + getLineConsigneValue(line), 0);
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

                setReturnedCasiers(prev => ({...prev, [dette.id]: linesForReturn}));
            } else {
                handleToutRendre(dette);
            }
        } catch (e) {
            console.error("Erreur récupération emballages originaux", e);
            handleToutRendre(dette);
        }

        setRetourMode(prev => ({...prev, [dette.id]: 'full'}));
    };

    const choisirCompensation = (dette) => {
        setRetourMode(prev => ({...prev, [dette.id]: 'compensation'}));
        if (!returnedCasiers[dette.id] || returnedCasiers[dette.id].length === 0) {
            addCasierLine(dette.id);
        }
    };

    const resetMode = (detteId) => {
        setRetourMode(prev => {
            const c = {...prev};
            delete c[detteId];
            return c;
        });
        setReturnedCasiers(prev => {
            const c = {...prev};
            delete c[detteId];
            return c;
        });
        setCashSaisi(prev => {
            const c = {...prev};
            delete c[detteId];
            return c;
        });
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

            setReturnedCasiers(prev => ({...prev, [dette.id]: lines}));
        }
    };

    const handleConfirmRetourComplet = async (dette) => {
        if (!selectedClient)
            return;
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
            await privateApi.post('/api/dettes/paiement', {
                client_id: selectedClient.id,
                pvId: pvId,
                montant: total,
                type: dette.type,
                mode: mode, // NOUVEAU : 'full' pour retour physique, 'compensation' pour règlement cash
                libelle: mode === 'full'
                        ? `Retour physique - ${clientNom} (${dette.vente})`
                        : `Compensation emballage - ${clientNom} (${dette.vente})`,
            });

            // CORRECTION APPLIQUÉE : on retire l'élément au lieu de modifier son montant
            setDettes(prev => prev.filter(d => d.id !== dette.id));
            resetMode(dette.id);
            alert(`✅ Mouvement enregistré avec succès ! ${fmt(total)} F`);

            const casierLines = returnedCasiers[dette.id] || [];
            if (casierLines.length > 0 && pvId) {
                const retoursPayload = casierLines.map(line => ({typeCasierId: line.typeCasierId, quantite: line.qte}));
                try {
                    await privateApi.post(`/api/dettes/${dette.originalId}/retour-casiers?pvId=${pvId}`, retoursPayload);
                } catch (stockErr) {
                    console.error("Erreur mise à jour stock casiers:", stockErr);
                }
            }
            navigate('/accueil/caisse/journal');
        } catch (err) {
            alert("Erreur : " + (err.response?.data?.message || err.message));
        }
    };

    const handleValidateCompense = async () => {
        if (!selectedClient || !compenseDette) return;
        const casierLines = returnedCasiers[compenseDette.id] || [];
        const cashVal = Number(compenseCashAmount) || 0;
        const casiersVal = getTotalCasiersValue(compenseDette.id);
        const totalCompensation = casiersVal + cashVal;

        if (totalCompensation <= 0 && casierLines.length === 0) {
            alert("Rien à valider. Ajoutez des casiers ou un montant.");
            return;
        }

        try {
            const clientNom = selectedClient?.raisonsociale || 'Client';
            await privateApi.post('/api/dettes/paiement', {
                client_id: selectedClient.id,
                pvId: pvId,
                montant: cashVal,
                type: compenseDette.type,
                mode: 'compensation',
                valeurCasiers: casiersVal,
                libelle: `Compensation emballage - ${clientNom} (${compenseDette.vente})`,
            });

            setDettes(prev => prev.filter(d => d.id !== compenseDette.id));
            setReturnedCasiers(prev => {
                const c = {...prev};
                delete c[compenseDette.id];
                return c;
            });

            if (casierLines.length > 0 && pvId && compenseDette.originalId) {
                const retoursPayload = casierLines.map(line => ({typeCasierId: line.typeCasierId, quantite: line.qte}));
                try {
                    await privateApi.post(`/api/dettes/${compenseDette.originalId}/retour-casiers?pvId=${pvId}`, retoursPayload);
                } catch (stockErr) {
                    console.error("Erreur mise à jour stock casiers:", stockErr);
                }
            }

            setCompenseDette(null);
            setCompenseCashAmount(0);
            alert(`✅ Compensation enregistrée ! Espèces: ${fmt(cashVal)} F · Emballages: ${fmt(casiersVal)} F`);
            navigate('/accueil/caisse/journal');
        } catch (err) {
            alert("Erreur : " + (err.response?.data?.message || err.message));
        }
    };

    const totalLiquide = dettes
            .filter((d) => d.type === "liquide")
            .reduce((s, d) => s + (d.restant || 0), 0);
    const totalEmballage = dettes
            .filter((d) => d.type === "emballage")
            .reduce((s, d) => s + (d.restant || 0), 0);
    const totalDette = totalLiquide + totalEmballage;

    return (
            <div style={{...S.page, opacity: animIn ? 1 : 0, transition: "opacity 0.4s"}}>
                {/* Header compact : client + résumé dettes */}
                <div style={{
                        ...S.header,
                        flexDirection: "column",
                        alignItems: "stretch",
                        height: "auto",
                        padding: "12px 14px 14px",
                        gap: 10,
                         }}>
                    <div style={{display: "flex", alignItems: "center", gap: 10}}>
                        <button
                            onClick={() => navigate('/accueil/caisse/journal')}
                            style={S.backBtn}
                            aria-label="Retour journal caisse"
                            >
                            ←
                        </button>
            
                        <div style={{flex: 1, minWidth: 0}}>
                            <div style={{fontSize: 10, fontWeight: 700, opacity: 0.9, letterSpacing: "0.1em", marginBottom: 4, textTransform: "uppercase"}}>
                                Règlement client
                            </div>
                            {loadingClients ? (
                            <div style={{color: '#fff', fontSize: 14, fontWeight: 500}}>Chargement...</div>
                                        ) : (
                            <select
                                value={selectedClient?.id || ''}
                                onChange={(e) => {
                                                        const client = clients.find(c => c.id === Number(e.target.value));
                                                        setSelectedClient(client || null);
                                                    }}
                                style={S.selectClient}
                                >
                                <option value="">Choisir un client</option>
                                {clients.map(c => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.raisonsociale || c.nom || `Client ${c.id}`}
                                                    </option>
                                                                ))}
                            </select>
                                        )}
                        </div>
                    </div>
            
                    {selectedClient && loadingDettes && (
                            <div style={{fontSize: 12, opacity: 0.9, textAlign: "center", padding: "4px 0"}}>
                                Chargement des dettes...
                            </div>
                                )}
            
                    {selectedClient && !loadingDettes && dettes.length > 0 && (
                            <div style={{display: "flex", gap: 8}}>
                                <div style={S.kpiChip}>
                                    <div style={S.kpiLabel}>Liquide</div>
                                    <div style={S.kpiValue}>{fmt(totalLiquide)}</div>
                                </div>
                                <div style={S.kpiChip}>
                                    <div style={S.kpiLabel}>Emballage</div>
                                    <div style={S.kpiValue}>{fmt(totalEmballage)}</div>
                                </div>
                                <div style={{...S.kpiChip, background: "rgba(255,255,255,0.32)"}}>
                                    <div style={S.kpiLabel}>Total</div>
                                    <div style={{...S.kpiValue, fontSize: 14}}>{fmt(totalDette)} F</div>
                                </div>
                            </div>
                                )}
            
                    {selectedClient && !loadingDettes && dettes.length === 0 && (
                            <div style={{fontSize: 12, opacity: 0.9, textAlign: "center", padding: "4px 0", fontWeight: 500}}>
                                ✓ Aucune dette en cours
                            </div>
                                )}
                </div>
            
                <div style={{padding: "16px 14px 100px", maxWidth: 480, width: "100%", boxSizing: "border-box", margin: "0 auto", overflowX: "hidden"}}>
                    {!selectedClient && (
                            <div style={S.emptyState}>
                                <div style={S.emptyIcon}>👤</div>
                                <div style={{fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 6}}>Qui paie ?</div>
                                <div style={{fontSize: 14, lineHeight: 1.5}}>Sélectionnez un client en haut pour encaisser en 2 taps.</div>
                            </div>
                                )}
            
                    {selectedClient && loadingDettes && (
                            <div style={S.emptyState}>
                                <div style={{...S.emptyIcon, fontSize: 24}}>⏳</div>
                                <div style={{fontWeight: 600}}>Chargement des dettes...</div>
                            </div>
                                )}
            
                    {selectedClient && !loadingDettes && dettes.length === 0 && (
                            <div style={S.emptyState}>
                                <div style={S.emptyIcon}>✓</div>
                                <div style={{fontWeight: 700, fontSize: 16, color: C.green}}>Compte à jour</div>
                                <div style={{fontSize: 14, marginTop: 6}}>Aucune dette pour ce client.</div>
                            </div>
                                )}
            
                    {dettes.map((dette) => (
                                <div key={dette.id} style={S.card(dette.type === "liquide")}>
                                    {/* En-tête de la carte */}
                                    <div style={S.cardHeader(dette.type === "liquide")}>
                                        <div style={{display: "flex", alignItems: "center", gap: 10, minWidth: 0}}>
                                            <span style={{fontSize: 26}}>{dette.type === "liquide" ? "💰" : "📦"}</span>
                                            <div style={{minWidth: 0}}>
                                                <div style={{fontWeight: 800, fontSize: 16, lineHeight: 1.2}}>
                                                    {dette.vente}
                                                </div>
                                                <div style={{fontSize: 12, color: "#888", marginTop: 1}}>{dette.date}</div>
                                            </div>
                                        </div>
                                        <div style={{flexShrink: 0, textAlign: "right"}}>
                                            <div style={S.pill(dette.type === "liquide")}>{dette.type === "liquide" ? "LIQUIDE" : "EMBALLAGE"}</div>
                                            <div style={{textAlign: "right", marginTop: 6}}>
                                                <span style={S.amountHero}>{fmt(dette.restant)}</span>
                                                <span style={{fontSize: 11, color: C.muted, marginLeft: 3, fontWeight: 600}}>{getCurrencySymbol()}</span>
                                            </div>
                                        </div>
                                    </div>
                        
                                    {/* Corps carte */}
                                    <div style={{padding: "16px"}}>
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
                                                                                             style={{...S.btnPrimary, marginBottom: 16}}
                                                                                             >
                                                                                             Tout solder {fmt(dette.restant)} F
                                                                                         </button>
                                                                                         <div style={{display: "flex", alignItems: "center", gap: 8, margin: "0 0 16px"}}>
                                                                                             <div style={{flex: 1, height: 1, background: "#E5E7EB"}} />
                                                                                             <span style={{fontSize: 11, color: C.muted, fontWeight: 600}}>ou saisir un montant</span>
                                                                                             <div style={{flex: 1, height: 1, background: "#E5E7EB"}} />
                                                                                         </div>
                                                                                         <div style={{fontSize: 12, color: C.muted, marginBottom: 8, fontWeight: 600}}>
                                                                                             Montant à encaisser
                                                                                         </div>
                                                                                         <input
                                                                                             type="number"
                                                                                             inputMode="numeric"
                                                                                             placeholder="0"
                                                                                             value={cashSaisi[dette.id] || ""}
                                                                                             onChange={(e) => setCashSaisi((p) => ({...p, [dette.id]: e.target.value}))}
                                                                                             style={{...S.input(!!cashSaisi[dette.id]), marginBottom: 12}}
                                                                                             />
                                                                 
                                                                                         <button
                                                                                             onClick={() => handleValiderPartiel(dette)}
                                                                                             style={S.btnOutline(C.teal)}
                                                                                             >
                                                                                             Encaisser {cashSaisi[dette.id] ? fmt(parseFloat(cashSaisi[dette.id]) || 0) : ""} F
                                                                                         </button>
                                                                 
                                                                                         <div style={{fontSize: 11, color: C.muted, textAlign: "center", marginTop: 8}}>
                                                                                             Vente {dette.vente}
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
                                                                                         {/* Boutons d'action */}
                                                                                          <div style={{display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12}}>
                                                                                             <button
                                                                                                 onClick={() => choisirToutRendre(dette)}
                                                                                                 style={{
                                                                                                      flex: "1 1 145px", minHeight: 48, padding: "10px 8px",
                                                                                                     border: "none", borderRadius: 11,
                                                                                                     background: `linear-gradient(135deg, ${C.orange} 0%, ${C.orangeDark} 100%)`,
                                                                                                     color: "#fff", fontWeight: 700, fontSize: 12,
                                                                                                     cursor: "pointer",
                                                                                                     boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                                                                                                 }}
                                                                                             >
                                                                                                  📦 Retour d'emballages
                                                                                             </button>
                                                                                             <button
                                                                                                 onClick={() => setCompenseDette(dette)}
                                                                                                 style={{
                                                                                                      flex: "1 1 145px", minHeight: 48, padding: "10px 8px",
                                                                                                     border: `2px solid ${C.green}`, borderRadius: 11,
                                                                                                     background: "#fff", color: C.green, fontWeight: 700, fontSize: 12,
                                                                                                     cursor: "pointer",
                                                                                                 }}
                                                                                             >
                                                                                                   💰 Compensation
                                                                                             </button>
                                                                                         </div>
                                                                 
                                                                                         {/* Liste des articles retournés */}
                                                                                          <div style={S.alertInfo}>
                                                                                               <div style={{fontWeight: 700, marginBottom: 4}}>Emballages retournés :</div>
                                                                                              {getReturnedForDette(dette.id).length > 0 ? (
                                                                                                  getReturnedForDette(dette.id).map((line, idx) => (
                                                                                                       <div key={idx} style={{display: "flex", alignItems: "center", gap: 6, minWidth: 0}}>
                                                                                                           <span style={{fontFamily: "monospace", fontSize: 13, flex: 1, minWidth: 0, overflowWrap: "anywhere"}}>
                                                                                                              • {line.qte} × {line.produitNom || "Casier d'origine"}
                                                                                                          </span>
                                                                                                          <button
                                                                                                              onClick={() => {
                                                                                                                  setReturnedCasiers(prev => ({
                                                                                                                      ...prev,
                                                                                                                      [dette.id]: (prev[dette.id] || []).filter((_, i) => i !== idx)
                                                                                                                  }));
                                                                                                              }}
                                                                                                              style={{background: "none", border: "none", color: "#DC2626", fontSize: 14, cursor: "pointer", padding: "2px 4px", lineHeight: 1}}
                                                                                                          >
                                                                                                              ✕
                                                                                                          </button>
                                                                                                      </div>
                                                                                                  ))
                                                                                              ) : (
                                                                                                  <div style={{fontSize: 12, fontStyle: "italic"}}>Aucun article consigné trouvé</div>
                                                                                              )}
                                                                                           </div>
                                                                 
                                                                                         {/* Bouton confirmer retour */}
                                                                                         <button
                                                                                             onClick={() => handleConfirmRetourComplet(dette)}
                                                                                             style={S.btnGreen}
                                                                                         >
                                                                                                Valider retour · caisse 0 F
                                                                                         </button>
                                                                                     </div>
                                                                                        )}
                                                        </div>
                                                            )}
                                    </div>
                                </div>
                                    ))}
                </div>

                {/* ── MODAL RÈGLEMENT EMBALLAGE ─────────────────────────────── */}
                {compenseDette && (
                    <div style={{
                            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                            background: "rgba(0,0,0,0.5)", zIndex: 1000,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            padding: 12,
                            boxSizing: "border-box",
                        }}
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setCompenseDette(null);
                                setCompenseCashAmount(0);
                                setShowCompenseHelp(false);
                            }
                        }}
                    >
                        <div style={{
                                background: "#fff", borderRadius: 18, width: "100%", maxWidth: 420,
                                boxSizing: "border-box",
                                maxHeight: "90vh", overflowY: "auto",
                                boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                                animation: "fadeSlideIn 0.2s ease",
                            }}
                        >
                            {/* Header */}
                            <div style={{
                                    ...S.cardHeader(false),
                                    borderBottom: "1px solid #E5E7EB",
                                    padding: "14px 16px",
                                }}
                            >
                                <div style={{fontWeight: 800, fontSize: 16, minWidth: 0, overflowWrap: "anywhere"}}>
                                    💰 Compensation emballage {compenseDette.vente}
                                </div>
                                <button
                                    onClick={() => { setCompenseDette(null); setCompenseCashAmount(0); setShowCompenseHelp(false); }}
                                    style={{background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.muted, padding: 4}}
                                >
                                    ✕
                                </button>
                            </div>

                            <div style={{padding: 16, boxSizing: "border-box"}}>
                                {/* Info dette */}
                                <div style={S.alertInfo}>
                                    <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8}}>
                                        <div>
                                            <div style={{fontWeight: 700, marginBottom: 4}}>Dette : {fmt(compenseDette.restant)} F</div>
                                            <div style={{fontWeight: 800, fontSize: 18, color: C.green}}>
                                                Reste : {fmt(Math.max(0, compenseDette.restant - getTotalCasiersValue(compenseDette.id) - (Number(compenseCashAmount) || 0)))} F
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowCompenseHelp(v => !v)}
                                            style={{background: "rgba(255,255,255,0.65)", border: `1px solid rgba(26,188,156,0.35)`, color: C.tealDark, borderRadius: 999, padding: "7px 10px", fontWeight: 800, fontSize: 12, cursor: "pointer", flexShrink: 0}}
                                            type="button"
                                        >
                                            Aide
                                        </button>
                                    </div>
                                    {showCompenseHelp && (
                                        <div style={{fontSize: 12, fontWeight: 600, marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(26,188,156,0.25)", lineHeight: 1.45}}>
                                            Compensation = emballages différents, espèces, ou les deux. Les espèces entrent en caisse; les emballages augmentent le stock vide et diminuent la dette.
                                        </div>
                                    )}
                                </div>

                                {/* Section casiers */}
                                <div style={{fontWeight: 700, fontSize: 14, marginBottom: 8, marginTop: 12}}>
                                    📦 Emballages retournés
                                </div>

                                {(returnedCasiers[compenseDette.id] || []).map((line, idx) => (
                                    <div key={idx} style={{display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8, alignItems: "center"}}>
                                        <select
                                            value={line.typeCasierId || ''}
                                            onChange={(e) => updateCasierLine(compenseDette.id, idx, 'typeCasierId', e.target.value)}
                                            style={{
                                                flex: "1 1 170px", minWidth: 0, padding: "8px 10px", borderRadius: 10,
                                                boxSizing: "border-box",
                                                border: "2px solid #E5E7EB", fontSize: 13, fontWeight: 600,
                                                background: "#FAFBFC", outline: "none",
                                            }}
                                        >
                                            <option value="">Type...</option>
                                            {availableTypeCasiers.map(t => (
                                                <option key={t.id} value={t.id}>{t.nomDisplay || t.nom}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            min="0"
                                            value={line.qte || 0}
                                            onChange={(e) => updateCasierLine(compenseDette.id, idx, 'qte', e.target.value)}
                                            style={{
                                                width: 52, padding: "8px 6px", borderRadius: 10,
                                                boxSizing: "border-box",
                                                border: "2px solid #E5E7EB", fontSize: 13, fontWeight: 700,
                                                textAlign: "center", background: "#FAFBFC", outline: "none",
                                            }}
                                        />
                                        <span style={{fontSize: 12, fontWeight: 700, color: C.green, minWidth: 56, flex: "1 0 auto", textAlign: "right"}}>
                                            +{fmt(getLineConsigneValue(line))}
                                        </span>
                                        <button
                                            onClick={() => {
                                                setReturnedCasiers(prev => ({
                                                    ...prev,
                                                    [compenseDette.id]: (prev[compenseDette.id] || []).filter((_, i) => i !== idx)
                                                }));
                                            }}
                                            style={{background: "none", border: "none", color: "#DC2626", fontSize: 16, cursor: "pointer", padding: 4}}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}

                                <button
                                    onClick={() => addCasierLine(compenseDette.id)}
                                    style={{
                                        ...S.btnOutline(C.teal), padding: "10px", minHeight: 40, fontSize: 13,
                                        marginBottom: 16, marginTop: 4,
                                    }}
                                >
                                    + Ajouter un type de casier
                                </button>

                                {/* Section especes */}
                                <div style={{fontWeight: 700, fontSize: 14, marginBottom: 8}}>
                                    💰 Espèces reçues
                                </div>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    placeholder="0"
                                    value={compenseCashAmount || ''}
                                    onChange={(e) => setCompenseCashAmount(Number(e.target.value) || 0)}
                                    style={{...S.input(compenseCashAmount > 0), marginBottom: 16}}
                                />

                                {/* Total */}
                                {(getTotalCasiersValue(compenseDette.id) > 0 || compenseCashAmount > 0) && (
                                    <div style={{marginBottom: 16}}>
                                        <div style={{
                                                background: "linear-gradient(135deg, #1a237e 0%, #283593 100%)",
                                                color: "#fff", borderRadius: 14, padding: "14px 16px",
                                                textAlign: "center", marginBottom: 10,
                                            }}
                                        >
                                            <div style={{fontSize: 11, opacity: 0.8, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4}}>
                                                Total règlement dette
                                            </div>
                                            <div style={{fontSize: 24, fontWeight: 900}}>
                                                {fmt(getTotalCasiersValue(compenseDette.id) + (Number(compenseCashAmount) || 0))} F
                                            </div>
                                        </div>

                                        <div style={{display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6}}>
                                            <div style={{background: "#ECFDF5", border: "1px solid rgba(39,174,96,0.25)", borderRadius: 10, padding: 8, color: C.green, fontSize: 11, fontWeight: 800, textAlign: "center"}}>
                                                Dette<br />-{fmt(Math.min(compenseDette.restant, getTotalCasiersValue(compenseDette.id) + (Number(compenseCashAmount) || 0)))}
                                            </div>
                                            <div style={{background: "#E8F8F5", border: "1px solid rgba(26,188,156,0.25)", borderRadius: 10, padding: 8, color: C.tealDark, fontSize: 11, fontWeight: 800, textAlign: "center"}}>
                                                Stock<br />+{(returnedCasiers[compenseDette.id] || []).reduce((sum, line) => sum + (Number(line.qte) || 0), 0)}
                                            </div>
                                            <div style={{background: "#FFF8F0", border: "1px solid rgba(255,107,53,0.25)", borderRadius: 10, padding: 8, color: C.orangeDark, fontSize: 11, fontWeight: 800, textAlign: "center"}}>
                                                Caisse<br />+{fmt(Number(compenseCashAmount) || 0)}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div style={{display: "flex", flexWrap: "wrap", gap: 8}}>
                                    <button
                                        onClick={() => { setCompenseDette(null); setCompenseCashAmount(0); setShowCompenseHelp(false); }}
                                        style={{...S.btnOutline(C.muted), flex: "1 1 120px", minHeight: 48, fontSize: 14}}
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={handleValidateCompense}
                                        style={{...S.btnPrimary, flex: "2 1 180px", minHeight: 48, fontSize: 14}}
                                    >
                                        Valider règlement
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            );
}
