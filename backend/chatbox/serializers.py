from rest_framework import serializers
from django.conf import settings
from authentication.serializers import CustomUserSerializer
from .models import Message
from authentication.models import CustomUser

class MessageSerializer(serializers.ModelSerializer):
    sender = CustomUserSerializer(read_only=True)
    receiver = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all())
    sender_id = serializers.IntegerField(source='sender.id', read_only=True)
    receiver_id = serializers.IntegerField(source='receiver.id', read_only=True)
    file_url = serializers.SerializerMethodField()
    file_view_url = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'sender', 'receiver', 'sender_id', 'receiver_id', 'content', 'timestamp', 'file', 'file_url', 'file_view_url', 'file_name', 'file_size']

    def get_file_url(self, obj):
        """
        Return secure download URL for file attachments with proper MIME types
        """
        if obj.file:
            request = self.context.get('request')
            if request:
                # Use the secure download endpoint that handles MIME types properly
                return request.build_absolute_uri(f'/chatbox/download/{obj.id}/')
            else:
                # Fallback URL
                return f'/chatbox/download/{obj.id}/'
        return None

    def get_file_view_url(self, obj):
        """
        Return secure view URL for file attachments (for inline viewing)
        """
        if obj.file:
            request = self.context.get('request')
            if request:
                # Return the secure view URL
                return request.build_absolute_uri(f'/chatbox/view/{obj.id}/')
            else:
                # Fallback URL
                return f'/chatbox/view/{obj.id}/'
        return None

    def get_file_name(self, obj):
        """
        Return the original filename
        """
        if obj.file:
            import os
            return os.path.basename(obj.file.name)
        return None

    def get_file_size(self, obj):
        """
        Return file size in bytes
        """
        if obj.file:
            try:
                return obj.file.size
            except:
                return None
        return None
