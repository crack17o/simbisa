import { apiRequest } from './client'

export function getMyScore() {
  return apiRequest('/api/v1/scoring/me/')
}

export function getScoringDetail(demandeId) {
  return apiRequest(`/api/v1/scoring/${demandeId}/`)
}

export function triggerScoring(demandeId) {
  return apiRequest(`/api/v1/scoring/${demandeId}/trigger/`, { method: 'POST', body: {} })
}
