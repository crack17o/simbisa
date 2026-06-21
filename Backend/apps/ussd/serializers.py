from rest_framework import serializers


class UssdCallbackSerializer(serializers.Serializer):
    session_id = serializers.CharField(required=False, allow_blank=True, max_length=64)
    msisdn = serializers.CharField(max_length=20)
    input = serializers.CharField(required=False, allow_blank=True, max_length=32)
    service_code = serializers.CharField(required=False, allow_blank=True, default='*123#')
    operator = serializers.CharField(required=False, allow_blank=True, default='simulated')
