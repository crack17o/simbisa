# POLITIQUE D'OCTROI DE MICRO-CRÉDIT — RAWBANK RDC
## Version 4.2 — Exercice 2025
### Direction Crédit & Risques | Conformité BCC Circulaire N°04/2023

---

## SECTION 1 — OBJET ET CHAMP D'APPLICATION

La présente politique définit les règles, critères et procédures encadrant l'octroi de micro-crédits
par Rawbank via la plateforme numérique Simbisa FinTech, conformément aux directives de la
Banque Centrale du Congo (BCC) relatives au financement des particuliers et des micro-entreprises.

Elle s'applique à l'ensemble des demandes de crédit soumises via l'application mobile et web
Simbisa, pour des montants inférieurs ou égaux à 1 500 USD sur une durée maximale de 12 mois.

---

## SECTION 2 — ÉLIGIBILITÉ ET CONDITIONS D'ACCÈS

### 2.1 Conditions générales d'éligibilité

Pour être éligible à un micro-crédit Simbisa, le demandeur doit :

- Être titulaire d'un compte actif Rawbank depuis au minimum 3 mois
- Être âgé de 18 à 65 ans révolus à la date de la demande
- Être résident en République Démocratique du Congo
- Ne pas avoir de défaut de paiement actif ou d'incident de crédit non régularisé
- Ne pas avoir de crédit en cours sur la plateforme Simbisa (un seul crédit actif par client)
- Disposer d'une pièce d'identité valide (CNI, Passeport, Permis, Carte de réfugié)
- Avoir complété son processus de vérification KYC (Know Your Customer)

### 2.2 Vérification KYC obligatoire

Aucun décaissement ne peut être effectué sans validation préalable du KYC par un agent Rawbank
accrédité. Le KYC couvre :
- Vérification de l'identité (pièce + photo)
- Vérification de l'adresse de résidence
- Vérification de la profession et des revenus déclarés
- Contrôle des listes de sanctions internationales (OFAC, ONU, UE)

Le KYC est valable 24 mois. Tout KYC expiré suspend l'accès au crédit jusqu'au renouvellement.

### 2.3 Critères d'exclusion automatique

Sont automatiquement exclus de l'éligibilité :
- Clients avec un score de crédit inférieur à 25/100 (risque très élevé)
- Clients sous procédure judiciaire ou en faillite
- Clients dont le compte a été suspendu pour activité suspecte
- Clients présentant une dette impayée envers Rawbank supérieure à 30 jours
- Mineurs et personnes frappées d'incapacité légale

---

## SECTION 3 — PARAMÈTRES DE CRÉDIT

### 3.1 Plage de montants

| Niveau de compte | Montant minimum | Montant maximum |
|-----------------|----------------|----------------|
| Standard        | 50 USD         | 300 USD        |
| Pro             | 50 USD         | 700 USD        |
| Pro+            | 50 USD         | 1 000 USD      |
| Premium         | 50 USD         | 1 500 USD      |

Le plafond du niveau de compte prend la priorité sur toute autre condition. Un client de niveau
Standard ne peut pas obtenir plus de 300 USD, quelle que soit son ancienneté ou son score.

### 3.2 Durées autorisées

Les crédits Simbisa sont accordés pour des durées de 1 à 12 mois, par tranches d'un mois.
La durée maximale est modulée selon le niveau de compte :

- Standard : 1 à 6 mois
- Pro : 1 à 9 mois
- Pro+ : 1 à 12 mois
- Premium : 1 à 12 mois

### 3.3 Taux d'intérêt

Le taux d'intérêt nominal mensuel est déterminé en deux étapes :

**Étape 1 — Taux de base selon le score IA :**

| Score global (XGBoost) | Taux de base mensuel |
|------------------------|---------------------|
| ≥ 75/100 (faible risque)  | 2,5% |
| 60–74/100 (risque modéré) | 3,0% |
| 40–59/100 (zone grise)    | 3,5% |
| < 40/100 (risque élevé)   | Validation agent obligatoire |

**Étape 2 — Remise selon le niveau de compte :**

| Niveau  | Remise sur taux |
|---------|----------------|
| Standard | 0%           |
| Pro      | −0,25%       |
| Pro+     | −0,50%       |
| Premium  | −0,75%       |

Le taux final ne peut jamais descendre en dessous de **1,5% mensuel** (plancher réglementaire BCC).

**Exemple :** Client Pro+, score 80 → 2,5% − 0,5% = **2,0% mensuel**

### 3.4 Devise

Les crédits Simbisa sont libellés exclusivement en **USD (Dollar Américain)**.
Le remboursement peut s'effectuer en USD ou en CDF au taux de change BCC du jour du paiement.

---

## SECTION 4 — PROCESSUS DE SCORING ET DÉCISION

### 4.1 Moteur de scoring IA (XGBoost)

Chaque demande de crédit est évaluée automatiquement par le modèle XGBoost de scoring crédit
de Simbisa. Ce modèle produit :

- Un **score global de 0 à 100** représentant la probabilité de remboursement
- Des **attributions SHAP** (SHapley Additive exPlanations) identifiant les 5 facteurs les plus
  déterminants dans la décision (positivement ou négativement)

Les principales variables du modèle incluent :
- Historique de remboursements antérieurs
- Ancienneté du compte Rawbank
- Régularité des transactions (dépôts/retraits)
- Ratio montant demandé / revenu estimé
- Niveau KYC et fraîcheur de la vérification
- Score comportemental Mobile Money (Airtel Money, M-Pesa, Orange Money)
- Profession et secteur d'activité
- Historique d'épargne sur le compte Simbisa

### 4.2 Seuils de décision automatique

| Score        | Décision automatique         | Action requise              |
|--------------|-----------------------------|-----------------------------|
| ≥ 60/100     | Approbation automatique      | Aucune — décaissement direct |
| 40–59/100    | Zone grise / Mise en attente | Revue obligatoire par un agent |
| 25–39/100    | Approbation sous conditions  | Validation manager requise  |
| < 25/100     | Rejet automatique            | Aucun recours immédiat      |

### 4.3 Motifs de refus standardisés

Les motifs de refus communiqués au client sont intentionnellement non-techniques :
- "Profil de risque insuffisant pour ce montant"
- "Historique de compte insuffisant"
- "Vérification d'identité requise"
- "Crédit en cours — remboursez avant de soumettre une nouvelle demande"
- "Montant demandé supérieur au plafond de votre niveau de compte"

---

## SECTION 5 — REMBOURSEMENT ET ÉCHEANCIER

### 5.1 Structure de remboursement

Les crédits Simbisa sont remboursés par mensualités constantes (amortissement linéaire).
Chaque échéance comprend :
- Une part de capital
- Les intérêts sur le capital restant dû
- Aucun frais de dossier ni frais cachés

### 5.2 Modalités de paiement

Le remboursement s'effectue via :
- **Mobile Money** : Airtel Money, M-Pesa, Orange Money (numéro enregistré dans l'application)
- **Virement bancaire** : depuis tout compte Rawbank
- **Versement en agence** : auprès d'un agent Rawbank accrédité Simbisa

### 5.3 Retards et pénalités

- Retard 1–7 jours : notification automatique, aucune pénalité
- Retard 8–30 jours : pénalité de 0,5% du capital restant dû par semaine
- Retard > 30 jours : signalement au bureau de crédit BCC, blocage de l'accès aux nouveaux crédits
- Retard > 90 jours : transfert au service contentieux, poursuite judiciaire possible

### 5.4 Remboursement anticipé

Le remboursement anticipé total ou partiel est autorisé sans pénalité à tout moment.
Les intérêts ne sont dus que pour la période effective du crédit.

---

## SECTION 6 — PROMOTION DES NIVEAUX DE COMPTE

### 6.1 Critères de promotion automatique

La promotion de niveau est évaluée trimestriellement par le système Simbisa :

**Standard → Pro :**
- Avoir remboursé au moins 1 crédit sans incident
- Ancienneté compte ≥ 6 mois
- Score IA ≥ 55/100

**Pro → Pro+ :**
- Avoir remboursé au moins 2 crédits sans incident
- Ancienneté compte ≥ 12 mois
- Score IA ≥ 65/100
- Épargne active sur compte Simbisa

**Pro+ → Premium :**
- Avoir remboursé au moins 4 crédits sans incident
- Ancienneté compte ≥ 24 mois
- Score IA ≥ 75/100
- Volume total crédits remboursés ≥ 2 000 USD

### 6.2 Rétrogradation de niveau

Un incident de paiement grave (retard > 30 jours) entraîne la rétrogradation automatique
d'un niveau. La récupération du niveau précédent nécessite de remplir à nouveau les critères.

---

## SECTION 7 — ÉPARGNE VIRTUELLE

### 7.1 Fonctionnement

Le compte d'épargne virtuelle Simbisa permet aux clients de constituer une épargne rémunérée
séparée de leur compte courant Rawbank. L'épargne virtuelle :

- Rapporte un taux d'intérêt annuel de 4% sur le solde maintenu ≥ 30 jours
- Est disponible pour des retraits à tout moment (sans pénalité)
- Améliore le score IA du client (facteur comportemental positif)
- Peut servir de garantie partielle pour les demandes de crédit en zone grise

### 7.2 Dépôts et retraits

Les opérations d'épargne s'effectuent via Mobile Money ou virement bancaire.
Montant minimum par transaction : 5 USD. Pas de montant maximum.

---

## SECTION 8 — CONFORMITÉ ET GOUVERNANCE

### 8.1 Cadre réglementaire

La politique Simbisa est conforme aux textes suivants :
- Circulaire BCC N°04/2023 relative aux établissements de crédit et financement inclusif
- Loi N°004/2002 du 21 février 2002 portant Code des investissements
- Directive FATF/GAFI sur la lutte contre le blanchiment et le financement du terrorisme (LBC/FT)
- Règlement BCC sur la protection des données personnelles des clients (RGPD-RDC)

### 8.2 Rôles et responsabilités

| Rôle       | Périmètre de décision                                    |
|------------|----------------------------------------------------------|
| Client     | Soumet la demande, consulte son scoring, rembourse       |
| Agent      | Vérifie KYC, valide les dossiers en zone grise (40–59)   |
| Manager    | Valide les exceptions, gère les plafonds par zone        |
| Analyste   | Surveille les performances du modèle IA, ajuste les règles |
| Auditeur   | Contrôle la conformité des décisions, génère les rapports |
| Admin      | Gestion des utilisateurs, paramétrage système             |

### 8.3 Traçabilité et audit

Toute décision de crédit (automatique ou manuelle) est journalisée avec :
- Horodatage précis
- Score IA et attributions SHAP
- Agent/manager impliqué le cas échéant
- Motif de la décision
- Version du modèle XGBoost utilisé

Ces journaux sont conservés 7 ans conformément aux obligations réglementaires BCC.

---

## SECTION 9 — SÉCURITÉ ET PROTECTION DES DONNÉES

### 9.1 Données personnelles traitées

Dans le cadre du crédit Simbisa, Rawbank collecte et traite :
- Données d'identité (nom, prénom, date de naissance, numéro de pièce)
- Données de contact (téléphone, e-mail, adresse)
- Données financières (historique de transactions, revenus déclarés)
- Données comportementales (fréquence et montants des opérations)
- Données biométriques optionnelles (photo KYC)

### 9.2 Droits des clients

Conformément au RGPD-RDC, tout client a le droit de :
- Accéder à ses données personnelles
- Demander la correction de données inexactes
- S'opposer au traitement automatisé des décisions le concernant
- Demander la portabilité de ses données
- Être informé de toute décision automatique défavorable et de son fondement

### 9.3 Sécurité informatique

La plateforme Simbisa met en œuvre les mesures de sécurité suivantes :
- Authentification JWT (access token 30 min + refresh token 7 jours)
- MFA obligatoire pour les comptes agents et managers
- MFA optionnel (OTP e-mail) pour les clients
- Chiffrement TLS 1.3 pour toutes les communications
- Journalisation de toutes les actions sensibles
- Contrôle d'accès basé sur les rôles (RBAC)

---

*Document à usage interne Rawbank — Simbisa FinTech Platform*
*Approuvé par : Direction Risques & Conformité — Janvier 2025*
*Révision prévue : Juillet 2025*
