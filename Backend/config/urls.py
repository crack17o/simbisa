from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve as static_serve
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from apps.clients.views import serve_kyc_document

API_V1 = 'api/v1/'

urlpatterns = [
    path('admin/', admin.site.urls),
    path(f'{API_V1}auth/', include('apps.authentication.urls')),
    path(f'{API_V1}admin/', include('apps.authentication.admin_urls')),
    path(f'{API_V1}clients/', include('apps.clients.urls')),
    path(f'{API_V1}wallets/', include('apps.wallets.urls')),
    path(f'{API_V1}savings/', include('apps.savings.urls')),
    path(f'{API_V1}credits/', include('apps.credits.urls')),
    path(f'{API_V1}manager/', include('apps.credits.manager_urls')),
    path(f'{API_V1}scoring/', include('apps.scoring.urls')),
    path(f'{API_V1}risk/', include('apps.scoring.risk_urls')),
    path(f'{API_V1}rag/', include('apps.rag.urls')),
    path(f'{API_V1}audit/', include('apps.audit.urls')),
    path(f'{API_V1}settings/', include('apps.core.urls')),
    path(f'{API_V1}ussd/', include('apps.ussd.urls')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('health/', include('apps.core.health_urls')),
]

# Documents KYC : accès protégé par authentification JWT (toujours actif)
urlpatterns += [
    re_path(r'^media/kyc/(?P<path>.*)$', serve_kyc_document),
]

if settings.DEBUG:
    # Autres fichiers media (non-KYC) servis directement en dev
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    try:
        import debug_toolbar
        urlpatterns = [path('__debug__/', include(debug_toolbar.urls))] + urlpatterns
    except ImportError:
        pass
else:
    # En production avec Nginx : Nginx sert /media/ et proxie /media/kyc/ vers Django.
    # Sur VPS sans Nginx (ou dev VPS), mettre SERVE_MEDIA_DJANGO=true dans .env
    if settings.SERVE_MEDIA_DJANGO:
        urlpatterns += [re_path(r'^media/(?P<path>.*)$', static_serve, {'document_root': settings.MEDIA_ROOT})]
