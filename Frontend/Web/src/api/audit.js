import { apiRequest } from './client'

export function listAuditLogs(params = '') {
  const q = params ? `?${params}` : ''
  return apiRequest(`/api/v1/audit/${q}`)
}

export function listAuditDecisions(params = '') {
  const q = params ? `?${params}` : ''
  return apiRequest(`/api/v1/audit/decisions/${q}`)
}

export function listAuditReports() {
  return apiRequest('/api/v1/audit/reports/')
}

export function generateAuditReport(data = {}) {
  return apiRequest('/api/v1/audit/reports/', { method: 'POST', body: data })
}
