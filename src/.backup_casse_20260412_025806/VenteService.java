package com.toure.depotmanager.service;

import com.toure.depotmanager.dto.VenteDetailResponseDTO;
import com.toure.depotmanager.dto.VenteResponseDTO;
import com.toure.depotmanager.model.*;
import com.toure.depotmanager.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.Authentication;
import com.toure.depotmanager.model.Utilisateur;
import com.toure.depotmanager.repository.UtilisateurRepository;
import com.toure.depotmanager.model.TypeVente;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class VenteService {

    private static final Logger log = LoggerFactory.getLogger(VenteService.class);

    private final VenteRepository venteRepository;
    private final ClientRepository clientRepository;
    private final ProduitRepository produitRepository;
    private final PointDeVenteService pointDeVenteService;
    private final TypeCasierRepository typeCasierRepository;
    private final CaisseRepository caisseRepository;
    private final MouvementCaisseRepository mouvementCaisseRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final ReglementRepository reglementRepository;

    private final NotificationService notificationService;
    private final OrangeSmsService orangeSmsService;
    private final LivraisonNotificationService livraisonNotificationService;
    private final StockService stockService;

    public VenteService(VenteRepository venteRepository, ClientRepository clientRepository,
                        ProduitRepository produitRepository, PointDeVenteService pointDeVenteService,
                        UtilisateurRepository utilisateurRepository,
                        TypeCasierRepository typeCasierRepository,
                        CaisseRepository caisseRepository,
                        MouvementCaisseRepository mouvementCaisseRepository,
                        ReglementRepository reglementRepository,
                        NotificationService notificationService,
                        OrangeSmsService orangeSmsService,
                        LivraisonNotificationService livraisonNotificationService,
                        StockService stockService) {
        this.venteRepository = venteRepository;
        this.clientRepository = clientRepository;
        this.produitRepository = produitRepository;
        this.pointDeVenteService = pointDeVenteService;
        this.utilisateurRepository = utilisateurRepository;
        this.typeCasierRepository = typeCasierRepository;
        this.caisseRepository = caisseRepository;
        this.mouvementCaisseRepository = mouvementCaisseRepository;
        this.reglementRepository = reglementRepository;
        this.notificationService = notificationService;
        this.orangeSmsService = orangeSmsService;
        this.livraisonNotificationService = livraisonNotificationService;
        this.stockService = stockService;
    }

    /**
     * 1. MÉTHODE OUTIL : Transforme une Entité en DTO Propre
     * Utilisée par le GET et par le POST (via le controller)
     */
    public VenteResponseDTO transformerEnDTO(Vente vente) {
        VenteResponseDTO dto = new VenteResponseDTO();
        dto.setId(vente.getId());
        dto.setDateVente(vente.getDateVente());
        dto.setTotalGeneral(vente.getTotalGeneral() != null ? vente.getTotalGeneral() : BigDecimal.ZERO);
        dto.setMontantPaye(vente.getMontantPaye() != null ? vente.getMontantPaye() : BigDecimal.ZERO);
        dto.setStatutPaiement(vente.getStatutPaiement() != null ? vente.getStatutPaiement().toString() : "NON_DEFINI");

        // Sécurité Client
        dto.setNomClient(vente.getClient() != null ? vente.getClient().getRaisonsociale() : "Client Inconnu");

        // Expose l'ID du livreur si présent
        dto.setLivreurId(vente.getLivreur() != null ? vente.getLivreur().getId() : null);

        // Expose le créateur (saisi par)
        dto.setCreateurId(vente.getCreateur() != null ? vente.getCreateur().getId() : null);
        dto.setCreateurNom(vente.getCreateur() != null ? (vente.getCreateur().getFirstName() + " " + vente.getCreateur().getLastName()) : null);

        // Calcul sécurisé du Reste à Payer
        BigDecimal total = dto.getTotalGeneral();
        BigDecimal cash = dto.getMontantPaye();
        BigDecimal vides = (vente.getMontantVidesRendus() != null) ? vente.getMontantVidesRendus() : BigDecimal.ZERO;
        dto.setResteApayer(total.subtract(vides).subtract(cash));

        // Mapping des détails
        if (vente.getDetails() != null) {
            dto.setDetails(vente.getDetails().stream().map(det -> {
                VenteDetailResponseDTO dDto = new VenteDetailResponseDTO();
                dDto.setNomProduit(det.getProduit() != null ? det.getProduit().getNomProduit() : "Produit Inconnu");
                dDto.setQuantite(det.getQuantite());
                dDto.setPrixUnitaire(det.getPrixBase());
                dDto.setTotalLigne(det.getPrixTotalLigne());
                
                // Récupérer les infos de consigne depuis TypeCasier
                if (det.getProduit() != null && det.getProduit().getTypeCasierAssocie() != null) {
                    TypeCasier typeCasier = det.getProduit().getTypeCasierAssocie();
                    dDto.setConsigneCasier(typeCasier.getPrixConsigneCasier() != null 
                        ? typeCasier.getPrixConsigneCasier().doubleValue() : 0.0);
                    dDto.setConsigneBouteille(typeCasier.getPrixConsigneBouteille() != null 
                        ? typeCasier.getPrixConsigneBouteille().doubleValue() : 0.0);
                    dDto.setNombreBouteillesParCasier(typeCasier.getNbreBouteillesParCasier());
                }
                
                return dDto;
            }).collect(Collectors.toList()));
        }

        // Expose le statut de livraison pour le front
        dto.setStatutLivraison(vente.getStatutLivraison());
        
        // Expose le mode de livraison pour le front
        dto.setModeLivraison(vente.getModeLivraison() != null ? vente.getModeLivraison().toString() : null);
        
        // Ventilation des montants depuis la Vente
        BigDecimal montantEmballage = vente.getMontantEmballageTotal() != null 
            ? vente.getMontantEmballageTotal() 
            : BigDecimal.ZERO;
        
        // Le montant liquide = total - emballage (puisque totalGeneral = totalLiquide + totalEmballage)
        BigDecimal totalVente = vente.getTotalGeneral() != null ? vente.getTotalGeneral() : BigDecimal.ZERO;
        BigDecimal montantLiquide = totalVente.subtract(montantEmballage);
        
        dto.setMontantLiquide(montantLiquide.compareTo(BigDecimal.ZERO) > 0 ? montantLiquide : BigDecimal.ZERO);
        dto.setMontantEmballage(montantEmballage.compareTo(BigDecimal.ZERO) > 0 ? montantEmballage : BigDecimal.ZERO);
        dto.setMontantEmballageTotal(vente.getMontantEmballageTotal() != null ? vente.getMontantEmballageTotal() : BigDecimal.ZERO);

        return dto;
    }

    private Caisse ensureTodayOpenCaisse(PointDeVente pv) {
        LocalDate today = LocalDate.now();
        return caisseRepository.findCaisseOuverteByDate(pv, today)
                .orElseGet(() -> {
                    Caisse c = new Caisse();
                    c.setPointDeVente(pv);
                    c.setDateOuverture(today);
                    caisseRepository.findLastClosedCaisse(pv)
                            .ifPresent(last -> c.setMontantInitial(last.getSoldeFinal()));
                    c.recalculerSolde();
                    return caisseRepository.save(c);
                });
    }

    /**
     * 2. RÉCUPÉRER L'HISTORIQUE (Format DTO)
     */
    @Transactional(readOnly = true)
    public List<VenteResponseDTO> listerVentesDTO(Long pointDeVenteId) {
        List<Vente> ventes = venteRepository.findByPointDeVenteIdWithDetails(pointDeVenteId);
        return ventes.stream().map(this::transformerEnDTO).collect(Collectors.toList());
    }

    /**
     * 3. ACTION DE VENTE DIRECTE
     */
    /**
     * Nouvelle version : permet d'attribuer un livreur à la vente
     */
    @Transactional
    public Vente effectuerVenteDirecte(Client client,
                                       List<DetailArticleVendu> articles,
                                       BigDecimal montantPaye,
                                       BigDecimal montantVidesRendus,
                                       Long livreurId,
                                       ModeLivraison modeLivraison,
                                       String typeVenteSouhaite) {
        // Récupérer le point de vente depuis le header X-PV-ID envoyé par le frontend
        Long pvId = getCurrentPointDeVenteId();
        if (pvId == null) {
            throw new RuntimeException("Impossible de déterminer le point de vente. Veuillez contacter l'administrateur.");
        }
        PointDeVente pvActif = pointDeVenteService.findById(pvId);

        Vente vente = new Vente();
        vente.setClient(client);
        vente.setPointDeVente(pvActif);
        vente.setDateVente(LocalDateTime.now());
        vente.setModeLivraison(modeLivraison != null ? modeLivraison : ModeLivraison.SUR_PLACE);

        // Gestion du livreur
        if (livreurId != null) {
            Utilisateur livreur = utilisateurRepository.findById(livreurId).orElse(null);
            vente.setLivreur(livreur);
        }

        // Ajout : renseigner le créateur (utilisateur connecté)
        Utilisateur createur = null;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            String email = auth.getName();
            createur = utilisateurRepository.findByEmail(email).orElse(null);
            vente.setCreateur(createur);
        }

        BigDecimal cashInput = (montantPaye != null) ? montantPaye : BigDecimal.ZERO;
        BigDecimal vides = (montantVidesRendus != null) ? montantVidesRendus : BigDecimal.ZERO;
        
        vente.setMontantVidesRendus(vides);

        BigDecimal totalLiquide = BigDecimal.ZERO;
        BigDecimal totalConsigne = BigDecimal.ZERO;

        for (DetailArticleVendu item : articles) {
            BigDecimal prixFlash = (item.getPrixBase() != null) ? item.getPrixBase() : BigDecimal.valueOf(1250);
            item.setVente(vente);
            item.setPointDeVente(pvActif);
            item.setPrixBase(prixFlash);
            item.setPrixVenteFlash(prixFlash);

            BigDecimal ligneTotal = prixFlash.multiply(new BigDecimal(item.getQuantite()));
            item.setPrixTotalLigne(ligneTotal);
            totalLiquide = totalLiquide.add(ligneTotal);

            // Calcul consigne totale pour cette ligne (depuis TypeCasier SEULEMENT)
            BigDecimal consigneBouteille = BigDecimal.ZERO;
            BigDecimal consigneCasier = BigDecimal.ZERO;
            Integer nbBouteilles = 0;
            
            if (item.getProduit() != null && item.getProduit().getTypeCasierAssocie() != null) {
                TypeCasier typeCasier = item.getProduit().getTypeCasierAssocie();
                consigneBouteille = (typeCasier.getPrixConsigneBouteille() != null) ? typeCasier.getPrixConsigneBouteille() : BigDecimal.ZERO;
                consigneCasier = (typeCasier.getPrixConsigneCasier() != null) ? typeCasier.getPrixConsigneCasier() : BigDecimal.ZERO;
                nbBouteilles = (typeCasier.getNbreBouteillesParCasier() != null) ? typeCasier.getNbreBouteillesParCasier() : 0;
            }
            
            BigDecimal consigneTotaleLigne = consigneCasier.add(consigneBouteille.multiply(BigDecimal.valueOf(nbBouteilles)));
            consigneTotaleLigne = consigneTotaleLigne.multiply(BigDecimal.valueOf(item.getQuantite()));
            totalConsigne = totalConsigne.add(consigneTotaleLigne);

            // Remplissage des champs obligatoires
            item.setConsigneAppliquee(false);
            item.setPrixUnitaireEmballage(BigDecimal.ZERO);
            item.setQuantiteDemandee(item.getQuantite());
            item.setQuantiteLivree(item.getQuantite());
            item.setReductionManuelle(BigDecimal.ZERO);
            item.setRemisePourcentage(0);

            // Mise à jour stock
            Produit produitEnBase = produitRepository.findById(item.getProduit().getId()).orElse(null);
            if (produitEnBase != null) {
                int stock = (produitEnBase.getQuantiteStock() != null) ? produitEnBase.getQuantiteStock() : 0;
                produitEnBase.setQuantiteStock(stock - item.getQuantite());
                produitRepository.save(produitEnBase);
            }
        }

        vente.setDetails(articles);
        vente.setTotalGeneral(totalLiquide.add(totalConsigne));  // Total = articles + consigne
        vente.setMontantEmballageTotal(totalConsigne);

        // Déterminer le type de vente et le montant réellement encaissé en caisse
        TypeVente typeVente;
        if (typeVenteSouhaite != null) {
            try {
                typeVente = TypeVente.valueOf(typeVenteSouhaite);
            } catch (IllegalArgumentException e) {
                typeVente = TypeVente.VENTE_CASH;
            }
        } else if (cashInput.compareTo(BigDecimal.ZERO) <= 0) {
            typeVente = TypeVente.VENTE_CREDIT;
        } else if (vides.compareTo(BigDecimal.ZERO) > 0) {
            typeVente = TypeVente.CASH_ECHANGE;
        } else {
            typeVente = TypeVente.VENTE_CASH;
        }

        BigDecimal montantEncaisse;
        switch (typeVente) {
            case CASH_ECHANGE -> montantEncaisse = totalLiquide; // uniquement le liquide pour l'échange
            case VENTE_CREDIT -> montantEncaisse = BigDecimal.ZERO;
            default -> montantEncaisse = vente.getTotalGeneral();
        }
        if (montantEncaisse.compareTo(BigDecimal.ZERO) < 0) {
            montantEncaisse = BigDecimal.ZERO;
        }

        vente.setTypeVente(typeVente);
        vente.setMontantPaye(montantEncaisse);

        // Mise à jour des montants sur le client
        // On additionne les montants précédents pour garder l'historique
        BigDecimal emballageAvant = client.getMontantEmballage() != null ? client.getMontantEmballage() : BigDecimal.ZERO;
        BigDecimal liquideAvant = client.getMontantLiquide() != null ? client.getMontantLiquide() : BigDecimal.ZERO;
        client.setMontantEmballage(emballageAvant.add(totalConsigne));
        client.setMontantLiquide(liquideAvant.add(totalLiquide));
        // Le solde doit refléter la dette réelle (total vente - payé - vides)
        BigDecimal resteApayer = totalLiquide.add(totalConsigne).subtract(vides).subtract(montantEncaisse);
        BigDecimal soldeAvant = client.getSoldeTotal() != null ? client.getSoldeTotal() : BigDecimal.ZERO;
        client.setSoldeTotal(soldeAvant.add(resteApayer));
        clientRepository.save(client);

        vente.setStatutPaiement(resteApayer.compareTo(BigDecimal.ZERO) <= 0 ? StatutPaiement.PAYE : StatutPaiement.NON_PAYE);
        vente.setStatutLivraison("NON_LIVREE");
        
        // Ajouter le statutEmballage manquant
        if (vides.compareTo(BigDecimal.ZERO) > 0) {
            vente.setStatutEmballage("RENDU");
        } else {
            vente.setStatutEmballage("NON_RENDU");
        }
        
        Vente saved = venteRepository.save(vente);

        // Créer UN SEUL enregistrement de Reglement avec montants ventilés
        // (logique du trigger SQL - remplacée par logique Java)
        if (totalConsigne.signum() > 0 || totalLiquide.signum() > 0) {
            Reglement reglement = new Reglement();
            reglement.setVente(saved);
            reglement.setClient(client);
            reglement.setDateOperation(LocalDateTime.now());
            reglement.setLibelle("Reglement CMD N° " + saved.getId());
            reglement.setMontant(totalConsigne.add(totalLiquide));
            reglement.setMtEmballage(totalConsigne);
            reglement.setMtLiquide(totalLiquide);
            reglement.setUtilisateur(createur);
            reglement.setPointDeVente(pvActif);
            // Statut: EN_ATTENTE si aucun paiement (crédit), ACCEPTE sinon
            reglement.setStatut(montantEncaisse.signum() > 0 ? StatutReglement.ACCEPTE : StatutReglement.EN_ATTENTE);
            reglementRepository.save(reglement);
        }

        // Journaliser l'encaissement initial si espèces à la création
        if (montantEncaisse != null && montantEncaisse.signum() > 0) {
            Caisse caisse = ensureTodayOpenCaisse(saved.getPointDeVente());
            caisse.ajouterEntree(montantEncaisse);
            caisseRepository.save(caisse);

            MouvementCaisse mvt = new MouvementCaisse();
            mvt.setCaisse(caisse);
            mvt.setPointDeVente(saved.getPointDeVente());
            mvt.setType(TypeMouvementCaisse.VENTE);
            mvt.setMontant(montantEncaisse);
            mvt.setReferenceOperation("VENTE-" + saved.getId());
            mvt.setCommentaire("Encaissement initial vente");
            mvt.setSoldeCourant(caisse.getSoldeFinal());
            mouvementCaisseRepository.save(mvt);
        }

        return saved;
    }

    /**
     * 🔥 NOUVEAU: Version avec PointDeVente explicite (pour transformation Commande → Vente)
     */
    @Transactional
    public Vente effectuerVenteDirecteWithPointDeVente(Client client,
                                       List<DetailArticleVendu> articles,
                                       BigDecimal montantPaye,
                                       BigDecimal montantVidesRendus,
                                       Long livreurId,
                                       ModeLivraison modeLivraison,
                                       String typeVenteSouhaite,
                                       PointDeVente pointDeVente) {
        if (pointDeVente == null) {
            throw new RuntimeException("Point de vente requis");
        }

        Vente vente = new Vente();
        vente.setClient(client);
        vente.setPointDeVente(pointDeVente);
        vente.setDateVente(LocalDateTime.now());
        vente.setModeLivraison(modeLivraison != null ? modeLivraison : ModeLivraison.SUR_PLACE);

        // Gestion du livreur
        if (livreurId != null) {
            Utilisateur livreur = utilisateurRepository.findById(livreurId).orElse(null);
            vente.setLivreur(livreur);
        }

        // Créateur: essayer de récupérer depuis l'authentification
        Utilisateur createur = null;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            String email = auth.getName();
            createur = utilisateurRepository.findByEmail(email).orElse(null);
            vente.setCreateur(createur);
        }

        BigDecimal cashInput = (montantPaye != null) ? montantPaye : BigDecimal.ZERO;
        BigDecimal vides = (montantVidesRendus != null) ? montantVidesRendus : BigDecimal.ZERO;
        
        vente.setMontantVidesRendus(vides);

        BigDecimal totalLiquide = BigDecimal.ZERO;
        BigDecimal totalConsigne = BigDecimal.ZERO;

        for (DetailArticleVendu item : articles) {
            BigDecimal prixFlash = (item.getPrixBase() != null) ? item.getPrixBase() : BigDecimal.valueOf(1250);
            item.setVente(vente);
            item.setPointDeVente(pointDeVente);
            item.setPrixBase(prixFlash);
            item.setPrixVenteFlash(prixFlash);

            BigDecimal ligneTotal = prixFlash.multiply(new BigDecimal(item.getQuantite()));
            item.setPrixTotalLigne(ligneTotal);
            totalLiquide = totalLiquide.add(ligneTotal);

            // Calcul consigne
            BigDecimal consigneBouteille = BigDecimal.ZERO;
            BigDecimal consigneCasier = BigDecimal.ZERO;
            Integer nbBouteilles = 0;
            
            if (item.getProduit() != null && item.getProduit().getTypeCasierAssocie() != null) {
                TypeCasier typeCasier = item.getProduit().getTypeCasierAssocie();
                consigneBouteille = (typeCasier.getPrixConsigneBouteille() != null) ? typeCasier.getPrixConsigneBouteille() : BigDecimal.ZERO;
                consigneCasier = (typeCasier.getPrixConsigneCasier() != null) ? typeCasier.getPrixConsigneCasier() : BigDecimal.ZERO;
                nbBouteilles = (typeCasier.getNbreBouteillesParCasier() != null) ? typeCasier.getNbreBouteillesParCasier() : 0;
            }
            
            BigDecimal consigneTotaleLigne = consigneCasier.add(consigneBouteille.multiply(BigDecimal.valueOf(nbBouteilles)));
            consigneTotaleLigne = consigneTotaleLigne.multiply(BigDecimal.valueOf(item.getQuantite()));
            totalConsigne = totalConsigne.add(consigneTotaleLigne);

            item.setConsigneAppliquee(false);
            item.setPrixUnitaireEmballage(BigDecimal.ZERO);
            item.setQuantiteDemandee(item.getQuantite());
            item.setQuantiteLivree(item.getQuantite());
            item.setReductionManuelle(BigDecimal.ZERO);
            item.setRemisePourcentage(0);

            // Mise à jour stock
            Produit produitEnBase = produitRepository.findById(item.getProduit().getId()).orElse(null);
            if (produitEnBase != null) {
                int stock = (produitEnBase.getQuantiteStock() != null) ? produitEnBase.getQuantiteStock() : 0;
                produitEnBase.setQuantiteStock(stock - item.getQuantite());
                produitRepository.save(produitEnBase);
            }
        }

        vente.setDetails(articles);
        vente.setTotalGeneral(totalLiquide.add(totalConsigne));
        vente.setMontantEmballageTotal(totalConsigne);

        // Déterminer le type de vente
        TypeVente typeVente;
        if (typeVenteSouhaite != null) {
            try {
                typeVente = TypeVente.valueOf(typeVenteSouhaite);
            } catch (IllegalArgumentException e) {
                typeVente = TypeVente.VENTE_CASH;
            }
        } else if (cashInput.compareTo(BigDecimal.ZERO) <= 0) {
            typeVente = TypeVente.VENTE_CREDIT;
        } else if (vides.compareTo(BigDecimal.ZERO) > 0) {
            typeVente = TypeVente.CASH_ECHANGE;
        } else {
            typeVente = TypeVente.VENTE_CASH;
        }

        BigDecimal montantEncaisse;
        switch (typeVente) {
            case CASH_ECHANGE -> montantEncaisse = totalLiquide;
            case VENTE_CREDIT -> montantEncaisse = BigDecimal.ZERO;
            default -> montantEncaisse = vente.getTotalGeneral();
        }
        if (montantEncaisse.compareTo(BigDecimal.ZERO) < 0) {
            montantEncaisse = BigDecimal.ZERO;
        }

        vente.setTypeVente(typeVente);
        vente.setMontantPaye(montantEncaisse);

        // Mise à jour client
        BigDecimal emballageAvant = client.getMontantEmballage() != null ? client.getMontantEmballage() : BigDecimal.ZERO;
        BigDecimal liquideAvant = client.getMontantLiquide() != null ? client.getMontantLiquide() : BigDecimal.ZERO;
        client.setMontantEmballage(emballageAvant.add(totalConsigne));
        client.setMontantLiquide(liquideAvant.add(totalLiquide));
        BigDecimal resteApayer = totalLiquide.add(totalConsigne).subtract(vides).subtract(montantEncaisse);
        BigDecimal soldeAvant = client.getSoldeTotal() != null ? client.getSoldeTotal() : BigDecimal.ZERO;
        client.setSoldeTotal(soldeAvant.add(resteApayer));
        clientRepository.save(client);

        vente.setStatutPaiement(resteApayer.compareTo(BigDecimal.ZERO) <= 0 ? StatutPaiement.PAYE : StatutPaiement.NON_PAYE);
        vente.setStatutLivraison("NON_LIVREE");
        
        if (vides.compareTo(BigDecimal.ZERO) > 0) {
            vente.setStatutEmballage("RENDU");
        } else {
            vente.setStatutEmballage("NON_RENDU");
        }
        
        Vente saved = venteRepository.save(vente);

        // Créer le règlement
        if (totalConsigne.signum() > 0 || totalLiquide.signum() > 0) {
            Reglement reglement = new Reglement();
            reglement.setVente(saved);
            reglement.setClient(client);
            reglement.setDateOperation(LocalDateTime.now());
            reglement.setLibelle("Reglement CMD N° " + saved.getId());
            reglement.setMontant(totalConsigne.add(totalLiquide));
            reglement.setMtEmballage(totalConsigne);
            reglement.setMtLiquide(totalLiquide);
            reglement.setUtilisateur(createur);
            reglement.setPointDeVente(pointDeVente);
            reglement.setStatut(montantEncaisse.signum() > 0 ? StatutReglement.ACCEPTE : StatutReglement.EN_ATTENTE);
            reglementRepository.save(reglement);
        }

        // Journaliser l'encaissement initial
        if (montantEncaisse != null && montantEncaisse.signum() > 0) {
            Caisse caisse = ensureTodayOpenCaisse(saved.getPointDeVente());
            caisse.ajouterEntree(montantEncaisse);
            caisseRepository.save(caisse);

            MouvementCaisse mvt = new MouvementCaisse();
            mvt.setCaisse(caisse);
            mvt.setPointDeVente(saved.getPointDeVente());
            mvt.setType(TypeMouvementCaisse.VENTE);
            mvt.setMontant(montantEncaisse);
            mvt.setReferenceOperation("VENTE-" + saved.getId());
            mvt.setCommentaire("Encaissement initial vente");
            mvt.setSoldeCourant(caisse.getSoldeFinal());
            mouvementCaisseRepository.save(mvt);
        }

        return saved;
    }

    /**
     * 4. ENCAISSEMENT D'UNE DETTE
     */
    @Transactional
    public Vente encaisserVente(Long venteId, ModePaiement mode, BigDecimal montant) {
        Vente vente = venteRepository.findById(venteId)
                .orElseThrow(() -> new RuntimeException("Vente introuvable ID: " + venteId));

        BigDecimal ancienMontantPaye = (vente.getMontantPaye() != null) ? vente.getMontantPaye() : BigDecimal.ZERO;
        vente.setMontantPaye(ancienMontantPaye.add(montant));
        vente.setModePaiement(mode);

        // Journaliser encaissement en caisse
        if (montant != null && montant.signum() > 0) {
            Caisse caisse = ensureTodayOpenCaisse(vente.getPointDeVente());
            caisse.ajouterEntree(montant);
            caisseRepository.save(caisse);

            MouvementCaisse mvt = new MouvementCaisse();
            mvt.setCaisse(caisse);
            mvt.setPointDeVente(vente.getPointDeVente());
            mvt.setType(TypeMouvementCaisse.VENTE);
            mvt.setMontant(montant);
            mvt.setReferenceOperation("VENTE-" + vente.getId());
            mvt.setCommentaire("Encaissement vente");
            mvt.setSoldeCourant(caisse.getSoldeFinal());
            mouvementCaisseRepository.save(mvt);
        }

        if (vente.getClient() != null) {
            BigDecimal soldeActuel = (vente.getClient().getSoldeTotal() != null) ? vente.getClient().getSoldeTotal() : BigDecimal.ZERO;
            vente.getClient().setSoldeTotal(soldeActuel.subtract(montant));
            clientRepository.save(vente.getClient());
        }

        BigDecimal reste = vente.getTotalGeneral()
                .subtract(vente.getMontantVidesRendus() != null ? vente.getMontantVidesRendus() : BigDecimal.ZERO)
                .subtract(vente.getMontantPaye());
        
        if (reste.compareTo(BigDecimal.ZERO) <= 0) {
            vente.setStatutPaiement(StatutPaiement.PAYE);
        }

        return venteRepository.save(vente);
    }

    /**
     * 🎯 VALIDER LIVRAISON COMPLÈTE
     * Quand utilisateur dit "TOUT EST OK" :
     * - Quantité livrée = Quantité commandée
     * - Quantité vide rendue = Quantité emballage
     * - Compensation = 0
     * - Status -> LIVREE
     * - Solde client = 0 (la dette s'annule)
     */
    @Transactional
    public VenteResponseDTO validerLivraisonComplete(Long venteId) {
        Vente vente = venteRepository.findById(venteId)
                .orElseThrow(() -> new RuntimeException("Vente non trouvée : " + venteId));

        // Mettre à jour le statut de livraison
        vente.setStatutLivraison("LIVREE");
        
        // Tous les emballages ont été rendus : montant vides rendus = total du montant
        vente.setMontantVidesRendus(vente.getTotalGeneral());
        
        // 🔥 Incrémenter le stock de vides rendus pour chaque détail de la vente
        // Le client a rendu TOUS ses casiers = quantiteLivree de chaque ligne
        if (vente.getDetails() != null) {
            for (var detail : vente.getDetails()) {
                if (detail.getProduit() != null && detail.getProduit().getTypeCasierAssocie() != null) {
                    int qteRendue = detail.getQuantiteLivree() != null ? detail.getQuantiteLivree() : detail.getQuantite();
                    if (qteRendue > 0) {
                        stockService.incrementerStockVideRendu(detail.getProduit().getTypeCasierAssocie().getId(), qteRendue);
                    }
                }
            }
        }
        
        // Compensation = 0 (tout est bon)
        // Note: pas de champ compensation explicite, on utilise le montant vides rendus
        
        // La dette s'annule si liquide payé + emballage rendu = total
        if (vente.getClient() != null) {
            BigDecimal total = vente.getTotalGeneral() != null ? vente.getTotalGeneral() : BigDecimal.ZERO;
            
            // Si le client a payé le liquide + rendu les emballages, sa dette = 0
            BigDecimal montantPaye = vente.getMontantPaye() != null ? vente.getMontantPaye() : BigDecimal.ZERO;
            BigDecimal montantVidesRendus = vente.getMontantVidesRendus() != null ? vente.getMontantVidesRendus() : BigDecimal.ZERO;
            
            if (montantPaye.add(montantVidesRendus).compareTo(total) >= 0) {
                // Annuler la dette
                vente.getClient().setSoldeTotal(BigDecimal.ZERO);
                vente.setStatutPaiement(StatutPaiement.PAYE);
            }
            clientRepository.save(vente.getClient());
        }

        // Sauvegarder la vente avec le nouveau statut
        Vente venteSauvegardee = venteRepository.save(vente);

        // ENVOI DE LA NOTIFICATION PUSH AU CLIENT (uniquement pour les livraisons)
        if (vente.getModeLivraison() == ModeLivraison.A_LIVRER && vente.getClient() != null) {
            String pushToken = vente.getClient().getPushToken();
            if (pushToken != null && !pushToken.isEmpty()) {
                String titre = "Livraison validée";
                String corps = "Votre livraison pour la vente n°" + vente.getId() + " est confirmée. Merci de procéder au paiement.";
                notificationService.envoyerNotificationInterne(pushToken, titre, corps, "VENTE_LIVREE");
            }
        }

        // Retourner le DTO mis à jour
        return transformerEnDTO(venteSauvegardee);
    }

    /**
     * Valider une livraison avec problème (manquants/compensations).
     * Règle calcul: solde = valeurManquants - (cashComp + casierComp)
     * - montantVidesRendus = casierComp
     * - montantPaye += cashComp
     * - solde client -= (cashComp + casierComp)
     */
    @Transactional
    public VenteResponseDTO validerLivraisonAvecProbleme(Long venteId, com.toure.depotmanager.dto.LivraisonProblemeRequest req) {
        Vente vente = venteRepository.findById(venteId)
                .orElseThrow(() -> new RuntimeException("Vente non trouvée : " + venteId));

        java.math.BigDecimal valeurManquants = java.math.BigDecimal.ZERO;
        if (req.getManquants() != null) {
            for (com.toure.depotmanager.dto.LivraisonProblemeRequest.ManquantItem m : req.getManquants()) {
                if (m == null || m.getTypeCasierId() == null || m.getQuantite() == null || m.getQuantite() <= 0) continue;
                TypeCasier tc = typeCasierRepository.findById(m.getTypeCasierId()).orElse(null);
                if (tc == null) continue;
                java.math.BigDecimal unit = tc.getConsigneTotaleParCasier();
                valeurManquants = valeurManquants.add(unit.multiply(java.math.BigDecimal.valueOf(m.getQuantite())));
            }
        }

        java.math.BigDecimal cashComp = java.math.BigDecimal.ZERO;
        java.math.BigDecimal casierComp = java.math.BigDecimal.ZERO;
        if (req.getCompensations() != null) {
            for (com.toure.depotmanager.dto.LivraisonProblemeRequest.CompensationItem c : req.getCompensations()) {
                if (c == null || c.getType() == null) continue;
                switch (c.getType()) {
                    case ESPECES -> {
                        java.math.BigDecimal m = c.getMontant() != null ? c.getMontant() : java.math.BigDecimal.ZERO;
                        if (m.signum() > 0) cashComp = cashComp.add(m);
                    }
                    case CASIER -> {
                        if (c.getTypeCasierId() == null || c.getQuantite() == null || c.getQuantite() <= 0) break;
                        TypeCasier tc = typeCasierRepository.findById(c.getTypeCasierId()).orElse(null);
                        if (tc == null) break;
                        java.math.BigDecimal unit = tc.getConsigneTotaleParCasier();
                        casierComp = casierComp.add(unit.multiply(java.math.BigDecimal.valueOf(c.getQuantite())));

                        // 🔥 Incrémenter le stock de vides rendus
                        stockService.incrementerStockVideRendu(c.getTypeCasierId(), c.getQuantite());
                    }
                }
            }
        }

        // Mise à jour de la vente
        vente.setStatutLivraison("LIVREE_AVEC_PROBLEME");
        java.math.BigDecimal ancienVides = vente.getMontantVidesRendus() != null ? vente.getMontantVidesRendus() : java.math.BigDecimal.ZERO;
        vente.setMontantVidesRendus(ancienVides.add(casierComp));

        java.math.BigDecimal ancienPaye = vente.getMontantPaye() != null ? vente.getMontantPaye() : java.math.BigDecimal.ZERO;
        vente.setMontantPaye(ancienPaye.add(cashComp));

        // Si espèces > 0, journaliser en caisse (entrée)
        if (cashComp.signum() > 0) {
            PointDeVente pv = vente.getPointDeVente();
            Caisse caisse = ensureTodayOpenCaisse(pv);
            caisse.ajouterEntree(cashComp);
            caisseRepository.save(caisse);

            MouvementCaisse mvt = new MouvementCaisse();
            mvt.setCaisse(caisse);
            mvt.setPointDeVente(pv);
            mvt.setType(TypeMouvementCaisse.LIVRAISON);
            mvt.setMontant(cashComp);
            mvt.setReferenceOperation("VENTE-" + vente.getId());
            mvt.setCommentaire(req.getCommentaire());
            mvt.setSoldeCourant(caisse.getSoldeFinal());
            mouvementCaisseRepository.save(mvt);
        }

        // Journaliser la compensation casier sans impacter le solde
        if (casierComp.signum() > 0) {
            PointDeVente pv = vente.getPointDeVente();
            Caisse caisse = ensureTodayOpenCaisse(pv);
            MouvementCaisse mvt = new MouvementCaisse();
            mvt.setCaisse(caisse);
            mvt.setPointDeVente(pv);
            mvt.setType(TypeMouvementCaisse.RETOUR_CASIER);
            mvt.setMontant(BigDecimal.ZERO);
            mvt.setReferenceOperation("VENTE-" + vente.getId());
            String commentaire = (req.getCommentaire() != null ? req.getCommentaire() + " | " : "") +
                    "Compensation casiers (valeur consigne: " + casierComp + ")";
            mvt.setCommentaire(commentaire);
            mvt.setSoldeCourant(caisse.getSoldeFinal());
            mouvementCaisseRepository.save(mvt);
        }

        // Mettre à jour statut de paiement selon reste
        java.math.BigDecimal total = vente.getTotalGeneral() != null ? vente.getTotalGeneral() : java.math.BigDecimal.ZERO;
        java.math.BigDecimal reste = total
                .subtract(vente.getMontantVidesRendus() != null ? vente.getMontantVidesRendus() : java.math.BigDecimal.ZERO)
                .subtract(vente.getMontantPaye() != null ? vente.getMontantPaye() : java.math.BigDecimal.ZERO);
        if (reste.compareTo(java.math.BigDecimal.ZERO) <= 0) {
            vente.setStatutPaiement(StatutPaiement.PAYE);
        }

        // Ajuster le solde du client (dette diminue du total des compensations)
        if (vente.getClient() != null) {
            java.math.BigDecimal solde = vente.getClient().getSoldeTotal() != null ? vente.getClient().getSoldeTotal() : java.math.BigDecimal.ZERO;
            vente.getClient().setSoldeTotal(solde.subtract(cashComp).subtract(casierComp));
            clientRepository.save(vente.getClient());
        }

        Vente saved = venteRepository.save(vente);
        
        // ENVOI SMS AU CLIENT pour l'informer de la compensation
        if (vente.getClient() != null && vente.getClient().getTelephone() != null) {
            try {
                String telephone = vente.getClient().getTelephone();
                StringBuilder message = new StringBuilder();
                message.append("📦 Livraison vente #").append(vente.getId()).append(" validée avec compensation.\n\n");
                
                if (cashComp.signum() > 0) {
                    message.append("💵 Compensation espèces: ").append(cashComp.intValue()).append(" FCFA\n");
                }
                if (casierComp.signum() > 0) {
                    message.append("📦 Compensation casiers: ").append(casierComp.intValue()).append(" FCFA\n");
                }
                
                message.append("\n💰 Nouveau solde: ").append(vente.getClient().getSoldeTotal().intValue()).append(" FCFA");
                message.append("\n\nMerci de votre compréhension.");
                
                orangeSmsService.envoyerSms(telephone, message.toString());
            } catch (Exception e) {
                System.err.println("❌ Erreur envoi SMS compensation: " + e.getMessage());
            }
        }
        
        return transformerEnDTO(saved);
    }

    /**
     * Récupère l'ID du point de vente depuis le header X-PV-ID envoyé par le frontend
     */
    private Long getCurrentPointDeVenteId() {
        // Essayer de récupérer depuis le header X-PV-ID
        try {
            org.springframework.web.context.request.RequestAttributes requestAttributes = 
                org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
            if (requestAttributes != null) {
                String pvIdHeader = (String) requestAttributes.getAttribute("X-PV-ID", 
                    org.springframework.web.context.request.RequestAttributes.SCOPE_REQUEST);
                if (pvIdHeader != null && !pvIdHeader.isEmpty()) {
                    System.out.println("✅ PV ID depuis header X-PV-ID: " + pvIdHeader);
                    return Long.parseLong(pvIdHeader);
                }
            }
        } catch (Exception e) {
            // En cas d'erreur, logger et utiliser fallback
            System.err.println("Erreur récupération X-PV-ID: " + e.getMessage());
        }
        
        // Fallback: essayer de récupérer depuis l'utilisateur connecté
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                String email = auth.getName();
                Utilisateur utilisateur = utilisateurRepository.findByEmail(email).orElse(null);
                if (utilisateur != null && utilisateur.getPointDeVenteActif() != null) {
                    Long pvId = utilisateur.getPointDeVenteActif().getId();
                    System.out.println("✅ PV ID depuis utilisateur connecté: " + pvId);
                    return pvId;
                }
            }
        } catch (Exception e) {
            System.err.println("Erreur récupération PV depuis utilisateur: " + e.getMessage());
        }
        
        // Dernier fallback: essayer de récupérer depuis le premier PV de l'utilisateur
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                String email = auth.getName();
                Utilisateur utilisateur = utilisateurRepository.findByEmail(email).orElse(null);
                if (utilisateur != null && utilisateur.getPointsVentes() != null && !utilisateur.getPointsVentes().isEmpty()) {
                    Long pvId = utilisateur.getPointsVentes().get(0).getPointDeVente().getId();
                    System.out.println("✅ PV ID depuis premier PV de l'utilisateur: " + pvId);
                    return pvId;
                }
            }
        } catch (Exception e) {
            System.err.println("Erreur récupération PV depuis premier PV: " + e.getMessage());
        }
        
        // Retourner null au lieu de lancer une exception
        System.err.println("⚠️ Aucun point de vente trouvé - header X-PV-ID manquant et utilisateur sans PV");
        return null;
    }
    
    /**
     * Expose le service de notification de livraison pour les contrôleurs
     */
    public LivraisonNotificationService getLivraisonNotificationService() {
        return livraisonNotificationService;
    }
}
