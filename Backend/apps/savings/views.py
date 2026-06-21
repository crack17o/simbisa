import logging
from decimal import Decimal
from django.db import transaction
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.serializers import Serializer, DecimalField, CharField

from apps.core.permissions import IsClient
from apps.core.currency import symbole
from .models import CompteEpargne, OperationEpargne
from .serializers import CompteEpargneSerializer

logger = logging.getLogger('apps.savings')


class CompteEpargneListCreateView(generics.ListCreateAPIView):
    serializer_class = CompteEpargneSerializer
    permission_classes = [IsClient]

    def get_queryset(self):
        qs = CompteEpargne.objects.filter(
            id_client=self.request.user.client_profile, is_active=True
        )
        devise = self.request.query_params.get('devise')
        if devise:
            qs = qs.filter(devise=devise.upper())
        return qs

    def perform_create(self, serializer):
        serializer.save(id_client=self.request.user.client_profile)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data})

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        return Response({'success': True, 'data': response.data}, status=status.HTTP_201_CREATED)


class OperationSerializer(Serializer):
    montant = DecimalField(max_digits=15, decimal_places=2, min_value=Decimal('0.01'))
    description = CharField(max_length=255, required=False, allow_blank=True)


@api_view(['POST'])
@permission_classes([IsClient])
def depot_epargne_view(request, pk):
    try:
        compte = CompteEpargne.objects.get(pk=pk, id_client=request.user.client_profile)
    except CompteEpargne.DoesNotExist:
        return Response({'success': False, 'error': {'message': 'Compte introuvable.'}},
                        status=status.HTTP_404_NOT_FOUND)

    serializer = OperationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    montant = serializer.validated_data['montant']

    with transaction.atomic():
        solde_avant = compte.solde
        compte.solde += montant
        compte.save(update_fields=['solde', 'updated_at'])

        op = OperationEpargne.objects.create(
            id_compte_epargne=compte,
            type_operation='depot',
            montant=montant,
            solde_avant=solde_avant,
            solde_apres=compte.solde,
            description=serializer.validated_data.get('description', ''),
        )

    sym = symbole(compte.devise)
    logger.info(f"Dépôt épargne {sym}{montant} — compte #{pk}")
    return Response({
        'success': True,
        'message': f'Dépôt de {sym}{montant} effectué.',
        'data': {
            'devise': compte.devise,
            'nouveau_solde': str(compte.solde),
            'progression': compte.progression_pct,
            'operation_id': op.pk,
        }
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsClient])
def retrait_epargne_view(request, pk):
    serializer = OperationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    montant = serializer.validated_data['montant']

    with transaction.atomic():
        try:
            compte = CompteEpargne.objects.select_for_update().get(
                pk=pk, id_client=request.user.client_profile
            )
        except CompteEpargne.DoesNotExist:
            return Response({'success': False, 'error': {'message': 'Compte introuvable.'}},
                            status=status.HTTP_404_NOT_FOUND)

        if compte.solde < montant:
            return Response({
                'success': False,
                'error': {'code': 'insufficient_balance', 'message': 'Solde insuffisant.'}
            }, status=status.HTTP_400_BAD_REQUEST)

        solde_avant = compte.solde
        compte.solde -= montant
        compte.save(update_fields=['solde', 'updated_at'])

        op = OperationEpargne.objects.create(
            id_compte_epargne=compte,
            type_operation='retrait',
            montant=montant,
            solde_avant=solde_avant,
            solde_apres=compte.solde,
            description=serializer.validated_data.get('description', ''),
        )

    sym = symbole(compte.devise)
    return Response({
        'success': True,
        'message': f'Retrait de {sym}{montant} effectué.',
        'data': {
            'devise': compte.devise,
            'nouveau_solde': str(compte.solde),
            'operation_id': op.pk,
        }
    })


@api_view(['GET'])
@permission_classes([IsClient])
def list_operations_view(request, pk):
    try:
        compte = CompteEpargne.objects.get(pk=pk, id_client=request.user.client_profile)
    except CompteEpargne.DoesNotExist:
        return Response({'success': False, 'error': {'message': 'Compte introuvable.'}},
                        status=status.HTTP_404_NOT_FOUND)

    limit = min(int(request.query_params.get('limit', 50)), 200)
    ops = compte.operations.all()[:limit]
    data = [
        {
            'id': op.pk,
            'type_operation': op.type_operation,
            'montant': str(op.montant),
            'solde_avant': str(op.solde_avant),
            'solde_apres': str(op.solde_apres),
            'description': op.description,
            'date_operation': op.date_operation,
            'devise': compte.devise,
            'symbole': symbole(compte.devise),
        }
        for op in ops
    ]
    return Response({'success': True, 'data': data, 'count': len(data)})
