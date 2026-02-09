"""
Management command to fix verifier and approver digital signatures
"""
from django.core.management.base import BaseCommand
from ptw.models import DigitalSignature
from ptw.signature_service import signature_service
import json
import base64

class Command(BaseCommand):
    help = 'Fix verifier and approver digital signatures to match requestor format'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be fixed without making changes',
        )
        parser.add_argument(
            '--signature-type',
            choices=['verifier', 'approver', 'all'],
            default='all',
            help='Which signature types to fix',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        signature_type = options['signature_type']
        
        self.stdout.write(f"{'DRY RUN: ' if dry_run else ''}Fixing digital signatures...")
        
        # Get signatures to fix
        if signature_type == 'all':
            signatures = DigitalSignature.objects.filter(
                signature_type__in=['verifier', 'approver']
            )
        else:
            signatures = DigitalSignature.objects.filter(
                signature_type=signature_type
            )
        
        fixed_count = 0
        error_count = 0
        
        for signature in signatures:
            try:
                # Check if signature needs fixing
                needs_fix = self.check_signature_format(signature)
                
                if needs_fix:
                    self.stdout.write(
                        f"{'Would fix' if dry_run else 'Fixing'} {signature.signature_type} "
                        f"signature for {signature.signatory.username} "
                        f"(permit {signature.permit.permit_number})"
                    )
                    
                    if not dry_run:
                        # Regenerate signature with original time
                        signature_service.regenerate_signature_with_original_time(signature)
                    
                    fixed_count += 1
                else:
                    self.stdout.write(
                        f"✓ {signature.signature_type} signature for "
                        f"{signature.signatory.username} is already correct"
                    )
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f"Error fixing {signature.signature_type} signature "
                        f"for {signature.signatory.username}: {str(e)}"
                    )
                )
                error_count += 1
        
        # Summary
        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f"DRY RUN: Would fix {fixed_count} signatures, "
                    f"{error_count} errors encountered"
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Fixed {fixed_count} signatures, "
                    f"{error_count} errors encountered"
                )
            )

    def check_signature_format(self, signature):
        """Check if signature needs fixing"""
        try:
            if not signature.signature_data:
                return True
                
            if not signature.signature_data.startswith('data:image/png;base64,'):
                return True
                
            # Try to decode and parse JSON
            b64_data = signature.signature_data.split(',')[1]
            decoded = base64.b64decode(b64_data).decode('utf-8')
            parsed = json.loads(decoded)
            
            # Check if it has the expected format
            if not isinstance(parsed, dict) or 'template_url' not in parsed:
                return True
                
            return False  # Format is correct
            
        except Exception:
            return True  # Needs fixing if we can't parse it