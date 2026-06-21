import logging
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, JSONParser
from drf_spectacular.utils import extend_schema

from apps.core.permissions import IsAgent, IsClient, IsSelfOrAgent, IsCreditAgent, IsAdministrateur
from apps.core.kinshasa_communes import KINSHASA_COMMUNES
from apps.clients.services.territoire import (
    filter_clients_queryset, can_agent_access_client,
)
from .models import Client, Identite
from .serializers import (
    ClientSerializer, IdentiteSerializer, KYCVerificationSerializer,
    AgentCreateClientSerializer, AgentClientUpdateSerializer,
)

logger = logging.getLogger('apps.clients')


class ClientListView(generics.ListAPIView):
    serializer_class = ClientSerializer
    permission_classes = [IsAgent]
    filterset_fields = ['niveau_risque', 'commune_kinshasa']
    search_fields = ['id_utilisateur__nom', 'id_utilisateur__telephone']
    ordering_fields = ['date_inscription', 'niveau_risque']

    def get_queryset(self):
        qs = Client.objects.select_related(
            'id_utilisateur__role', 'id_agent_assigne',
        ).prefetch_related('identites')
        return filter_clients_queryset(qs, self.request.user)


class ClientDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ClientSerializer
    permission_classes = [IsSelfOrAgent]
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        qs = Client.objects.select_related(
            'id_utilisateur', 'id_agent_assigne',
        ).prefetch_related('identites')
        return filter_clients_queryset(qs, self.request.user)

    def get_permissions(self):
        if self.request.method == 'DELETE':
            return [IsAdministrateur()]
        return [IsSelfOrAgent()]

    def get_serializer_class(self):
        role = getattr(getattr(self.request.user, 'role', None), 'nom_role', '')
        if self.request.method in ('PATCH', 'PUT') and role == 'Agent de crédit':
            return AgentClientUpdateSerializer
        return ClientSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        role = getattr(getattr(request.user, 'role', None), 'nom_role', '')
        if role == 'Agent de crédit':
            serializer = AgentClientUpdateSerializer(
                instance, data=request.data, partial=True, context={'request': request},
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response({
                'success': True,
                'message': 'Client mis à jour.',
                'data': ClientSerializer(instance).data,
            })
        return super().update(request, *args, **kwargs, partial=partial)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user = instance.id_utilisateur
        client_id = instance.pk
        user.delete()
        logger.warning(f"Client #{client_id} supprime par admin {request.user.telephone}")
        return Response(
            {'success': True, 'message': 'Client et compte utilisateur supprimés.'},
            status=status.HTTP_200_OK,
        )


class MyProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = ClientSerializer
    permission_classes = [IsClient]

    def get_object(self):
        return self.request.user.client_profile


class IdentiteCreateView(generics.CreateAPIView):
    serializer_class = IdentiteSerializer
    parser_classes = [MultiPartParser, JSONParser]
    permission_classes = [IsClient]

    def perform_create(self, serializer):
        client = self.request.user.client_profile
        serializer.save(id_client=client)
        logger.info(f"Document KYC soumis par client #{client.pk}")


@extend_schema(tags=['Clients'])
@api_view(['GET'])
@permission_classes([AllowAny])
def communes_list_view(request):
    data = [{'code': code, 'label': label} for code, label in KINSHASA_COMMUNES]
    return Response({'success': True, 'data': data})


@extend_schema(tags=['Clients'])
@api_view(['POST'])
@permission_classes([IsCreditAgent])
def agent_create_client_view(request):
    serializer = AgentCreateClientSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    client = serializer.save()
    logger.info(
        f"Client #{client.pk} cree par agent {request.user.telephone} "
        f"(commune {client.commune_kinshasa})"
    )
    return Response({
        'success': True,
        'message': 'Client enregistré et affecté à votre portefeuille.',
        'data': ClientSerializer(client).data,
    }, status=status.HTTP_201_CREATED)


@extend_schema(tags=['KYC'])
@api_view(['POST'])
@permission_classes([IsAgent])
def verify_kyc_view(request, pk):
    try:
        identite = Identite.objects.select_related('id_client').get(pk=pk)
    except Identite.DoesNotExist:
        return Response({'success': False, 'error': {'message': 'Document introuvable.'}},
                        status=status.HTTP_404_NOT_FOUND)

    if not can_agent_access_client(request.user, identite.id_client):
        return Response(
            {'success': False, 'error': {'message': 'Ce client ne fait pas partie de votre portefeuille.'}},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = KYCVerificationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    identite.statut_verification = serializer.validated_data['statut']
    identite.date_verification = timezone.now()
    identite.rejection_reason = serializer.validated_data.get('rejection_reason', '')
    identite.verified_by = request.user
    identite.save()

    logger.info(f"KYC {serializer.validated_data['statut']} pour identité #{pk}")

    return Response({
        'success': True,
        'message': f"KYC {serializer.validated_data['statut']}.",
        'data': IdentiteSerializer(identite).data
    })
