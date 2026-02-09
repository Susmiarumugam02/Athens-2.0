"""
Management command to check and escalate overdue PTW tasks
Can be run manually or via cron
"""
from django.core.management.base import BaseCommand
from ptw.tasks import check_overdue_workflow_tasks


class Command(BaseCommand):
    help = 'Check for overdue PTW workflow tasks and send escalation notifications'

    def handle(self, *args, **options):
        self.stdout.write('Checking for overdue PTW tasks...')
        
        try:
            check_overdue_workflow_tasks()
            self.stdout.write(self.style.SUCCESS('Successfully checked overdue tasks'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {str(e)}'))
