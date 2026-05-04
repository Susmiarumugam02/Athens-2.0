from django.core.management.base import BaseCommand
from authentication.models import CustomUser
from ptw.models import Permit

class Command(BaseCommand):
    help = 'Debug workflow and notification issues'

    def handle(self, *args, **options):
        # Check EPC C grade users
        epc_c_users = CustomUser.objects.filter(
            admin_type='epcuser',
            grade='C',
            is_active=True
        )
        
        self.stdout.write(f"Found {epc_c_users.count()} EPC C grade users:")
        for user in epc_c_users:
            self.stdout.write(f"  - {user.username} ({user.name} {user.surname}) - Project: {user.project}")
        
        # Check recent permits
        recent_permits = Permit.objects.all().order_by('-created_at')[:5]
        self.stdout.write(f"\nRecent permits:")
        for permit in recent_permits:
            self.stdout.write(f"  - {permit.permit_number} - Status: {permit.status} - Created by: {permit.created_by}")
            
            # Check if permit has workflow
            if hasattr(permit, 'workflow'):
                workflow = permit.workflow
                self.stdout.write(f"    Workflow: {workflow.id} - Status: {workflow.status}")
                
                steps = workflow.steps.all()
                for step in steps:
                    self.stdout.write(f"      Step: {step.name} - Assignee: {step.assignee} - Status: {step.status}")
            else:
                self.stdout.write(f"    No workflow found")