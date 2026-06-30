import React, { useEffect, useState } from 'react'
import { CreditCard, CalendarDays } from 'lucide-react'
import DashboardLayout from '@/components/templates/DashboardLayout'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import { useNavigate } from 'react-router-dom'
import { useLang } from '@/context/LangContext'
import { getMyCredits } from '@/api/credits'
import { formatMoney, mapDecisionLabel } from '@/utils/apiHelpers'

export default function MyCredits() {
  const navigate = useNavigate()
  const { t } = useLang()
  const [credits, setCredits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyCredits()
      .then(res => setCredits(res.data || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <DashboardLayout title={t('credits.page_title')}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">
            {loading ? t('label.loading') : `${credits.length} ${t('label.requests')}`}
          </p>
          <Button onClick={() => navigate('/credit-request')}>{t('action.new_request')}</Button>
        </div>

        <div className="flex flex-col gap-3">
          {credits.length === 0 && !loading && (
            <p className="text-sm text-muted">{t('credits.no_credits')}</p>
          )}
          {credits.map(c => (
            <div key={c.demande_id} className="neu-flat p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#D4AF3715', color: '#D4AF37' }}>
                  <CreditCard size={18} />
                </div>
                <div>
                  <p className="font-semibold text-blanc">#{c.demande_id} · {c.devise}</p>
                  <p className="text-xs text-muted">
                    {c.duree_mois} {t('label.months')}
                    {c.credit?.mensualite ? ` · ${formatMoney(c.credit.mensualite, c.devise)}${t('label.month_abbr')}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl font-display font-bold text-blanc">{formatMoney(c.montant_demande, c.devise)}</span>
                <Badge label={mapDecisionLabel(c.statut)} />
                {c.credit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={CalendarDays}
                    onClick={() => navigate(`/echeancier?credit_id=${c.credit.id}`)}
                  >
                    {t('credits.schedule')}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
