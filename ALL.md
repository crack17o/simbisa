# ALL.md — Documentation complète de l’application Simbisa (Vue d’ensemble)

Ce document décrit **l’application Simbisa de bout en bout** : architecture globale, rôles et responsabilités, déroulement des activités par acteur, authentification (JWT + MFA/OTP), scoring IA (XGBoost + XAI), génération de mémos via RAG, et démarrage en environnement de développement.

> Références utiles déjà présentes :
> - Backend : `backend/README.md` (API, sécurité, endpoints)
> - Frontend : `Frontend/README.md` (UI par rôle, routing RBAC)
> - Docs backend : `backend/docs/*` (USSD, ML, API reference, MySQL…)

---

## Vue d’ensemble (ce que fait la plateforme)

Simbisa est une plateforme de micro‑crédit “intelligente” qui combine :
- **Canaux d’accès** : Web (React), Mobile (Flutter), USSD (sessions persistées côté serveur).
- **Backend** : API Django REST sécurisée (RBAC 6 rôles) + tâches asynchrones (Celery).
- **Décision de crédit** : scoring multi‑moteur dont un moteur **XGBoost**.
- **Transparence** : explications **XAI** (SHAP/LIME) pour comprendre les facteurs qui influencent une décision.
- **Assistance rédactionnelle** : génération de **mémos/rapports** (RAG) ancrés sur des politiques internes.
- **Conformité** : audit trail, logs, journalisation des décisions et des actions sensibles.

---

## Structure du projet (répertoires principaux)

À la racine :
- `backend/` : Backend Django (API + ML inference + RAG + audit + Celery)
- `Frontend/` : Interfaces utilisateurs
  - `Frontend/Web/` : Frontend web React
  - `Frontend/Mobile/` : Frontend mobile Flutter

---

## Rôles (RBAC) — qui fait quoi

La plateforme applique un **RBAC à 6 rôles** :
- **Client** : s’inscrire, compléter KYC, consulter score, faire une demande de crédit, consulter ses crédits/échéances, rembourser.
- **Agent de crédit** : gérer un portefeuille de clients (création/édition, KYC), traiter les demandes de sa zone, consulter scoring + explications, ajouter des observations métier.
- **Responsable crédit** : supervision, validation de dossiers sensibles/à dérogation, arbitrages.
- **Analyste risque** : suivi performance scoring, règles, analyses de risque, lecture des explications XAI.
- **Administrateur** : gestion utilisateurs/roles/statuts, paramètres système, supervision globale.
- **Auditeur** : accès aux journaux, décisions, rapports de contrôle/audit.

> **Important (territorialité Kinshasa)** : la notion de **commune de Kinshasa** est un attribut utilisateur (`commune_kinshasa`). Elle sert à l’assignation des clients/agents par zone et au filtrage des portefeuilles.

---

## Parcours & activités par rôle (déroulement “métier”)

### Parcours Client (Web/Mobile/USSD)

- **Inscription**
  - Le client crée un compte via l’interface publique (Web/Mobile) ou via un parcours USSD (si activé).
  - À l’inscription, le client fournit sa **commune de résidence (Kinshasa)**.
  - Le système peut **assigner automatiquement** le client à l’agent de crédit correspondant à sa commune (si la logique d’assignation est activée côté backend).

- **KYC (identité)**
  - Le client complète son profil et soumet des pièces d’identité.
  - Le KYC est consultable par l’agent/responsable pour validation et audit.

- **Demande de crédit**
  - Le client soumet une demande (montant, durée, motif).
  - La demande déclenche le **pipeline de scoring** (souvent via Celery).
  - Le client reçoit une décision (automatique ou “à valider”) selon les règles/seuils.

- **Suivi & remboursement**
  - Le client consulte le statut du crédit, les échéances et effectue des remboursements via le canal prévu.

### Parcours Agent de crédit

- **Gestion du portefeuille**
  - L’agent gère les clients de sa zone (commune) : création/édition des profils, suivi.
  - L’agent accompagne le client sur KYC et sur la compréhension du score (grâce aux explications XAI).

- **Traitement des demandes**
  - L’agent consulte les demandes entrantes de sa zone.
  - Il lit : score global, scores par moteur, facteurs XAI, mémo IA (si disponible), historique.
  - Il peut ajouter des observations et préparer une recommandation.

### Parcours Responsable crédit

- **Supervision**
  - Le responsable traite les dossiers “à escalader” : montants élevés, score limite, KYC incomplet, exceptions.
  - Il valide/rejette/ajuste selon la politique interne et le contexte, en conservant la traçabilité (audit).

### Parcours Analyste risque

- **Pilotage modèle & risque**
  - Suivi des métriques (AUC, Gini, calibration, taux de défaut).
  - Analyse des explications SHAP/LIME (globales et locales).
  - Recommandations d’ajustement : features, seuils, règles, retraining.

### Parcours Administrateur

- **Gestion des utilisateurs**
  - Création/activation/suspension des comptes.
  - Attribution des rôles.
  - Gestion de la commune (pour les agents de crédit et les affectations territoriales).

- **Paramétrage & supervision**
  - Paramètres sécurité (MFA, restrictions, timeouts), paramètres métier (taux de change, limites), supervision.

### Parcours Auditeur

- **Contrôle & traçabilité**
  - Consultation des logs d’audit (actions sensibles : auth, crédits, scoring, modifications).
  - Vérification de la cohérence : décision IA vs décision humaine, justification, horodatage, auteur.

---

## Authentification & gestion des tokens (JWT + OTP/MFA)

### Principe
L’API utilise **JWT** (access + refresh) :
- **Access token** : courte durée, utilisé pour appeler l’API (`Authorization: Bearer <access>`).
- **Refresh token** : sert à obtenir un nouvel access token sans se reconnecter.

### Endpoints d’authentification (backend)
Les routes principales (préfixe typique `/api/v1/auth/`) :
- `POST register/` : inscription (création compte client)
- `POST login/` : connexion (peut exiger OTP selon contexte)
- `POST token/refresh/` : rotation/rafraîchissement de token
- `POST logout/` : blacklist du refresh token
- `GET me/` : profil courant (pour hydrater la session front)
- `POST change-password/` : changement de mot de passe
- `POST mfa/setup/` + `POST mfa/verify/` : activation MFA par OTP e‑mail
- `POST password/forgot/` + `POST password/verify-otp/` + `POST password/reset/` : réinitialisation

### OTP/MFA (sécurité adaptative)
La connexion peut exiger un **OTP** selon le contexte (pays, device_id, signaux de risque, etc.). Le flux type :
1) `POST login/` (téléphone + mot de passe, sans OTP) → réponse “OTP requis”
2) le backend envoie un OTP à l’e‑mail enregistré
3) `POST login/` avec `otp_code`/`mfa_token` → tokens délivrés

### Gestion côté Frontend (session)
Côté Web, la session est généralement :
- stockée dans un **contexte auth** (ex. `AuthContext`)
- persistée dans `localStorage`
- renouvelée via `token/refresh/` avant expiration de l’access token

Bonnes pratiques recommandées dans l’app :
- si un refresh échoue → déconnexion locale + redirection login
- ne jamais logguer les tokens dans la console en production
- utiliser un `device_id` stable (mobile) pour améliorer le contrôle de contexte

---

## Territorialité Kinshasa (communes, agents, affectation)

### Objectif
Garantir que :
- chaque **agent de crédit** est rattaché à **une commune**,
- chaque **client** est rattaché à la commune de résidence,
- à l’inscription d’un client, le système **détermine l’agent** de la commune et l’assigne automatiquement (si configuré),
- les listes (portefeuille, demandes) sont filtrées par commune pour l’agent.

### Où se trouve l’information “commune”
Le backend possède une liste de communes (`KINSHASA_COMMUNES`) et un champ utilisateur :
- `Utilisateur.commune_kinshasa` : champ texte à choix (communes)

### Inscription client et assignation automatique
Lors de l’inscription, le backend reçoit `commune_kinshasa` et peut appeler un service d’assignation (ex. `assign_client_on_registration`) afin de lier le client à un agent de sa zone.

---

## Scoring IA — “comment ça marche”

### Objectif
Produire une décision (ou une recommandation) basée sur :
- données du client (profil/KYC),
- comportements financiers (mobile money / wallet / épargne),
- historique crédit (si disponible),
- moteurs de scoring (règles + ML) et agrégation.

### Déroulement (flux recommandé)
1) Le client soumet une **demande de crédit** (`DemandeCredit`).
2) Une tâche **Celery** lance le traitement scoring (orchestrateur).
3) Le scoring combine plusieurs moteurs (ex. règles, mobile money, comportemental, XGBoost).
4) Un score global est calculé + une décision (auto / manuel / rejet) selon seuils.
5) Les explications **XAI** sont calculées (au moins pour la partie XGBoost).
6) Un **mémo RAG** peut être généré pour faciliter la lecture du dossier.
7) Si approuvé, création du crédit + échéancier.

### XGBoost (ML)
Le modèle XGBoost est entraîné dans `backend/mltraining/` (hors runtime) puis chargé côté backend pour l’inférence.

### XAI (SHAP/LIME)
Le système calcule des explications :
- **locales** : pourquoi ce client a ce score (top facteurs + impacts),
- **globales** : quelles variables influencent le modèle en moyenne (pilotage).

Livrables à afficher (Web/Mobile) :
- score global + score par moteur
- top facteurs favorables/défavorables (SHAP)
- justification textuelle (issue du pipeline XAI/RAG selon configuration)

---

## IA générative (RAG) — mémos/rapports

### But
Générer un **mémo de crédit** cohérent et “ancré” sur des sources internes (politiques, procédures, règles), plutôt que d’inventer.

### Pipeline RAG (conceptuel)
1) **Indexation** de documents (politiques, règles, procédures) → embeddings → store vectoriel
2) À la demande, **retrieval** des passages pertinents (top‑K)
3) **Génération** du mémo avec un prompt structuré + contexte récupéré
4) **Fallback** : si l’API LLM n’est pas disponible, usage d’un template

Le mémo final sert à :
- accélérer l’analyse agent/responsable,
- standardiser la rédaction,
- conserver une trace dans le dossier.

---

## Politique de décision automatique (barème 100 → 0)

La décision “automatique vs humaine” est pilotée par le **score global sur 100** :
- **100 → 60** : **validation automatique** (`approuve`)
- **60 → 40** : **validation de l’agent requise** (`mise_en_attente`) — “zone grise”
- **< 40** : **validation de l’agent requise** (`mise_en_attente`) avec une alerte explicite :
  - “**ACCORDER CE PRÊT EST DANGEREUX**”
  - et, si disponible, un rappel du **niveau de risque IA** et de la **probabilité de défaut**

Objectif : garder l’automatisation sur les dossiers “clairs”, tout en imposant une revue humaine sur les dossiers limites/risqués.

---

## Ré-entraînement quotidien du modèle (03:00) basé sur les décisions humaines

Le modèle XGBoost est ré-entraîné **chaque jour à 03:00 (Africa/Kinshasa)** à partir des **décisions humaines** (agents / responsables) :
- `approuve` → label proxy \(y=0\)
- `rejete` → label proxy \(y=1\)

Les features d’entraînement proviennent du `feature_vector` persisté lors du scoring (afin de réutiliser la même représentation côté production).

### Statut du modèle (pour Analyste Risque)
Un endpoint expose le statut et le dernier retraining :
- `GET /api/v1/risk/model-status/`
  - fichier modèle actif (date de modification, taille)
  - dernière exécution de retraining (statut, nb d’échantillons, détails)

### Lancer le retraining manuellement
Commande Django :
- `python manage.py retrain_xgboost`
  - option : `--min-samples 200`

---

## USSD — sessions & activités

### Pourquoi Redis + MySQL
Le USSD est stateless côté opérateur : l’application doit conserver un état conversationnel.
- **Redis** : état court terme (menu actuel, données saisies, tentatives), TTL.
- **MySQL** : persistance longue (historique, audit, analytics).

### Déroulement type
1) Requête USSD (session_id, msisdn, input)
2) Chargement de l’état en Redis (ou init)
3) Calcul de l’étape suivante (machine à états)
4) Sauvegarde état + réponse texte

---

## Audit, logs et traçabilité

La plateforme conserve des traces pour :
- authentification (succès/échec, verrouillage, OTP),
- actions sensibles (KYC, scoring, décisions, modifications),
- conformité (qui a fait quoi, quand, sur quel dossier).

Bonnes pratiques :
- horodatage partout
- versioning du modèle ML
- conservation des explications XAI avec l’ID de la demande

---

## Démarrage en développement (raccourci)

### Backend (Django)
Pré‑requis : Python 3.12+, MySQL 8, Redis 7.

- Aller dans `backend/`
- Installer les dépendances (requirements)
- Configurer `.env` depuis `.env.example`
- Lancer migrations + seed
- Lancer serveur Django
- Lancer Celery worker + beat

> Détails complets : `backend/README.md` et `backend/docs/*`

---

## Backend “sans Celery” (mode synchrone)

Il est possible d’exécuter le backend **sans worker Celery** (et même sans dépendre de Celery) en mode synchrone :
- le scoring est exécuté **immédiatement** au lieu d’être mis en file d’attente,
- le retraining quotidien peut être déclenché via **Windows Task Scheduler** (ou cron), en appelant la commande Django.

> **Guide complet de déploiement** : [`backend/docs/DEPLOIEMENT_SANS_CELERY.md`](backend/docs/DEPLOIEMENT_SANS_CELERY.md)

### Lancer Django sans Celery (dev)
- `python manage.py runserver --settings=config.settings.nocelery`

### Déployer en production sans Celery
- `DJANGO_SETTINGS_MODULE=config.settings.production_nocelery`
- Gunicorn avec `--timeout 120` (scoring synchrone)

### Planifier les tâches sans Celery Beat
| Heure | Commande |
|-------|----------|
| 03:00 | `python manage.py retrain_xgboost` |
| 06:00 | `python manage.py run_credit_maintenance` |

### Commandes utiles
- `python manage.py score_demande <id>` — forcer le scoring d’une demande
- `python manage.py retrain_xgboost --min-samples 200` — retrain manuel


### Frontend Web (React)
- Aller dans `Frontend/Web/` (ou `Frontend/web/` selon l’arborescence réelle)
- `npm install` puis `npm run dev`

### Mobile (Flutter)
- Ouvrir `Frontend/Mobile/`
- Configurer `BASE_URL` vers l’API (LAN ou `10.0.2.2`)
- Lancer sur émulateur ou appareil

---

## “Qui fait quoi” (résumé rapide)

- **Client**
  - s’inscrit + choisit commune
  - fait KYC
  - demande crédit, suit crédits, rembourse

- **Agent de crédit**
  - gère les clients de sa commune
  - instruit les demandes (analyse + observations)
  - utilise scoring + XAI + mémo RAG pour décider/recommander

- **Responsable crédit**
  - valide les exceptions et supervise

- **Analyste risque**
  - pilote le risque et les modèles (métriques, drift, retraining)

- **Admin**
  - gère utilisateurs/roles/statuts/paramètres
  - supervise la plateforme

- **Auditeur**
  - contrôle les décisions + consulte les logs et rapports

---

## Glossaire (rapide)
- **RBAC** : Role‑Based Access Control
- **JWT** : JSON Web Token (access/refresh)
- **OTP/MFA** : code à usage unique / double authentification
- **XGBoost** : modèle ML de gradient boosting d’arbres
- **XAI** : explicabilité (SHAP/LIME)
- **RAG** : génération augmentée par recherche (retrieval + generation)
- **USSD** : canal mobile sessionnel (menus *123#)

