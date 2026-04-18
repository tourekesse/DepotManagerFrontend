package com.toure.depotmanager.service;

import com.toure.depotmanager.dto.vente.DispatcherVenteRequestDTO;
import com.toure.depotmanager.dto.vente.DispatcherVenteResponseDTO;
import com.toure.depotmanager.model.Client;
import com.toure.depotmanager.model.Livraison;
import com.toure.depotmanager.model.StatutPaiement;
import com.toure.depotmanager.model.Vente;
import com.toure.depotmanager.model.TypeCasier;
import com.toure.depotmanager.repository.ClientRepository;
import com.toure.depotmanager.repository.LivraisonRepository;
import com.toure.depotmanager.repository.VenteRepository;
import com.toure.depotmanager.repository.TypeCasierRepository;
import com.toure.depotmanager.service.StockService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional
public class DispatcherVenteService {
    
    private static final Logger logger = LoggerFactory.getLogger(DispatcherVenteService.class);
    
    private final VenteRepository venteRepository;
    private final ClientRepository clientRepository;
    private final LivraisonRepository livraisonRepository;
    private final CaisseService caisseService;
    private final TypeOperationService typeOperationService;
    private final StockService stockService;
    private final TypeCasierRepository typeCasierRepository;
    
    /**
     * Dispatcher une vente : met à jour les soldes du client
     */
    public DispatcherVenteResponseDTO dispatcher(Long venteId, DispatcherVenteRequestDTO request) {
        logger.info("=== DISPATCHER VENTE #{} ===", venteId);
        logger.info("📦 Request payload: casiersRendus={}, bouteillesRendues={}, montantPaye={}", 
                request.getCasiersRendus(), request.getBouteillesRendues(), request.getMontantPaye());
        
        // 1. Charger la vente
        Vente vente = venteRepository.findById(venteId)
                .orElseThrow(() -> new EntityNotFoundException("Vente non trouvée: " + venteId));
        logger.info("Vente trouvée: id={}, client={}, montantTotal={}, modeLivraison={}", 
                vente.getId(), vente.getClient().getId(), vente.getTotalGeneral(), vente.getModeLivraison());
        
        // 2. Charger le client
        Client client = vente.getClient();
        BigDecimal ancienSoldeLiquide = client.getMontantLiquide() != null ? client.getMontantLiquide() : BigDecimal.ZERO;
        BigDecimal ancienSoldeEmballage = client.getMontantEmballage() != null ? client.getMontantEmballage() : BigDecimal.ZERO;
        BigDecimal ancienSoldeTotal = client.getSoldeTotal() != null ? client.getSoldeTotal() : BigDecimal.ZERO;
        
        logger.info("Client avant: liquide={}, emballage={}, total={}", 
                ancienSoldeLiquide, ancienSoldeEmballage, ancienSoldeTotal);
        
        // 3. Calculer montant à payer pour cette vente
                BigDecimal montantVente = vente.getTotalGeneral() != null ? vente.getTotalGeneral() : BigDecimal.ZERO;
                BigDecimal montantConsigneVente = vente.getMontantEmballageTotal() != null ? vente.getMontantEmballageTotal() : BigDecimal.ZERO;
                BigDecimal montantLiquideVente = montantVente.subtract(montantConsigneVente);
                if (montantLiquideVente.compareTo(BigDecimal.ZERO) < 0) {
                        montantLiquideVente = BigDecimal.ZERO;
                }
                BigDecimal montantPaye = request.getMontantPaye() != null ? request.getMontantPaye() : BigDecimal.ZERO;
        
        logger.info("Montant vente: {}, Montant payé: {}", montantVente, montantPaye);
        
                // 4. Appliquer le paiement uniquement sur la dette liquide de cette vente (ne pas effacer dettes antérieures)
                BigDecimal detteLiquideVente = montantLiquideVente.max(BigDecimal.ZERO);
                BigDecimal montantAffecteLiquide = montantPaye.min(detteLiquideVente);
                BigDecimal nouveauSoldeLiquide = ancienSoldeLiquide.subtract(montantAffecteLiquide);
                if (nouveauSoldeLiquide.compareTo(BigDecimal.ZERO) < 0) {
                        nouveauSoldeLiquide = BigDecimal.ZERO; // garde les dettes antérieures, ne passe pas en négatif
                }

                logger.info("Paiement appliqué sur dette liquide de la vente: {} (dette vente: {}, paye: {})", 
                                montantAffecteLiquide, detteLiquideVente, montantPaye);

                // 5. Réduire la dette emballage uniquement par les casiers rendus de cette vente
                BigDecimal montantEmballageRendus = BigDecimal.ZERO;
                if (request.getCasiersRendus() != null && request.getCasiersRendus() > 0) {
                    // Utiliser prixUnitaireEmballage des détails de la vente pour calculer le montant rendu
                    BigDecimal prixConsigneUnitaire = vente.getDetails().stream()
                            .filter(d -> d.getPrixUnitaireEmballage() != null && d.getPrixUnitaireEmballage().compareTo(BigDecimal.ZERO) > 0)
                            .map(d -> d.getPrixUnitaireEmballage())
                            .findFirst()
                            .orElse(montantConsigneVente.divide(BigDecimal.valueOf(Math.max(1, vente.getDetails().stream()
                                    .mapToInt(d -> d.getQuantiteLivree() != null ? d.getQuantiteLivree() : d.getQuantite())
                                    .sum())), 2, RoundingMode.HALF_UP));
                    
                    montantEmballageRendus = new BigDecimal(request.getCasiersRendus()).multiply(prixConsigneUnitaire);
                    logger.info("Montant emballage rendu: {} casiers x {} = {}", 
                            request.getCasiersRendus(), prixConsigneUnitaire, montantEmballageRendus);

                    // 🔥 Incrémenter le stock de vides rendus pour chaque type de casier de la vente
                    // On répartit proportionnellement aux quantités vendues
                    int totalCasiersRendus = request.getCasiersRendus();
                    int totalQuantiteVendue = vente.getDetails().stream()
                            .mapToInt(d -> d.getQuantiteLivree() != null ? d.getQuantiteLivree() : d.getQuantite())
                            .sum();
                    
                    for (var detail : vente.getDetails()) {
                        if (detail.getProduit() != null && detail.getProduit().getTypeCasierAssocie() != null) {
                            int qteVendue = detail.getQuantiteLivree() != null ? detail.getQuantiteLivree() : detail.getQuantite();
                            // Répartition proportionnelle
                            int casiersRendusPourCeType = totalQuantiteVendue > 0 
                                    ? Math.round((float) totalCasiersRendus * qteVendue / totalQuantiteVendue)
                                    : 0;
                            if (casiersRendusPourCeType > 0) {
                                stockService.incrementerStockVideRendu(detail.getProduit().getTypeCasierAssocie().getId(), casiersRendusPourCeType);
                            }
                        }
                    }
                }

                BigDecimal detteEmballageVente = montantConsigneVente.max(BigDecimal.ZERO);
                BigDecimal montantAffecteEmballage = montantEmballageRendus.min(detteEmballageVente);
                BigDecimal nouveauSoldeEmballage = ancienSoldeEmballage.subtract(montantAffecteEmballage);
                if (nouveauSoldeEmballage.compareTo(BigDecimal.ZERO) < 0) {
                        nouveauSoldeEmballage = BigDecimal.ZERO; // ne pas passer en négatif
                }

                logger.info("Emballage rendu appliqué: {} (dette emballage vente: {})", montantAffecteEmballage, detteEmballageVente);
                logger.info("Nouveau solde liquide: {}", nouveauSoldeLiquide);
                logger.info("Nouveau solde emballage: {}", nouveauSoldeEmballage);
        
        // 6. Mettre à jour le client
        client.setMontantLiquide(nouveauSoldeLiquide);
        client.setMontantEmballage(nouveauSoldeEmballage);
        client.setSoldeTotal(nouveauSoldeLiquide.add(nouveauSoldeEmballage));
        client.setDateDerniereOperation(LocalDate.now());
        clientRepository.save(client);
        
        logger.info("Client après: liquide={}, emballage={}, total={}", 
                nouveauSoldeLiquide, nouveauSoldeEmballage, client.getSoldeTotal());
        
        // 6bis. Enregistrer le mouvement de caisse si paiement effectué
        if (montantAffecteLiquide.compareTo(BigDecimal.ZERO) > 0) {
            try {
                Long pvId = vente.getPointDeVente().getId();
                var typeOperation = typeOperationService.findByLibelle("REGLEMENT LIQUIDE");
                if (typeOperation != null) {
                    caisseService.enregistrerMouvement(
                        pvId,
                        typeOperation.getId(),
                        montantAffecteLiquide,
                        "ENCAISSEMENT VENTE #" + venteId + " - Client: " + client.getRaisonsociale()
                    );
                    logger.info("✅ Mouvement de caisse enregistré: {} FCFA pour la vente {}", montantAffecteLiquide, venteId);
                } else {
                    logger.warn("⚠️ Type opération 'REGLEMENT LIQUIDE' introuvable pour PV {}. Caisse non mise à jour.", pvId);
                }
            } catch (Exception e) {
                logger.error("❌ Erreur lors de l'enregistrement en caisse pour la vente {}: {}", venteId, e.getMessage(), e);
                // Ne pas échouer toute l'opération si l'enregistrement caisse échoue
            }
        }
        
        // 7. Mettre à jour la vente (status = LIVREE)
        vente.setStatutLivraison("LIVREE");
        vente.setStatutPaiement(montantAffecteLiquide.compareTo(BigDecimal.ZERO) > 0 ? StatutPaiement.PAYE : StatutPaiement.NON_PAYE);
        vente.setMontantPaye(montantAffecteLiquide);
        venteRepository.save(vente);
        
        logger.info("✅ Vente mise à jour: statutLivraison={}, statutPaiement={}, montantPaye={}", 
                vente.getStatutLivraison(), vente.getStatutPaiement(), vente.getMontantPaye());
        
        // 8. Créer l'enregistrement de livraison
        Livraison livraison = Livraison.builder()
                .vente(vente)
                .client(client)
                .dateLivraison(LocalDateTime.now())
                .casiersRendus(request.getCasiersRendus() != null ? request.getCasiersRendus() : 0)
                .bouteillesRendues(request.getBouteillesRendues() != null ? request.getBouteillesRendues() : 0)
                .montantPaye(montantPaye)
                .montantEmballageRendu(montantEmballageRendus)
                .statut("VALIDEE")
                .build();
        livraison.setPointDeVente(vente.getPointDeVente()); // Copier le point de vente de la vente
        livraisonRepository.save(livraison);
        
        logger.info("Livraison enregistrée: id={}", livraison.getId());
        
        logger.info("Vente #{} dipatchée avec succès", venteId);
        
        return DispatcherVenteResponseDTO.builder()
                .venteId(venteId)
                .ancienSoldeLiquide(ancienSoldeLiquide)
                .ancienSoldeEmballage(ancienSoldeEmballage)
                .ancienSoldeTotal(ancienSoldeTotal)
                .nouveauSoldeLiquide(nouveauSoldeLiquide)
                .nouveauSoldeEmballage(nouveauSoldeEmballage)
                .nouveauSoldeTotal(client.getSoldeTotal())
                .message("Vente dispatchée avec succès")
                .build();
    }
}
