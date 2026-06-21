from rest_framework import generics
from rest_framework.response import Response
from apps.core.permissions import IsClient
from apps.core.currency import DEVISES
from .models import WalletRawbank, MobileMoneyAccount
from .serializers import WalletSerializer, MobileMoneyAccountSerializer


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
