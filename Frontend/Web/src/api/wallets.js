import { apiRequest } from './client'

export function getMyWallets() {
  return apiRequest('/api/v1/wallets/me/')
}

export function listMobileMoney(devise) {
  const q = devise ? `?devise=${devise}` : ''
  return apiRequest(`/api/v1/wallets/mobile-money/${q}`)
}

export function createMobileMoney(data) {
  return apiRequest('/api/v1/wallets/mobile-money/', { method: 'POST', body: data })
}
