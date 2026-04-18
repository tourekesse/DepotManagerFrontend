package com.toure.depotmanager.service;

import com.toure.depotmanager.entity.Commande;
import com.toure.depotmanager.entity.LigneCommande;
import com.toure.depotmanager.model.Produit;
import com.toure.depotmanager.model.PointDeVente;
import com.toure.depotmanager.model.TypeCasier;
import com.toure.depotmanager.repository.ProduitRepository;
import com.toure.depotmanager.repository.TypeCasierRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class StockService {

    private final ProduitRepository produitRepository;
    private final TypeCasierRepository typeCasierRepository;
    private final FiltrageContexteService filtrageContexteService;
    private final PointDeVenteService pointDeVenteService;

    // 🔹 Récupère le PointDeVente actif du contexte utilisateur
    private PointDeVente getActivePointDeVente() {
        Long pvId = filtrageContexteService.getPointDeVenteActifId();
        if (pvId == null) {
            throw new IllegalStateException("Aucun point de vente actif sélectionné.");
        }
        return pointDeVenteService.findById(pvId);
    }

    // 🔹 Quantité en stock pour un produit dans le PV actif
    public Integer getQuantiteStock(Long produitId) {
        PointDeVente pvActif = getActivePointDeVente();
        return findProduitWithStock(produitId, pvActif.getId())
                .map(Produit::getQuantiteStock)
                .orElse(0);
    }

    // 🔹 Recherche d’un produit avec stock par ID et PV
    public Optional<Produit> findProduitWithStock(Long produitId, Long pointDeVenteId) {
        return produitRepository.findByIdAndPointDeVenteId(produitId, pointDeVenteId);
    }

    // 🔹 Vérifie si la quantité demandée est disponible dans le PV actif
    public boolean estQuantiteDisponible(Long produitId, int quantiteDemandee) {
        Integer quantiteStock = getQuantiteStock(produitId);
        return quantiteStock >= quantiteDemandee;
    }

    // 🔹 Vérifie si la quantité demandée est disponible dans un PV donné
    public boolean estQuantiteDisponible(Long produitId, Long pointDeVenteId, int quantiteDemandee) {
        Optional<Produit> produitStockOpt = findProduitWithStock(produitId, pointDeVenteId);
        if (produitStockOpt.isEmpty()) return false;

        Integer quantiteStockInt = Optional.ofNullable(produitStockOpt.get().getQuantiteStock()).orElse(0);
        return quantiteStockInt >= quantiteDemandee;
    }

    // 🔹 Décrémente le stock dans le PV actif
    @Transactional
    public void decrementerStock(Long produitId, Long uniteId, int quantiteCommandee) {
        PointDeVente pvActif = getActivePointDeVente();
        decrementerStock(pvActif.getId(), produitId, uniteId, quantiteCommandee);
    }

    // 🔹 Décrémente le stock dans un PV donné
    @Transactional
    public void decrementerStock(Long pointDeVenteId, Long produitId, Long uniteId, int quantiteCommandee) {
        TypeCasier uniteCommande = typeCasierRepository.findById(uniteId)
                .orElseThrow(() -> new EntityNotFoundException("Unité de commande (TypeCasier) non trouvée avec l'ID: " + uniteId));

        int facteurConversion = Optional.ofNullable(uniteCommande.getNbreBouteillesParCasier()).orElse(1);
        int quantiteTotaleADeduire = quantiteCommandee * facteurConversion;

        deduireStock(produitId, pointDeVenteId, quantiteTotaleADeduire);
    }

    // 🔹 Déduit une quantité du stock
    @Transactional
    public void deduireStock(Long produitId, Long pointDeVenteId, int quantiteARetirer) {
        if (quantiteARetirer <= 0) return;

        Produit produitStock = produitRepository.findByIdAndPointDeVenteId(produitId, pointDeVenteId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Stock introuvable pour le produit ID " + produitId + " dans le PV ID " + pointDeVenteId));

        Integer quantiteStockInt = Optional.ofNullable(produitStock.getQuantiteStock()).orElse(0);
        BigDecimal quantiteDisponible = new BigDecimal(quantiteStockInt);
        BigDecimal quantiteARetirerBd = new BigDecimal(quantiteARetirer);

        if (quantiteDisponible.compareTo(quantiteARetirerBd) < 0) {
            throw new IllegalStateException("Stock insuffisant (" + quantiteDisponible.toPlainString()
                    + ") pour le produit " + produitId + ". Quantité demandée: " + quantiteARetirer);
        }

        Integer nouveauStockInt = quantiteDisponible.subtract(quantiteARetirerBd)
                .setScale(0, RoundingMode.DOWN).intValue();
        produitStock.setQuantiteStock(nouveauStockInt);

        produitRepository.save(produitStock);
    }

    // 🔹 Ajoute une quantité au stock
    @Transactional
    public void ajouterStock(Long produitId, Long pointDeVenteId, int quantiteAAjouter) {
        if (quantiteAAjouter <= 0) return;

        Produit produitStock = produitRepository.findByIdAndPointDeVenteId(produitId, pointDeVenteId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Impossible d'ajouter du stock : Produit introuvable pour PV ID " + pointDeVenteId));

        Integer quantiteStockInt = Optional.ofNullable(produitStock.getQuantiteStock()).orElse(0);
        Integer nouveauStockInt = quantiteStockInt + quantiteAAjouter;

        produitStock.setQuantiteStock(nouveauStockInt);
        produitRepository.save(produitStock);
    }

    // 🔹 Incrémente le stock de vides rendus pour un type de casier
    @Transactional
    public void incrementerStockVideRendu(Long typeCasierId, int quantite) {
        if (quantite <= 0) return;

        TypeCasier typeCasier = typeCasierRepository.findById(typeCasierId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "TypeCasier introuvable avec l'ID: " + typeCasierId));

        Integer stockVideActuel = Optional.ofNullable(typeCasier.getNbreStockVideActuel()).orElse(0);
        Integer nouveauStockVide = stockVideActuel + quantite;
        typeCasier.setNbreStockVideActuel(nouveauStockVide);

        typeCasierRepository.save(typeCasier);

        System.out.println("✅ Stock vide rendu incrémenté: " + typeCasier.getNomDisplay()
                + " | Ancien: " + stockVideActuel + " | Ajouté: " + quantite
                + " | Nouveau: " + nouveauStockVide);
    }

    // 🔹 Enregistre les mouvements de livraison
    @Transactional
    public void enregistrerMouvementsLivraison(Commande commande) {
        PointDeVente pvSource = Optional.ofNullable(commande.getPointDeVente())
                .orElseThrow(() -> new IllegalStateException("Le point de vente de la commande est manquant."));

        for (LigneCommande ligne : commande.getLignes()) {
            TypeCasier uniteCommande = typeCasierRepository.findById(ligne.getUnite().getId())
                    .orElseThrow(() -> new EntityNotFoundException("Unité de commande (TypeCasier) non trouvée avec l'ID: " + ligne.getUnite().getId()));

            int facteurConversion = Optional.ofNullable(uniteCommande.getNbreBouteillesParCasier()).orElse(1);
            int quantiteTotaleADeduire = (ligne.getQuantiteLivree() != null ? ligne.getQuantiteLivree() : ligne.getQuantite()) * facteurConversion;

            if (quantiteTotaleADeduire > 0) {
                deduireStock(ligne.getProduit().getId(), pvSource.getId(), quantiteTotaleADeduire);
                System.out.println("Déduit du stock: " + quantiteTotaleADeduire + " unités de " + ligne.getProduit().getNomProduit());
            }

            // Gestion des casiers vides rendus (simulation)
            // Note: qteEmballageVideRendu n'existe pas dans LigneCommande, on laisse vide pour l'instant
            // Integer qteEmballageVideRendu = ligne.getQteEmballageVideRendu();
            // if (qteEmballageVideRendu != null && qteEmballageVideRendu > 0) {
            //     System.out.println("⚠️ ACTION NON IMPLÉMENTÉE: Ajouter " + qteEmballageVideRendu
            //             + " casiers vides (" + uniteCommande.getNomDisplay() + ") au stock d'emballage.");
            // }
        }
    }
}
