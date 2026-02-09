from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from .models import DigitalSignature, Permit
from authentication.signature_template_generator_new import SignatureTemplateGenerator
from authentication.models import UserDetail, AdminDetail
import base64
import logging

logger = logging.getLogger(__name__)

class UnifiedSignaturePipeline:
    """
    Unified signature pipeline - single source of truth for all signature operations
    
    Consolidates:
    - Signature validation
    - Signature generation
    - Authorization checks
    - Duplicate prevention
    """
    
    # Signature type to role mapping
    SIGNATURE_ROLES = {
        'requestor': ['contractoruser', 'epcuser', 'clientuser'],
        'verifier': ['epcuser', 'clientuser'],
        'approver': ['epcuser', 'clientuser'],
        'issuer': ['epcuser', 'clientuser'],
        'receiver': ['contractoruser', 'epcuser', 'clientuser'],
        'safety_officer': ['epcuser', 'clientuser'],
        'area_manager': ['epcuser', 'clientuser'],
        'witness': ['contractoruser', 'epcuser', 'clientuser']
    }
    
    # Required signatures by permit status
    REQUIRED_SIGNATURES = {
        'submitted': ['requestor'],
        'under_review': ['requestor', 'verifier'],
        'approved': ['requestor', 'verifier', 'approver'],
        'active': ['requestor', 'verifier', 'approver', 'issuer', 'receiver'],
        'completed': ['requestor', 'verifier', 'approver', 'issuer', 'receiver']
    }
    
    @classmethod
    @transaction.atomic
    def add_signature(cls, permit, signature_type, user, **kwargs):
        """
        Unified signature addition with full validation
        
        Args:
            permit: Permit object
            signature_type: Type of signature
            user: User adding signature
            **kwargs: Additional signature data
            
        Returns:
            DigitalSignature: Created signature object
        """
        try:
            # Validate signature type
            cls._validate_signature_type(signature_type)
            
            # Validate authorization
            cls._validate_authorization(permit, signature_type, user)
            
            # Check for duplicates
            existing = cls._check_duplicate(permit, signature_type, user)
            if existing:
                return existing
            
            # Generate signature data
            signature_data = cls._generate_signature_data(user)
            
            # Create signature
            signature = DigitalSignature.objects.create(
                permit=permit,
                signature_type=signature_type,
                signatory=user,
                signature_data=signature_data,
                ip_address=kwargs.get('ip_address'),
                device_info=kwargs.get('device_info', {})
            )
            
            logger.info(f"Signature added: {signature_type} by {user.username} for permit {permit.permit_number}")
            return signature
            
        except Exception as e:
            logger.error(f"Signature addition failed: {str(e)}")
            raise
    
    @classmethod
    def _validate_signature_type(cls, signature_type):
        """Validate signature type is allowed"""
        allowed_types = {choice[0] for choice in DigitalSignature.SIGNATURE_TYPE_CHOICES}
        if signature_type not in allowed_types:
            raise serializers.ValidationError(f'Invalid signature type: {signature_type}')
    
    @classmethod
    def _validate_authorization(cls, permit, signature_type, user):
        """Validate user is authorized for signature type"""
        allowed_roles = cls.SIGNATURE_ROLES.get(signature_type, [])
        if user.admin_type not in allowed_roles:
            raise serializers.ValidationError(
                f'User type {user.admin_type} not authorized for {signature_type} signature'
            )
        
        # Additional role-specific validations
        if signature_type == 'verifier' and user.grade not in ['B', 'C']:
            raise serializers.ValidationError('Only Grade B/C users can verify permits')
        
        if signature_type == 'approver' and user.grade not in ['A', 'B']:
            raise serializers.ValidationError('Only Grade A/B users can approve permits')
        
        # Status-based validations
        if signature_type == 'verifier' and permit.status not in ['submitted', 'under_review']:
            raise serializers.ValidationError('Permit must be submitted for verification')
        
        if signature_type == 'approver' and permit.status != 'under_review':
            raise serializers.ValidationError('Permit must be under review for approval')
    
    @classmethod
    def _check_duplicate(cls, permit, signature_type, user):
        """Check for existing signature"""
        return DigitalSignature.objects.filter(
            permit=permit,
            signature_type=signature_type,
            signatory=user
        ).first()
    
    @classmethod
    def _generate_signature_data(cls, user):
        """Generate signature data using template generator"""
        try:
            # Get user detail for signature generation
            user_detail = None
            if user.user_type == 'adminuser':
                user_detail, _ = UserDetail.objects.get_or_create(user=user)
            elif user.user_type in ['projectadmin', 'master']:
                user_detail, _ = AdminDetail.objects.get_or_create(user=user)
            
            if not user_detail:
                raise ValueError('User detail not found for signature generation')
            
            # Generate signed document signature with current timestamp
            generator = SignatureTemplateGenerator()
            signed_signature_file = generator.generate_signed_document_signature(
                user_detail, 
                timezone.now()
            )
            
            # Convert to base64 data URL
            signed_signature_file.seek(0)
            signature_data = base64.b64encode(signed_signature_file.read()).decode('utf-8')
            return f"data:image/png;base64,{signature_data}"
            
        except Exception as e:
            logger.error(f"Signature generation failed: {str(e)}")
            raise ValueError(f'Failed to generate signature: {str(e)}')
    
    @classmethod
    def get_permit_signatures(cls, permit):
        """Get all signatures for permit organized by type"""
        signatures = permit.signatures.all().select_related('signatory')
        
        signatures_by_type = {}
        for signature in signatures:
            signatures_by_type[signature.signature_type] = {
                'id': signature.id,
                'signatory': {
                    'id': signature.signatory.id,
                    'username': signature.signatory.username,
                    'full_name': signature.signatory.get_full_name(),
                    'admin_type': signature.signatory.admin_type,
                    'grade': signature.signatory.grade
                },
                'signed_at': signature.signed_at.isoformat(),
                'signature_data': signature.signature_data
            }
        
        return signatures_by_type
    
    @classmethod
    def get_missing_signatures(cls, permit):
        """Get list of missing required signatures for current permit status"""
        required = cls.REQUIRED_SIGNATURES.get(permit.status, [])
        existing = set(permit.signatures.values_list('signature_type', flat=True))
        
        return [sig_type for sig_type in required if sig_type not in existing]
    
    @classmethod
    def is_signature_complete(cls, permit):
        """Check if all required signatures are present"""
        return len(cls.get_missing_signatures(permit)) == 0
    
    @classmethod
    def get_next_required_signature(cls, permit):
        """Get next signature required for workflow progression"""
        missing = cls.get_missing_signatures(permit)
        
        # Return in workflow order
        workflow_order = ['requestor', 'verifier', 'approver', 'issuer', 'receiver']
        for sig_type in workflow_order:
            if sig_type in missing:
                return sig_type
        
        return None
    
    @classmethod
    def validate_signature_for_action(cls, permit, action, user):
        """Validate required signatures before allowing action"""
        if action == 'verify':
            if 'requestor' not in permit.signatures.values_list('signature_type', flat=True):
                raise serializers.ValidationError('Requestor signature required before verification')
        
        elif action == 'approve':
            required = ['requestor', 'verifier']
            existing = set(permit.signatures.values_list('signature_type', flat=True))
            missing = [sig for sig in required if sig not in existing]
            
            if missing:
                raise serializers.ValidationError(f'Missing signatures: {", ".join(missing)}')
        
        elif action == 'activate':
            required = ['requestor', 'verifier', 'approver', 'issuer']
            existing = set(permit.signatures.values_list('signature_type', flat=True))
            missing = [sig for sig in required if sig not in existing]
            
            if missing:
                raise serializers.ValidationError(f'Missing signatures: {", ".join(missing)}')

# Singleton instance
unified_signature_pipeline = UnifiedSignaturePipeline()