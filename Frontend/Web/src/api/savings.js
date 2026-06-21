import { apiRequest } from './client'

export function listSavings(devise) {
  const q = devise ? `?devise=${devise}` : ''
  return apiRequest(`/api/v1/savings${q}`)
}

export function createSavings(data) {
  return apiRequest('/api/v1/savings/', { method: 'POST', body: data })
}

export function depotSavings(compteId, data) {
  return apiRequest(`/api/v1/savings/${compteId}/depot/`, { method: 'POST', body: data })
}

export function retraitSavings(compteId, data) {
  return apiRequest(`/api/v1/savings/${compteId}/retrait/`, { method: 'POST', body: data })
}

export function listSavingsOperations(compteId, limit = 20) {
  return apiRequest(`/api/v1/savings/${compteId}/operations/?limit=${limit}`)
}
