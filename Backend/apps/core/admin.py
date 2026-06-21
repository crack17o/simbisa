from django.contrib import admin
from .models import PlatformConfig


@admin.register(PlatformConfig)
class PlatformConfigAdmin(admin.ModelAdmin):
    list_display = ('cdf_per_usd', 'updated_at', 'updated_by')
    readonly_fields = ('pk', 'updated_at')

    def has_add_permission(self, request):
        return not PlatformConfig.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
