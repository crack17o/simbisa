import { apiRequest } from './client'

export function submitCreditRequest(data) {
  return apiRequest('/api/v1/credits/', { method: 'POST', body: data })
}

export function getMyCredits(devise) {
  const q = devise ? `?devise=${devise}` : ''
  return apiRequest(`/api/v1/credits/me${q}`)
}

export function submitRepayment(creditId, data) {
  return apiRequest(`/api/v1/credits/${creditId}/remboursement/`, { method: 'POST', body: data })
}

export function listDemandes(params = '') {
  const q = params ? `?${params}` : ''
  return apiRequest(`/api/v1/credits/demandes/${q}`)
}

export function getDemandesStats() {
  return apiRequest('/api/v1/credits/demandes/stats/')
}

export function listDemandesSensibles() {
  return apiRequest('/api/v1/credits/demandes/sensibles/')
}

export function submitDemandeDecision(demandeId, data) {
  return apiRequest(`/api/v1/credits/demandes/${demandeId}/decision/`, { method: 'POST', body: data })
}

export function getEcheances(creditId) {
  return apiRequest(`/api/v1/credits/${creditId}/echeances/`)
}

export function getDemande(demandeId) {
  return apiRequest(`/api/v1/credits/demandes/${demandeId}/`)
}

export function cloturerDemande(demandeId, motif) {
  return apiRequest(`/api/v1/credits/demandes/${demandeId}/cloturer/`, { method: 'POST', body: { motif } })
}
