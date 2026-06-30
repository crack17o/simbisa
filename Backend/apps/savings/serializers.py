from rest_framework import serializers
from apps.core.currency import DEVISE_CHOICES
from .models import CompteEpargne, OperationEpargne


class CompteEpargneSerializer(serializers.ModelSerializer):
    progression_pct = serializers.FloatField(read_only=True)
    symbole = serializers.SerializerMethodField()

    class Meta:
        model = CompteEpargne
        fields = [
            'id', 'devise', 'symbole', 'solde', 'objectif_montant', 'objectif_description',
            'objectif_periodicite', 'date_objectif', 'is_active', 'date_creation', 'progression_pct',
        ]
        read_only_fields = ['id', 'solde', 'date_creation', 'progression_pct']

    def get_symbole(self, obj):
        from apps.core.currency import symbole
        return symbole(obj.devise)

    def validate_devise(self, value):
        return value.upper()
