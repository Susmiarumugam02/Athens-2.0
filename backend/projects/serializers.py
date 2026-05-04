from rest_framework import serializers
from .models import Project, ProjectMembership


class ProjectSerializer(serializers.ModelSerializer):
    members_count = serializers.SerializerMethodField()
    company_name = serializers.CharField(source="company.name", read_only=True)
    
    class Meta:
        model = Project
        fields = [
            "id", "company", "company_name", "name", "code", "status",
            "start_date", "end_date", "members_count",
            "created_by", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "company", "created_by", "created_at", "updated_at", "company_name"]
        extra_kwargs = {
            'code': {'required': False, 'allow_blank': True}
        }
    
    def get_members_count(self, obj):
        return obj.memberships.filter(is_active=True).count()


class ProjectMembershipSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True)
    user_type = serializers.CharField(source="user.user_type", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    
    class Meta:
        model = ProjectMembership
        fields = [
            "id", "project", "project_name", "user", "user_email", "user_type",
            "role", "is_active", "created_by", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "project", "created_by", "created_at", "updated_at"]


class AddMemberSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    role = serializers.ChoiceField(choices=["owner", "admin", "member", "viewer"])
