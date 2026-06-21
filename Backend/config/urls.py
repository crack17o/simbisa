from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

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

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    try:
        import debug_toolbar
        urlpatterns = [path('__debug__/', include(debug_toolbar.urls))] + urlpatterns
    except ImportError:
        pass
