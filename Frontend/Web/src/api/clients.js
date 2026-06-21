import { apiRequest } from './client'

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
