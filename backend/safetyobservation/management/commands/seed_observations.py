from django.core.management.base import BaseCommand
from safetyobservation.models import SafetyObservation
from authentication.models import User
from datetime import date, time, timedelta

class Command(BaseCommand):
    help = 'Seed 10 dummy safety observations'

    def handle(self, *args, **options):
        from control_plane.models import Tenant
        
        tenant = Tenant.objects.first()
        if not tenant:
            self.stdout.write(self.style.ERROR('No tenant found'))
            return
            
        user = User.objects.filter(is_active=True).first()
        if not user:
            self.stdout.write(self.style.ERROR('No active user found'))
            return

        SafetyObservation.objects.all().delete()
        
        locations = ['Construction Site A', 'Warehouse B', 'Factory Floor C']
        today = date.today()
        username = user.username if user.username else (user.email if hasattr(user, 'email') else 'admin')

        for i in range(10):
            obs = SafetyObservation(
                observationID=f'SO-DEMO-{i+1:03d}',
                date=today-timedelta(days=i*2),
                time=time(9,30),
                reportedBy=f'Inspector {chr(65+i%5)}',
                department='Safety',
                workLocation=locations[i%3],
                activityPerforming=f'Activity {i+1}',
                typeOfObservation=['unsafe_act','unsafe_condition','near_miss','ppe_non_compliance'][i%4],
                classification=['ppe_compliance'],
                safetyObservationFound=f'Safety issue observed at location {i+1}',
                severity=[1,2,3,4,2,3,1,2,4,3][i],
                likelihood=2,
                correctivePreventiveAction=f'Corrective action plan {i+1}',
                correctiveActionAssignedTo=username,
                target_close_date=today+timedelta(days=[-5,-3,5,2,8,3,-2,6,10,4][i]),
                observationStatus=['submitted','submitted','closed','submitted','closed','submitted','draft','submitted','closed','submitted'][i],
                athens_tenant_id=tenant.id,
                created_by=user
            )
            obs.save()
            self.stdout.write(f'✓ {obs.observationID} - {obs.workLocation}')
        
        self.stdout.write(self.style.SUCCESS(f'\n✅ Created 10 observations for tenant {tenant.id}'))
