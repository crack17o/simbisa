import { apiRequest } from './client'

export function getManagerDashboard() {
  return apiRequest('/api/v1/manager/dashboard/')
}

export function listExceptions(statut) {
  const q = statut ? `?statut=${statut}` : ''
  return apiRequest(`/api/v1/manager/exceptions/${q}`)
}

export function resolveException(id, data) {
  return apiRequest(`/api/v1/manager/exceptions/${id}/`, { method: 'PATCH', body: data })
}

export function getPlafonds() {
  return apiRequest('/api/v1/manager/plafonds/')
}

export function updatePlafonds(data) {
  return apiRequest('/api/v1/manager/plafonds/', { method: 'PATCH', body: data })
}

export function getNiveauPlafonds() {
  return apiRequest('/api/v1/manager/plafonds/niveaux/')
}

export function updateNiveauPlafonds(data) {
  return apiRequest('/api/v1/manager/plafonds/niveaux/', { method: 'PATCH', body: data })
}
