"""
Consolidated Signature Service - Single source of truth for all signature operations
"""
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from .models import DigitalSignature, PermitAudit
from .unified_error_handling import PTWSignatureError, PTWPermissionError, PTWValidationError
from .ptw_permissions import ptw_permissions
import logging

logger = logging.getLogger(__name__)

class SignatureService:
    """
    Consolidated signature service - handles all signature operations
    """
    
    SIGNATURE_WORKFLOW_REQUIREMENTS = {
        'requestor': {'required_for': ['submit'], 'min_status': 'draft'},
        'verifier': {'required_for': ['verify'], 'min_status': 'submitted'},
        'approver': {'required_for': ['approve'], 'min_status': 'under_review'},
        'issuer': {'required_for': ['activate'], 'min_status': 'approved'},
        'receiver': {'required_for': ['activate'], 'min_status': 'approved'}
    }
    
    @transaction.atomic
    def add_signature(self, permit, signature_type, user, ip_address=None, device_info=None, sign_time=None):
        """
        Add signature with full validation and audit trail
        
        Args:
            permit: Permit instance
            signature_type: Type of signature
            user: User adding signature
            ip_address: Client IP address
            device_info: Device information dict
            sign_time: Specific signing time (defaults to now)
            
        Returns:
            DigitalSignature instance
            
        Raises:
            PTWSignatureError: Signature validation failed
            PTWPermissionError: User not authorized
        """
        # Validate signature type
        self._validate_signature_type(signature_type)
        
        # Validate authorization
        self._validate_signature_authorization(permit, signature_type, user)
        
        # Check for existing signature
        existing = self._get_existing_signature(permit, signature_type, user)
        if existing:
            logger.info(f"Signature already exists: {signature_type} by {user.username} for permit {permit.permit_number}")
            return existing
        
        # Use provided sign_time or current time
        actual_sign_time = sign_time or timezone.now()
        
        # Generate signature data with specific time
        signature_data = self._generate_signature_data(user, actual_sign_time)
        
        # Create signature
        signature = DigitalSignature.objects.create(
            permit=permit,
            signature_type=signature_type,
            signatory=user,
            signature_data=signature_data,
            signed_at=actual_sign_time,
            ip_address=ip_address,
            device_info=device_info or {}
        )
        
        # Create audit log
        PermitAudit.objects.create(
            permit=permit,
            action=f'signed_{signature_type}',
            user=user,
            comments=f'{signature_type.title()} signature added',
            new_values={'signature_type': signature_type},
            timestamp=actual_sign_time
        )
        
        logger.info(f"Signature added: {signature_type} by {user.username} for permit {permit.permit_number}")
        return signature
    
    def validate_signature_for_workflow(self, permit, action, user):
        """
        Validate required signatures are present for workflow action
        
        Args:
            permit: Permit instance
            action: Workflow action (submit, verify, approve, activate)
            user: User performing action
            
        Raises:
            PTWValidationError: Required signatures missing
        """
        required_signatures = self._get_required_signatures_for_action(action)
        missing_signatures = []
        
        for sig_type in required_signatures:
            if not self._has_signature(permit, sig_type):
                missing_signatures.append(sig_type)
        
        if missing_signatures:
            raise PTWValidationError(
                f"Missing required signatures for {action}: {', '.join(missing_signatures)}",
                field='signatures',
                details={'missing': missing_signatures, 'required': required_signatures}
            )
    
    def get_signature_status(self, permit):
        """
        Get comprehensive signature status for permit
        
        Returns:
            Dict with signature status information
        """
        signatures = permit.signatures.all().select_related('signatory')
        signature_map = {sig.signature_type: sig for sig in signatures}
        
        status = {}
        for sig_type in ['requestor', 'verifier', 'approver', 'issuer', 'receiver']:
            signature = signature_map.get(sig_type)
            required_user = self._get_required_user_for_signature(permit, sig_type)
            
            status[sig_type] = {
                'required': bool(required_user),
                'present': bool(signature and signature.signature_data),
                'signed_by': signature.signatory.get_full_name() if signature else None,
                'signed_at': signature.signed_at.isoformat() if signature else None,
                'required_user': required_user.get_full_name() if required_user else None
            }
        
        return status
    
    def _validate_signature_type(self, signature_type):
        """Validate signature type is allowed"""
        allowed_types = {choice[0] for choice in DigitalSignature.SIGNATURE_TYPE_CHOICES}
        if signature_type not in allowed_types:
            raise PTWSignatureError(f'Invalid signature type: {signature_type}', signature_type=signature_type)
    
    def _validate_signature_authorization(self, permit, signature_type, user):
        """Validate user is authorized for signature type"""
        # Check permission
        required_user = self._get_required_user_for_signature(permit, signature_type)
        if not required_user:
            raise PTWValidationError(
                f'No assigned {signature_type} for this permit',
                field='signature_type'
            )
        if not ptw_permissions.can_sign(user, permit, signature_type) or required_user.id != user.id:
            raise PTWPermissionError(
                f'Signature type {signature_type} must be signed by {required_user.get_full_name()}, not {user.get_full_name()}',
                action=f'sign_{signature_type}'
            )
    
    def _get_existing_signature(self, permit, signature_type, user):
        """Get existing signature if present"""
        return DigitalSignature.objects.filter(
            permit=permit,
            signature_type=signature_type,
            signatory=user
        ).first()
    
    def _generate_signature_data(self, user, sign_time=None):
        """Generate signature data with specific signing time"""
        try:
            from authentication.signature_template_generator_new import SignatureTemplateGenerator, create_signature_template
            from authentication.models import UserDetail, AdminDetail
            import base64
            import json
            
            # Use provided sign_time or current time
            actual_sign_time = sign_time or timezone.now()
            
            # Get user detail for signature generation - prioritize existing records
            user_detail = None
            
            # Try to get existing UserDetail first (for adminuser type)
            if user.user_type == 'adminuser':
                try:
                    user_detail = UserDetail.objects.get(user=user)
                except UserDetail.DoesNotExist:
                    user_detail = UserDetail.objects.create(user=user)
            
            # Try to get existing AdminDetail (for projectadmin/master types)
            elif user.user_type in ['projectadmin', 'master']:
                try:
                    user_detail = AdminDetail.objects.get(user=user)
                except AdminDetail.DoesNotExist:
                    user_detail = AdminDetail.objects.create(user=user)
            
            # Fallback: try AdminDetail for any user type if UserDetail doesn't exist
            if not user_detail:
                try:
                    user_detail = AdminDetail.objects.get(user=user)
                except AdminDetail.DoesNotExist:
                    user_detail = AdminDetail.objects.create(user=user)
            
            if not user_detail:
                raise ValueError(f'Could not create user detail for {user.username} (type: {user.user_type})')
            
            # Ensure signature template exists
            if not user_detail.signature_template:
                logger.info(f"Creating signature template for {user.username}")
                create_signature_template(user_detail)
            
            # Generate signed document signature with specific time
            generator = SignatureTemplateGenerator()
            signed_signature_file = generator.generate_signed_document_signature(
                user_detail, 
                actual_sign_time
            )
            
            # Save the signature file and return template URL
            from django.core.files.storage import default_storage
            from django.conf import settings
            import os
            
            # Save signature file with timestamp from actual sign time
            filename = f"signature_templates/signature_template_v4_{user.id}_{actual_sign_time.strftime('%Y%m%d_%H%M%S')}.png"
            saved_path = default_storage.save(filename, signed_signature_file)
            
            # Build absolute URL
            if hasattr(settings, 'MEDIA_URL') and settings.MEDIA_URL:
                template_url = f"{settings.MEDIA_URL}{saved_path}"
                # Convert to absolute URL
                base_url = os.getenv('SITE_URL', 'https://prozeal.athenas.co.in')
                template_url = f"{base_url.rstrip('/')}{template_url}"
            else:
                template_url = saved_path
            
            # Return JSON with template_url (consistent format)
            response_data = {
                'success': True,
                'template_url': template_url
            }
            
            # Encode as base64 JSON (same format as requestor)
            json_str = json.dumps(response_data)
            signature_data = base64.b64encode(json_str.encode('utf-8')).decode('utf-8')
            return f"data:image/png;base64,{signature_data}"
            
        except Exception as e:
            logger.error(f"Signature generation failed for {user.username}: {str(e)}")
            raise PTWSignatureError(f'Failed to generate signature: {str(e)}')
    
    def _get_required_signatures_for_action(self, action):
        """Get required signatures for workflow action"""
        action_requirements = {
            'submit': ['requestor'],
            'verify': ['requestor', 'verifier'],
            'approve': ['requestor', 'verifier', 'approver'],
            'activate': ['requestor', 'verifier', 'approver', 'issuer']
        }
        return action_requirements.get(action, [])
    
    def _has_signature(self, permit, signature_type):
        """Check if permit has signature of given type"""
        return permit.signatures.filter(
            signature_type=signature_type,
            signature_data__isnull=False
        ).exclude(signature_data='').exists()
    
    def _get_required_user_for_signature(self, permit, signature_type):
        """Get user required for signature type"""
        user_map = {
            'requestor': permit.created_by,
            'verifier': permit.verifier,
            'approver': permit.approver or permit.approved_by,
            'issuer': permit.issuer,
            'receiver': permit.receiver
        }
        return user_map.get(signature_type)

    def regenerate_signature_with_original_time(self, signature):
        """Regenerate signature using its original signed_at time"""
        try:
            # Generate new signature data with original time
            new_signature_data = self._generate_signature_data(signature.signatory, signature.signed_at)
            
            # Update signature
            signature.signature_data = new_signature_data
            signature.save()
            
            logger.info(f"Regenerated signature for {signature.signatory.username} with original time {signature.signed_at}")
            return signature
            
        except Exception as e:
            logger.error(f"Failed to regenerate signature: {str(e)}")
            raise PTWSignatureError(f'Failed to regenerate signature: {str(e)}')

    def regenerate_all_signatures_for_permit(self, permit):
        """Regenerate all signatures for a permit using their original times"""
        try:
            signatures = permit.signatures.all()
            for signature in signatures:
                self.regenerate_signature_with_original_time(signature)
            
            logger.info(f"Regenerated {signatures.count()} signatures for permit {permit.permit_number}")
            return signatures.count()
            
        except Exception as e:
            logger.error(f"Failed to regenerate signatures for permit {permit.permit_number}: {str(e)}")
            raise PTWSignatureError(f'Failed to regenerate signatures: {str(e)}')

    def set_request_context(self, request):
        """Set request context for URL building"""
        self._request_context = request

# Service instance
signature_service = SignatureService()