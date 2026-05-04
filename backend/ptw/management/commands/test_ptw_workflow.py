from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from ptw.models import Permit, PermitType
from ptw.workflow_manager import workflow_manager
from authentication.models_notification import Notification
from authentication.models import CustomUser

User = get_user_model()

class Command(BaseCommand):
    help = 'Test PTW workflow and notification system'

    def handle(self, *args, **options):
        self.stdout.write('🔍 Testing PTW Workflow and Notification System...')
        
        # Find contractor user
        contractor_user = CustomUser.objects.filter(
            admin_type='contractoruser'
        ).first()
        
        if not contractor_user:
            self.stdout.write(self.style.ERROR('❌ No contractor user found'))
            return
        
        self.stdout.write(f'✅ Found contractor user: {contractor_user.username} ({contractor_user.get_full_name()})')
        
        # Find EPC C grade users
        epc_c_users = CustomUser.objects.filter(
            admin_type='epcuser',
            grade='C',
            is_active=True
        )
        
        self.stdout.write(f'✅ Found {epc_c_users.count()} EPC C grade users:')
        for user in epc_c_users:
            self.stdout.write(f'   - {user.username} ({user.get_full_name()}) - Grade: {user.grade}')
        
        if not epc_c_users.exists():
            self.stdout.write(self.style.ERROR('❌ No EPC C grade users found'))
            return
        
        # Get or create permit type
        permit_type, created = PermitType.objects.get_or_create(
            name='Hot Work',
            defaults={
                'description': 'Hot work permit for testing',
                'category': 'hot_work',
                'risk_level': 'high'
            }
        )
        
        # Create test permit
        permit = Permit.objects.create(
            permit_number=f'TEST-{Permit.objects.count() + 1:04d}',
            title='Test Hot Work Permit',
            description='Testing PTW workflow notification system',
            location='Test Location',
            permit_type=permit_type,
            created_by=contractor_user,
            project=contractor_user.project,
            planned_start_time='2025-08-01 08:00:00',
            planned_end_time='2025-08-01 17:00:00',
            risk_level='high'
        )
        
        self.stdout.write(f'✅ Created test permit: {permit.permit_number}')
        
        # Test workflow initiation
        try:
            workflow = workflow_manager.initiate_workflow(permit, contractor_user)
            self.stdout.write(f'✅ Workflow initiated: {workflow.id}')
            
            # Check workflow steps
            steps = workflow.steps.all()
            self.stdout.write(f'✅ Created {steps.count()} workflow steps:')
            for step in steps:
                self.stdout.write(f'   - {step.name} -> {step.assignee.get_full_name() if step.assignee else "Unassigned"}')
            
            # Check notifications
            notifications = Notification.objects.filter(
                notification_type='ptw_verification',
                data__permit_id=permit.id
            )
            
            self.stdout.write(f'✅ Created {notifications.count()} notifications:')
            for notif in notifications:
                self.stdout.write(f'   - To: {notif.user.get_full_name()} ({notif.user.username})')
                self.stdout.write(f'     Title: {notif.title}')
                self.stdout.write(f'     Message: {notif.message}')
                self.stdout.write(f'     Link: {notif.link}')
                self.stdout.write(f'     Data: {notif.data}')
            
            if notifications.count() > 0:
                self.stdout.write(self.style.SUCCESS('🎉 PTW Workflow and Notification System is working correctly!'))
            else:
                self.stdout.write(self.style.ERROR('❌ No notifications were created'))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error testing workflow: {str(e)}'))
            import traceback
            self.stdout.write(traceback.format_exc())
        
        # Clean up test data
        self.stdout.write('🧹 Cleaning up test data...')
        permit.delete()
        self.stdout.write('✅ Test completed')