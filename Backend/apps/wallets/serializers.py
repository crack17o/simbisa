from rest_framework import serializers
from apps.core.currency import DEVISE_CHOICES
from .models import WalletRawbank, MobileMoneyAccount, MobileMoneyTransaction


class WalletSerializer(serializers.ModelSerializer):
    symbole = serializers.SerializerMethodField()

    class Meta:
        model = WalletRawbank
        fields = ['id', 'devise', 'symbole', 'numero_wallet', 'solde', 'statut', 'date_creation']
        read_only_fields = ['id', 'numero_wallet', 'solde', 'statut', 'date_creation']

    def get_symbole(self, obj):
        from apps.core.currency import symbole
        return symbole(obj.devise)


class MobileMoneyAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = MobileMoneyAccount
        fields = ['id', 'operateur', 'numero_telephone', 'devise', 'date_liaison', 'is_active']
        read_only_fields = ['id', 'date_liaison']


class MobileMoneyTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MobileMoneyTransaction
        fields = [
            'id', 'devise', 'type_transaction', 'montant', 'solde_apres',
            'date_transaction', 'reference_externe', 'description',
        ]
        read_only_fields = fields
