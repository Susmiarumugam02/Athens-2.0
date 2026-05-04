from django.core.management.base import BaseCommand
from django.utils import timezone
from mom.models import Mom, ParticipantResponse


class Command(BaseCommand):
    help = 'Update participant responses to "noresponse" for meetings that have started'

    def add_arguments(self, parser):
        parser.add_argument(
            '--mom-id',
            type=int,
            help='Update specific meeting ID only',
        )

    def handle(self, *args, **options):
        mom_id = options.get('mom_id')
        
        if mom_id:
            # Update specific meeting
            try:
                mom = Mom.objects.get(id=mom_id)
                updated_count = self.update_meeting_responses(mom)
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Updated {updated_count} participant responses for meeting "{mom.title}"'
                    )
                )
            except Mom.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Meeting with ID {mom_id} not found')
                )
        else:
            # Update all live meetings
            live_meetings = Mom.objects.filter(status=Mom.MeetingStatus.LIVE)
            total_updated = 0
            
            for mom in live_meetings:
                updated_count = self.update_meeting_responses(mom)
                total_updated += updated_count
                self.stdout.write(
                    f'Updated {updated_count} responses for meeting "{mom.title}"'
                )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Total updated: {total_updated} participant responses across {live_meetings.count()} live meetings'
                )
            )

    def update_meeting_responses(self, mom):
        """Update pending responses to noresponse for a specific meeting"""
        # Get all participants who haven't responded
        pending_responses = ParticipantResponse.objects.filter(
            mom=mom,
            status='pending'
        )
        
        # Also create responses for participants who don't have any response record
        participants_with_responses = set(
            ParticipantResponse.objects.filter(mom=mom).values_list('user_id', flat=True)
        )
        all_participants = set(mom.participants.values_list('id', flat=True))
        participants_without_responses = all_participants - participants_with_responses
        
        # Create noresponse records for participants without any response
        for user_id in participants_without_responses:
            ParticipantResponse.objects.create(
                mom=mom,
                user_id=user_id,
                status='noresponse'
            )
        
        # Update pending responses to noresponse
        updated_count = pending_responses.update(status='noresponse')
        
        # Add count of newly created noresponse records
        total_updated = updated_count + len(participants_without_responses)
        
        return total_updated
