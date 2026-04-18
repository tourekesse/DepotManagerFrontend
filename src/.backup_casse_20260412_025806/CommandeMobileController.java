package com.toure.depotmanager.controller;

import com.toure.depotmanager.dto.VenteResponseDTO;
import com.toure.depotmanager.entity.Commande;
import com.toure.depotmanager.model.Utilisateur;
import com.toure.depotmanager.model.Vente;
import com.toure.depotmanager.repository.CommandeRepository;
import com.toure.depotmanager.repository.OtpLivraisonRepository;
import com.toure.depotmanager.repository.UtilisateurRepository;
import com.toure.depotmanager.service.CommandeMobileService;
import com.toure.depotmanager.service.OtpService;
import com.toure.depotmanager.service.VenteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Controller REST dédié au système de commandes mobiles (nouveau système)
 * Séparé de CommandeController (ancien système Vaadin) pour éviter les conflits
 */
@RestController
@RequestMapping("/api/commandes-mobile")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CommandeMobileController {
    
    private final CommandeMobileService commandeMobileService;
    private final VenteService venteService;
    private final CommandeRepository commandeRepository;
    private final OtpLivraisonRepository otpRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final OtpService otpService;
    
    /**
     * Transformer une commande validée en vente pour livraison
     * 
     * Utilisé après que le gérant a validé la commande et assigné un livreur.
     * Cette opération crée une Vente à partir de la Commande, permettant
     * au livreur de la voir dans PWALivreur et d'effectuer la livraison.
     * 
     * @param id ID de la commande à transformer
     * @return VenteResponseDTO contenant les détails de la vente créée
     */
    @PostMapping("/{id}/transformer-en-vente")
    public ResponseEntity<VenteResponseDTO> transformerEnVente(@PathVariable Long id) {
        Vente vente = commandeMobileService.transformerCommandeEnVente(id);
        VenteResponseDTO venteDTO = venteService.transformerEnDTO(vente);
        return ResponseEntity.ok(venteDTO);
    }
    
    /**
     * Endpoint de test pour vérifier que le service est opérationnel
     */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("CommandeMobileController opérationnel");
    }

    /**
     * Récupère toutes les commandes du client connecté (historique)
     * 
     * @param authentication l'utilisateur connecté (JWT)
     * @return Liste des commandes du client
     */
    @GetMapping("/mes-commandes")
    public ResponseEntity<List<Commande>> getMesCommandes(Authentication authentication) {
        try {
            String email = authentication.getName();
            
            // Récupérer l'utilisateur connecté
            Utilisateur utilisateur = utilisateurRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
            
            // Vérifier que l'utilisateur a un client lié
            if (utilisateur.getPhoneNumber() == null) {
                return ResponseEntity.ok(List.of());
            }
            
            // Récupérer toutes les commandes de son client (via téléphone)
            List<Commande> commandes = commandeRepository.findByClientTelephoneOrderByDateCommandeDesc(
                    utilisateur.getPhoneNumber());
            
            return ResponseEntity.ok(commandes);
            
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Récupère les commandes assignées à un livreur spécifique
     * 
     * @param livreurId ID du livreur
     * @return Liste des commandes avec leurs détails
     */
    @GetMapping("/livreur/{livreurId}/commandes")
    public ResponseEntity<List<Map<String, Object>>> getCommandesByLivreur(@PathVariable Long livreurId) {
        List<Commande> commandes = commandeRepository.findByLivreurIdWithClient(livreurId);
        
        List<Map<String, Object>> result = commandes.stream()
            .filter(c -> c.getModeRetrait() == com.toure.depotmanager.entity.ModeRetrait.LIVRAISON)
            .filter(c -> {
                // Filtrer les statuts actifs (pas livrées/annulées)
                com.toure.depotmanager.entity.StatutCommande statut = c.getStatut();
                return statut == com.toure.depotmanager.entity.StatutCommande.EN_ATTENTE ||
                       statut == com.toure.depotmanager.entity.StatutCommande.VALIDEE ||
                       statut == com.toure.depotmanager.entity.StatutCommande.EN_PREPARATION ||
                       statut == com.toure.depotmanager.entity.StatutCommande.PRETE_POUR_LIVRAISON ||
                       statut == com.toure.depotmanager.entity.StatutCommande.EN_ROUTE;
            })
            .map(c -> {
                Map<String, Object> item = new HashMap<>();
                item.put("id", c.getId());
                item.put("nomClient", c.getClient() != null ? c.getClient().getNomClient() : "Client");
                item.put("dateCommande", c.getDateCommande());
                item.put("montantTotal", c.getMontantTotal());
                item.put("montantEmballage", c.getMontantEmballage());
                item.put("statut", c.getStatut());
                item.put("modeRetrait", c.getModeRetrait());
                item.put("telephoneClient", c.getClient() != null ? c.getClient().getTelephone() : "");
                return item;
            })
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }

    /**
     * 🔥 VALIDER LIVRAISON avec OTP (workflow livreur)
     * 
     * 1. Vérifie l'OTP
     * 2. Transforme commande → vente si pas déjà fait
     * 3. Enregistre le paiement (CASH ou CREDIT)
     * 4. Marque comme livrée
     * 5. Retourne le reçu
     * 
     * POST /api/commandes-mobile/{id}/valider-livraison
     */
    @PostMapping("/{id}/valider-livraison")
    public ResponseEntity<Map<String, Object>> validerLivraison(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {
        
        try {
            // 1. Récupérer la commande avec client chargé (évite LazyLoadingException)
            Commande commande = commandeRepository.findByIdWithClient(id)
                    .orElseThrow(() -> new RuntimeException("Commande non trouvée: " + id));
            
            // 2. Vérifier l'OTP (cherche par commandeId même si déjà utilisé à l'étape 2)
            String otpCode = (String) request.get("otpCode");

            // Mode test: accepter 123456
            boolean otpValide = "123456".equals(otpCode);
            if (!otpValide) {
                // Chercher l'OTP même s'il est déjà utilisé (l'étape 2 l'a déjà marqué)
                var otpOpt = otpRepository.findTopByCommandeIdAndCodeAndDateExpirationAfterOrderByDateCreationDesc(
                    id, otpCode, java.time.LocalDateTime.now());
                otpValide = otpOpt.isPresent();
            }
            
            if (!otpValide) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Code OTP invalide"
                ));
            }
            
            // 3. Transformer en vente si pas encore fait (méthode spéciale pour livreur)
            Vente vente;
            if (commande.getVente() == null) {
                vente = commandeMobileService.transformerCommandeEnVentePourLivreur(id);
            } else {
                vente = commande.getVente();
            }
            
            // 4. Récupérer les infos du paiement
            String typePaiement = (String) request.get("type"); // VENTE_CASH ou VENTE_CREDIT
            Number montant = (Number) request.get("montant");
            BigDecimal montantPaye = montant != null ? BigDecimal.valueOf(montant.doubleValue()) : BigDecimal.ZERO;
            
            // 4bis. Extraire les compensations (valeur pour traçabilité)
            @SuppressWarnings("unchecked")
            java.util.List<java.util.Map<String, Object>> compensations = 
                (java.util.List<java.util.Map<String, Object>>) request.get("compensations");
            
            boolean hasCasierCompensations = compensations != null && !compensations.isEmpty()
                && compensations.stream().anyMatch(c -> "CASIER".equals(c.get("type")));
            
            VenteResponseDTO venteDto;
            
            // 5. Effectuer le paiement selon le type
            if ("VENTE_CASH".equals(typePaiement) && montantPaye.compareTo(BigDecimal.ZERO) > 0) {
                // Encaisser la vente
                venteService.encaisserVente(vente.getId(), 
                    com.toure.depotmanager.model.ModePaiement.ESPECES, 
                    montantPaye);
            } else if ("VENTE_CREDIT".equals(typePaiement)) {
                // Vente à crédit - pas d'encaissement maintenant
                // La dette est déjà enregistrée via effectuerVenteDirecte
            }
            
            // 6. Valider la livraison
            if (hasCasierCompensations) {
                // Livraison partielle avec compensations → utiliser validerLivraisonAvecProbleme
                // Construire le request DTO
                com.toure.depotmanager.dto.LivraisonProblemeRequest problemeReq = 
                    new com.toure.depotmanager.dto.LivraisonProblemeRequest();
                
                String commentaire = (String) request.get("commentaire");
                problemeReq.setCommentaire(commentaire);
                
                // Convertir les compensations du frontend
                java.util.List<com.toure.depotmanager.dto.LivraisonProblemeRequest.CompensationItem> compItems = new java.util.ArrayList<>();
                for (var comp : compensations) {
                    String compType = (String) comp.get("type");
                    if ("CASIER".equals(compType)) {
                        var item = new com.toure.depotmanager.dto.LivraisonProblemeRequest.CompensationItem();
                        item.setType(com.toure.depotmanager.dto.LivraisonProblemeRequest.CompensationItem.Type.CASIER);
                        item.setTypeCasierId(Long.valueOf(comp.get("typeCasierId").toString()));
                        item.setQuantite(Integer.valueOf(comp.get("quantite").toString()));
                        compItems.add(item);
                    } else if ("ESPECES".equals(compType)) {
                        var item = new com.toure.depotmanager.dto.LivraisonProblemeRequest.CompensationItem();
                        item.setType(com.toure.depotmanager.dto.LivraisonProblemeRequest.CompensationItem.Type.ESPECES);
                        item.setMontant(comp.get("montant") != null ? 
                            BigDecimal.valueOf(((Number) comp.get("montant")).doubleValue()) : BigDecimal.ZERO);
                        compItems.add(item);
                    }
                }
                problemeReq.setCompensations(compItems);
                // Pas de manquants déclarés ici (le livreur déclare ce qu'il rend, pas ce qui manque)
                
                venteDto = venteService.validerLivraisonAvecProbleme(vente.getId(), problemeReq);
            } else {
                // Livraison complète ou sans compensation CASIER
                venteDto = venteService.validerLivraisonComplete(vente.getId());
            }
            
            // 7. Mettre à jour le statut de la commande
            commande.setStatut(com.toure.depotmanager.entity.StatutCommande.LIVREE);
            commande.setDateLivraison(java.time.LocalDateTime.now());
            commandeRepository.save(commande);
            
            // 8. Construire la réponse avec reçu
            Map<String, Object> recu = new HashMap<>();
            recu.put("venteId", vente.getId());
            recu.put("commandeId", id);
            recu.put("client", commande.getClient() != null ? commande.getClient().getNomClient() : "N/A");
            recu.put("montantTotal", commande.getMontantTotal());
            recu.put("montantPaye", montantPaye);
            recu.put("typePaiement", typePaiement);
            recu.put("dateLivraison", java.time.LocalDateTime.now().toString());
            recu.put("otpValide", true);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Livraison validée avec succès",
                "recu", recu,
                "vente", venteDto
            ));
            
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "message", "Erreur: " + e.getMessage()
            ));
        }
    }
}

