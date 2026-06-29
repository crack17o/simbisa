from rest_framework import generics
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from apps.core.permissions import IsAgent
from .models import VectorDocument
from .serializers import VectorDocumentSerializer
from .services.generator import RAGGenerator
from .services.llm.factory import llm_is_available
from .services.embeddings.factory import embedding_is_available


class VectorDocumentListView(generics.ListAPIView):
    serializer_class = VectorDocumentSerializer
    permission_classes = [IsAgent]
    queryset = VectorDocument.objects.all()

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return Response({'success': True, 'data': response.data})


@extend_schema(tags=['RAG'])
@api_view(['POST'])
@permission_classes([IsAgent])
def generate_memo_view(request, demande_pk):
    from apps.credits.models import DemandeCredit
    try:
        demande = DemandeCredit.objects.select_related('id_client__id_utilisateur').get(pk=demande_pk)
    except DemandeCredit.DoesNotExist:
        return Response({'success': False, 'error': {'message': 'Demande introuvable.'}}, status=404)

    decision = getattr(getattr(demande, 'decision', None), 'decision', 'en_analyse')
    score = float(getattr(getattr(demande, 'decision', None), 'score_global', 0))
    shap = getattr(getattr(demande, 'score_ia', None), 'shap_values', {})
    motif = getattr(getattr(demande, 'decision', None), 'motif', '')

    memo = RAGGenerator().generate_credit_memo(
        demande=demande,
        decision=decision,
        score_global=score,
        shap_values=shap,
        motif=motif,
    )
    return Response({'success': True, 'data': {'memo': memo}})


@extend_schema(tags=['RAG'])
@api_view(['GET'])
@permission_classes([IsAgent])
def rag_status_view(request):
    """Statut du pipeline RAG (provider LLM, embeddings, documents indexés)."""
    from django.conf import settings

    total_docs = VectorDocument.objects.filter(document_type='policy').count()
    embedded_docs = VectorDocument.objects.filter(document_type='policy').exclude(embedding__isnull=True).count()

    llm_provider = settings.LLM_PROVIDER
    emb_provider = settings.EMBEDDING_PROVIDER

    llm_ok = llm_is_available()
    return Response({
        'success': True,
        'data': {
            'status': 'ok' if llm_ok else 'degraded',
            'llm_provider': llm_provider,
            'llm_available': llm_ok,
            'llm_model': settings.GEMINI_MODEL if llm_provider == 'gemini' else settings.OPENAI_MODEL,
            'embedding_provider': emb_provider,
            'embedding_available': embedding_is_available(),
            'documents_policy': total_docs,
            'documents_embedded': embedded_docs,
            'retrieval_k': settings.RAG_RETRIEVAL_K,
        },
    })
