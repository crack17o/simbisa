import {
  LayoutDashboard, CreditCard, PiggyBank, BarChart3, ShieldCheck,
  User, FileCheck, Wallet, Sparkles, ClipboardList, Eye, AlertTriangle,
  Sliders, Users, Settings, Shield, FileText, Activity, Lock, UserCog, CalendarDays,
  Smartphone, HelpCircle,
} from 'lucide-react'
import { ROLES } from '@/constants/roles'

export const NAV_BY_ROLE = {
  [ROLES.CLIENT]: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', key: 'nav.dashboard' },
    { to: '/profile', icon: User, label: 'Mon profil & KYC', key: 'nav.profile' },
    { to: '/savings', icon: PiggyBank, label: 'Épargne virtuelle', key: 'nav.savings' },
    { to: '/wallets', icon: Smartphone, label: 'Mobile Money', key: 'nav.wallet' },
    { to: '/credit-request', icon: CreditCard, label: 'Demande de crédit', key: 'nav.credit' },
    { to: '/my-credits', icon: ShieldCheck, label: 'Mes crédits', key: 'nav.credits' },
    { to: '/repayments', icon: Wallet, label: 'Remboursements', key: 'nav.repayments' },
    { to: '/echeancier', icon: CalendarDays, label: 'Échéancier', key: 'nav.schedule' },
    { to: '/ai-explanations', icon: Sparkles, label: 'Mon score & IA', key: 'nav.ai' },
    { to: '/help', icon: HelpCircle, label: 'Aide', key: 'nav.help' },
  ],
  [ROLES.AGENT]: [
    { to: '/agent', icon: LayoutDashboard, label: 'Tableau de bord', key: 'nav.dashboard' },
    { to: '/agent/clients', icon: Users, label: 'Clients de ma zone', key: 'nav.clients' },
    { to: '/agent/requests', icon: ClipboardList, label: 'Demandes de crédit', key: 'nav.requests' },
    { to: '/scoring', icon: BarChart3, label: 'Scores clients', key: 'nav.scores' },
    { to: '/help', icon: HelpCircle, label: 'Aide', key: 'nav.help' },
  ],
  [ROLES.MANAGER]: [
    { to: '/manager', icon: LayoutDashboard, label: 'Supervision', key: 'nav.supervision' },
    { to: '/agent/requests', icon: ClipboardList, label: 'Dossiers en attente', key: 'nav.pending' },
    { to: '/manager/exceptions', icon: AlertTriangle, label: 'Exceptions', key: 'nav.exceptions' },
    { to: '/manager/plafonds', icon: Sliders, label: 'Plafonds', key: 'nav.plafonds' },
    { to: '/scoring', icon: BarChart3, label: 'Scores', key: 'nav.scoring' },
    { to: '/help', icon: HelpCircle, label: 'Aide', key: 'nav.help' },
  ],
  [ROLES.ANALYST]: [
    { to: '/risk', icon: LayoutDashboard, label: 'Tableau de bord risque', key: 'nav.risk' },
    { to: '/risk/rules', icon: FileCheck, label: 'Règles métier', key: 'nav.rules' },
    { to: '/risk/models', icon: Activity, label: 'Performance modèles', key: 'nav.models' },
    { to: '/risk/documents', icon: FileText, label: 'Documents politique', key: 'nav.documents' },
    { to: '/help', icon: HelpCircle, label: 'Aide', key: 'nav.help' },
  ],
  [ROLES.ADMIN]: [
    { to: '/admin', icon: LayoutDashboard, label: 'Administration', key: 'nav.admin' },
    { to: '/admin/users', icon: Users, label: 'Utilisateurs', key: 'nav.users' },
    { to: '/admin/roles', icon: UserCog, label: 'Rôles', key: 'nav.roles' },
    { to: '/admin/settings', icon: Settings, label: 'Paramètres', key: 'nav.settings' },
    { to: '/help', icon: HelpCircle, label: 'Aide', key: 'nav.help' },
  ],
  [ROLES.AUDITOR]: [
    { to: '/audit', icon: LayoutDashboard, label: 'Audit', key: 'nav.audit' },
    { to: '/audit/decisions', icon: Eye, label: 'Décisions', key: 'nav.decisions' },
    { to: '/audit/reports', icon: FileText, label: 'Rapports', key: 'nav.reports' },
    { to: '/help', icon: HelpCircle, label: 'Aide', key: 'nav.help' },
  ],
}

export function getNavItems(role) {
  return NAV_BY_ROLE[role] || []
}

export function getRoleLabel(role) {
  const labels = {
    [ROLES.CLIENT]: 'Client',
    [ROLES.AGENT]: 'Agent de crédit',
    [ROLES.MANAGER]: 'Responsable crédit',
    [ROLES.ANALYST]: 'Analyste risque',
    [ROLES.ADMIN]: 'Administrateur',
    [ROLES.AUDITOR]: 'Auditeur',
  }
  return labels[role] || role
}
