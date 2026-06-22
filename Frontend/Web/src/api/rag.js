import { apiRequest } from './client'

export function listRagDocuments() {
  return apiRequest('/api/v1/rag/documents/')
}

export function generateMemo(demandeId) {
  return apiRequest(`/api/v1/rag/memo/${demandeId}/`, { method: 'POST', body: {} })
}

export function getRagStatus() {
  return apiRequest('/api/v1/rag/status/')
}
