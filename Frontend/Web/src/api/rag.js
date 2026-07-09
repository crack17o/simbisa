import { apiRequest } from './client'

export function listRagDocuments() {
  return apiRequest('/api/v1/rag/documents/')
}

export function uploadRagDocument(formData) {
  return apiRequest('/api/v1/rag/documents/upload/', { method: 'POST', body: formData })
}

export function deleteRagDocument(id) {
  return apiRequest(`/api/v1/rag/documents/${id}/`, { method: 'DELETE' })
}

export function generateMemo(demandeId) {
  return apiRequest(`/api/v1/rag/memo/${demandeId}/`, { method: 'POST', body: {} })
}

export function getRagStatus() {
  return apiRequest('/api/v1/rag/status/')
}
