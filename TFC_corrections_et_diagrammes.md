# TFC Simbisa — Corrections textuelles + Diagrammes PlantUML

---

## PARTIE 1 : CORRECTIONS TEXTUELLES

### Corrections factuelles (erreurs vs le projet réel)

---

**Section 3.2.6 — Besoins techniques et outils**

REMPLACER le bloc actuel par :

> Backend : API REST exposant les services d'authentification, de gestion des utilisateurs et des clients, de scoring, de sessions USSD et de reporting. Implémentée avec Django REST Framework (Python), l'API orchestre l'ensemble des appels entre les modules applicatifs.
> Tâches asynchrones : les calculs de scoring et la génération de rapports RAG s'exécutent hors du cycle requête/réponse via Celery, avec Redis comme broker de messages.
> Persistance : MySQL pour les données structurées (utilisateurs, crédits, épargne, journaux) et Redis pour le cache et les sessions USSD.
> Data Science / Machine Learning : pipeline de features, apprentissage XGBoost, sérialisation du modèle et endpoints de scoring (Python, scikit-learn, XGBoost).
> Intelligence artificielle explicable : génération d'explications locales et globales via SHAP et LIME, avec stockage des vecteurs d'attribution dans MySQL pour l'audit.
> Génération augmentée par récupération : indexation vectorielle dans pgvector (PostgreSQL), calcul d'embeddings et génération de texte via l'API Gemini de Google DeepMind (modèle gemini-2.0-flash, embeddings text-embedding-004).
> Interface : tableau de bord web (React + Vite) pour les agents, administrateurs et auditeurs ; application mobile (Flutter) pour les clients, accessible sur Android et iOS.

---

**Section 3.3.1 — Diagramme de déploiement (légende)**

REMPLACER la description actuelle par :

> Le prototype est conteneurisé via Docker Compose. Les conteneurs applicatifs sont : l'API Django (port 8000), le worker Celery pour le scoring asynchrone, et le scheduler Celery Beat pour les tâches planifiées. Les services de données sont : MySQL (port 3306) pour la persistance relationnelle, Redis (port 6379) comme broker de messages et cache de sessions USSD, et PostgreSQL + pgvector pour l'index vectoriel RAG. Le frontend React est déployé sur Vercel (CDN externe) ; l'application Flutter est distribuée via les stores (hors périmètre POC). En production, Nginx sur l'hôte sert de reverse proxy vers le port 8000 de l'API.

---

### Corrections humanize-writing

---

**Section 0.1 — dernier paragraphe**

AVANT :
> Le choix de ce sujet se justifie d'abord par sa pertinence socio-économique immédiate : en ancrant le scoring de crédit sur des données réellement disponibles pour les populations non bancarisées, ce travail répond directement à un besoin documenté de l'écosystème financier congolais [20, 22, 1]. Sur le plan académique, il se situe à la convergence de trois domaines de recherche habituellement traités séparément dans la littérature : la modélisation statistique et computationnelle du risque de crédit, l'intelligence artificielle explicable appliquée à la finance, et l'ingénierie logicielle distribuée appliquée aux contraintes des réseaux télécom africains (USSD, connectivité intermittente). L'originalité du travail réside dans l'intégration native de ces trois axes au sein d'une architecture logicielle unique et auditable, plutôt que dans le traitement isolé de l'un d'entre eux.

APRÈS :
> Ce choix se justifie d'abord par sa pertinence socio-économique : en fondant le scoring de crédit sur des données effectivement disponibles pour les populations non bancarisées, ce travail adresse un besoin documenté de l'écosystème financier congolais [20, 22, 1]. Sur le plan académique, il croise trois domaines habituellement traités séparément : la modélisation statistique du risque de crédit, l'IA explicable appliquée à la finance, et l'ingénierie logicielle distribuée adaptée aux contraintes des réseaux télécom africains — USSD, connectivité intermittente. L'originalité tient à l'intégration de ces trois axes dans une même architecture auditable, plutôt qu'au traitement isolé de l'un d'entre eux.

---

**Section 2.1 — première phrase**

AVANT :
> La conception d'un système d'information part rarement d'une page blanche : elle s'appuie sur ce qui existe déjà, ses forces et ses limites, avant de proposer une trajectoire d'amélioration.

APRÈS :
> La conception d'un système d'information s'appuie toujours sur ce qui existe déjà : comprendre les forces et les limites du système en place est la condition pour proposer quelque chose de mieux fondé.

---

**Section 3.2.7.4 — première phrase**

AVANT :
> Dans un système de scoring de crédit, la performance prédictive seule ne suffit pas : il est nécessaire d'expliquer chaque décision afin de renforcer la confiance, faciliter l'audit et permettre une prise de décision responsable, conformément au cadre théorique exposé au point 1.2.3 [31, 24, 33].

APRÈS :
> Dans un système de scoring de crédit, la performance prédictive ne suffit pas. Chaque décision doit pouvoir être expliquée — pour l'agent de crédit qui statue sur le dossier, pour l'auditeur qui vérifie la conformité, et pour le client qui conteste un refus — conformément au cadre théorique du point 1.2.3 [31, 24, 33].

---

**Section 3.4 — premier paragraphe**

AVANT :
> Ce travail se situe au stade de la conception et de la modélisation d'un prototype (cf. délimitation, point 0.7) : les indicateurs quantitatifs associés aux trois hypothèses (aire sous la courbe ROC, cohérence d'explication SHAP/LIME, taux d'hallucination du pipeline RAG) restent à mesurer sur un jeu de données constitué.

APRÈS :
> Ce travail porte sur la conception et la modélisation d'un prototype (point 0.7) : les indicateurs des trois hypothèses — aire sous la courbe ROC, cohérence d'explication SHAP/LIME, taux d'hallucination du pipeline RAG — restent à mesurer sur un jeu de données constitué.

---

**Conclusion — avant-dernier paragraphe**

AVANT :
> Ce travail montre enfin qu'un projet de Génie Logiciel peut articuler gestion de projet agile, modélisation par le Processus Unifié et intégration de composants d'intelligence artificielle explicable et générative au sein d'une même architecture, auditable et conforme aux exigences du secteur bancaire congolais — sans que l'un de ces registres prenne le pas sur les deux autres.

APRÈS :
> Ce travail illustre aussi qu'une architecture de Génie Logiciel peut faire coexister gestion de projet agile, modélisation par le Processus Unifié et composants d'intelligence artificielle explicable et générative, sans que l'un de ces registres n'efface les deux autres — chaque couche reste lisible et auditable indépendamment.

---

---

## PARTIE 2 : DIAGRAMMES PLANTUML

Chaque bloc PlantUML correspond à la figure indiquée dans le document.
Rendu recommandé : PlantUML server (plantuml.com/plantuml) ou extension VS Code.

---

### Figure 1 — Diagramme de Gantt

```plantuml
@startgantt
title Planification prévisionnelle du projet Simbisa (8 semaines / 46 jours ouvrés)
printscale daily zoom 2
saturday are closed
sunday are closed

Project starts 2025-09-01

-- PHASE 1 : Inception (S1-S2) --
[Cadrage & état de l'art] lasts 5 days and starts 2025-09-01
[Analyse de l'existant illicocash] lasts 4 days and starts 2025-09-01
[Diagramme de contexte] lasts 2 days and starts after [Analyse de l'existant illicocash]
[Diagramme de cas d'utilisation global] lasts 3 days and starts after [Diagramme de contexte]
[Étude de faisabilité & Gantt] lasts 2 days and starts after [Cadrage & état de l'art]
[JALON 1 — Inception] happens at [Diagramme de cas d'utilisation global]'s end

-- PHASE 2 : Élaboration (S3-S4) --
[Fiches cas d'utilisation détaillées] lasts 3 days and starts at [JALON 1 — Inception]'s start
[Diagrammes de séquence (Auth, Score, Décaissement)] lasts 5 days and starts after [Fiches cas d'utilisation détaillées]
[Diagrammes de collaboration] lasts 3 days and starts after [Fiches cas d'utilisation détaillées]
[Matrice RBAC & exigences] lasts 2 days and starts after [Fiches cas d'utilisation détaillées]
[JALON 2 — Élaboration] happens at [Diagrammes de séquence (Auth, Score, Décaissement)]'s end

-- PHASE 3 : Construction (S5-S7) --
[Diagramme de classes & objets] lasts 4 days and starts at [JALON 2 — Élaboration]'s start
[Diagramme d'activités (pipeline crédit)] lasts 3 days and starts at [JALON 2 — Élaboration]'s start
[Diagramme de composants] lasts 3 days and starts after [Diagramme de classes & objets]
[Diagramme états-transitions] lasts 2 days and starts after [Diagramme d'activités (pipeline crédit)]
[Pipeline XGBoost + SHAP/LIME] lasts 6 days and starts at [JALON 2 — Élaboration]'s start
[Pipeline RAG (pgvector + Gemini)] lasts 5 days and starts after [Pipeline XGBoost + SHAP/LIME]
[JALON 3 — Construction] happens at [Pipeline RAG (pgvector + Gemini)]'s end

-- PHASE 4 : Transition (S8) --
[Diagramme de déploiement Docker] lasts 3 days and starts at [JALON 3 — Construction]'s start
[Tests de scénarios critiques] lasts 4 days and starts after [Diagramme de déploiement Docker]
[Rédaction finale & relecture] lasts 5 days and starts at [JALON 3 — Construction]'s start
[JALON FINAL — Livraison J46] happens at [Tests de scénarios critiques]'s end

[Cadrage & état de l'art] is colored in DarkSalmon
[Diagrammes de séquence (Auth, Score, Décaissement)] is colored in DarkSalmon
[Pipeline XGBoost + SHAP/LIME] is colored in DarkSalmon
[Pipeline RAG (pgvector + Gemini)] is colored in DarkSalmon
[Tests de scénarios critiques] is colored in DarkSalmon
@endgantt
```

---

### Figure 2 — Diagramme de contexte

```plantuml
@startuml
!theme plain
skinparam backgroundColor #FAFAFA
skinparam defaultFontName "Arial"
skinparam actorStyle awesome
skinparam packageStyle rectangle

title Diagramme de contexte — Plateforme FinTech Simbisa

left to right direction

actor "Client\n(non bancarisé)" as client
actor "Agent de crédit\n(commune Kinshasa)" as agent
actor "Administrateur" as admin
actor "Auditeur" as auditeur

rectangle "Écosystème externe" {
  rectangle "illicocash\n(Rawbank)" as illicocash
  rectangle "Opérateurs\nMobile Money\n(Vodacom M-Pesa\nAirtel Money\nOrange Money)" as mno
  rectangle "Banque Centrale\ndu Congo (BCC)" as bcc
  rectangle "API Gemini\n(Google DeepMind)" as gemini
}

rectangle "Plateforme Simbisa\n(périmètre du POC)" as simbisa {
  rectangle "API REST\nDjango" as api
  rectangle "Moteur de scoring\nXGBoost + SHAP/LIME" as scoring
  rectangle "Pipeline RAG\npgvector + Gemini" as rag
  rectangle "Application mobile\nFlutter" as mobile
  rectangle "Tableau de bord web\nReact" as web
}

client --> mobile : inscription, épargne\ndemande de crédit
agent --> web : traitement des dossiers\nconsultation score + mémo
admin --> web : gestion des comptes\nconfiguration système
auditeur --> web : journaux d'audit\ngénération de rapports
illicocash --> api : flux Mobile Money\nKYC utilisateurs
mno --> illicocash : transactions USSD
api --> bcc : rapports de conformité
api --> gemini : embeddings + génération
@enduml
```

---

### Figure 3 — Diagramme de cas d'utilisation (vue globale)

```plantuml
@startuml
!theme plain
skinparam backgroundColor #FAFAFA
skinparam defaultFontName "Arial"
left to right direction

title Diagramme de cas d'utilisation — Plateforme Simbisa

actor Client as C
actor "Agent de crédit" as A
actor Administrateur as Ad
actor Auditeur as Au
actor "Système illicocash" as S <<system>>

rectangle "Plateforme Simbisa" {
  usecase "S'inscrire &\nvalider le KYC" as UC1
  usecase "S'authentifier\n(téléphone + OTP)" as UC2
  usecase "Gérer son\ncompte épargne" as UC3
  usecase "Soumettre une demande\nde micro-crédit" as UC4
  usecase "Consulter son score\net les explications IA" as UC5
  usecase "Rembourser\nune échéance" as UC6
  usecase "Traiter un dossier\nde crédit" as UC7
  usecase "Consulter score,\nSHAP/LIME et mémo RAG" as UC8
  usecase "Valider ou\nrejeter un dossier" as UC9
  usecase "Gérer les comptes\nutilisateurs" as UC10
  usecase "Attribuer les rôles\net communes" as UC11
  usecase "Consulter les journaux\nd'audit complets" as UC12
  usecase "Générer des rapports\nréglementaires" as UC13
  usecase "Fournir les flux\nMobile Money" as UC14
  usecase "Calculer le score\n(pipeline automatique)" as UC15
  usecase "Générer le mémo\n(pipeline RAG)" as UC16
  usecase "Journaliser\nl'action" as UC17

  UC4 ..> UC2 : <<include>>
  UC3 ..> UC2 : <<include>>
  UC5 ..> UC2 : <<include>>
  UC7 ..> UC8 : <<include>>
  UC7 ..> UC9 : <<include>>
  UC4 ..> UC15 : <<include>>
  UC15 ..> UC16 : <<include>>
  UC7 ..> UC17 : <<include>>
  UC9 ..> UC17 : <<include>>
}

C --> UC1
C --> UC2
C --> UC3
C --> UC4
C --> UC5
C --> UC6
A --> UC7
A --> UC2
Ad --> UC10
Ad --> UC11
Au --> UC12
Au --> UC13
S --> UC14
UC14 ..> UC15 : <<include>>
@enduml
```

---

### Figure 4 — Diagramme de séquence — Authentification (téléphone + OTP)

```plantuml
@startuml
!theme plain
skinparam backgroundColor #FAFAFA
skinparam defaultFontName "Arial"
skinparam sequenceMessageAlign center

title Diagramme de séquence — Authentification (téléphone + mot de passe + OTP email)

actor "Client" as C
participant "App Flutter /\nInterface Web" as UI
participant "API Django\n(AuthView)" as API
participant "Redis\n(session cache)" as Redis
database "MySQL\n(Utilisateur)" as DB
participant "Service Email\n(SMTP Gmail)" as Email

C -> UI : saisit téléphone + mot de passe
UI -> API : POST /auth/login/\n{telephone, password}
API -> DB : SELECT utilisateur WHERE telephone=...
DB --> API : utilisateur + hash mot de passe

alt mot de passe invalide
  API --> UI : 401 Unauthorized
  UI --> C : message d'erreur
else mot de passe valide + MFA activé
  API -> API : génère OTP (6 chiffres, TTL 10 min)
  API -> Redis : SET otp:{user_id} = OTP, EX 600
  API -> Email : envoi OTP par email
  Email --> C : email contenant le code OTP
  API --> UI : {mfa_required: true, user_id}

  C -> UI : saisit le code OTP reçu
  UI -> API : POST /auth/verify-otp/\n{user_id, otp}
  API -> Redis : GET otp:{user_id}

  alt OTP invalide ou expiré
    API --> UI : 400 Bad Request
    UI --> C : "Code invalide ou expiré"
  else OTP valide
    API -> Redis : DEL otp:{user_id}
    API -> API : génère JWT access (30 min)\n+ refresh token (7 jours)
    API --> UI : {access_token, refresh_token, user}
    UI -> UI : stocke tokens localement
    UI --> C : redirige vers le tableau de bord
  end
else mot de passe valide + MFA désactivé
  API -> API : génère JWT access + refresh
  API --> UI : {access_token, refresh_token, user}
  UI --> C : redirige vers le tableau de bord
end
@enduml
```

---

### Figure 5 — Diagramme de séquence — Calcul du score de crédit

```plantuml
@startuml
!theme plain
skinparam backgroundColor #FAFAFA
skinparam defaultFontName "Arial"

title Diagramme de séquence — Calcul du score de crédit (pipeline multi-moteurs)

actor "Client" as C
participant "API Django" as API
participant "Worker Celery\n(tâche asynchrone)" as Celery
participant "Moteur de règles\n(règles métier Rawbank)" as Rules
participant "Moteur Mobile Money\n(indicateurs comportementaux)" as MM
participant "Moteur comportemental\n(épargne + historique app)" as Behav
participant "Moteur IA\n(XGBoost + SHAP/LIME)" as IA
participant "Pipeline RAG\n(pgvector + Gemini)" as RAG
database "MySQL" as DB

C -> API : POST /scoring/trigger/\n{demande_credit_id}
API -> DB : INSERT ScoreClient (statut=en_calcul)
API -> Celery : lance tâche calculate_score(demande_id)
API --> C : 202 Accepted {task_id}

Celery -> Rules : évalue règles éligibilité\n(âge, KYC, contentieux, commune)
Rules --> Celery : {score_regles: 0-25, eligible: bool}

alt non éligible (score_regles < seuil)
  Celery -> DB : UPDATE ScoreClient\n(statut=rejete, motif=règles)
else éligible
  Celery -> MM : calcule indicateurs Mobile Money\n(fréquence, régularité, volume)
  MM -> DB : SELECT transactions 90 derniers jours
  DB --> MM : historique transactions
  MM --> Celery : {score_mm: 0-25, features: {...}}

  Celery -> Behav : calcule score comportemental\n(épargne, interactions app)
  Behav -> DB : SELECT CompteEpargne, sessions
  DB --> Behav : données épargne
  Behav --> Celery : {score_comport: 0-25, features: {...}}

  Celery -> IA : prédit P(défaut) avec XGBoost
  IA --> Celery : {proba_defaut: 0-1, score_ia: 0-25}
  Celery -> IA : calcule explications SHAP + LIME
  IA --> Celery : {shap_values: {...}, lime_explanation: {...}}

  Celery -> IA : agrège score global (0-100)
  IA --> Celery : {score_client: float, niveau_risque: str}

  Celery -> RAG : génère mémo de crédit
  RAG -> DB : récupère profil client + transactions agrégées
  DB --> RAG : données contextuelles
  RAG -> RAG : retrieval top-K passages\n(politique Rawbank via pgvector)
  RAG -> RAG : génération Gemini Flash\n(contexte ancré uniquement)
  RAG --> Celery : mémo de décision (texte structuré)

  Celery -> DB : UPDATE ScoreClient\n(score_client, niveau_risque,\nSHAP, LIME, mémo, statut=calculé)
end

C -> API : GET /scoring/my-score/
API -> DB : SELECT ScoreClient WHERE id_client=...
DB --> API : score + explications + mémo
API --> C : {score_client, niveau_risque, detail, explication_ia}
@enduml
```

---

### Figure 6 — Diagramme de séquence — Décaissement automatique

```plantuml
@startuml
!theme plain
skinparam backgroundColor #FAFAFA
skinparam defaultFontName "Arial"

title Diagramme de séquence — Décaissement automatique post-approbation

actor "Agent de crédit" as A
participant "Interface Web\n(React)" as UI
participant "API Django" as API
participant "Worker Celery" as Celery
database "MySQL" as DB
participant "Service Email\n(SMTP)" as Email
actor "Client" as C

A -> UI : ouvre dossier #{demande_id}
UI -> API : GET /credits/demandes/{id}/
API -> DB : SELECT DemandeCredit + ScoreClient + mémo
DB --> API : dossier complet
API --> UI : {demande, score, shap, memo_rag}

UI --> A : affiche score, explications SHAP/LIME\net mémo généré par IA

A -> UI : soumet décision : Approuvée\n+ montant accordé + taux
UI -> API : PATCH /credits/demandes/{id}/decision/\n{decision: "approuvee", montant, taux}
API -> API : vérifie rôle = AGENT_CREDIT\net commune autorisée

API -> DB : INSERT Credit\n(montant, taux, mensualite, date_fin)\nINSERT EcheancierPaiement (n échéances)\nUPDATE DemandeCredit (statut=approuvee)

API -> Celery : tâche notifier_decaissement(credit_id)
Celery -> DB : SELECT Client.email, Credit.mensualite
Celery -> Email : envoi email de confirmation\n(montant accordé, mensualités, date 1ère échéance)
Email --> C : email de confirmation de crédit

API --> UI : 200 OK {credit_id, echeancier}
UI --> A : "Dossier approuvé — crédit #{credit_id} créé"

alt décision = Rejetée
  API -> DB : UPDATE DemandeCredit (statut=rejetee, motif_refus)
  API -> Celery : tâche notifier_refus(demande_id, motif)
  Celery -> Email : email de refus motivé (SHAP simplifié)
  Email --> C : email de refus avec explication
end
@enduml
```

---

### Figure 7 — Diagramme de communication — Authentification

```plantuml
@startuml
!theme plain
skinparam backgroundColor #FAFAFA
skinparam defaultFontName "Arial"

title Diagramme de communication — Authentification (téléphone + OTP)

object ":Client" as C
object ":AppFlutter" as App
object ":AuthView\n(Django)" as Auth
object ":Redis" as Redis
object ":Utilisateur\n(MySQL)" as DB
object ":ServiceEmail" as Mail

C --> App : 1 : saisit(telephone, password)
App --> Auth : 2 : POST /auth/login/
Auth --> DB : 3 : find_by_telephone()
DB --> Auth : 3.1 : utilisateur
Auth --> Auth : 4 : verify_password()
Auth --> Redis : 5 : set_otp(user_id, code, ttl=600)
Auth --> Mail : 6 : send_otp_email(email, code)
Mail --> C : 6.1 : email OTP
Auth --> App : 7 : {mfa_required: true}
C --> App : 8 : saisit(otp_code)
App --> Auth : 9 : POST /auth/verify-otp/
Auth --> Redis : 10 : get_otp(user_id)
Redis --> Auth : 10.1 : code_stored
Auth --> Auth : 11 : compare(otp_code, code_stored)
Auth --> Redis : 12 : del_otp(user_id)
Auth --> Auth : 13 : generate_jwt(access, refresh)
Auth --> App : 14 : {access_token, refresh_token}
App --> C : 15 : redirige vers dashboard
@enduml
```

---

### Figure 8 — Diagramme de communication — Calcul du score

```plantuml
@startuml
!theme plain
skinparam backgroundColor #FAFAFA
skinparam defaultFontName "Arial"

title Diagramme de communication — Calcul du score de crédit

object ":ScoringView\n(Django)" as SV
object ":CeleryWorker" as CW
object ":MoteurRegles" as MR
object ":MoteurMobileMoney" as MM
object ":MoteurComportemental" as MB
object ":MoteurIA\n(XGBoost)" as IA
object ":ModuleXAI\n(SHAP+LIME)" as XAI
object ":PipelineRAG\n(pgvector+Gemini)" as RAG
object ":ScoreClient\n(MySQL)" as SC

SV --> CW : 1 : trigger_score_task(demande_id)
CW --> MR : 2 : evaluate_rules(client_id)
MR --> CW : 2.1 : {score_regles, eligible}
CW --> MM : 3 : compute_mm_score(transactions)
MM --> CW : 3.1 : {score_mm, features_mm}
CW --> MB : 4 : compute_behavioral_score(client_id)
MB --> CW : 4.1 : {score_comport, features_behav}
CW --> IA : 5 : predict(features_combined)
IA --> CW : 5.1 : {proba_defaut, score_ia}
CW --> XAI : 6 : explain(model, instance)
XAI --> CW : 6.1 : {shap_values, lime_coeffs}
CW --> RAG : 7 : generate_memo(client_context, shap)
RAG --> CW : 7.1 : memo_texte
CW --> SC : 8 : save_score(score_global, detail, memo)
SC --> CW : 8.1 : score_id
@enduml
```

---

### Figure 9 — Diagramme de classes

```plantuml
@startuml
!theme plain
skinparam backgroundColor #FAFAFA
skinparam defaultFontName "Arial"
skinparam classAttributeIconSize 0

title Diagramme de classes — Plateforme Simbisa

enum Role {
  CLIENT
  AGENT_CREDIT
  ADMINISTRATEUR
  AUDITEUR
}

class Utilisateur {
  - id : int
  - telephone : str {unique}
  - email : str
  - nom : str
  - prenom : str
  - postnom : str
  - role : Role
  - is_active : bool
  - date_creation : datetime
  + get_full_name() : str
  + has_role(r: Role) : bool
}

class ClientProfile {
  - id : int
  - commune_kinshasa : str
  - kyc_valid : bool
  - niveau_risque : str
  - date_kyc : date
  - agent_assigne : AgentCreditProfile
}

class AgentCreditProfile {
  - id : int
  - commune_couverte : str
  - nb_dossiers_traites : int
}

class AdministrateurProfile {
  - id : int
}

class AuditeurProfile {
  - id : int
}

class CompteEpargne {
  - id : int
  - devise : str <<USD|CDF>>
  - solde : Decimal
  - objectif_montant : Decimal
  - objectif_description : str
  - objectif_periodicite : str <<mensuel|annuel>>
  - date_creation : datetime
  + progression_pct() : float
  + score_contribution() : float
}

class OperationEpargne {
  - id : int
  - type_operation : str <<depot|retrait>>
  - montant : Decimal
  - devise : str
  - solde_apres : Decimal
  - mode_paiement : str
  - date_operation : datetime
  - description : str
}

class MobileMoneyTransaction {
  - id : int
  - type_operation : str
  - montant : Decimal
  - operateur : str
  - sens : str <<entrant|sortant>>
  - date_transaction : datetime
}

class DemandeCredit {
  - id : int
  - montant_demande : Decimal
  - devise : str <<USD|CDF>>
  - duree_mois : int
  - statut : str
  - date_soumission : datetime
  - motif_refus : str
}

class ScoreClient {
  - id : int
  - score_client : float <<0-100>>
  - niveau_risque : str
  - score_regles : JSON
  - score_mobile_money : JSON
  - score_comportemental : JSON
  - score_ia : JSON
  - explication_shap : JSON
  - explication_ia : str <<mémo RAG>>
  - date_calcul : datetime
}

class Credit {
  - id : int
  - montant_accorde : Decimal
  - taux_interet : float
  - mensualite : Decimal
  - solde_restant : Decimal
  - date_debut : date
  - date_fin : date
  - statut : str <<en_cours|rembourse|cloture>>
}

class EcheancierPaiement {
  - id : int
  - numero_echeance : int
  - montant_echeance : Decimal
  - date_echeance : date
  - statut : str <<en_attente|paye|en_retard>>
  - date_paiement : datetime
}

Utilisateur "1" --o "0..1" ClientProfile : profil >
Utilisateur "1" --o "0..1" AgentCreditProfile : profil >
Utilisateur "1" --o "0..1" AdministrateurProfile : profil >
Utilisateur "1" --o "0..1" AuditeurProfile : profil >

ClientProfile "1" --* "1..2" CompteEpargne : détient >\n<<USD + CDF>>
CompteEpargne "1" *-- "0..*" OperationEpargne : contient >

ClientProfile "1" -- "0..*" MobileMoneyTransaction : génère >
AgentCreditProfile "0..1" -- "0..*" ClientProfile : encadre >

ClientProfile "1" -- "0..*" DemandeCredit : soumet >
AgentCreditProfile "1" -- "0..*" DemandeCredit : traite >

DemandeCredit "1" -- "0..1" ScoreClient : évalué par >
DemandeCredit "1" -- "0..1" Credit : aboutit à >
Credit "1" *-- "1..*" EcheancierPaiement : structure >
@enduml
```

---

### Figure 10 — Diagramme d'objets — dossier approuvé

```plantuml
@startuml
!theme plain
skinparam backgroundColor #FAFAFA
skinparam defaultFontName "Arial"
skinparam objectAttributeIconSize 0

title Diagramme d'objets — Instantané d'un dossier approuvé (Joëlle Tshimba)

object "tshimba : Utilisateur" as U {
  id = 42
  telephone = "+243810445788"
  nom = "Tshimba"
  prenom = "Joëlle"
  role = CLIENT
  is_active = true
}

object "profil42 : ClientProfile" as CP {
  commune_kinshasa = "NGALIEMA"
  kyc_valid = true
  niveau_risque = "faible"
}

object "epsUSD : CompteEpargne" as E {
  devise = "USD"
  solde = 240.00
  objectif_montant = 500.00
  objectif_periodicite = "mensuel"
  progression_pct = 48.0
}

object "demande7 : DemandeCredit" as D {
  id = 7
  montant_demande = 350.00
  devise = "USD"
  duree_mois = 6
  statut = "approuvee"
}

object "score7 : ScoreClient" as S {
  score_client = 74.5
  niveau_risque = "faible"
  score_regles = 22
  score_mm = 19
  score_comport = 18
  score_ia = 15.5
}

object "credit7 : Credit" as CR {
  montant_accorde = 350.00
  taux_interet = 1.75
  mensualite = 61.25
  solde_restant = 350.00
  statut = "en_cours"
}

object "ech1 : EcheancierPaiement" as EC1 {
  numero_echeance = 1
  montant_echeance = 61.25
  date_echeance = 2025-11-30
  statut = "en_attente"
}

object "ech2 : EcheancierPaiement" as EC2 {
  numero_echeance = 2
  montant_echeance = 61.25
  date_echeance = 2025-12-31
  statut = "en_attente"
}

U "1" -- CP : profil >
CP "1" -- E : compte épargne USD >
CP "1" -- D : soumet >
D "1" -- S : évalué par >
D "1" -- CR : aboutit à >
CR "1" -- EC1 : échéance 1 >
CR "1" -- EC2 : échéance 2... >
@enduml
```

---

### Figure 11 — Diagramme d'activités — pipeline d'évaluation décisionnelle

```plantuml
@startuml
!theme plain
skinparam backgroundColor #FAFAFA
skinparam defaultFontName "Arial"

title Diagramme d'activités — Pipeline complet d'évaluation d'une demande de crédit

|Client|
start
:Soumettre une demande de crédit;

|API Django|
:Créer DemandeCredit (statut=soumise);
:Déclencher tâche Celery de scoring;

|Worker Celery|
fork
  :Évaluer les règles métier\n(âge, KYC, commune, contentieux);
  if (règles satisfaites ?) then (non)
    :Statut = rejeté (règles);
    stop
  else (oui)
  endif
fork again
  :Récupérer historique\nMobile Money (90 jours);
end fork

:Calculer score Mobile Money\n(fréquence, régularité, volume);
:Calculer score comportemental\n(épargne, progression, interactions);

:Prédire P(défaut) — XGBoost;
:Calculer valeurs SHAP + LIME;
:Agréger score global (0-100);

if (score >= seuil d'approbation ?) then (non)
  :Décision automatique : Rejeté;
  :Générer mémo de refus (RAG);
  :Notifier le client (email);
  stop
else (oui)
  :Décision : Dossier en analyse;
  :Générer mémo de crédit (RAG)\n(ancré sur politique Rawbank + SHAP);
endif

|Agent de crédit|
:Consulter dossier :\nscore + SHAP/LIME + mémo;
if (décision agent ?) then (rejet motivé)
  :Enregistrer refus + motif;
  :Notifier client (email de refus);
  stop
else (approbation)
  :Saisir montant accordé + taux;
endif

|API Django|
:Créer Credit + EcheancierPaiement;
:Notifier client (email de confirmation);

|Client|
:Recevoir confirmation de crédit;
:Rembourser selon l'échéancier;
stop
@enduml
```

---

### Figure 12 — Diagramme de composants

```plantuml
@startuml
!theme plain
skinparam backgroundColor #FAFAFA
skinparam defaultFontName "Arial"
skinparam componentStyle rectangle

title Diagramme de composants — Architecture Simbisa

package "Clients" {
  [Application mobile\nFlutter] as Flutter
  [Tableau de bord web\nReact + Vite] as React
}

package "Passerelle réseau" {
  [Nginx\nReverse Proxy] as Nginx
}

package "Backend applicatif" {
  [API REST\nDjango + DRF] as API
  interface "IAuthentification" as IAuth
  interface "IGestionDemande" as IDemande
  interface "IScoring" as IScore
  interface "IEpargne" as IEpargne

  [Worker asynchrone\nCelery] as Celery
  [Scheduler\nCelery Beat] as Beat
}

package "Moteurs de décision" {
  [Moteur de règles\n(éligibilité métier)] as Rules
  [Modèle XGBoost\n(sérialisé .joblib)] as XGB
  [Module XAI\nSHAP + LIME] as XAI
}

package "Intelligence artificielle générative" {
  [Pipeline RAG\n(retrieval + génération)] as RAG
  database "Base vectorielle\npgvector (PostgreSQL)" as PGV
  [API Gemini\nGoogle DeepMind\n(Flash + Embeddings)] as Gemini
}

package "Persistance" {
  database "MySQL\n(données métier)" as MySQL
  database "Redis\n(sessions + broker)" as Redis
}

Flutter --> Nginx : HTTPS
React --> Nginx : HTTPS
Nginx --> API : HTTP (port 8000)

API -( IAuth
API -( IDemande
API -( IScore
API -( IEpargne

API --> MySQL : lecture / écriture
API --> Redis : sessions JWT / USSD
API --> Celery : délègue tâches\nlongues (broker Redis)
Beat --> Celery : tâches planifiées

Celery --> Rules : évalue éligibilité
Celery --> XGB : prédit P(défaut)
Celery --> XAI : explique prédiction
Celery --> RAG : génère mémo

RAG --> PGV : similarité cosinus\n(top-K passages)
RAG --> Gemini : embeddings + génération\ncontrainte au contexte
RAG --> MySQL : données client agrégées
@enduml
```

---

### Figure 13 — Diagramme d'états-transitions — cycle de vie d'une demande de crédit

```plantuml
@startuml
!theme plain
skinparam backgroundColor #FAFAFA
skinparam defaultFontName "Arial"

title Diagramme d'états-transitions — Cycle de vie d'une DemandeCredit

[*] --> Soumise : Client soumet la demande\n/ créer DemandeCredit\n/ lancer tâche Celery

state Soumise {
  Soumise : entry / journaliser soumission
}

Soumise --> EnEvaluation : règles éligibilité satisfaites\n/ calculer scores MM + comportemental

state EnEvaluation {
  EnEvaluation : do / calcul XGBoost + SHAP\n/ génération mémo RAG
}

Soumise --> Rejetee : règles non satisfaites [KYC invalide\nou hors zone ou contentieux]\n/ journaliser motif règles

EnEvaluation --> EnAnalyse : score calculé\n[score >= seuil auto]\n/ assigner à agent de crédit

state EnAnalyse {
  EnAnalyse : do / agent consulte score\n        SHAP/LIME + mémo
}

EnEvaluation --> Rejetee : score calculé\n[score < seuil minimal]\n/ notifier client par email

EnAnalyse --> Approuvee : agent valide\n[décision = approuvée]\n/ saisir montant + taux

EnAnalyse --> Rejetee : agent rejette\n[décision = rejetée]\n/ saisir motif de refus

state Approuvee {
  Approuvee : entry / créer Credit\n         / créer EcheancierPaiement\n         / notifier client
}

Approuvee --> EnCours : crédit décaissé\n/ mettre à jour solde client

state EnCours {
  EnCours : do / surveiller les échéances
}

EnCours --> EnRetard : échéance dépassée\n[non payée à la date prévue]\n/ notifier client + agent

state EnRetard {
  EnRetard : do / calcul pénalités\n        / relances automatiques
}

EnRetard --> EnCours : client régularise\n/ enregistrer paiement

EnCours --> Rembourse : solde_restant = 0\n/ clôturer le crédit

state Rembourse {
  Rembourse : entry / archiver dossier\n         / mettre à jour score client
}

Rejetee --> [*] : dossier archivé
Rembourse --> [*] : dossier clôturé
@enduml
```

---

### Figure 14 — Diagramme de déploiement

```plantuml
@startuml
!theme plain
skinparam backgroundColor #FAFAFA
skinparam defaultFontName "Arial"
skinparam nodeStyle rectangle

title Diagramme de déploiement — Architecture réseau conteneurisée (POC)

node "Client Android / iOS" as MobileDevice {
  artifact "App Flutter" as FlutterApp
}

node "Navigateur Web\n(Agent / Admin / Auditeur)" as Browser {
  artifact "SPA React + Vite" as ReactApp
}

cloud "Vercel CDN\n(déploiement frontend)" as Vercel {
  artifact "Build React statique" as ReactBuild
}

node "VPS de production\n(Ubuntu 22.04)" as VPS {
  node "Nginx\n(reverse proxy :443)" as NginxNode

  node "Docker Compose\n(réseau interne simbisa_net)" as DockerNet {
    node "Conteneur : api\n(port 8000)" as ApiContainer {
      artifact "Django REST Framework\n+ Gunicorn (4 workers)" as DjangoApp
    }

    node "Conteneur : celery\n(worker)" as CeleryContainer {
      artifact "Celery Worker\n(scoring + RAG + emails)" as CeleryWorker
    }

    node "Conteneur : celery-beat" as BeatContainer {
      artifact "Celery Beat\n(tâches planifiées)" as CeleryBeat
    }

    node "Conteneur : db\n(MySQL :3306)" as DBContainer {
      database "MySQL 8\nsimbisa_db" as MySQLDB
    }

    node "Conteneur : redis\n(Redis :6379)" as RedisContainer {
      database "Redis\n(broker + cache USSD)" as RedisDB
    }

    node "Conteneur : pgvector\n(PostgreSQL :5432)" as PGVContainer {
      database "PostgreSQL + pgvector\n(index vectoriel RAG)" as PGVStore
    }
  }

  artifact "Modèles ML sérialisés\n(xgboost_v2.joblib\nscaler.joblib)" as MLModels
}

cloud "API Gemini\n(Google DeepMind)" as GeminiCloud {
  artifact "gemini-2.0-flash\ntext-embedding-004" as GeminiAPI
}

FlutterApp --> VPS : HTTPS / REST
Browser --> Vercel : HTTPS
ReactApp --> VPS : HTTPS / REST (API calls)

NginxNode --> ApiContainer : proxy_pass :8000

DjangoApp --> MySQLDB : SQLAlchemy / Django ORM
DjangoApp --> RedisDB : sessions JWT + USSD
DjangoApp --> CeleryWorker : Celery (via Redis broker)
CeleryWorker --> MySQLDB : lecture / écriture
CeleryWorker --> PGVStore : requêtes vectorielles
CeleryWorker --> GeminiCloud : embeddings + génération
CeleryWorker --> MLModels : chargement modèle XGBoost
CeleryBeat --> CeleryWorker : déclenchement périodique
@enduml
```

---

### NOUVEAU — Figure 1.2.4 — Architecture RAG : de l'indexation à la génération de mémos

Ce diagramme est à insérer dans la section 1.2.4, après le paragraphe décrivant les trois modules du RAG.

```plantuml
@startuml
!theme plain
skinparam backgroundColor #FAFAFA
skinparam defaultFontName "Arial"
skinparam actorStyle awesome

title Architecture RAG — Génération de mémos de crédit (section 1.2.4)

together {
  rectangle "Phase A — Indexation (hors-ligne)" as PhaseA #EEF4FF {
    collections "Documents sources\n(politique Rawbank,\ndirectives BCC,\nmodèles de mémos)" as Docs
    component "Découpage sémantique\n(chunking : ~512 tokens)" as Chunker
    component "Modèle d'embedding\nGemini text-embedding-004" as EmbedModel
    database "Base vectorielle\npgvector (PostgreSQL)" as VectorDB
    Docs --> Chunker : texte brut
    Chunker --> EmbedModel : blocs sémantiques
    EmbedModel --> VectorDB : vecteurs + métadonnées\n(source, section, date)
  }
}

together {
  rectangle "Phase B — Retrieval & Génération (en ligne, par dossier)" as PhaseB #F0FFF0 {
    collections "Données du dossier\n(score XGBoost, valeurs SHAP,\nprofil client, transactions)" as ClientData
    component "Construction de la requête\n(résumé structuré du dossier)" as QueryBuilder
    component "Similarité cosinus\n(top-K = 5 passages)" as Retriever
    component "Assemblage du prompt\n(contexte RAG + gabarit fixe)" as PromptBuilder
    component "Modèle génératif\nGemini 2.0 Flash" as LLM
    component "Contrôle de cohérence\n(chiffres rapport ↔ agrégats sources)" as Checker
    note right of LLM
      Contrainte de génération :
      le modèle ne peut énoncer
      que des faits présents
      dans le contexte récupéré.
      Pas d'extrapolation.
    end note
    artifact "Mémo de décision\n(structuré : profil / flux /\nrisques / recommandation)" as Memo
  }
}

ClientData --> QueryBuilder
QueryBuilder --> Retriever : requête vectorisée
VectorDB --> Retriever : index vectoriel
Retriever --> PromptBuilder : top-K passages\npertinents
ClientData --> PromptBuilder : données factuelles\ndu dossier
PromptBuilder --> LLM : prompt ancré
LLM --> Checker : texte généré
Checker --> Memo : mémo validé\n(sans hallucination factuelle)
@enduml
```

---

## RÉCAPITULATIF DES CORRECTIONS

| # | Localisation | Type | Description |
|---|---|---|---|
| 1 | Section 3.2.6 | Factuel | "FastAPI" → "Django REST Framework" |
| 2 | Section 3.2.6 | Factuel | "LangChain" → "API Gemini (Google DeepMind)" |
| 3 | Section 3.2.6 | Factuel | Ajout Celery (worker asynchrone) |
| 4 | Section 3.2.6 | Factuel | Préciser Flutter (mobile) + React (web) |
| 5 | Section 3.3.1 | Factuel | Diagramme déploiement : ajouter Celery + conteneur pgvector |
| 6 | Section 0.1 | Humanize | Triplet artificiel → reformulation ciblée |
| 7 | Section 2.1 | Humanize | "trajectoire d'amélioration" → formulation directe |
| 8 | Section 3.2.7.4 | Humanize | "il est nécessaire d'expliquer... afin de renforcer, faciliter et permettre" (triplet) |
| 9 | Section 3.4 | Humanize | Formule de mémoire redondante |
| 10 | Conclusion | Humanize | "Ce travail montre enfin" → "Ce travail illustre aussi" + restructuration |
| 11 | Section 1.2.4 | Nouveau | Ajout diagramme RAG (Phase A indexation + Phase B génération) |
| 12 | Toutes figures | Diagramme | 14 diagrammes PlantUML conformes au projet réel |
