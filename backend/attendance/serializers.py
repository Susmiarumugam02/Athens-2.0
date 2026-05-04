from rest_framework import serializers

from .models import AttendanceEvent


class AttendanceEventInputSerializer(serializers.Serializer):
    client_event_id = serializers.CharField(max_length=100)
    user_id = serializers.IntegerField(required=False)
    module = serializers.ChoiceField(choices=AttendanceEvent.Module.choices)
    module_ref_id = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=64)
    event_type = serializers.ChoiceField(choices=AttendanceEvent.EventType.choices)
    occurred_at = serializers.DateTimeField()
    device_id = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=100)
    offline = serializers.BooleanField(default=False)
    method = serializers.ChoiceField(choices=AttendanceEvent.Method.choices)
    location = serializers.JSONField(required=False, allow_null=True)
    payload = serializers.JSONField(required=False, allow_null=True)


class AttendanceEventResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceEvent
        fields = [
            "id",
            "athens_tenant_id",
            "user",
            "module",
            "module_ref_id",
            "event_type",
            "occurred_at",
            "received_at",
            "client_event_id",
            "device_id",
            "offline",
            "location",
            "method",
            "payload",
        ]
