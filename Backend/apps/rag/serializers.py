from rest_framework import serializers
from .models import VectorDocument


class VectorDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = VectorDocument
        fields = ['id', 'title', 'content', 'source', 'document_type', 'created_at']
        read_only_fields = fields
