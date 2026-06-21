export function formatMoney(amount, devise = 'USD') {
  const n = parseFloat(amount)
  if (Number.isNaN(n)) return devise === 'CDF' ? 'FC0' : '$0'
  if (devise === 'CDF') {
    return `FC${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}`
  }
  return `$${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function mapDecisionLabel(decision) {
  const map = {
    approuvee: 'approuve',
    approuve: 'approuve',
    rejetee: 'rejete',
    rejete: 'rejete',
    en_analyse: 'en_analyse',
    en_attente: 'en_attente',
    en_cours: 'encours',
    rembourse: 'rembourse',
  }
  return map[decision] || decision
}

export async function poll(fn, { attempts = 8, delayMs = 2000, until }) {
  for (let i = 0; i < attempts; i++) {
    const result = await fn()
    if (until(result)) return result
    await new Promise(r => setTimeout(r, delayMs))
  }
  return fn()
}
