import { apiRequest } from './client'

export function getMyWallets() {
  return apiRequest('/api/v1/wallets/me/')
}

export function depotWallet(walletId, data) {
  return apiRequest(`/api/v1/wallets/${walletId}/depot/`, { method: 'POST', body: data })
}

export function retraitWallet(walletId, data) {
  return apiRequest(`/api/v1/wallets/${walletId}/retrait/`, { method: 'POST', body: data })
}

export function listWalletTransactions(walletId, limit = 30) {
  return apiRequest(`/api/v1/wallets/${walletId}/transactions/?limit=${limit}`)
}

export function listMobileMoney(devise) {
  const q = devise ? `?devise=${devise}` : ''
  return apiRequest(`/api/v1/wallets/mobile-money/${q}`)
}

export function createMobileMoney(data) {
  return apiRequest('/api/v1/wallets/mobile-money/', { method: 'POST', body: data })
}

// Détection opérateur par préfixe DRC (miroir de la logique backend)
const PREFIXES_OPERATEUR = {
  mpesa:        ['081', '082', '083', '084', '085'],
  orange_money: ['086', '087', '088', '089'],
  airtel_money: ['097', '098', '099'],
  africell:     ['090', '091'],
}

export const OPERATEUR_LABELS = {
  mpesa:        'Vodacom M-Pesa',
  orange_money: 'Orange Money',
  airtel_money: 'Airtel Money',
  africell:     'Africell Money',
  illicocash:   'Illico Cash',
}

export function detectOperateur(numero) {
  if (!numero) return null
  const cleaned = numero.replace(/[\s\-]/g, '')
  let normalized = cleaned
  if (cleaned.startsWith('00')) normalized = '+' + cleaned.slice(2)
  if (cleaned.startsWith('243') && !cleaned.startsWith('+')) normalized = '+' + cleaned
  if (cleaned.length === 9 && /^\d+$/.test(cleaned)) normalized = '+243' + cleaned
  if (!normalized.startsWith('+243') || normalized.length < 7) return null
  const prefix = normalized.slice(4, 7)
  for (const [op, prefixes] of Object.entries(PREFIXES_OPERATEUR)) {
    if (prefixes.includes(prefix)) return op
  }
  return null
}
