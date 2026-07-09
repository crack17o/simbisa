from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from drf_spectacular.utils import extend_schema

from apps.core.permissions import IsAgent, IsAgentOrManager, IsAnalysteRisque
from .models import VectorDocument
from .serializers import VectorDocumentSerializer
from .services.generator import RAGGenerator
from .services.llm.factory import llm_is_available
from .services.embeddings.factory import embedding_is_available


class VectorDocumentListView(generics.ListAPIView):
    serializer_class = VectorDocumentSerializer
    permission_classes = [IsAgent | IsAnalysteRisque]
    queryset = VectorDocument.objects.all().order_by('-created_at')

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return Response({'success': True, 'data': response.data})


def _extract_pdf_text(file_obj) -> str:
    """Extrait le texte d'un fichier PDF. Retourne '' si pypdf absent."""
    try:
        import pypdf
        reader = pypdf.PdfReader(file_obj)
        pages = [page.extract_text() or '' for page in reader.pages]
        return '\n\n'.join(p for p in pages if p.strip())
    except ImportError:
        pass
    try:
        import PyPDF2
        reader = PyPDF2.PdfReader(file_obj)
        pages = [reader.pages[i].extract_text() or '' for i in range(len(reader.pages))]
        return '\n\n'.join(p for p in pages if p.strip())
    except ImportError:
        pass
    return ''


@extend_schema(tags=['RAG'])
@api_view(['POST'])
@permission_classes([IsAnalysteRisque])
def upload_document_view(request):
    """
    Upload d'un document de politique (texte ou PDF).
    Champs : title (str), document_type (str, défaut 'policy'),
             source (str, optionnel), content (str) OU file (PDF).
    """
    title = request.data.get('title', '').strip()
    if not title:
        return Response({'success': False, 'error': {'message': 'Titre requis.'}},
                        status=status.HTTP_400_BAD_REQUEST)

    content = request.data.get('content', '').strip()
    uploaded_file = request.FILES.get('file')

    if uploaded_file:
        name_lower = uploaded_file.name.lower()
        if name_lower.endswith('.pdf'):
            content = _extract_pdf_text(uploaded_file)
            if not content:
                content = uploaded_file.read().decode('utf-8', errors='replace')
        else:
            content = uploaded_file.read().decode('utf-8', errors='replace')

    if not content:
        return Response({'success': False, 'error': {'message': 'Contenu vide. Fournissez du texte ou un fichier PDF valide.'}},
                        status=status.HTTP_400_BAD_REQUEST)

    doc = VectorDocument.objects.create(
        title=title,
        content=content,
        source=request.data.get('source', '').strip(),
        document_type=request.data.get('document_type', 'policy'),
    )

    # Embedding asynchrone — ne bloque pas la réponse
    try:
        from .services.embedder import DocumentEmbedder
        emb = DocumentEmbedder()
        if emb.is_available():
            emb.embed_document(doc, save=True)
    except Exception:
        pass

    return Response({
        'success': True,
        'message': 'Document indexé avec succès.',
        'data': VectorDocumentSerializer(doc).data,
    }, status=status.HTTP_201_CREATED)


@extend_schema(tags=['RAG'])
@api_view(['DELETE'])
@permission_classes([IsAnalysteRisque])
def delete_document_view(request, pk):
    try:
        doc = VectorDocument.objects.get(pk=pk)
    except VectorDocument.DoesNotExist:
        return Response({'success': False, 'error': {'message': 'Document introuvable.'}},
                        status=status.HTTP_404_NOT_FOUND)
    title = doc.title
    doc.delete()
    return Response({'success': True, 'message': f'Document « {title} » supprimé.'})


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
@permission_classes([IsAuthenticated])
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
