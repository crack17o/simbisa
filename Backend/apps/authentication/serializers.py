import logging
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from apps.core.kinshasa_communes import KINSHASA_COMMUNES
from .models import Utilisateur, Role

logger = logging.getLogger('apps.authentication')


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['telephone'] = user.telephone
        token['role'] = user.role.nom_role if user.role else None
        token['full_name'] = user.full_name
        token['mfa_enabled'] = user.mfa_enabled
        return token


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, style={'input_type': 'password'})
    commune_kinshasa = serializers.ChoiceField(choices=KINSHASA_COMMUNES, write_only=True)

    class Meta:
        model = Utilisateur
        fields = [
            'telephone', 'nom', 'postnom', 'prenom', 'email',
            'password', 'password_confirm', 'commune_kinshasa',
        ]

    def validate_telephone(self, value):
        cleaned = value.replace(' ', '').replace('-', '')
        if not (cleaned.startswith('+243') or cleaned.startswith('243')):
            raise serializers.ValidationError("Numéro DRC requis (format : +243XXXXXXXXX)")
        return cleaned

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Les mots de passe ne correspondent pas.'})
        return data

    def create(self, validated_data):
        commune = validated_data.pop('commune_kinshasa')
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        role, _ = Role.objects.get_or_create(nom_role='Client')
        user = Utilisateur.objects.create_user(role=role, password=password, **validated_data)
        user._registration_commune = commune
        return user


class LoginSerializer(serializers.Serializer):
    telephone = serializers.CharField()
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    mfa_token = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        telephone = data.get('telephone', '').replace(' ', '')
        password = data.get('password')

        try:
            user = Utilisateur.objects.get(telephone=telephone)
        except Utilisateur.DoesNotExist:
            raise serializers.ValidationError({'telephone': 'Identifiants incorrects.'})

        if user.is_locked():
            raise serializers.ValidationError({
                'non_field_errors': 'Compte temporairement verrouillé. Réessayez dans 30 minutes.'
            })

        if not user.check_password(password):
            user.record_failed_login()
            logger.warning(f"Tentative de connexion échouée pour {telephone}")
            raise serializers.ValidationError({'password': 'Identifiants incorrects.'})

        if user.statut != 'actif':
            raise serializers.ValidationError({'non_field_errors': f'Compte {user.statut}. Contactez la Rawbank.'})

        user.reset_failed_logins()
        data['user'] = user
        return data


class UtilisateurPublicSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='role.nom_role', read_only=True)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Utilisateur
        fields = [
            'id', 'telephone', 'nom', 'postnom', 'prenom', 'email',
            'role_name', 'full_name', 'statut', 'mfa_enabled', 'commune_kinshasa', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'statut']


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': 'Les nouveaux mots de passe ne correspondent pas.'})
        return data

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Mot de passe actuel incorrect.')
        return value


class MFASetupSerializer(serializers.Serializer):
    otp_token = serializers.CharField(max_length=6, min_length=6)


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class VerifyResetOtpSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6, min_length=6)


class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    reset_token = serializers.CharField(max_length=128)
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True, min_length=8)

    def validate(self, data):
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': 'Les mots de passe ne correspondent pas.',
            })
        return data
