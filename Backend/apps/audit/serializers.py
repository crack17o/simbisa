from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    utilisateur_telephone = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = ['id', 'id_utilisateur', 'utilisateur_telephone',
                  'action', 'details', 'adresse_ip', 'date_action']

    def get_utilisateur_telephone(self, obj):
        return obj.id_utilisateur.telephone if obj.id_utilisateur else None
