from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from apps.core.permissions import IsAuditeur
from apps.scoring.models import DecisionCredit
from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuditeur]
    filterset_fields = ['action', 'id_utilisateur']
    search_fields = ['action', 'adresse_ip']
    ordering_fields = ['date_action']

    def get_queryset(self):
        return AuditLog.objects.select_related('id_utilisateur').all()

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return Response({'success': True, 'data': response.data})


def _serialize_decision(d: DecisionCredit) -> dict:
    demande = d.id_demande
    client = demande.id_client
    agent = d.id_agent
    return {
        'id': d.pk,
        'demande_id': demande.pk,
        'ref': f'#CR-{demande.pk:03d}',
        'client': client.id_utilisateur.full_name if client.id_utilisateur else f'Client #{client.pk}',
        'devise': demande.devise,
        'montant_demande': str(demande.montant_demande),
        'decision': d.decision,
        'score_global': str(d.score_global),
        'motif': d.motif,
        'explication_ia': d.explication_ia,
        'is_automatic': d.is_automatic,
        'agent': agent.full_name if agent else None,
        'agent_telephone': agent.telephone if agent else None,
        'date_decision': d.date_decision,
    }


@api_view(['GET'])
@permission_classes([IsAuditeur])
def audit_decision_detail_view(request, pk):
    try:
        d = DecisionCredit.objects.select_related(
            'id_demande__id_client__id_utilisateur', 'id_agent',
        ).get(pk=pk)
    except DecisionCredit.DoesNotExist:
        return Response({'success': False, 'error': {'message': 'Décision introuvable.'}}, status=404)

    demande = d.id_demande
    client = demande.id_client
    utilisateur = client.id_utilisateur

    score_ia_data = None
    try:
        sia = demande.score_ia
        score_ia_data = {
            'probabilite_defaut_pct': round(float(sia.probabilite_defaut) * 100, 2),
            'niveau_risque': sia.niveau_risque,
            'score_normalise': float(sia.score_normalise),
            'modele_utilise': sia.modele_utilise,
            'shap_values': sia.shap_values,
            'feature_vector': sia.feature_vector,
        }
    except Exception:
        pass

    return Response({
        'success': True,
        'data': {
            **_serialize_decision(d),
            'duree_mois': demande.duree_mois,
            'motif_demande': demande.motif,
            'date_demande': demande.date_demande,
            'statut_demande': demande.statut,
            'client_telephone': utilisateur.telephone if utilisateur else None,
            'client_date_naissance': str(client.date_naissance) if client.date_naissance else None,
            'client_adresse': getattr(client, 'adresse', None),
            'client_profession': getattr(client, 'profession', None),
            'recommandation_ia': d.recommandation_ia,
            'score_ia': score_ia_data,
        },
    })


@api_view(['GET'])
@permission_classes([IsAuditeur])
def audit_decisions_view(request):
    qs = DecisionCredit.objects.select_related(
        'id_demande__id_client__id_utilisateur', 'id_agent',
    ).order_by('-date_decision')

    decision = request.query_params.get('decision')
    if decision:
        qs = qs.filter(decision=decision)
    automatic = request.query_params.get('is_automatic')
    if automatic is not None:
        qs = qs.filter(is_automatic=automatic.lower() in ('1', 'true', 'yes'))

    data = [_serialize_decision(d) for d in qs[:200]]
    return Response({'success': True, 'data': data, 'count': len(data)})


@api_view(['GET', 'POST'])
@permission_classes([IsAuditeur])
def audit_reports_view(request):
    now = timezone.now()

    if request.method == 'GET':
        reports = [
            {
                'id': f'RPT-Q{((now.month - 1) // 3) + 1}-{now.year}',
                'titre': f'Audit trimestriel Q{((now.month - 1) // 3) + 1} {now.year}',
                'date': now.strftime('%d/%m/%Y'),
                'statut': 'disponible',
                'type': 'trimestriel',
            },
            {
                'id': f'RPT-{now.strftime("%m-%Y").upper()}',
                'titre': f'Contrôle décisions crédit — {now.strftime("%B %Y")}',
                'date': now.replace(day=1).strftime('%d/%m/%Y'),
                'statut': 'disponible',
                'type': 'decisions_credit',
            },
            {
                'id': 'RPT-ACCES-2026',
                'titre': 'Revue des accès RBAC',
                'date': '15/04/2026',
                'statut': 'disponible',
                'type': 'rbac',
            },
        ]
        return Response({'success': True, 'data': reports})

    report_type = request.data.get('type', 'decisions_credit')
    period = request.data.get('period', now.strftime('%Y-%m'))

    decisions = DecisionCredit.objects.filter(
        date_decision__year=int(period[:4]),
        date_decision__month=int(period[5:7]) if len(period) >= 7 else now.month,
    )
    logs = AuditLog.objects.filter(
        date_action__year=int(period[:4]),
        date_action__month=int(period[5:7]) if len(period) >= 7 else now.month,
    )

    payload = {
        'report_id': f'RPT-GEN-{now.strftime("%Y%m%d%H%M%S")}',
        'type': report_type,
        'period': period,
        'generated_at': now.isoformat(),
        'summary': {
            'decisions_total': decisions.count(),
            'decisions_automatiques': decisions.filter(is_automatic=True).count(),
            'decisions_manuelles': decisions.filter(is_automatic=False).count(),
            'audit_entries': logs.count(),
        },
        'decisions': [_serialize_decision(d) for d in decisions[:50]],
        'format': 'json',
        'note': 'Export PDF à brancher côté frontend ; données JSON disponibles.',
    }
    return Response(
        {'success': True, 'message': 'Rapport généré.', 'data': payload},
        status=status.HTTP_201_CREATED,
    )
