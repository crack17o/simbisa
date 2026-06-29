import logging
from decimal import Decimal
from django.db import transaction
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.serializers import Serializer, DecimalField, ChoiceField, CharField
from apps.core.permissions import IsClient
from apps.core.currency import DEVISES, symbole
from .models import WalletRawbank, MobileMoneyAccount, WalletTransaction, MODES_PAIEMENT
from .serializers import WalletSerializer, MobileMoneyAccountSerializer, WalletTransactionSerializer

logger = logging.getLogger('apps.wallets')


def ensure_client_wallets(client):
    for devise in DEVISES:
        WalletRawbank.objects.get_or_create(id_client=client, devise=devise)


class MyWalletsView(generics.ListAPIView):
    """Liste les deux wallets du client (CDF + USD)."""
    serializer_class = WalletSerializer
    permission_classes = [IsClient]

    def get_queryset(self):
        client = self.request.user.client_profile
        ensure_client_wallets(client)
        return WalletRawbank.objects.filter(id_client=client).order_by('devise')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data})


class MobileMoneyAccountListCreateView(generics.ListCreateAPIView):
    serializer_class = MobileMoneyAccountSerializer
    permission_classes = [IsClient]

    def get_queryset(self):
        qs = MobileMoneyAccount.objects.filter(
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
        response.data = {'success': True, 'data': response.data}
        return response


class _WalletOperationSerializer(Serializer):
    montant = DecimalField(max_digits=15, decimal_places=2, min_value=Decimal('0.01'))
    mode_paiement = ChoiceField(choices=[m[0] for m in MODES_PAIEMENT])
    numero_paiement = CharField(max_length=20, required=False, allow_blank=True)
    description = CharField(max_length=255, required=False, allow_blank=True)


@api_view(['POST'])
@permission_classes([IsClient])
def depot_wallet_view(request, pk):
    """Dépôt sur un wallet depuis illicocash ou mobile money."""
    try:
        wallet = WalletRawbank.objects.get(pk=pk, id_client=request.user.client_profile)
    except WalletRawbank.DoesNotExist:
        return Response({'success': False, 'error': {'message': 'Wallet introuvable.'}},
                        status=status.HTTP_404_NOT_FOUND)

    if wallet.statut != 'actif':
        return Response({'success': False, 'error': {'message': f'Wallet {wallet.statut}.'}},
                        status=status.HTTP_400_BAD_REQUEST)

    s = _WalletOperationSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    montant = s.validated_data['montant']
    mode = s.validated_data['mode_paiement']
    numero = s.validated_data.get('numero_paiement', '')

    # Validation : le numéro doit correspondre à l'opérateur détecté
    if mode != 'illicocash' and numero:
        from apps.ussd.msisdn import detect_operateur
        detected = detect_operateur(numero)
        if detected and detected != mode:
            operateur_labels = dict(MODES_PAIEMENT)
            return Response({
                'success': False,
                'error': {
                    'code': 'operateur_mismatch',
                    'message': (
                        f"Le numéro {numero} appartient à {operateur_labels.get(detected, detected)}, "
                        f"pas à {operateur_labels.get(mode, mode)}."
                    )
                }
            }, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        wallet_locked = WalletRawbank.objects.select_for_update().get(pk=wallet.pk)
        solde_avant = wallet_locked.solde
        wallet_locked.solde += montant
        wallet_locked.save(update_fields=['solde', 'updated_at'])

        txn = WalletTransaction.objects.create(
            wallet=wallet_locked,
            type_transaction='depot',
            montant=montant,
            solde_avant=solde_avant,
            solde_apres=wallet_locked.solde,
            mode_paiement=mode,
            numero_paiement=numero,
            description=s.validated_data.get('description', ''),
        )

    sym = symbole(wallet.devise)
    logger.info(f"Dépôt wallet #{wallet.pk} {sym}{montant} via {mode}")
    return Response({
        'success': True,
        'message': f'Dépôt de {sym}{montant} effectué.',
        'data': {
            'transaction_id': txn.pk,
            'devise': wallet.devise,
            'nouveau_solde': str(wallet_locked.solde),
            'mode_paiement': mode,
        }
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsClient])
def retrait_wallet_view(request, pk):
    """Retrait depuis un wallet vers illicocash ou mobile money."""
    s = _WalletOperationSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    montant = s.validated_data['montant']
    mode = s.validated_data['mode_paiement']
    numero = s.validated_data.get('numero_paiement', '')

    if mode != 'illicocash' and numero:
        from apps.ussd.msisdn import detect_operateur
        detected = detect_operateur(numero)
        if detected and detected != mode:
            operateur_labels = dict(MODES_PAIEMENT)
            return Response({
                'success': False,
                'error': {
                    'code': 'operateur_mismatch',
                    'message': (
                        f"Le numéro {numero} appartient à {operateur_labels.get(detected, detected)}, "
                        f"pas à {operateur_labels.get(mode, mode)}."
                    )
                }
            }, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        try:
            wallet = WalletRawbank.objects.select_for_update().get(
                pk=pk, id_client=request.user.client_profile
            )
        except WalletRawbank.DoesNotExist:
            return Response({'success': False, 'error': {'message': 'Wallet introuvable.'}},
                            status=status.HTTP_404_NOT_FOUND)

        if wallet.statut != 'actif':
            return Response({'success': False, 'error': {'message': f'Wallet {wallet.statut}.'}},
                            status=status.HTTP_400_BAD_REQUEST)

        if wallet.solde < montant:
            return Response({
                'success': False,
                'error': {'code': 'solde_insuffisant', 'message': 'Solde insuffisant.'}
            }, status=status.HTTP_400_BAD_REQUEST)

        solde_avant = wallet.solde
        wallet.solde -= montant
        wallet.save(update_fields=['solde', 'updated_at'])

        txn = WalletTransaction.objects.create(
            wallet=wallet,
            type_transaction='retrait',
            montant=montant,
            solde_avant=solde_avant,
            solde_apres=wallet.solde,
            mode_paiement=mode,
            numero_paiement=numero,
            description=s.validated_data.get('description', ''),
        )

    sym = symbole(wallet.devise)
    logger.info(f"Retrait wallet #{wallet.pk} {sym}{montant} vers {mode}")
    return Response({
        'success': True,
        'message': f'Retrait de {sym}{montant} effectué.',
        'data': {
            'transaction_id': txn.pk,
            'devise': wallet.devise,
            'nouveau_solde': str(wallet.solde),
            'mode_paiement': mode,
        }
    })


@api_view(['GET'])
@permission_classes([IsClient])
def wallet_transactions_view(request, pk):
    """Historique des transactions d'un wallet."""
    try:
        wallet = WalletRawbank.objects.get(pk=pk, id_client=request.user.client_profile)
    except WalletRawbank.DoesNotExist:
        return Response({'success': False, 'error': {'message': 'Wallet introuvable.'}},
                        status=status.HTTP_404_NOT_FOUND)

    limit = min(int(request.query_params.get('limit', 50)), 200)
    txns = wallet.transactions.all()[:limit]
    serializer = WalletTransactionSerializer(txns, many=True)
    return Response({'success': True, 'data': serializer.data, 'devise': wallet.devise})
