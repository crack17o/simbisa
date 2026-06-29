from rest_framework import serializers
from django.utils import timezone
from datetime import date
from .models import Client, Identite
from apps.authentication.models import Utilisateur, Role
from apps.authentication.serializers import UtilisateurPublicSerializer
from apps.core.kinshasa_communes import KINSHASA_COMMUNES, commune_label
from apps.clients.services.territoire import assign_client_to_agent


class IdentiteSerializer(serializers.ModelSerializer):
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Identite
        fields = [
            'id', 'type_piece', 'numero_piece', 'date_expiration',
            'statut_verification', 'date_verification', 'document_scan',
            'rejection_reason', 'is_expired', 'created_at',
        ]
        read_only_fields = ['id', 'statut_verification', 'date_verification',
                            'rejection_reason', 'created_at']

    def validate_date_expiration(self, value):
        if value <= timezone.now().date():
            raise serializers.ValidationError("La pièce d'identité est déjà expirée.")
        return value


class ClientSerializer(serializers.ModelSerializer):
    utilisateur = UtilisateurPublicSerializer(source='id_utilisateur', read_only=True)
    identites = IdentiteSerializer(many=True, read_only=True)
    age = serializers.IntegerField(read_only=True)
    kyc_valid = serializers.BooleanField(read_only=True)
    commune_label = serializers.SerializerMethodField()
    agent_assigne = UtilisateurPublicSerializer(source='id_agent_assigne', read_only=True)
    plafond_credit_usd = serializers.IntegerField(read_only=True)
    plafond_duree_mois = serializers.IntegerField(read_only=True)

    class Meta:
        model = Client
        fields = [
            'id', 'utilisateur', 'profession', 'adresse', 'commune_kinshasa', 'commune_label',
            'id_agent_assigne', 'agent_assigne', 'date_naissance',
            'revenu_estime_usd', 'revenu_estime_cdf',
            'niveau_risque', 'niveau_compte', 'plafond_credit_usd', 'plafond_duree_mois',
            'date_inscription', 'identites', 'age', 'kyc_valid',
        ]
        read_only_fields = [
            'id', 'niveau_risque', 'niveau_compte', 'date_inscription',
            'commune_kinshasa', 'id_agent_assigne',
        ]

    def get_commune_label(self, obj):
        return commune_label(obj.commune_kinshasa)

    def validate_date_naissance(self, value):
        from django.conf import settings
        today = date.today()
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
        if age < settings.MIN_AGE:
            raise serializers.ValidationError(f"Âge minimum requis : {settings.MIN_AGE} ans.")
        if age > 100:
            raise serializers.ValidationError("Date de naissance invalide.")
        return value


class AgentCreateClientSerializer(serializers.Serializer):
    telephone = serializers.CharField(max_length=20)
    nom = serializers.CharField(max_length=100)
    postnom = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    prenom = serializers.CharField(max_length=100)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)
    profession = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    adresse = serializers.CharField(required=False, allow_blank=True, default='')
    date_naissance = serializers.DateField(required=False)

    def validate_telephone(self, value):
        cleaned = value.replace(' ', '').replace('-', '')
        if not (cleaned.startswith('+243') or cleaned.startswith('243')):
            raise serializers.ValidationError("Numéro DRC requis (format : +243XXXXXXXXX)")
        if Utilisateur.objects.filter(telephone=cleaned).exists():
            raise serializers.ValidationError('Ce numéro est déjà enregistré.')
        return cleaned

    def create(self, validated_data):
        agent = self.context['request'].user
        commune = agent.commune_kinshasa
        if not commune:
            raise serializers.ValidationError({
                'non_field_errors': 'Votre compte agent n\'a pas de commune assignée. Contactez l\'administrateur.',
            })

        password = validated_data.pop('password')
        profession = validated_data.pop('profession', '')
        adresse = validated_data.pop('adresse', '')
        dob = validated_data.pop('date_naissance', date(1995, 1, 1))
        email = validated_data.pop('email', '') or None

        role, _ = Role.objects.get_or_create(nom_role='Client')
        user = Utilisateur.objects.create_user(role=role, password=password, email=email, **validated_data)
        client = user.client_profile
        client.profession = profession
        client.adresse = adresse
        client.date_naissance = dob
        client.commune_kinshasa = commune
        client.save(update_fields=['profession', 'adresse', 'date_naissance', 'commune_kinshasa', 'updated_at'])
        assign_client_to_agent(client, agent)
        return client


class AgentClientUpdateSerializer(serializers.Serializer):
    profession = serializers.CharField(max_length=150, required=False, allow_blank=True)
    adresse = serializers.CharField(required=False, allow_blank=True)
    date_naissance = serializers.DateField(required=False)
    revenu_estime_usd = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    revenu_estime_cdf = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    niveau_compte = serializers.ChoiceField(
        choices=['standard', 'pro', 'pro_plus', 'premium'], required=False
    )
    nom = serializers.CharField(max_length=100, required=False)
    postnom = serializers.CharField(max_length=100, required=False, allow_blank=True)
    prenom = serializers.CharField(max_length=100, required=False)
    email = serializers.EmailField(required=False, allow_blank=True)
    statut = serializers.ChoiceField(choices=['actif', 'bloque', 'suspendu'], required=False)

    def validate_date_naissance(self, value):
        from django.conf import settings
        today = date.today()
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
        if age < settings.MIN_AGE:
            raise serializers.ValidationError(f"Âge minimum requis : {settings.MIN_AGE} ans.")
        return value

    def update(self, instance: Client, validated_data):
        user_fields = {}
        for key in ('nom', 'postnom', 'prenom', 'email', 'statut'):
            if key in validated_data:
                val = validated_data.pop(key)
                user_fields[key] = val if key != 'email' else (val or None)
        if user_fields:
            for attr, val in user_fields.items():
                setattr(instance.id_utilisateur, attr, val)
            instance.id_utilisateur.save(update_fields=list(user_fields.keys()) + ['updated_at'])

        client_fields = {}
        for key in ('profession', 'adresse', 'date_naissance', 'revenu_estime_usd', 'revenu_estime_cdf', 'niveau_compte'):
            if key in validated_data:
                client_fields[key] = validated_data[key]
        if client_fields:
            for attr, val in client_fields.items():
                setattr(instance, attr, val)
            instance.save(update_fields=list(client_fields.keys()) + ['updated_at'])
        return instance


class KYCVerificationSerializer(serializers.Serializer):
    statut = serializers.ChoiceField(choices=['valide', 'rejete'])
    rejection_reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        if data['statut'] == 'rejete' and not data.get('rejection_reason'):
            raise serializers.ValidationError({'rejection_reason': 'Motif de rejet requis.'})
        return data
