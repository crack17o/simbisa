import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const SECTIONS = [
  {
    title: '1. Présentation du service',
    body: `Simbisa est une plateforme de micro-crédit numérique opérée par Rawbank S.A. (ci-après « Simbisa »), banque commerciale agréée par la Banque Centrale du Congo. La plateforme permet aux résidents de la ville de Kinshasa d'accéder à des services financiers : micro-crédits, épargne virtuelle, gestion de portefeuille Mobile Money et virements.`,
  },
  {
    title: '2. Conditions d\'accès',
    body: `Pour utiliser Simbisa, vous devez :\n• Être une personne physique résidant à Kinshasa\n• Avoir entre 20 et 60 ans\n• Disposer d'un numéro de téléphone mobile DRC valide (+243)\n• Fournir des informations exactes et à jour lors de votre inscription\n• Ne pas avoir fait l'objet de poursuites pour fraude financière\n\nSimbisa se réserve le droit de suspendre ou clôturer tout compte dont les informations se révèlent inexactes.`,
  },
  {
    title: '3. Services de crédit',
    body: `Les crédits accordés par Simbisa sont soumis à une évaluation par notre système de scoring automatique (moteurs : règles bancaires, analyse Mobile Money, comportement d'épargne, intelligence artificielle XGBoost). L'octroi d'un crédit n'est jamais garanti.\n\nPlafonds par niveau de compte :\n• Standard : jusqu'à $300 / 6 mois\n• Pro : jusqu'à $700 / 9 mois\n• Pro+ : jusqu'à $1 200 / 12 mois\n• Premium : jusqu'à $2 500 / 12 mois\n\nLes taux d'intérêt varient de 1,75% à 3,5% par mois selon le score obtenu et le niveau de compte. L'échéancier de remboursement est communiqué avant l'acceptation définitive.`,
  },
  {
    title: '4. Obligations du client',
    body: `En utilisant Simbisa, vous vous engagez à :\n• Rembourser les crédits accordés aux dates prévues dans l'échéancier\n• Maintenir un solde Mobile Money ou wallet Simbisa suffisant pour les remboursements\n• Signaler immédiatement tout accès suspect à votre compte\n• Ne pas utiliser la plateforme à des fins illégales ou frauduleuses\n• Maintenir votre numéro de téléphone actif et accessible\n\nTout défaut de remboursement au-delà de 30 jours entraîne la transmission du dossier au service de recouvrement et l'inscription dans le système de partage d'informations de crédit (SIC) de la BCC.`,
  },
  {
    title: '5. Wallet et épargne',
    body: `Les fonds déposés dans votre wallet Simbisa (USD ou CDF) sont conservés dans un compte ségrégué chez Rawbank S.A. Ils sont protégés par les dispositions légales applicables aux dépôts bancaires en RDC. Simbisa ne garantit pas les dépôts en cas d'insolvabilité — les fonds sont couverts par Rawbank S.A. dans les limites légales applicables.\n\nLes comptes d'épargne sont des produits d'épargne virtuelle liés à votre wallet. Ils ne portent pas d'intérêts mais améliorent votre score comportemental.`,
  },
  {
    title: '6. Mobile Money',
    body: `Simbisa intègre les services Mobile Money des opérateurs présents en RDC (Vodacom M-Pesa, Orange Money, Airtel Money, Africell). L'opérateur est détecté automatiquement à partir de votre numéro de téléphone. Simbisa n'est pas responsable des interruptions ou défaillances des réseaux des opérateurs tiers.`,
  },
  {
    title: '7. Responsabilité',
    body: `Simbisa ne saurait être tenue responsable :\n• Des pertes résultant d'un accès non autorisé à votre compte dû à une négligence de votre part (mot de passe partagé, appareil non sécurisé)\n• Des interruptions temporaires de service pour maintenance\n• Des décisions de crédit basées sur des informations inexactes fournies par l'utilisateur\n\nEn cas de réclamation, notre service client est joignable à support@simbisa.cd dans un délai de réponse garanti de 48 heures ouvrables.`,
  },
  {
    title: '8. Droit applicable et juridiction',
    body: `Les présentes conditions sont régies par le droit de la République Démocratique du Congo. Tout litige sera soumis à la juridiction des tribunaux de commerce de Kinshasa, après tentative de règlement amiable. La langue de référence est le français.`,
  },
  {
    title: '9. Modification des conditions',
    body: `Simbisa peut modifier ces conditions à tout moment. Les utilisateurs seront notifiés 30 jours avant l'entrée en vigueur de toute modification substantielle. L'utilisation continue du service après notification vaut acceptation des nouvelles conditions.`,
  },
]

export default function Terms() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen bg-surface text-blanc">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <button
          onClick={() => window.history.length <= 1 ? window.close() : navigate(-1)}
          className="flex items-center gap-2 text-muted hover:text-or transition-colors mb-8 text-sm"
        >
          <ArrowLeft size={16} />
          Retour
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg, #D4AF37, #B8960C)' }}>
            <FileText size={20} className="text-noir" />
          </div>
          <h1 className="text-2xl font-display font-bold text-blanc">Conditions d'utilisation</h1>
        </div>
        <p className="text-muted text-sm mb-8">Version 1.0 — En vigueur depuis le 1er janvier 2025 — Rawbank S.A., Kinshasa, RDC</p>

        <p className="text-sm text-muted/90 leading-relaxed mb-8 p-4 rounded-xl border border-white/8 bg-panel">
          En créant un compte Simbisa, vous acceptez sans réserve les présentes conditions d'utilisation. Veuillez les lire attentivement avant d'utiliser nos services.
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
          © 2025 Simbisa Rawbank · Kinshasa, RDC · support@simbisa.cd
        </p>
      </div>
    </div>
  )
}
