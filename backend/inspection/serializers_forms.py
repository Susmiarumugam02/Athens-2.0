from rest_framework import serializers
from .models_forms import ACCableInspectionForm, ACDBChecklistForm, HTCableChecklistForm, HTPreCommissionForm, HTPreCommissionTemplateForm, CivilWorkChecklistForm, CementRegisterForm, ConcretePourCardForm, PCCChecklistForm, BarBendingScheduleForm, BatteryChargerChecklistForm, BatteryUPSChecklistForm, BusDuctChecklistForm, ControlCableChecklistForm, ControlRoomAuditChecklistForm, EarthingChecklistForm

class ACCableInspectionFormSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by_user.username', read_only=True)
    
    class Meta:
        model = ACCableInspectionForm
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_user']

class ACDBChecklistFormSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by_user.username', read_only=True)
    
    class Meta:
        model = ACDBChecklistForm
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_user']
class HTCableChecklistFormSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by_user.username', read_only=True)
    
    class Meta:
        model = HTCableChecklistForm
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_user']
class HTPreCommissionFormSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by_user.username', read_only=True)
    
    class Meta:
        model = HTPreCommissionForm
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_user']
class HTPreCommissionTemplateFormSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by_user.username', read_only=True)
    
    class Meta:
        model = HTPreCommissionTemplateForm
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_user']
class CivilWorkChecklistFormSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by_user.username', read_only=True)
    
    class Meta:
        model = CivilWorkChecklistForm
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_user']

class CementRegisterFormSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by_user.username', read_only=True)
    
    class Meta:
        model = CementRegisterForm
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_user']

class ConcretePourCardFormSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by_user.username', read_only=True)
    
    class Meta:
        model = ConcretePourCardForm
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_user']

class PCCChecklistFormSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by_user.username', read_only=True)
    
    class Meta:
        model = PCCChecklistForm
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_user']

class BarBendingScheduleFormSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by_user.username', read_only=True)
    
    class Meta:
        model = BarBendingScheduleForm
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_user']

class BatteryChargerChecklistFormSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by_user.username', read_only=True)
    
    class Meta:
        model = BatteryChargerChecklistForm
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_user']

class BatteryUPSChecklistFormSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by_user.username', read_only=True)
    
    class Meta:
        model = BatteryUPSChecklistForm
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_user']

class BusDuctChecklistFormSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by_user.username', read_only=True)
    
    class Meta:
        model = BusDuctChecklistForm
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_user']

class ControlCableChecklistFormSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by_user.username', read_only=True)
    
    class Meta:
        model = ControlCableChecklistForm
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_user']

class ControlRoomAuditChecklistFormSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by_user.username', read_only=True)
    
    class Meta:
        model = ControlRoomAuditChecklistForm
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_user']

class EarthingChecklistFormSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by_user.username', read_only=True)
    
    class Meta:
        model = EarthingChecklistForm
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_user']