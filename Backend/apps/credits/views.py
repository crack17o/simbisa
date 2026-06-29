import logging
from decimal import Decimal
from django.db import transaction
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import serializers
from rest_framework.serializers import ModelSerializer, SerializerMethodField, DecimalField, ChoiceField, Serializer
from drf_spectacular.utils import extend_schema

from apps.core.permissions import IsClient, IsAgentOrManager
from apps.core.currency import DEVISE_CHOICES, symbole, get_credit_limits, valider_montant_credit
from apps.core.exceptions import KYCNotValidatedError, ActiveCreditExistsError, SimbisaException
from .models import DemandeCredit, Credit, Echeance, Remboursement
from .tasks import process_credit_scoring

logger = logging.getLogger('apps.credits')


class DemandeSerializer(ModelSerializer):
    class Meta:
        model = DemandeCredit
        fields = ['id', 'devise', 'montant_demande', 'duree_mois', 'motif', 'statut', 'date_demande']
        read_only_fields = ['id', 'statut', 'date_demande']

    def validate_devise(self, value):
        return value.upper()

    def validate(self, data):
        client = self.context['request'].user.client_profile
        devise = data.get('devise', 'USD').upper()
        data['devise'] = devise

        if not client.kyc_valid:
            raise KYCNotValidatedError()

        if Credit.objects.filter(
            id_demande__id_client=client,
            id_demande__devise=devise,
            statut='en_cours',
        ).exists():
            raise ActiveCreditExistsError()

        if client.age < settings.MIN_AGE or client.age > settings.MAX_AGE:
            raise SimbisaException(
                f"Éligibilité requise : entre {settings.MIN_AGE} et {settings.MAX_AGE} ans.",
                code='age_ineligible'
            )

        montant = data.get('montant_demande')
        duree_mois = data.get('duree_mois')
        if montant is not None:
            try:
                valider_montant_credit(montant, devise)
            except ValueError as e:
                raise SimbisaException(str(e), code='montant_hors_plage') from e
            # Vérification plafond niveau de compte
            from apps.core.exchange_rate import get_cdf_per_usd
            from apps.core.currency import USD, CDF
            plafond_usd = client.plafond_credit_usd
            montant_usd = float(montant) if devise == USD else float(montant) / get_cdf_per_usd()
            if montant_usd > plafond_usd:
                from apps.core.currency import symbole
                raise SimbisaException(
                    f"Votre niveau {client.niveau_compte.upper()} autorise un maximum de "
                    f"${plafond_usd} USD. Passez au niveau supérieur pour emprunter davantage.",
                    code='plafond_niveau_compte',
                )

        if duree_mois is not None and duree_mois > client.plafond_duree_mois:
            raise SimbisaException(
                f"Votre niveau {client.niveau_compte.upper()} autorise une durée maximale "
                f"de {client.plafond_duree_mois} mois.",
                code='duree_hors_plafond',
            )

        return data


class CreditSerializer(ModelSerializer):
    devise = serializers.CharField(source='id_demande.devise', read_only=True)
    symbole = SerializerMethodField()
    mensualite = DecimalField(max_digits=15, decimal_places=2, read_only=True)
    solde_restant = DecimalField(max_digits=15, decimal_places=2, read_only=True)
    progression_remboursement = SerializerMethodField()

    class Meta:
        model = Credit
        fields = [
            'id', 'devise', 'symbole', 'montant_accorde', 'taux_interet', 'date_debut', 'date_fin',
            'statut', 'mensualite', 'solde_restant', 'progression_remboursement'
        ]

    def get_symbole(self, obj):
        return symbole(obj.id_demande.devise)

    def get_progression_remboursement(self, obj):
        if obj.montant_accorde == 0:
            return 100
        return round(float(obj.montant_accorde - obj.solde_restant) / float(obj.montant_accorde) * 100, 1)


@extend_schema(tags=['Credits'])
@api_view(['POST'])
@permission_classes([IsClient])
def submit_credit_request(request):
    serializer = DemandeSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)

    with transaction.atomic():
        demande = serializer.save(id_client=request.user.client_profile)

    # Mode async (Celery) si disponible, sinon exécution synchrone.
    try:
        process_credit_scoring.delay(demande.pk)
    except Exception:
        process_credit_scoring(demande.pk)

    logger.info(
        f"Demande crédit #{demande.pk} ({demande.devise}) soumise "
        f"par client #{request.user.client_profile.pk}"
    )

    return Response({
        'success': True,
        'message': 'Demande soumise. Analyse en cours…',
        'data': {
            'demande_id': demande.pk,
            'devise': demande.devise,
            'statut': demande.statut,
        }
    }, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Credits'])
@api_view(['GET'])
@permission_classes([IsClient])
def my_credits_view(request):
    demandes = DemandeCredit.objects.filter(
        id_client=request.user.client_profile
    ).prefetch_related('credit').order_by('-date_demande')

    devise_filter = request.query_params.get('devise')
    if devise_filter:
        demandes = demandes.filter(devise=devise_filter.upper())

    data = []
    for d in demandes:
        item = {
            'demande_id': d.pk,
            'devise': d.devise,
            'symbole': symbole(d.devise),
            'montant_demande': str(d.montant_demande),
            'duree_mois': d.duree_mois,
            'motif': d.motif,
            'statut': d.statut,
            'date_demande': d.date_demande,
        }
        if hasattr(d, 'credit'):
            item['credit'] = CreditSerializer(d.credit).data
        data.append(item)

    return Response({'success': True, 'data': data})


@extend_schema(tags=['Credits'])
@api_view(['POST'])
@permission_classes([IsClient])
def remboursement_view(request, credit_pk):
    try:
        credit = Credit.objects.select_related('id_demande__id_client').get(
            pk=credit_pk,
            id_demande__id_client=request.user.client_profile,
            statut='en_cours'
        )
    except Credit.DoesNotExist:
        return Response({'success': False, 'error': {'message': 'Crédit introuvable ou déjà soldé.'}},
                        status=status.HTTP_404_NOT_FOUND)

    class RemboursementInputSerializer(Serializer):
        montant = DecimalField(max_digits=15, decimal_places=2, min_value=Decimal('0.01'))
        mode_paiement = ChoiceField(
            choices=['illicocash', 'virement', 'agence', 'mobile_money'],
            default='illicocash'
        )

    s = RemboursementInputSerializer(data=request.data)
    s.is_valid(raise_exception=True)

    devise = credit.id_demande.devise
    sym = symbole(devise)

    with transaction.atomic():
        remb = Remboursement.objects.create(
            id_credit=credit,
            montant=s.validated_data['montant'],
            mode_paiement=s.validated_data['mode_paiement'],
        )

        if credit.solde_restant <= Decimal('0.01'):
            credit.statut = 'rembourse'
            credit.save(update_fields=['statut'])

    return Response({
        'success': True,
        'message': f"Remboursement de {sym}{remb.montant} enregistré.",
        'data': {
            'remboursement_id': remb.pk,
            'devise': devise,
            'solde_restant': str(credit.solde_restant),
            'credit_statut': credit.statut,
        }
    }, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Credits'])
@api_view(['GET'])
def credit_echeances_view(request, credit_pk):
    try:
        credit = Credit.objects.select_related(
            'id_demande__id_client__id_utilisateur'
        ).get(pk=credit_pk)
    except Credit.DoesNotExist:
        return Response(
            {'success': False, 'error': {'message': 'Crédit introuvable.'}},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Vérifie l'accès : client propriétaire ou agent/manager/staff
    is_owner = (
        hasattr(request.user, 'client_profile')
        and credit.id_demande.id_client == request.user.client_profile
    )
    if not is_owner and not request.user.is_staff:
        role_nom = getattr(getattr(request.user, 'role', None), 'nom_role', '')
        allowed = ['Agent de crédit', 'Responsable crédit', 'Analyste risque', 'Administrateur', 'Auditeur']
        if role_nom not in allowed:
            return Response(
                {'success': False, 'error': {'message': 'Accès refusé.'}},
                status=status.HTTP_403_FORBIDDEN,
            )

    echeances = credit.echeances.order_by('date_echeance')
    data = {
        'credit_id': credit.pk,
        'devise': credit.devise,
        'symbole': symbole(credit.devise),
        'montant_accorde': str(credit.montant_accorde),
        'mensualite': str(credit.mensualite),
        'solde_restant': str(credit.solde_restant),
        'statut': credit.statut,
        'date_debut': credit.date_debut,
        'date_fin': credit.date_fin,
        'echeances': [
            {
                'id': e.pk,
                'montant': str(e.montant),
                'date_echeance': e.date_echeance,
                'statut': e.statut,
                'montant_paye': str(e.montant_paye),
                'restant': str(max(e.montant - e.montant_paye, 0)),
            }
            for e in echeances
        ],
    }
    return Response({'success': True, 'data': data})
