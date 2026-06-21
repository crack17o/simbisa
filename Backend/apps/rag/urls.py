from django.urls import path
from . import views

urlpatterns = [
    path('documents/', views.VectorDocumentListView.as_view(), name='rag-documents'),
    path('status/', views.rag_status_view, name='rag-status'),
    path('memo/<int:demande_pk>/', views.generate_memo_view, name='rag-memo'),
]
