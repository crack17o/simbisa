import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ROLES } from '@/constants/roles'
import DashboardLayout from '@/components/templates/DashboardLayout'

// ─── Contenu par rôle ────────────────────────────────────────────────────────

const HELP_CONTENT = {
  [ROLES.CLIENT]: {
    intro: 'Bienvenue dans le centre d\'aide Simbisa. Voici tout ce que vous pouvez faire en tant que client.',
    sections: [
      {
        title: '🪙 Wallet Mobile Money',
        items: [
          { q: 'Comment déposer de l\'argent ?', a: 'Allez dans "Mobile Money", cliquez sur votre wallet USD ou CDF, puis sur "Déposer". Entrez votre numéro de téléphone Mobile Money — l\'opérateur est détecté automatiquement à partir de votre préfixe (+243 081-085 → M-Pesa, 086-089 → Orange, 097-099 → Airtel, 090-091 → Africell).' },
          { q: 'Comment retirer de l\'argent ?', a: 'Même démarche, cliquez sur "Retirer". Le montant doit être disponible dans votre wallet. Les fonds sont envoyés sur votre numéro Mobile Money dans les minutes qui suivent.' },
          { q: 'Pourquoi j\'ai deux wallets ?', a: 'Simbisa vous donne automatiquement un wallet USD et un wallet CDF. Vous pouvez utiliser chacun selon la devise de vos transactions ou de votre crédit.' },
        ],
      },
      {
        title: '🏦 Épargne',
        items: [
          { q: 'Comment ouvrir un compte épargne ?', a: 'Dans la section "Épargne", cliquez sur "Nouveau compte". Choisissez la devise, définissez un objectif de montant et une description (ex. "Achat matériel").' },
          { q: 'L\'épargne influence-t-elle mon score ?', a: 'Oui. L\'épargne régulière et la progression vers vos objectifs comptent pour 25% de votre score de crédit (moteur comportemental).' },
          { q: 'Peut-on retirer l\'épargne à tout moment ?', a: 'Oui, il n\'y a pas de blocage. Cependant, des retraits fréquents avant d\'atteindre vos objectifs peuvent réduire votre score comportemental.' },
        ],
      },
      {
        title: '💳 Crédit',
        items: [
          { q: 'Quelles sont les conditions pour obtenir un crédit ?', a: 'Il vous faut : un KYC validé par un agent, être âgé de 20 à 60 ans, ne pas avoir de crédit actif dans la même devise, et que le montant soit dans les limites de votre niveau de compte (Standard : $300 / Pro : $700 / Pro+ : $1 200 / Premium : $2 500).' },
          { q: 'Comment est calculé mon taux d\'intérêt ?', a: 'Il dépend de votre score ET de votre niveau de compte. Un score ≥75 donne un taux de base de 2,5%/mois. Les clients Pro bénéficient d\'une remise de -0,25%, Pro+ de -0,5%, Premium de -0,75%. Exemple : score 80 + niveau Pro+ = 2,0%/mois.' },
          { q: 'Combien de temps prend l\'évaluation ?', a: 'Le scoring est automatique et dure quelques secondes. Si votre score est entre 40 et 60, un agent doit valider manuellement — prévoir 1 à 2 jours ouvrables.' },
          { q: 'Puis-je rembourser en avance ?', a: 'Oui. Dans "Remboursements", vous pouvez payer plus que la mensualité. Le solde restant diminue et les intérêts futurs sont recalculés.' },
        ],
      },
      {
        title: '📊 Score & IA',
        items: [
          { q: 'Comment améliorer mon score ?', a: '4 leviers : (1) valider votre KYC, (2) avoir une activité Mobile Money régulière sur 90 jours, (3) épargner régulièrement et atteindre vos objectifs, (4) rembourser vos crédits à temps sans défaut.' },
          { q: 'Que signifient les "Explications IA" ?', a: 'La section "Explications IA" vous montre quels facteurs ont le plus influencé votre score (via SHAP), ce qui vous permet de comprendre précisément pourquoi vous avez obtenu ce résultat et comment l\'améliorer.' },
        ],
      },
      {
        title: '🔒 Sécurité',
        items: [
          { q: 'Comment activer la double authentification ?', a: 'Dans votre profil, activez la MFA par email. À chaque connexion depuis un nouvel appareil ou une nouvelle localisation, un code vous sera envoyé.' },
          { q: 'J\'ai perdu l\'accès à mon compte, que faire ?', a: 'Utilisez "Mot de passe oublié" sur la page de connexion. Un code OTP sera envoyé sur votre email ou numéro de téléphone enregistré.' },
        ],
      },
    ],
  },

  [ROLES.AGENT]: {
    intro: 'Centre d\'aide pour les Agents de crédit Simbisa.',
    sections: [
      {
        title: '👥 Gestion des clients',
        items: [
          { q: 'Comment créer un nouveau client ?', a: 'Dans "Clients de ma zone", cliquez sur "Nouveau client". Le client sera automatiquement affecté à votre commune. Renseignez le numéro de téléphone, nom, prénom et date de naissance.' },
          { q: 'Puis-je créer des clients hors de ma commune ?', a: 'Non. Votre accès est limité à votre commune assignée par l\'administration. Contactez un responsable si une exception est nécessaire.' },
          { q: 'Comment modifier le niveau de compte d\'un client ?', a: 'Dans la fiche du client, section "Niveau de compte", vous pouvez upgrader de Standard à Pro, Pro+ ou Premium. Cela débloque des plafonds de crédit plus élevés.' },
        ],
      },
      {
        title: '✅ Validation KYC',
        items: [
          { q: 'Comment valider une pièce d\'identité ?', a: 'Dans la fiche client, section "KYC", consultez les documents scannés. Cliquez "Valider" si les informations correspondent. En cas de rejet, saisissez un motif précis.' },
          { q: 'Quels types de pièces sont acceptés ?', a: 'Carte nationale d\'identité congolaise, passeport (toutes nationalités), permis de conduire, carte de réfugié. La pièce ne doit pas être expirée.' },
        ],
      },
      {
        title: '📋 Traitement des dossiers',
        items: [
          { q: 'Quand dois-je intervenir sur une demande ?', a: 'Lorsque le score global est entre 40 et 60 (zone grise), la demande est mise en attente de votre validation. Les demandes < 40 nécessitent aussi validation, avec alerte "dangereux".' },
          { q: 'Que contient le dossier de scoring ?', a: 'Le dossier affiche le score global, la décomposition par moteur (règles, MM, comportemental, IA), la probabilité de défaut, les explications SHAP, et l\'historique crédit du client.' },
        ],
      },
    ],
  },

  [ROLES.MANAGER]: {
    intro: 'Centre d\'aide pour les Responsables crédit Simbisa.',
    sections: [
      {
        title: '⚙️ Plafonds et configuration',
        items: [
          { q: 'Comment modifier les plafonds globaux ?', a: 'Dans "Plafonds", vous gérez les montants minimum/maximum pour les crédits auto-approuvés et ceux nécessitant une validation agent ou manager. Ces plafonds s\'appliquent en plus des plafonds de niveau de compte.' },
          { q: 'Peut-on accorder un crédit au-delà du plafond d\'un client ?', a: 'Oui, via le système d\'exceptions. Vous pouvez ouvrir une exception pour un client spécifique, avec un motif obligatoire, qui sera tracé dans le journal d\'audit.' },
        ],
      },
      {
        title: '🔍 Supervision',
        items: [
          { q: 'Comment voir les dossiers sensibles ?', a: 'Le tableau de bord Supervision affiche tous les dossiers dont le montant dépasse le seuil auto et ceux marqués "dangereux" par le scoring. Filtrez par commune ou par agent.' },
          { q: 'Quelle est la différence entre exception et override ?', a: 'Une exception modifie temporairement le plafond d\'un client pour une demande précise. Un override (réservé à l\'admin) modifie la configuration globale. Les deux sont tracés en audit.' },
        ],
      },
    ],
  },

  [ROLES.ANALYST]: {
    intro: 'Centre d\'aide pour les Analystes risque Simbisa.',
    sections: [
      {
        title: '📐 Règles de scoring',
        items: [
          { q: 'Comment modifier les poids des moteurs ?', a: 'Les poids (règles 25%, MM 25%, comportemental 25%, IA 25%) sont configurés dans settings.py (SCORING_WEIGHTS). Une modification nécessite un redéploiement et est tracée en audit.' },
          { q: 'Comment activer/désactiver une règle ?', a: 'Dans "Règles métier", chaque règle a un toggle "Actif". Une règle désactivée n\'est plus évaluée mais reste visible dans l\'historique des décisions.' },
        ],
      },
      {
        title: '🤖 Modèle IA',
        items: [
          { q: 'Quand le modèle XGBoost est-il réentraîné ?', a: 'Le réentraînement se déclenche manuellement depuis "Performance modèles". Il nécessite un minimum de 100 dossiers historiques. Chaque run est versionné avec ses métriques (AUC, précision, rappel).' },
          { q: 'Que faire si l\'AUC du modèle baisse ?', a: 'Vérifiez d\'abord que les données d\'entraînement sont représentatives et non biaisées. Consultez les feature importances SHAP. Si l\'AUC < 0,70, désactivez le moteur IA et repassez en mode règles seul jusqu\'à correction.' },
          { q: 'Comment interpréter les alertes de dérive ?', a: 'Une dérive de données (data drift) signifie que les caractéristiques des nouvelles demandes s\'éloignent des données d\'entraînement. Déclenchez un réentraînement avec les données récentes.' },
        ],
      },
    ],
  },

  [ROLES.ADMIN]: {
    intro: 'Centre d\'aide pour les Administrateurs Simbisa.',
    sections: [
      {
        title: '👤 Gestion des utilisateurs',
        items: [
          { q: 'Comment bloquer un utilisateur ?', a: 'Dans "Utilisateurs", trouvez l\'utilisateur et changez son statut en "Bloqué". Il ne pourra plus se connecter immédiatement. Les sessions actives sont révoquées automatiquement.' },
          { q: 'Comment assigner un rôle ?', a: 'Dans "Rôles", vous pouvez assigner Agent, Manager, Analyste, Auditeur. Le rôle Client est assigné automatiquement à l\'inscription. Un utilisateur ne peut avoir qu\'un seul rôle.' },
          { q: 'Comment forcer la MFA pour tous les agents ?', a: 'Dans "Paramètres", activez "MFA obligatoire pour agents". À leur prochaine connexion, ils devront configurer leur authentification email.' },
        ],
      },
      {
        title: '💱 Taux de change',
        items: [
          { q: 'Comment mettre à jour le taux CDF/USD ?', a: 'Dans "Paramètres système", section "Taux de change". Le nouveau taux s\'applique immédiatement aux nouvelles demandes. Les crédits en cours conservent leur taux d\'origine.' },
        ],
      },
    ],
  },

  [ROLES.AUDITOR]: {
    intro: 'Centre d\'aide pour les Auditeurs Simbisa.',
    sections: [
      {
        title: '📜 Journal d\'audit',
        items: [
          { q: 'Que contient le journal d\'audit ?', a: 'Chaque action sensible est enregistrée : connexions, créations/modifications de clients, décisions de crédit, validations KYC, modifications de configuration. Chaque entrée contient l\'utilisateur, l\'IP, la date et les détails de l\'action.' },
          { q: 'Comment exporter un rapport d\'audit ?', a: 'Dans "Rapports", sélectionnez une période et un type d\'action. L\'export CSV est disponible pour toutes les entrées. Les rapports de décisions crédit incluent les scores et motifs.' },
          { q: 'Puis-je modifier des données en tant qu\'auditeur ?', a: 'Non. Le rôle Auditeur est strictement en lecture seule sur l\'ensemble de la plateforme. Aucune action de création, modification ou suppression n\'est possible.' },
        ],
      },
    ],
  },
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="border border-white/8 rounded-xl overflow-hidden"
      style={{ background: open ? 'rgba(212,175,55,0.04)' : 'transparent' }}
    >
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 text-left gap-4"
      >
        <span className="text-sm font-medium text-blanc">{q}</span>
        {open ? <ChevronUp size={15} className="text-or shrink-0" /> : <ChevronDown size={15} className="text-muted shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-sm text-muted leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  )
}

export default function Help() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const content = HELP_CONTENT[user?.role] || HELP_CONTENT[ROLES.CLIENT]

  return (
    <DashboardLayout title="Centre d'aide">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg, #D4AF37, #B8960C)' }}>
            <HelpCircle size={20} className="text-noir" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-blanc">Centre d'aide</h1>
            <p className="text-xs text-muted">{content.intro}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6 mb-6 p-4 rounded-xl border border-white/8 bg-panel text-sm text-muted">
          Vous ne trouvez pas ce que vous cherchez ?{' '}
          <a href="mailto:support@simbisa.cd" className="text-or hover:underline ml-1">
            Contactez le support →
          </a>
        </div>

        <div className="flex flex-col gap-8">
          {content.sections.map((sec) => (
            <section key={sec.title}>
              <h2 className="font-semibold text-blanc mb-3 text-sm">{sec.title}</h2>
              <div className="flex flex-col gap-2">
                {sec.items.map((item) => (
                  <FAQItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 p-4 rounded-xl border border-white/8 bg-panel flex gap-3 items-start">
          <span className="text-xl">📞</span>
          <div>
            <p className="text-sm font-medium text-blanc mb-1">Assistance directe</p>
            <p className="text-xs text-muted">Agence Rawbank la plus proche · Lundi–Vendredi 8h–17h</p>
            <p className="text-xs text-muted">Email : support@simbisa.cd · Réponse sous 48h ouvrables</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
