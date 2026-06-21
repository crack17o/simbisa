# Simbisa Flutter — Application mobile client

Application mobile Flutter de la plateforme **Simbisa**, solution de micro-crédit intelligente développée pour **Rawbank** (RDC). Ce projet couvre uniquement le **rôle Client**.

---

## Stack technique

| Technologie | Rôle |
|-------------|------|
| **Flutter 3.x** | Framework UI cross-platform (iOS / Android) |
| **Dart 3.3+** | Langage |
| **google_fonts** | Polices Inter + Sora |
| **fl_chart** | Graphiques épargne |
| **go_router** | Navigation déclarative |
| **flutter_riverpod** | State management (prêt pour l'API) |

---

## Design

**Neumorphisme sombre** — identique au frontend web React :
- Palette : `#0A0A0A` noir profond · `#141414` surface · `#1A1A1A` panel · `#D4AF37` or Rawbank
- Ombres doubles (claire `#232323` + sombre `#050505`) simulant un relief sur fond sombre
- Typographie : **Sora** (titres, chiffres) + **Inter** (corps, labels)
- Composants réutilisables : `NeuCard`, `NeuInset`, `NeuButton`, `NeuTextField`, `ScoreRing`, `NeuProgressBar`

---

## Démarrage rapide

### Prérequis
- Flutter SDK ≥ 3.3.0 → [flutter.dev/get-started](https://flutter.dev/get-started)
- Dart ≥ 3.3.0
- Android Studio ou VS Code avec l'extension Flutter

### Installation

```bash
# 1. Télécharger les polices Sora (Google Fonts)
#    et les placer dans : assets/fonts/
#    Sora-Regular.ttf | Sora-SemiBold.ttf | Sora-Bold.ttf | Sora-ExtraBold.ttf

# 2. Créer le dossier assets/images/ (peut rester vide)

# 3. Installer les dépendances
flutter pub get

# 4. Lancer en mode debug
flutter run

# 5. Build release Android
flutter build apk --release

# 6. Build release iOS
flutter build ipa --release
```

---

## Architecture — Atomic Design adapté Flutter

```
lib/
├── core/
│   ├── theme/
│   │   ├── app_theme.dart       → Couleurs, ombres, ThemeData
│   │   └── widgets.dart         → NeuCard, NeuButton, ScoreRing…
│   └── constants/
│       └── routes.dart          → Noms de routes
├── data/
│   └── mock/
│       └── mock_data.dart       → Données de démo (à remplacer par API)
├── features/
│   ├── auth/
│   │   └── screens/
│   │       └── login_screen.dart
│   ├── dashboard/
│   │   └── screens/
│   │       ├── client_shell.dart    → Bottom nav + shell
│   │       └── dashboard_screen.dart
│   ├── credit/
│   │   └── screens/
│   │       ├── credit_request_screen.dart
│   │       └── my_credits_screen.dart
│   ├── savings/
│   │   └── screens/
│   │       └── savings_screen.dart
│   ├── scoring/
│   │   └── screens/
│   │       └── scoring_screen.dart
│   └── profile/
│       └── screens/
│           └── profile_screen.dart
└── main.dart
```

---

## Écrans — Rôle Client

| Écran | Fichier | Fonctionnalité |
|-------|---------|----------------|
| **Login** | `login_screen.dart` | Auth téléphone + mot de passe, stats Simbisa |
| **Dashboard** | `dashboard_screen.dart` | Score, épargne, crédits récents, prochain remboursement, actions rapides |
| **Demande de crédit** | `credit_request_screen.dart` | Formulaire montant/durée/motif, mensualité live, décision IA |
| **Mes crédits** | `my_credits_screen.dart` | Historique complet des crédits avec statuts |
| **Épargne** | `savings_screen.dart` | Solde, objectif, graphique évolution, déposer/retirer, impact scoring |
| **Scoring** | `scoring_screen.dart` | Score global, 4 moteurs (Règles, Comportemental, Mobile Money, XGBoost), SHAP, cohérence LIME |
| **Profil / KYC** | `profile_screen.dart` | Infos personnelles, statut KYC, connexion illicocash, déconnexion |

---

## Branchement API backend

L'app est connectée au backend Django via **`lib/core/constants/api_config.dart`** :

```dart
static const String host = '192.168.1.163';  // IP LAN de la machine backend
static const int port = 8000;
static const String baseUrl = 'http://$host:$port/api/v1';
```

| Contexte | `host` à utiliser |
|----------|-------------------|
| **Téléphone physique** (même Wi-Fi) | `192.168.1.163` |
| **Émulateur Android** | `10.0.2.2` |
| **Émulateur iOS** | `localhost` ou IP Mac |

### 1. Démarrer le backend (sur la machine `192.168.1.163`)

```powershell
cd backend
.\.venv\Scripts\activate
python manage.py runserver 0.0.0.0:8000
```

> `0.0.0.0` est **obligatoire** pour accepter les connexions depuis le téléphone.

Vérifier : `http://192.168.1.163:8000/health/`

### 2. Lancer l'app mobile

```bash
cd Frontend/Mobile
flutter pub get
flutter run
```

### 3. Se connecter (compte démo seed)

| Champ | Valeur |
|-------|--------|
| Téléphone | `+243900000010` |
| Mot de passe | `Test123!` |

L'inscription appelle aussi l'API (`POST /auth/register/`) avec choix de commune Kinshasa.

### Fichiers API

| Fichier | Rôle |
|---------|------|
| `lib/core/constants/api_config.dart` | URL backend |
| `lib/core/services/api_client.dart` | Client HTTP + JWT |
| `lib/core/services/auth_service.dart` | Login / register |
| `lib/core/services/token_storage.dart` | Stockage tokens |

Les autres écrans (épargne, crédits, scoring) utilisent encore des **données mock** — l'auth est branchée.

---

## Polices requises (à télécharger manuellement)

Les polices Sora doivent être placées dans `assets/fonts/` :

- Sora-Regular.ttf (weight: 400)
- Sora-SemiBold.ttf (weight: 600)
- Sora-Bold.ttf (weight: 700)
- Sora-ExtraBold.ttf (weight: 800)

→ Téléchargement : [fonts.google.com/specimen/Sora](https://fonts.google.com/specimen/Sora)

---

## Licence

Propriété **Rawbank** — Simbisa FinTech Platform. Usage interne.
