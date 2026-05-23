"""
Risk Assessment — model, serializer, viewset.
Kept in a single file to avoid circular imports with the main ptw app.
Register in urls.py: router.register(r'risk-assessments', RiskAssessmentViewSet)
"""
from django.db import models
from rest_framework import serializers, viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from authentication.tenant_scoped import TenantScopedViewSet


# ─────────────────────────────────────────────
# MODEL
# ─────────────────────────────────────────────

class RiskAssessment(models.Model):
    RISK_LEVEL_CHOICES = [
        ('low',     'Low'),
        ('medium',  'Medium'),
        ('high',    'High'),
        ('extreme', 'Extreme'),
    ]

    permit = models.OneToOneField(
        'ptw.Permit',
        on_delete=models.CASCADE,
        related_name='risk_assessment_detail',
    )

    # Core inputs
    probability = models.PositiveSmallIntegerField(default=1)   # 1–5
    severity    = models.PositiveSmallIntegerField(default=1)   # 1–5

    # Auto-calculated
    risk_score = models.PositiveSmallIntegerField(default=1)
    risk_level = models.CharField(max_length=10, choices=RISK_LEVEL_CHOICES, default='low')

    # Hazards
    hazards        = models.JSONField(default=list)   # list of hazard IDs / labels
    other_hazards  = models.TextField(blank=True)

    # Mitigation
    risk_factors          = models.JSONField(default=list)
    control_measures      = models.TextField(blank=True)
    emergency_procedures  = models.TextField(blank=True)

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    assessed_by = models.ForeignKey(
        'authentication.User',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='risk_assessments',
    )

    class Meta:
        db_table = 'ptw_risk_assessment'

    def _compute_level(self):
        if self.risk_score <= 4:
            return 'low'
        elif self.risk_score <= 9:
            return 'medium'
        elif self.risk_score <= 16:
            return 'high'
        return 'extreme'

    def save(self, *args, **kwargs):
        self.risk_score = self.probability * self.severity
        self.risk_level = self._compute_level()
        super().save(*args, **kwargs)
        # Keep parent Permit in sync
        from ptw.models import Permit
        Permit.objects.filter(pk=self.permit_id).update(
            probability=self.probability,
            severity=self.severity,
            risk_score=self.risk_score,
            risk_level=self.risk_level,
            control_measures=self.control_measures,
            other_hazards=self.other_hazards,
            risk_assessment_completed=True,
        )

    def __str__(self):
        return f"RiskAssessment for Permit {self.permit_id} — {self.risk_level.upper()}"


# ─────────────────────────────────────────────
# SERIALIZER
# ─────────────────────────────────────────────

class RiskAssessmentSerializer(serializers.ModelSerializer):
    risk_color = serializers.SerializerMethodField()
    risk_score_display = serializers.SerializerMethodField()

    class Meta:
        model = RiskAssessment
        fields = [
            'id', 'permit',
            'probability', 'severity', 'risk_score', 'risk_level',
            'hazards', 'other_hazards',
            'risk_factors', 'control_measures', 'emergency_procedures',
            'risk_color', 'risk_score_display',
            'assessed_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'risk_score', 'risk_level', 'created_at', 'updated_at', 'assessed_by']

    def get_risk_color(self, obj):
        return {
            'low':     '#52c41a',
            'medium':  '#faad14',
            'high':    '#fa8c16',
            'extreme': '#ff4d4f',
        }.get(obj.risk_level, '#d9d9d9')

    def get_risk_score_display(self, obj):
        return f"{obj.risk_score}/25"

    def validate_probability(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Probability must be between 1 and 5.")
        return value

    def validate_severity(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Severity must be between 1 and 5.")
        return value


# ─────────────────────────────────────────────
# VIEWSET
# ─────────────────────────────────────────────

class RiskAssessmentViewSet(TenantScopedViewSet):
    serializer_class = RiskAssessmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    project_required = False

    def get_queryset(self):
        return RiskAssessment.objects.select_related('permit', 'assessed_by').filter(
            permit__project=self._get_user_project()
        )

    def _get_user_project(self):
        return getattr(self.request.user, 'project', None)

    def perform_create(self, serializer):
        serializer.save(assessed_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(assessed_by=self.request.user)

    # GET /api/ptw/risk-assessments/by_permit/?permit_id=<id>
    @action(detail=False, methods=['get'], url_path='by_permit')
    def by_permit(self, request):
        permit_id = request.query_params.get('permit_id')
        if not permit_id:
            return Response({'error': 'permit_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            ra = RiskAssessment.objects.get(permit_id=permit_id)
            return Response(RiskAssessmentSerializer(ra).data)
        except RiskAssessment.DoesNotExist:
            return Response({}, status=status.HTTP_404_NOT_FOUND)

    # POST /api/ptw/risk-assessments/upsert/
    @action(detail=False, methods=['post'], url_path='upsert')
    def upsert(self, request):
        permit_id = request.data.get('permit')
        if not permit_id:
            return Response({'error': 'permit is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            instance = RiskAssessment.objects.get(permit_id=permit_id)
            serializer = self.get_serializer(instance, data=request.data, partial=True)
        except RiskAssessment.DoesNotExist:
            serializer = self.get_serializer(data=request.data)

        serializer.is_valid(raise_exception=True)
        serializer.save(assessed_by=request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
