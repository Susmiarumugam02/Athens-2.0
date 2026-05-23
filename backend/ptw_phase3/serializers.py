from rest_framework import serializers
from .models import (
    SiteMap, SiteZone, PermitZoneAssignment,
    ConflictRule, PermitConflict,
    WeatherReading, WeatherAlert,
    AIApprovalRecommendation,
    BiometricVerification,
    IoTDevice, IoTReading,
    EmergencyPlan, EmergencyEvent,
    WorkflowDefinition,
    AILearningRecord,
    CommandCenterWidget,
    PPERequirement, PPEComplianceLog,
    SafetyAudit,
    ContractorSafetyScore,
    NotificationChannel, EnterpriseNotification,
    SearchIndex,
)


class SiteZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteZone
        fields = '__all__'


class SiteMapSerializer(serializers.ModelSerializer):
    zones = SiteZoneSerializer(many=True, read_only=True)

    class Meta:
        model = SiteMap
        fields = '__all__'


class PermitZoneAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PermitZoneAssignment
        fields = '__all__'


class ConflictRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConflictRule
        fields = '__all__'


class PermitConflictSerializer(serializers.ModelSerializer):
    class Meta:
        model = PermitConflict
        fields = '__all__'


class WeatherReadingSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeatherReading
        fields = '__all__'


class WeatherAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeatherAlert
        fields = '__all__'


class AIApprovalRecommendationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIApprovalRecommendation
        fields = '__all__'


class BiometricVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = BiometricVerification
        fields = '__all__'


class IoTDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = IoTDevice
        fields = '__all__'


class IoTReadingSerializer(serializers.ModelSerializer):
    class Meta:
        model = IoTReading
        fields = '__all__'


class EmergencyPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyPlan
        fields = '__all__'


class EmergencyEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyEvent
        fields = '__all__'


class WorkflowDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowDefinition
        fields = '__all__'


class AILearningRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = AILearningRecord
        fields = '__all__'


class CommandCenterWidgetSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommandCenterWidget
        fields = '__all__'


class PPERequirementSerializer(serializers.ModelSerializer):
    class Meta:
        model = PPERequirement
        fields = '__all__'


class PPEComplianceLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = PPEComplianceLog
        fields = '__all__'


class SafetyAuditSerializer(serializers.ModelSerializer):
    class Meta:
        model = SafetyAudit
        fields = '__all__'


class ContractorSafetyScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContractorSafetyScore
        fields = '__all__'


class NotificationChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationChannel
        fields = '__all__'


class EnterpriseNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnterpriseNotification
        fields = '__all__'


class SearchIndexSerializer(serializers.ModelSerializer):
    class Meta:
        model = SearchIndex
        fields = '__all__'
