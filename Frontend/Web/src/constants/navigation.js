import {
  LayoutDashboard, CreditCard, PiggyBank, BarChart3, ShieldCheck,
  User, FileCheck, Wallet, Sparkles, ClipboardList, Eye, AlertTriangle,
  Sliders, Users, Settings, Shield, FileText, Activity, Lock, UserCog, CalendarDays,
  Smartphone,
} from 'lucide-react'
import { ROLES } from '@/constants/roles'

export const NAV_BY_ROLE = {
  [ROLES.CLIENT]: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { to: '/profile', icon: User, label: 'Mon profil & KYC' },
    { to: '/savings', icon: PiggyBank, label: 'Épargne virtuelle' },
    { to: '/wallets', icon: Smartphone, label: 'Mobile Money' },
    { to: '/credit-request', icon: CreditCard, label: 'Demande de crédit' },
    { to: '/my-credits', icon: ShieldCheck, label: 'Mes crédits' },
    { to: '/repayments', icon: Wallet, label: 'Remboursements' },
    { to: '/echeancier', icon: CalendarDays, label: 'Échéancier' },
    { to: '/scoring', icon: BarChart3, label: 'Mon score' },
    { to: '/ai-explanations', icon: Sparkles, label: 'Explications IA' },
  ],
  [ROLES.AGENT]: [
    { to: '/agent', icon: LayoutDashboard, label: 'Tableau de bord' },
    { to: '/agent/clients', icon: Users, label: 'Clients de ma zone' },
    { to: '/agent/requests', icon: ClipboardList, label: 'Demandes de crédit' },
    { to: '/scoring', icon: BarChart3, label: 'Scores clients' },
  ],
  [ROLES.MANAGER]: [
    { to: '/manager', icon: LayoutDashboard, label: 'Supervision' },
    { to: '/agent/requests', icon: ClipboardList, label: 'Dossiers en attente' },
    { to: '/manager/exceptions', icon: AlertTriangle, label: 'Exceptions' },
    { to: '/manager/plafonds', icon: Sliders, label: 'Plafonds' },
    { to: '/scoring', icon: BarChart3, label: 'Scores' },
  ],
  [ROLES.ANALYST]: [
    { to: '/risk', icon: LayoutDashboard, label: 'Tableau de bord risque' },
    { to: '/risk/rules', icon: FileCheck, label: 'Règles métier' },
    { to: '/risk/models', icon: Activity, label: 'Performance modèles' },
    { to: '/scoring', icon: BarChart3, label: 'Scoring détaillé' },
  ],
  [ROLES.ADMIN]: [
    { to: '/admin', icon: LayoutDashboard, label: 'Administration' },
    { to: '/admin/users', icon: Users, label: 'Utilisateurs' },
    { to: '/admin/roles', icon: UserCog, label: 'Rôles' },
    { to: '/admin/settings', icon: Settings, label: 'Paramètres' },
  ],
  [ROLES.AUDITOR]: [
    { to: '/audit', icon: LayoutDashboard, label: 'Audit' },
    { to: '/audit/decisions', icon: Eye, label: 'Décisions' },
    { to: '/audit/reports', icon: FileText, label: 'Rapports' },
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
