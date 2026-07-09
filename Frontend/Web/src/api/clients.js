import { apiRequest, fetchAuthFile } from './client'

export function listCommunes() {
  return apiRequest('/api/v1/clients/communes/', { auth: false })
}

export function getMyProfile() {
  return apiRequest('/api/v1/clients/me/')
}

export function updateMyProfile(data) {
  return apiRequest('/api/v1/clients/me/', { method: 'PATCH', body: data })
}

export function submitKyc(formData) {
  return apiRequest('/api/v1/clients/me/identite/', {
    method: 'POST',
    body: formData,
  })
}

export function verifyKyc(identiteId, data) {
  return apiRequest(`/api/v1/clients/kyc/${identiteId}/verify/`, {
    method: 'POST',
    body: data,
  })
}

export function listClients(params = '') {
  const q = params ? `?${params}` : ''
  return apiRequest(`/api/v1/clients/${q}`)
}

export function createClientByAgent(data) {
  return apiRequest('/api/v1/clients/create/', { method: 'POST', body: data })
}

export function updateClientByAgent(clientId, data) {
  return apiRequest(`/api/v1/clients/${clientId}/`, { method: 'PATCH', body: data })
}

export function deleteClientAdmin(clientId) {
  return apiRequest(`/api/v1/clients/${clientId}/`, { method: 'DELETE' })
}

/**
 * Ouvre un document KYC dans un nouvel onglet en passant le JWT en header.
 * Retourne une blob URL valide pendant 30 s (révoquée automatiquement).
 */
export function getClientStats() {
  return apiRequest('/api/v1/clients/stats/')
}

export function getClientById(clientId) {
  return apiRequest(`/api/v1/clients/${clientId}/`)
}

export async function fetchKycFile(documentUrl) {
  const blob = await fetchAuthFile(documentUrl)
  const blobUrl = URL.createObjectURL(blob)
  setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000)
  return blobUrl
}
