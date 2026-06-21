import { apiRequest } from './client'

export function getExchangeRate() {
  return apiRequest('/api/v1/settings/taux-change/')
}

export function getAdminExchangeRate() {
  return apiRequest('/api/v1/settings/admin/taux-change/')
}

export function updateExchangeRate(cdf_per_usd) {
  return apiRequest('/api/v1/settings/admin/taux-change/', {
    method: 'PATCH',
    body: { cdf_per_usd },
  })
}

export function getAdminSecurity() {
  return apiRequest('/api/v1/settings/admin/security/')
}

export function updateAdminSecurity(data) {
  return apiRequest('/api/v1/settings/admin/security/', { method: 'PATCH', body: data })
}
