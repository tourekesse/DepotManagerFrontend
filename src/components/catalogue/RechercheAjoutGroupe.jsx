import React, { useState, useEffect, useRef } from "react";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { ProgressSpinner } from "primereact/progressspinner";
import { privateApi } from "../../api/axios";
import { Card } from "primereact/card";
import { CFormInput, CFormLabel, CRow, CCol } from "@coreui/react";
import { createProduit } from "../../api/produitsApi";
import { safeProductFields } from "../../utils/productGuards";
import { formatCurrency } from "../../utils/currencyUtils";

export default function RechercheAjoutGroupe() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [selected, setSelected] = useState([]);
    const [loading, setLoading] = useState(false);
    const toast = useRef(null);

    useEffect(() => {
        if (query.length >= 2) {
            privateApi.get(`/api/references/recherche?q=${query}`)
                .then((res) => setResults(res.data))
                .catch(() => {});
        } else {
            setResults([]);
        }
    }, [query]);

    const toggleSelection = (ref) => {
        const index = selected.findIndex((s) => s.id === ref.id);
        if (index > -1) {
            setSelected(selected.filter((s) => s.id !== ref.id));
        } else {
            // On crée un objet propre avec TOUTES les propriétés nécessaires
            const nouveauProduit = {
                ...ref,
                prixAchatHt: "",
                prixVenteHt: "",
                consigneBouteille: 150,
                consigneCasier: 1800,
                stockInitial: 0,
                stockMinimum: 0
            };
            setSelected([...selected, nouveauProduit]);
        }
    };

    const updateField = (id, field, value) => {
        setSelected(selected.map((p) => 
            p.id === id ? { ...p, [field]: value } : p
        ));
    };

    const toutRempli = selected.length > 0 && selected.every(p => 
        p.prixAchatHt > 0 && p.prixVenteHt > 0
    );

    const ajouterProduits = async () => {
        setLoading(true);
        try {
            for (const p of selected) {
                const safe = safeProductFields({
                    marque: p.marque,
                    format: p.format,
                    groupeLiquide: p.groupe || p.groupeLiquide,
                });
                await createProduit({
                    designation: `${p.marque} ${p.format}`,
                    ...safe,
                    nbreBouteillesParCasier: p.casierBouteilles,
                    prixAchatHt: Number(p.prixAchatHt),
                    prixVenteHt: Number(p.prixVenteHt),
                    consigneBouteille: Number(p.consigneBouteille),
                    consigneCasier: Number(p.consigneCasier),
                    stockInitial: Number(p.stockInitial),
                    stockMinimum: Number(p.stockMinimum),
                });
            }
            toast.current.show({ severity: "success", summary: "Succès", detail: "Enregistré" });
            setSelected([]);
            setQuery("");
        } catch (e) {
            toast.current.show({ severity: "error", summary: "Erreur" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-2">
            <Toast ref={toast} />
            <Card title="Ajout rapide" className="shadow-sm">
                <CFormInput 
                    placeholder="Rechercher (ex: Castel)..." 
                    value={query} 
                    onChange={(e) => setQuery(e.target.value)} 
                    className="mb-4"
                />

                <div className="d-flex flex-column gap-3">
                    {results.map((ref) => {
                        const data = selected.find((s) => s.id === ref.id);
                        const estCoche = !!data;

                        return (
                            <div key={ref.id} className="border rounded p-3 bg-white">
                                <div className="d-flex align-items-center gap-3">
                                    <Checkbox checked={estCoche} onChange={() => toggleSelection(ref)} />
                                    <span className="fw-bold">{ref.marque} {ref.format}</span>
                                </div>

                                {estCoche && (
                                    <div className="mt-3 p-3 bg-light border-top">
                                        <CRow className="g-3">
                                            <CCol xs={12} className="small fw-bold text-muted border-bottom">COMMERCE</CCol>
                                            <CCol xs={6}>
                                                <CFormLabel className="small">Prix Achat *</CFormLabel>
                                                <CFormInput type="number" value={data.prixAchatHt} onChange={(e) => updateField(ref.id, "prixAchatHt", e.target.value)} />
                                            </CCol>
                                            <CCol xs={6}>
                                                <CFormLabel className="small text-success">Prix Vente *</CFormLabel>
                                                <CFormInput type="number" value={data.prixVenteHt} onChange={(e) => updateField(ref.id, "prixVenteHt", e.target.value)} />
                                            </CCol>

                                            <CCol xs={12} className="small fw-bold text-muted border-bottom mt-3">CONSIGNES</CCol>
                                            <CCol xs={6}>
                                                <CFormLabel className="small">Bouteille Vide *</CFormLabel>
                                                <CFormInput type="number" value={data.consigneBouteille} onChange={(e) => updateField(ref.id, "consigneBouteille", e.target.value)} />
                                            </CCol>
                                            <CCol xs={6}>
                                                <CFormLabel className="small">Casier Plastique *</CFormLabel>
                                                <CFormInput type="number" value={data.consigneCasier} onChange={(e) => updateField(ref.id, "consigneCasier", e.target.value)} />
                                            </CCol>

                                            <CCol xs={12} className="text-center p-2 bg-white border rounded">
                                                <small>Prix Nu Total : <strong>{formatCurrency((Number(data.consigneBouteille) * ref.casierBouteilles) + Number(data.consigneCasier))}</strong></small>
                                            </CCol>

                                            <CCol xs={12} className="small fw-bold text-muted border-bottom mt-3">INVENTAIRE</CCol>
                                            <CCol xs={6}>
                                                <CFormLabel className="small">Stock Initial</CFormLabel>
                                                <CFormInput type="number" value={data.stockInitial} onChange={(e) => updateField(ref.id, "stockInitial", e.target.value)} />
                                            </CCol>
                                            <CCol xs={6}>
                                                <CFormLabel className="small text-danger">Stock Alerte</CFormLabel>
                                                <CFormInput type="number" value={data.stockMinimum} onChange={(e) => updateField(ref.id, "stockMinimum", e.target.value)} />
                                            </CCol>
                                        </CRow>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {selected.length > 0 && (
                    <Button 
                        label={`VALIDER (${selected.length})`} 
                        className="w-full mt-4 p-button-success" 
                        loading={loading}
                        disabled={!toutRempli}
                        onClick={ajouterProduits}
                    />
                )}
            </Card>
        </div>
    );
}