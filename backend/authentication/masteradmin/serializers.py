from rest_framework import serializers
from authentication.models import Project, User
import random
import string


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = [
            'id', 'projectName', 'projectCategory', 'capacity', 'location',
            'latitude', 'longitude', 'nearestPoliceStation', 'nearestPoliceStationContact',
            'nearestHospital', 'nearestHospitalContact', 'commencementDate', 'deadlineDate',
            'athens_tenant_id', 'subscriber_role', 'client_company_id', 'epc_company_ids', 'contractor_company_ids'
        ]
        read_only_fields = ['id']


class ProjectCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = [
            'projectName', 'projectCategory', 'capacity', 'location',
            'latitude', 'longitude', 'nearestPoliceStation', 'nearestPoliceStationContact',
            'nearestHospital', 'nearestHospitalContact', 'commencementDate', 'deadlineDate',
            'subscriber_role', 'client_company_id', 'epc_company_ids', 'contractor_company_ids'
        ]

    def validate(self, data):
        if data.get('deadlineDate') and data.get('commencementDate'):
            if data['deadlineDate'] < data['commencementDate']:
                raise serializers.ValidationError(
                    {'deadlineDate': 'Deadline date must be after commencement date'}
                )
        
        # REQUIRED: subscriber_role must be set
        subscriber_role = data.get('subscriber_role')
        if not subscriber_role:
            raise serializers.ValidationError(
                {'subscriber_role': 'Subscriber role is required (client or epc)'}
            )
        
        # Business Rule: EPC subscriber can only have max 1 EPC
        epc_company_ids = data.get('epc_company_ids', [])
        if subscriber_role == 'epc' and len(epc_company_ids) > 1:
            raise serializers.ValidationError(
                {'epc_company_ids': 'EPC subscriber can only have ONE EPC (itself)'}
            )
        
        return data

    def create(self, validated_data):
        user = self.context['request'].user
        tenant = user.tenant
        if tenant:
            validated_data['athens_tenant_id'] = tenant.id
        return super().create(validated_data)


class ProjectUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = [
            'projectName', 'projectCategory', 'capacity', 'location',
            'latitude', 'longitude', 'nearestPoliceStation', 'nearestPoliceStationContact',
            'nearestHospital', 'nearestHospitalContact', 'commencementDate', 'deadlineDate',
            'subscriber_role', 'client_company_id', 'epc_company_ids', 'contractor_company_ids'
        ]


class DashboardStatsSerializer(serializers.Serializer):
    total_projects = serializers.IntegerField()
    active_projects = serializers.IntegerField()
    total_users = serializers.IntegerField()
    pending_approvals = serializers.IntegerField()


class AdminUserSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.projectName', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'name', 'email', 'admin_type', 'company_name', 
                  'registered_address', 'project', 'project_name', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at', 'project_name']


class ProjectAdminCreateSerializer(serializers.Serializer):
    """Serializer for creating project admins (Original Athens parity)"""
    project_id = serializers.IntegerField(required=True)
    admin_type = serializers.ChoiceField(
        choices=['client', 'epc', 'contractor'],
        required=True
    )
    username = serializers.CharField(required=True, max_length=150)
    company_name = serializers.CharField(required=True, max_length=255)
    registered_address = serializers.CharField(required=True)

    def validate(self, data):
        request = self.context.get('request')
        if not request:
            raise serializers.ValidationError('Request context required')
        
        user = request.user
        tenant = user.tenant
        
        if not tenant:
            raise serializers.ValidationError('User not associated with a tenant')
        
        tenant_id = tenant.id
        project_id = data.get('project_id')
        admin_type = data.get('admin_type')
        username = data.get('username')
        
        # Check username for spaces
        if ' ' in username:
            raise serializers.ValidationError({'username': 'Username cannot contain spaces'})
        
        # Check username uniqueness
        if User.objects.filter(username=username).exists():
            raise serializers.ValidationError({'username': 'Username already exists'})
        
        # Validate project exists
        try:
            project = Project.objects.get(id=project_id, athens_tenant_id=tenant_id)
        except Project.DoesNotExist:
            raise serializers.ValidationError({'project_id': 'Project not found or access denied'})
        
        # Business Rule 1: Only ONE client admin allowed per project
        if admin_type == 'client':
            existing_client = User.objects.filter(
                project=project,
                admin_type='client',
                user_type='companyuser'
            ).exists()
            if existing_client:
                raise serializers.ValidationError(
                    {'admin_type': 'Only ONE client admin allowed per project'}
                )
        
        # Business Rule 2: EPC admin limit based on subscriber_role
        if admin_type == 'epc':
            if project.subscriber_role == 'epc':
                # EPC subscriber: max 1 EPC admin
                existing_epc_count = User.objects.filter(
                    project=project,
                    admin_type='epc',
                    user_type='companyuser'
                ).count()
                if existing_epc_count >= 1:
                    raise serializers.ValidationError(
                        {'admin_type': 'EPC subscriber project can only have ONE EPC admin'}
                    )
            # Client subscriber: unlimited EPC admins (no validation)
        
        # Contractor: unlimited (no validation)
        
        return data

    def create(self, validated_data):
        request = self.context['request']
        user = request.user
        tenant = user.tenant
        
        if not tenant:
            raise serializers.ValidationError('User not associated with a tenant')
        
        tenant_id = tenant.id
        
        # Get project
        project = Project.objects.get(
            id=validated_data['project_id'],
            athens_tenant_id=tenant_id
        )
        
        # Generate 16-character secure password
        password = ''.join(random.choices(
            string.ascii_letters + string.digits + '!@#$%^&*',
            k=16
        ))
        
        # Use provided company_name or fallback to tenant name
        company_name = validated_data.get('company_name') or tenant.name
        
        # Create admin user
        admin_user = User.objects.create(
            username=validated_data['username'],
            email=f"{validated_data['username']}@temp.local",
            tenant=tenant,
            company_id=tenant.id,
            athens_tenant_id=tenant.id,
            project=project,
            admin_type=validated_data['admin_type'],
            company_name=company_name,
            registered_address=validated_data['registered_address'],
            user_type='companyuser',
            is_autogenerated_password=True,
            is_temporary_password=True,
            password_changed=False,
            must_change_password=True,
            is_password_reset_required=True,
            is_active=True
        )
        admin_user.set_password(password)
        admin_user.save()
        
        # Store password temporarily for response
        admin_user._generated_password = password
        return admin_user


class AdminUserCreateSerializer(serializers.Serializer):
    """Legacy serializer - kept for backward compatibility"""
    name = serializers.CharField(required=True, max_length=255)
    username = serializers.CharField(required=True, max_length=150)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Username already exists')
        return value

    def create(self, validated_data):
        user = self.context['request'].user
        tenant = user.tenant
        
        # Generate secure random password
        alphabet = string.ascii_letters + string.digits
        password = ''.join(random.choice(alphabet) for _ in range(14))
        
        # Create admin user
        admin_user = User.objects.create(
            username=validated_data['username'],
            name=validated_data['name'],
            email=f"{validated_data['username']}@temp.local",
            tenant=tenant,
            user_type='companyuser',
            is_autogenerated_password=True,
            is_temporary_password=True,
            password_changed=False,
            must_change_password=True,
            is_password_reset_required=True,
            is_active=True
        )
        admin_user.set_password(password)
        admin_user.save()
        
        # Store password temporarily for response
        admin_user._generated_password = password
        return admin_user
