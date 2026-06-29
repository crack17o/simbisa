import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const SECTIONS = [
  {
    title: '1. Collecte des données',
    body: `Simbisa Rawbank collecte uniquement les données nécessaires à la fourniture de ses services de micro-crédit : informations d'identité (nom, prénom, date de naissance, pièce d'identité), coordonnées (numéro de téléphone, email), données financières (revenus estimés, historique de transactions Mobile Money) et données de navigation sur la plateforme.\n\nCes données sont collectées lors de votre inscription et lors de vos interactions avec l'application.`,
  },
  {
    title: '2. Utilisation des données',
    body: `Vos données sont utilisées exclusivement pour :\n• Évaluer votre éligibilité au crédit via notre système de scoring à 4 moteurs\n• Assurer la sécurité de votre compte (détection de fraude, authentification MFA)\n• Vous contacter pour la gestion de vos dossiers de crédit et d'épargne\n• Respecter nos obligations légales et réglementaires en République Démocratique du Congo\n• Améliorer nos modèles de scoring de manière anonymisée`,
  },
  {
    title: '3. Partage des données',
    body: `Nous ne vendons jamais vos données personnelles à des tiers. Vos données peuvent être partagées uniquement avec :\n• Rawbank S.A. dans le cadre de la réglementation bancaire congolaise\n• Les opérateurs Mobile Money (Vodacom M-Pesa, Orange Money, Airtel Money, Africell) pour la vérification des transactions, avec votre consentement explicite\n• Les autorités réglementaires (BCC, FIC) sur réquisition légale`,
  },
  {
    title: '4. Sécurité des données',
    body: `Toutes vos données sont chiffrées en transit (TLS 1.3) et au repos (AES-256). L'accès à vos données est strictement contrôlé par rôle (RBAC). Chaque action sensible est journalisée dans notre système d'audit. Les mots de passe sont hachés avec bcrypt — même nos équipes ne peuvent pas les lire.`,
  },
  {
    title: '5. Durée de conservation',
    body: `Conformément à la réglementation bancaire congolaise, vos données sont conservées pendant 10 ans après la clôture de votre compte. Les données de scoring sont conservées 5 ans. Les journaux d'audit sont conservés 7 ans. À l'expiration de ces délais, vos données sont anonymisées ou supprimées de manière sécurisée.`,
  },
  {
    title: '6. Vos droits',
    body: `Vous disposez des droits suivants sur vos données personnelles :\n• Droit d'accès : consulter toutes les données nous concernant\n• Droit de rectification : corriger des informations inexactes\n• Droit à l'oubli : demander la suppression (sous réserve des obligations légales)\n• Droit à la portabilité : recevoir vos données dans un format structuré\n• Droit d'opposition : vous opposer à certains traitements\n\nPour exercer ces droits, contactez notre Délégué à la Protection des Données : privacy@simbisa.cd`,
  },
  {
    title: '7. Cookies et traçage',
    body: `L'application web utilise des cookies fonctionnels (session, préférences) indispensables au fonctionnement. Aucun cookie publicitaire ou de traçage tiers n'est utilisé. Vous pouvez désactiver les cookies dans votre navigateur, mais certaines fonctionnalités pourraient ne plus fonctionner.`,
  },
  {
    title: '8. Modifications de la politique',
    body: `Cette politique peut être mise à jour pour refléter les évolutions légales ou techniques. Vous serez notifié par email ou notification in-app au moins 30 jours avant toute modification substantielle. La version en vigueur est toujours accessible depuis l'application.`,
  },
]

export default function Privacy() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen bg-surface text-blanc">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <button
          onClick={() => navigate(isAuthenticated ? -1 : '/login')}
          className="flex items-center gap-2 text-muted hover:text-or transition-colors mb-8 text-sm"
        >
          <ArrowLeft size={16} />
          Retour
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg, #D4AF37, #B8960C)' }}>
            <Shield size={20} className="text-noir" />
          </div>
          <h1 className="text-2xl font-display font-bold text-blanc">Politique de confidentialité</h1>
        </div>
        <p className="text-muted text-sm mb-8">Dernière mise à jour : 1er janvier 2025 — Simbisa Rawbank S.A., Kinshasa, RDC</p>

        <p className="text-sm text-muted/90 leading-relaxed mb-8 p-4 rounded-xl border border-white/8 bg-panel">
          Simbisa Rawbank s'engage à protéger vos données personnelles conformément aux lois en vigueur en République Démocratique du Congo. Cette politique explique comment nous collectons, utilisons et protégeons vos informations.
        </p>

        <div className="flex flex-col gap-6">
          {SECTIONS.map((s) => (
            <section key={s.title} className="p-5 rounded-2xl border border-white/8 bg-panel">
              <h2 className="font-semibold text-or mb-3 text-sm">{s.title}</h2>
              <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{s.body}</p>
            </section>
          ))}
        </div>

        <p className="text-center text-xs text-muted mt-10">
          © 2025 Simbisa Rawbank · Kinshasa, RDC · privacy@simbisa.cd
        </p>
      </div>
    </div>
  )
}
