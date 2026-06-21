from django.db.models import Count
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from apps.core.permissions import IsAdministrateur
from apps.core.kinshasa_communes import KINSHASA_COMMUNES, COMMUNE_CODES
from apps.authentication.models import Role, Utilisateur
from apps.authentication.serializers import UtilisateurPublicSerializer


@extend_schema(tags=['Admin'])
@api_view(['GET'])
@permission_classes([IsAdministrateur])
def admin_users_view(request):
    statut = request.query_params.get('statut')
    role = request.query_params.get('role')

    qs = Utilisateur.objects.select_related('role').order_by('-created_at')
    if statut:
        qs = qs.filter(statut=statut)
    if role:
        qs = qs.filter(role__nom_role=role)

    data = []
    for u in qs[:500]:
        item = UtilisateurPublicSerializer(u).data
        item['name'] = u.full_name
        item['role'] = u.role.nom_role if u.role else None
        data.append(item)

    return Response({'success': True, 'data': data, 'count': len(data)})


@extend_schema(tags=['Admin'])
@api_view(['PATCH'])
@permission_classes([IsAdministrateur])
def admin_update_user_view(request, user_id):
    try:
        user = Utilisateur.objects.select_related('role').get(pk=user_id)
    except Utilisateur.DoesNotExist:
        return Response(
            {'success': False, 'error': {'message': 'Utilisateur introuvable.'}},
            status=status.HTTP_404_NOT_FOUND,
        )

    commune = request.data.get('commune_kinshasa')
    if commune is not None:
        if user.role and user.role.nom_role != 'Agent de crédit':
            return Response(
                {'success': False, 'error': {'message': 'Seuls les agents de crédit ont une commune.'}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if commune and commune not in COMMUNE_CODES:
            return Response(
                {'success': False, 'error': {'message': 'Commune Kinshasa invalide.'}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.commune_kinshasa = commune
        user.save(update_fields=['commune_kinshasa', 'updated_at'])

    return Response({
        'success': True,
        'message': 'Utilisateur mis à jour.',
        'data': UtilisateurPublicSerializer(user).data,
    })


@extend_schema(tags=['Admin'])
@api_view(['GET'])
@permission_classes([IsAdministrateur])
def admin_communes_view(request):
    data = [{'code': code, 'label': label} for code, label in KINSHASA_COMMUNES]
    return Response({'success': True, 'data': data})


@extend_schema(tags=['Admin'])
@api_view(['GET'])
@permission_classes([IsAdministrateur])
def admin_roles_view(request):
    roles = Role.objects.annotate(user_count=Count('utilisateurs')).order_by('nom_role')

    descriptions = {
        'Client': 'Accès crédits, épargne, scoring personnel',
        'Agent de crédit': 'Traitement opérationnel des dossiers de sa commune',
        'Responsable crédit': 'Validation dossiers sensibles et exceptions',
        'Analyste risque': 'Règles métier, seuils, modèles IA',
        'Administrateur': 'Gestion technique, agents et sécurité',
        'Auditeur': 'Contrôle interne et rapports',
    }

    data = [
        {
            'name': r.nom_role,
            'users': r.user_count,
            'desc': descriptions.get(r.nom_role, r.description or ''),
        }
        for r in roles
    ]
    return Response({'success': True, 'data': data})
