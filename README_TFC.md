# README — Guide de rédaction du TFC (Simbisa Rawbank)

Ce document sert de **trame de rédaction** pour ton TFC. Il explique “quoi dire” et “comment le dire”, avec une structure prête à copier-coller dans ton mémoire.

---

## 0) Contexte et problématique (à mettre en introduction)

### Objectif du projet
- Construire une plateforme de **micro‑crédit intelligente** (web + mobile + USSD) capable de :
  - collecter des **données alternatives** (Mobile Money, comportements, épargne, historique crédit),
  - prédire le **risque de défaut** (XGBoost),
  - fournir une **explicabilité** (XAI : SHAP/LIME),
  - générer des **mémos/rapports** (RAG) ancrés sur la politique interne.

### Problématique (exemple à adapter)
> Comment améliorer la décision de crédit en RDC en utilisant des données transactionnelles alternatives (Mobile Money) tout en garantissant la transparence (XAI) et l’accessibilité (USSD/mobile) ?

### Contributions attendues
- Modèle de scoring + pipeline d’IA explicable.
- Architecture applicative (API + frontends) + sécurité.
- USSD avec persistance de session.
- Génération de rapports/mémos via RAG.

---

## 1) Modélisation mathématique et Data Science

### 1.1 Protocole d’acquisition des données alternatives
Décris :
- **Sources** :
  - transactions Mobile Money (entrants/sortants, fréquence, montants, régularité),
  - wallet / épargne (dépôts/retraits, stabilité),
  - KYC (statut, âge, cohérence),
  - historique crédit (demandes, décisions, remboursements, défaut).
- **Périmètre temporel** :
  - fenêtre glissante (ex. 30/90/180 jours) par demande de crédit.
- **Contraintes** :
  - confidentialité (PII), minimisation des données, conservation.

À inclure :
- tableau “données brutes” vs “données dérivées”
- schéma de pipeline (ETL/ELT)

### 1.2 Préparation & nettoyage
Explique :
- normalisation des devises (CDF↔USD) via un taux,
- gestion des valeurs manquantes,
- traitement des outliers (winsorization / log1p),
- déduplication (références externes transactions),
- split temporel (éviter fuite de données : train sur passé, test sur futur).

### 1.3 Feature engineering (Mobile Money)
Présente des familles de variables :
- **Volume** : somme entrants/sortants, ratio, moyenne, médiane.
- **Fréquence** : nb transactions / période, nb jours actifs.
- **Régularité** : écart-type des entrées, stabilité mensuelle.
- **Comportement** : saisonnalité, volatilité, pics, tendance.
- **Solvabilité proxy** : solde moyen, min/max, cash‑flow net.

Exemples de features (à adapter à tes champs) :
- `flux_entrants_moyen_usd`, `flux_sortants_moyen_usd`
- `regularite_revenus_pct`, `volatilite_depenses_pct`
- `nb_mois_actifs`, `ratio_cashflow_net`

### 1.4 Formulation du modèle prédictif (XGBoost)

#### Variable cible
Définis clairement \(y\) :
- \(y=1\) si défaut (retard > N jours / impayé), \(y=0\) sinon.

#### Modèle
XGBoost (Gradient Boosted Trees) apprend une fonction \(f(x)\) :
\[
\hat{p}(y=1|x)=\sigma(f(x))=\frac{1}{1+e^{-f(x)}}
\]
Objectif (binaire logloss) :
\[
\mathcal{L} = -\sum_i \left[y_i\log(\hat{p}_i) + (1-y_i)\log(1-\hat{p}_i)\right] + \Omega(f)
\]
où \(\Omega(f)\) régularise la complexité des arbres (profondeur, nombre de feuilles, etc.).

#### Hyperparamètres (à justifier)
À décrire (et pourquoi) :
- `n_estimators`, `max_depth`, `learning_rate`
- `subsample`, `colsample_bytree`
- `min_child_weight`, `gamma`
- `reg_alpha`, `reg_lambda`
- `scale_pos_weight` (déséquilibre de classes)

#### Évaluation
Présente :
- AUC‑ROC, PR‑AUC (si classes rares),
- F1, recall (risque), précision,
- matrice de confusion,
- calibration (Brier score, reliability curve) si nécessaire.

Inclure :
- protocole de validation (k‑fold ou split temporel),
- analyse de sensibilité au seuil (ex. seuil décisionnel 0.35/0.5).

### 1.5 Intégration mathématique de l’XAI (SHAP/LIME)

#### SHAP (Shapley Values)
Explique l’idée : contribution additive de chaque feature à la prédiction.
Forme additive :
\[
f(x)=\phi_0+\sum_{j=1}^M \phi_j
\]
où \(\phi_j\) est l’impact de la feature \(j\).

Dans le TFC :
- global : top features, importance moyenne \(|\phi_j|\),
- local : explication par demande (client) pour audit et décision.

#### LIME
Explique :
- approximation locale par un modèle interprétable \(g\) (linéaire),
- pondération des voisins autour de \(x\),
- extraction d’une liste de règles/poids.

#### “Intégration dans l’architecture”
Décris où l’XAI intervient :
- après inference XGBoost,
- stockage : `shap_values`, `lime_values` en JSON,
- exposition via API au staff (agent/risque),
- usage : justification + audit + génération RAG.

À inclure :
- diagramme séquence “scoring → XAI → décision”
- exemple d’explication : “flux entrants réguliers + KYC OK → risque faible”

---

## 2) Modélisation de l’application

### 2.1 Méthodologie (Scrum)
Décris :
- rôles : PO (banque), dev, QA, utilisateur pilote,
- backlog : user stories (client, agent, manager, admin),
- sprints : planning, daily, review, retro,
- livrables : increments testables (API, UI web, UI mobile, USSD).

Inclure :
- tableau “Sprint” → “objectif” → “fonctionnalités” → “risques”

### 2.2 Spécifications fonctionnelles
Présente par acteur :
- **Client** : inscription, profil/KYC, épargne, demande crédit, score, remboursements.
- **Agent de crédit** : portefeuille clients (CRUD sauf delete), KYC, décisions dossiers.
- **Responsable crédit** : exceptions, plafonds, supervision dossiers sensibles.
- **Analyste risque** : règles scoring, modèles.
- **Administrateur** : sécurité, paramètres, affectation agents/communes.
- **Auditeur** : décisions, logs, rapports.

### 2.3 Spécifications non fonctionnelles
Minimum :
- sécurité (JWT, OTP/MFA e‑mail, révocation sessions, RBAC),
- performance (pagination, index DB, cache),
- traçabilité (audit log),
- disponibilité (déploiement Docker, backups),
- conformité (KYC, minimisation données).

### 2.4 Diagrammes UML (à inclure dans le mémoire)

Tu peux produire tes diagrammes en Mermaid puis exporter en image (PNG) pour le TFC.

#### Cas d’utilisation (Use Case)
À représenter :
- Client : demander crédit, consulter score, épargne, KYC.
- Agent : créer client, valider KYC, traiter dossier.
- Admin : assigner agent à commune, supprimer client.

#### Classes (Class Diagram)
À représenter :
`Utilisateur`, `Client`, `Identite`, `DemandeCredit`, `Credit`, `DecisionCredit`, `ScoreIA`, `Wallet`, `CompteEpargne`, `AuditLog`.

#### Séquence (Sequence Diagram)
À minima :
- inscription + affectation agent,
- login OTP,
- scoring crédit,
- création client par agent,
- USSD session.

#### Activités (Activity Diagram)
À minima :
- parcours demande de crédit,
- validation KYC,
- workflow USSD menu.

#### Déploiement (Deployment Diagram)
À représenter :
React Web, Flutter Mobile, Django API, MySQL, Redis, SMTP, OpenAI, Nginx/Gunicorn/Celery.

---

## 3) Architecture système et réalisation technique

### 3.1 Persistance de session USSD (Redis & MySQL)
Explique l’objectif :
- USSD = dialogue stateless côté opérateur, donc on doit conserver l’état serveur.

Décris la stratégie :
- **Redis** : stockage rapide des sessions (TTL court : 180s), état courant (menu, authentification).
- **MySQL** : journalisation durable (logs d’interactions, audit, analytics).

À écrire (exemple) :
- clé session : `ussd:session:{session_id}`
- contenu : msisdn, step, attempts, last_input, timestamp
- TTL : réinitialisé à chaque frappe.

À inclure :
- séquence “USSD request → load state → process → save state → response”

### 3.2 Pipeline RAG (génération de rapports/mémos)
Décris :
- ingestion documents (politiques, procédures, règles),
- embeddings + stockage (vecteurs),
- retrieval top‑K,
- prompt + génération (OpenAI),
- fallback (template) si LLM indisponible.

À inclure :
- diagramme “RAG : query → retrieve → generate”
- exemple de mémo : décision, score global, motifs, recommandations.

### 3.3 Outils et langages (Front & Back)

#### Backend
- Python, Django, DRF, SimpleJWT
- Celery, Redis
- MySQL
- XGBoost, scikit‑learn
- SHAP/LIME (XAI)
- OpenAI (RAG)
- Docker (prod)

#### Frontend Web
- React, Vite, Tailwind
- gestion auth : JWT + refresh, `X-Device-Id`
- pages par rôle (RBAC UI)

#### Frontend Mobile
- Flutter 3, Riverpod, go_router
- architecture features (auth, dashboard, credit, savings, scoring, profile)
- API cible : mêmes endpoints REST (pas de CORS), base URL émulateur `10.0.2.2`.

### 3.4 Sécurité et contrôle d’accès
Décris :
- RBAC 6 rôles,
- OTP e‑mail selon contexte (MFA, pays, device_id),
- suppression client réservée admin,
- séparation des responsabilités (agent vs manager vs auditeur).

---

## 4) Annexes recommandées (fin du TFC)

- Dictionnaire de données (tables + champs clés)
- Dictionnaire de features (feature → description → formule)
- Jeux de tests / seed (comptes demo)
- Captures UI web + mobile + USSD
- Extraits d’API (OpenAPI / Postman)

---

## 5) Conseils de rédaction

- Commence chaque chapitre par : **objectif**, **approche**, **résultats**.
- Ajoute une figure toutes les 1–2 pages (diagramme, tableau, courbe).
- Pour Data Science : documente les choix (fenêtres, seuils, split temporel), pas seulement les résultats.

