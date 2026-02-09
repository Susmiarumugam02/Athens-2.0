from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.http import FileResponse
from django.conf import settings
import os
import subprocess
from datetime import datetime

from superadmin.models import SystemSettings, DatabaseBackup
from superadmin.serializers import SystemSettingsSerializer, DatabaseBackupSerializer
from superadmin.permissions import IsSuperAdmin
from superadmin.services.audit import log_audit, get_client_ip, get_user_agent


class SystemSettingsView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def get(self, request):
        settings_obj = SystemSettings.get_settings()
        serializer = SystemSettingsSerializer(settings_obj)
        return Response(serializer.data)
    
    def put(self, request):
        settings_obj = SystemSettings.get_settings()
        serializer = SystemSettingsSerializer(settings_obj, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save(updated_by=request.user)
            
            log_audit(
                user=request.user,
                action='settings.update_system_settings',
                module='settings',
                ip_address=get_client_ip(request),
                user_agent=get_user_agent(request),
                request_data=request.data,
            )
            
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DatabaseBackupViewSet(viewsets.ModelViewSet):
    queryset = DatabaseBackup.objects.all()
    serializer_class = DatabaseBackupSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def get_queryset(self):
        return DatabaseBackup.objects.all().order_by('-created_at')
    
    @action(detail=False, methods=['post'])
    def create_backup(self, request):
        """Create a new database backup"""
        backup_dir = getattr(settings, 'BACKUP_DIR', '/var/backups/athens2')
        os.makedirs(backup_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'athens2_backup_{timestamp}.sql'
        filepath = os.path.join(backup_dir, filename)
        
        # Create backup record
        backup = DatabaseBackup.objects.create(
            filename=filename,
            file_path=filepath,
            backup_type='manual',
            status='in_progress',
            created_by=request.user
        )
        
        try:
            # Run pg_dump
            db_settings = settings.DATABASES['default']
            cmd = [
                'pg_dump',
                '-h', db_settings.get('HOST', 'localhost'),
                '-p', str(db_settings.get('PORT', 5432)),
                '-U', db_settings['USER'],
                '-d', db_settings['NAME'],
                '-f', filepath
            ]
            
            env = os.environ.copy()
            env['PGPASSWORD'] = db_settings['PASSWORD']
            
            result = subprocess.run(cmd, env=env, capture_output=True, text=True)
            
            if result.returncode == 0:
                # Get file size
                file_size = os.path.getsize(filepath)
                backup.file_size = file_size
                backup.status = 'completed'
                backup.completed_at = datetime.now()
            else:
                backup.status = 'failed'
                backup.error_message = result.stderr
            
            backup.save()
            
            log_audit(
                user=request.user,
                action='settings.create_backup',
                module='settings',
                resource_type='DatabaseBackup',
                resource_id=str(backup.id),
                ip_address=get_client_ip(request),
                user_agent=get_user_agent(request),
            )
            
            serializer = DatabaseBackupSerializer(backup)
            return Response(serializer.data)
            
        except Exception as e:
            backup.status = 'failed'
            backup.error_message = str(e)
            backup.save()
            
            return Response(
                {'error': f'Backup failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download a backup file"""
        backup = self.get_object()
        
        if not os.path.exists(backup.file_path):
            return Response(
                {'error': 'Backup file not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        log_audit(
            user=request.user,
            action='settings.download_backup',
            module='settings',
            resource_type='DatabaseBackup',
            resource_id=str(backup.id),
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
        )
        
        return FileResponse(
            open(backup.file_path, 'rb'),
            as_attachment=True,
            filename=backup.filename
        )
    
    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Restore database from backup"""
        backup = self.get_object()
        
        if not os.path.exists(backup.file_path):
            return Response(
                {'error': 'Backup file not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            db_settings = settings.DATABASES['default']
            cmd = [
                'psql',
                '-h', db_settings.get('HOST', 'localhost'),
                '-p', str(db_settings.get('PORT', 5432)),
                '-U', db_settings['USER'],
                '-d', db_settings['NAME'],
                '-f', backup.file_path
            ]
            
            env = os.environ.copy()
            env['PGPASSWORD'] = db_settings['PASSWORD']
            
            result = subprocess.run(cmd, env=env, capture_output=True, text=True)
            
            if result.returncode == 0:
                log_audit(
                    user=request.user,
                    action='settings.restore_backup',
                    module='settings',
                    resource_type='DatabaseBackup',
                    resource_id=str(backup.id),
                    ip_address=get_client_ip(request),
                    user_agent=get_user_agent(request),
                )
                
                return Response({'message': 'Database restored successfully'})
            else:
                return Response(
                    {'error': f'Restore failed: {result.stderr}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            return Response(
                {'error': f'Restore failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MaintenanceModeView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def post(self, request):
        """Toggle maintenance mode"""
        settings_obj = SystemSettings.get_settings()
        settings_obj.maintenance_mode = not settings_obj.maintenance_mode
        settings_obj.updated_by = request.user
        settings_obj.save()
        
        log_audit(
            user=request.user,
            action='settings.toggle_maintenance_mode',
            module='settings',
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            request_data={'maintenance_mode': settings_obj.maintenance_mode},
        )
        
        return Response({
            'message': f"Maintenance mode {'enabled' if settings_obj.maintenance_mode else 'disabled'}",
            'maintenance_mode': settings_obj.maintenance_mode
        })
