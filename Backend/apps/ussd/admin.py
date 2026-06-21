from django.contrib import admin
from .models import UssdProfile, UssdInteractionLog


@admin.register(UssdProfile)
class UssdProfileAdmin(admin.ModelAdmin):
    list_display = ('client', 'is_active', 'failed_pin_attempts', 'locked_until')
    search_fields = ('client__id_utilisateur__telephone',)


@admin.register(UssdInteractionLog)
class UssdInteractionLogAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'msisdn', 'user_input', 'response_type', 'channel')
    list_filter = ('response_type', 'channel')
    search_fields = ('msisdn', 'session_id')
    readonly_fields = ('created_at',)
