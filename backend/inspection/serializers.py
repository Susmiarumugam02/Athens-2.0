from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Inspection, InspectionItem, InspectionReport

class InspectionSerializer(serializers.ModelSerializer):
    inspector_name = serializers.CharField(source='inspector.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    
    class Meta:
        model = Inspection
        fields = [
            'id', 'project', 'inspection_type', 'title', 'description', 'location',
            'scheduled_date', 'actual_start_date', 'actual_end_date', 'status',
            'priority', 'inspector', 'inspector_name', 'created_by', 'created_by_name',
            'project_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

class InspectionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InspectionItem
        fields = [
            'id', 'inspection', 'item_number', 'description', 'requirement',
            'compliance_status', 'findings', 'recommendations', 'photo', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class InspectionReportSerializer(serializers.ModelSerializer):
    inspection_title = serializers.CharField(source='inspection.title', read_only=True)
    inspection_type = serializers.CharField(source='inspection.get_inspection_type_display', read_only=True)
    inspector_name = serializers.CharField(source='inspection.inspector.get_full_name', read_only=True)
    
    class Meta:
        model = InspectionReport
        fields = [
            'id', 'inspection', 'inspection_title', 'inspection_type', 'inspector_name',
            'summary', 'total_items', 'compliant_items', 'non_compliant_items',
            'observations', 'overall_score', 'recommendations', 'inspector_signature',
            'report_date'
        ]
        read_only_fields = ['id', 'report_date']