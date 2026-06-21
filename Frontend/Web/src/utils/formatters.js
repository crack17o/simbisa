export function formatCurrency(amount, currency = 'USD') {
  const num = Number(amount)
  if (Number.isNaN(num)) return '—'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatDate(date, locale = 'fr-FR') {
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatPercent(value, decimals = 0) {
  const num = Number(value)
  if (Number.isNaN(num)) return '—'
  return `${num.toFixed(decimals)}%`
}

export function estimateMonthlyPayment(amount, durationMonths, ratePerMonth = 0.03) {
  const principal = Number(amount)
  const months = Number(durationMonths)
  if (!principal || !months) return null
  const total = principal * (1 + ratePerMonth)
  return total / months
}
