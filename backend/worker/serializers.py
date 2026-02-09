from rest_framework import serializers
from .models import Worker
import re

class WorkerDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for detailed worker information, used in the WorkerView component.
    Includes all fields needed for the detailed worker profile view.
    """
    class Meta:
        model = Worker
        fields = '__all__'
        read_only_fields = ['worker_id', 'created_at', 'updated_at', 'created_by', 'project']

class WorkerSerializer(serializers.ModelSerializer):
    """
    Serializer for worker creation and basic listing.
    Enhanced with identity document validation and uniqueness checks.
    """

    class Meta:
        model = Worker
        fields = '__all__'
        read_only_fields = ['worker_id', 'created_at', 'updated_at', 'created_by', 'project']

    def to_representation(self, instance):
        """
        Override to ensure photo URLs are always absolute
        """
        representation = super().to_representation(instance)


        # Handle photo field specifically
        if instance.photo:
            try:
                request = self.context.get('request')

                if request is not None:
                    # Use request to build absolute URI
                    photo_url = request.build_absolute_uri(instance.photo.url)
                    representation['photo'] = photo_url
                else:
                    # Fallback: manually construct absolute URL
                    from django.conf import settings
                    base_url = getattr(settings, 'BASE_URL', 'http://localhost:8000')
                    photo_url = f"{base_url}{instance.photo.url}"
                    representation['photo'] = photo_url
            except Exception as e:
                import traceback
                traceback.print_exc()
                representation['photo'] = None
        else:
            representation['photo'] = None

        return representation



    def validate_date_of_birth(self, value):
        """
        Check that the worker is at least 18 years old.
        """
        import datetime
        today = datetime.date.today()
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
        if age < 18:
            raise serializers.ValidationError("Worker must be at least 18 years old.")
        return value

    def validate_aadhaar(self, value):
        """
        Validate Aadhaar number format and uniqueness.
        """
        if not value:
            raise serializers.ValidationError("Aadhaar number is required.")

        # Check format (12 digits)
        if not re.match(r'^\d{12}$', value):
            raise serializers.ValidationError("Aadhaar number must be exactly 12 digits.")

        # Check uniqueness (exclude current instance if updating)
        existing_worker = Worker.objects.filter(aadhaar=value)
        if self.instance:
            existing_worker = existing_worker.exclude(id=self.instance.id)

        if existing_worker.exists():
            existing = existing_worker.first()
            raise serializers.ValidationError(
                f"This Aadhaar number is already registered with worker: {existing.name} {existing.surname} (ID: {existing.worker_id})"
            )

        return value

    def validate_pan(self, value):
        """
        Validate PAN number format and uniqueness (if provided).
        """
        if value:
            # Check PAN format: 5 letters, 4 digits, 1 letter
            if not re.match(r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$', value):
                raise serializers.ValidationError("Invalid PAN format. Expected format: ABCDE1234F")

            # Check uniqueness (exclude current instance if updating)
            existing_worker = Worker.objects.filter(pan=value)
            if self.instance:
                existing_worker = existing_worker.exclude(id=self.instance.id)

            if existing_worker.exists():
                existing = existing_worker.first()
                raise serializers.ValidationError(
                    f"This PAN number is already registered with worker: {existing.name} {existing.surname} (ID: {existing.worker_id})"
                )

        return value

    def validate_uan(self, value):
        """
        Validate UAN number format and uniqueness (if provided).
        """
        if value:
            # Check UAN format (12 digits)
            if not re.match(r'^\d{12}$', value):
                raise serializers.ValidationError("UAN number must be exactly 12 digits.")

            # Check uniqueness (exclude current instance if updating)
            existing_worker = Worker.objects.filter(uan=value)
            if self.instance:
                existing_worker = existing_worker.exclude(id=self.instance.id)

            if existing_worker.exists():
                existing = existing_worker.first()
                raise serializers.ValidationError(
                    f"This UAN number is already registered with worker: {existing.name} {existing.surname} (ID: {existing.worker_id})"
                )

        return value

    def validate_phone_number(self, value):
        """
        Validate phone number format and uniqueness.
        """
        if not value:
            raise serializers.ValidationError("Phone number is required.")

        # Remove any spaces, dashes, or plus signs for validation
        clean_number = re.sub(r'[^\d]', '', value)

        # Check if it's a valid 10-digit Indian mobile number
        if not re.match(r'^[6-9]\d{9}$', clean_number):
            raise serializers.ValidationError("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.")

        # Check uniqueness (exclude current instance if updating)
        existing_worker = Worker.objects.filter(phone_number=value)
        if self.instance:
            existing_worker = existing_worker.exclude(id=self.instance.id)

        if existing_worker.exists():
            existing = existing_worker.first()
            raise serializers.ValidationError(
                f"This phone number is already registered with worker: {existing.name} {existing.surname} (ID: {existing.worker_id})"
            )

        return value

    def validate_esic_ip(self, value):
        """
        Validate ESIC IP number uniqueness (if provided).
        """
        if value:
            # Check uniqueness (exclude current instance if updating)
            existing_worker = Worker.objects.filter(esic_ip=value)
            if self.instance:
                existing_worker = existing_worker.exclude(id=self.instance.id)

            if existing_worker.exists():
                existing = existing_worker.first()
                raise serializers.ValidationError(
                    f"This ESIC IP number is already registered with worker: {existing.name} {existing.surname} (ID: {existing.worker_id})"
                )

        return value
