from django.db import models
from apps.core.models import TimestampedModel


class VectorDocument(TimestampedModel):
    title = models.CharField(max_length=255)
    content = models.TextField()
    source = models.CharField(max_length=255, blank=True)
    document_type = models.CharField(max_length=100, default='policy')
    embedding = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = 'vector_document'

    def __str__(self):
        return f"[{self.document_type}] {self.title}"
