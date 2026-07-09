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

    # Scoring synchrone — le score est calculé avant que la réponse soit retournée
    # afin que l'agent voie immédiatement le résultat dans la liste des demandes.
    try:
        from apps.scoring.services import ScoringOrchestrator
        ScoringOrchestrator(demande).run()
    except Exception as e:
        logger.warning(f"Scoring synchrone échoué pour demande #{demande.pk}: {e}")

    logger.info(
        f"Demande crédit #{demande.pk} ({demande.devise}) soumise "
        f"par client #{request.user.client_profile.pk}"
    )

    return Response({
        'success': True,
        'message': 'Demande soumise avec analyse de risque.',
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

    montant = s.validated_data['montant']
    if montant > credit.solde_restant:
        return Response(
            {'success': False, 'error': {'message': f'Le montant dépasse le solde restant ({sym}{credit.solde_restant}).'}},
            status=status.HTTP_400_BAD_REQUEST,
        )

    with transaction.atomic():
        remb = Remboursement.objects.create(
            id_credit=credit,
            montant=montant,
            mode_paiement=s.validated_data['mode_paiement'],
        )

        # Allouer le paiement aux échéances chronologiquement
        echeances_a_payer = credit.echeances.filter(
            statut__in=['non_paye', 'en_retard', 'partiellement_paye']
        ).order_by('date_echeance')

        restant = montant
        premiere_echeance = None

        for ech in echeances_a_payer:
            if restant <= Decimal('0'):
                break
            manquant = ech.montant - ech.montant_paye
            if manquant <= Decimal('0'):
                continue
            if premiere_echeance is None:
                premiere_echeance = ech
            a_crediter = min(manquant, restant)
            ech.montant_paye += a_crediter
            restant -= a_crediter
            ech.statut = 'paye' if ech.montant_paye >= ech.montant else 'partiellement_paye'
            ech.save(update_fields=['montant_paye', 'statut'])

        if premiere_echeance:
            remb.echeance = premiere_echeance
            remb.save(update_fields=['echeance'])

        if credit.solde_restant <= Decimal('0.01'):
            credit.statut = 'rembourse'
            credit.save(update_fields=['statut'])

    # Déclencher le recalcul du score en arrière-plan
    try:
        process_credit_scoring.delay(credit.id_demande_id)
    except Exception:
        logger.warning(f"Impossible de déclencher le recalcul du score pour la demande #{credit.id_demande_id}")

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
