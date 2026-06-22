import { apiRequest } from './client'

export function listAdminUsers(params = '') {
  const q = params ? `?${params}` : ''
  return apiRequest(`/api/v1/admin/users/${q}`)
}

export function listAdminRoles() {
  return apiRequest('/api/v1/admin/roles/')
}

export function listAdminCommunes() {
  return apiRequest('/api/v1/admin/communes/')
}

export function updateAdminUserCommune(userId, commune_kinshasa) {
  return apiRequest(`/api/v1/admin/users/${userId}/`, {
    method: 'PATCH',
    body: { commune_kinshasa },
  })
}

export function updateAdminUserRole(userId, role) {
  return apiRequest(`/api/v1/admin/users/${userId}/`, {
    method: 'PATCH',
    body: { role },
  })
}

export function updateAdminUserStatut(userId, statut) {
  return apiRequest(`/api/v1/admin/users/${userId}/`, {
    method: 'PATCH',
    body: { statut },
  })
}
