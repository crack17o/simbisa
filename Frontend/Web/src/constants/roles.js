export const ROLES = {
  CLIENT: 'Client',
  AGENT: 'Agent de crédit',
  MANAGER: 'Responsable crédit',
  ANALYST: 'Analyste risque',
  ADMIN: 'Administrateur',
  AUDITOR: 'Auditeur',
}

export const ROLE_COLORS = {
  [ROLES.CLIENT]:  '#D4AF37',
  [ROLES.AGENT]:   '#60A5FA',
  [ROLES.MANAGER]: '#34D399',
  [ROLES.ANALYST]: '#F59E0B',
  [ROLES.ADMIN]:   '#EF4444',
  [ROLES.AUDITOR]: '#A78BFA',
}

export const DEFAULT_ROUTE = {
  [ROLES.CLIENT]: '/dashboard',
  [ROLES.AGENT]: '/agent',
  [ROLES.MANAGER]: '/manager',
  [ROLES.ANALYST]: '/risk',
  [ROLES.ADMIN]: '/admin',
  [ROLES.AUDITOR]: '/audit',
}

export const ROUTE_ACCESS = {
  '/dashboard': [ROLES.CLIENT],
  '/profile': [ROLES.CLIENT],
  '/register': [],
  '/login': [],
  '/savings': [ROLES.CLIENT],
  '/credit-request': [ROLES.CLIENT],
  '/my-credits': [ROLES.CLIENT],
  '/repayments': [ROLES.CLIENT],
  '/scoring': [ROLES.CLIENT, ROLES.AGENT, ROLES.MANAGER, ROLES.ANALYST],
  '/ai-explanations': [ROLES.CLIENT],
  '/agent': [ROLES.AGENT, ROLES.MANAGER],
  '/agent/clients': [ROLES.AGENT, ROLES.MANAGER],
  '/manager': [ROLES.MANAGER],
  '/manager/exceptions': [ROLES.MANAGER],
  '/manager/plafonds': [ROLES.MANAGER],
  '/risk': [ROLES.ANALYST],
  '/risk/rules': [ROLES.ANALYST],
  '/risk/models': [ROLES.ANALYST],
  '/admin': [ROLES.ADMIN],
  '/admin/users': [ROLES.ADMIN],
  '/admin/roles': [ROLES.ADMIN],
  '/admin/settings': [ROLES.ADMIN],
  '/audit': [ROLES.AUDITOR],
  '/audit/decisions': [ROLES.AUDITOR],
  '/audit/reports': [ROLES.AUDITOR],
  '/settings': Object.values(ROLES),
}

export function canAccess(role, path) {
  const normalized = path.split('?')[0].replace(/\/$/, '') || '/'
  const allowed = ROUTE_ACCESS[normalized]
  if (!allowed) return true
  if (allowed.length === 0) return true
  return allowed.includes(role)
}

export function getHomeRoute(role) {
  return DEFAULT_ROUTE[role] || '/login'
}

/** Mot de passe des comptes seed backend (POSTMAN_GUIDE.md) */
export const SEED_PASSWORD = 'Test123!'

/** Comptes démo alignés sur `python manage.py seed_demo` */
export const DEMO_USERS = {
  client: {
    id: 10,
    name: 'Jean Mukendi',
    role: ROLES.CLIENT,
    telephone: '+243900000010',
    email: 'jean@example.cd',
  },
  agent: {
    id: 2,
    name: 'Agent Crédit',
    role: ROLES.AGENT,
    telephone: '+243900000002',
    email: 'agent@rawbank.cd',
  },
  manager: {
    id: 3,
    name: 'Responsable Crédit',
    role: ROLES.MANAGER,
    telephone: '+243900000003',
    email: 'manager@rawbank.cd',
  },
  analyst: {
    id: 4,
    name: 'Analyste Risque',
    role: ROLES.ANALYST,
    telephone: '+243900000004',
    email: 'analyste@rawbank.cd',
  },
  admin: {
    id: 1,
    name: 'Admin Simbisa',
    role: ROLES.ADMIN,
    telephone: '+243900000000',
    email: 'admin@simbisa.cd',
  },
  auditor: {
    id: 5,
    name: 'Auditeur',
    role: ROLES.AUDITOR,
    telephone: '+243900000005',
    email: 'auditeur@rawbank.cd',
  },
}

export const KYC_TYPE_MAP = {
  "Carte d'électeur": 'carte_electeur',
  'Passeport': 'passeport',
  'Permis de conduire': 'permis_conduire',
  'Carte consulaire': 'carte_consulaire',
}

export const KYC_TYPE_LABELS = Object.fromEntries(
  Object.entries(KYC_TYPE_MAP).map(([label, value]) => [value, label])
)
