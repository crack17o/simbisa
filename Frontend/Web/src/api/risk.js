import { apiRequest } from './client'

export function getRiskDashboard() {
  return apiRequest('/api/v1/risk/dashboard/')
}

export function getRiskRules() {
  return apiRequest('/api/v1/risk/rules/')
}

export function updateRiskRules(rules) {
  return apiRequest('/api/v1/risk/rules/', { method: 'PATCH', body: { rules } })
}

export function getRiskModels() {
  return apiRequest('/api/v1/risk/models/')
}

export function getRiskModelStatus() {
  return apiRequest('/api/v1/risk/model-status/')
}
