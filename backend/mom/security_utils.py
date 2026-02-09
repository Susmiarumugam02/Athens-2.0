"""
Security utilities for MOM module
Provides secure file handling and path validation
"""

import os
from django.conf import settings
from django.core.exceptions import SuspiciousOperation
from django.utils._os import safe_join
from pathlib import Path
import re


def validate_file_path(file_path: str, allowed_base_dirs: list = None) -> str:
    """
    Validates and sanitizes file paths to prevent path traversal attacks.
    
    Args:
        file_path: The file path to validate
        allowed_base_dirs: List of allowed base directories
        
    Returns:
        Sanitized file path
        
    Raises:
        SuspiciousOperation: If path traversal is detected
    """
    if not file_path:
        raise SuspiciousOperation("Empty file path provided")
    
    # Remove any null bytes
    file_path = file_path.replace('\x00', '')
    
    # Normalize the path
    normalized_path = os.path.normpath(file_path)
    
    # Check for path traversal attempts
    if '..' in normalized_path or normalized_path.startswith('/'):
        raise SuspiciousOperation("Path traversal attempt detected")
    
    # Default allowed directories
    if allowed_base_dirs is None:
        allowed_base_dirs = [
            settings.MEDIA_ROOT,
            os.path.join(settings.BASE_DIR, 'media'),
        ]
    
    # Validate against allowed base directories
    for base_dir in allowed_base_dirs:
        try:
            safe_path = safe_join(base_dir, normalized_path)
            # Ensure the path is within the allowed directory
            if os.path.commonpath([safe_path, base_dir]) == base_dir:
                return safe_path
        except ValueError:
            continue
    
    raise SuspiciousOperation("File path not in allowed directories")


def sanitize_filename(filename: str) -> str:
    """
    Sanitizes filename to prevent security issues.
    
    Args:
        filename: Original filename
        
    Returns:
        Sanitized filename
    """
    if not filename:
        return "unnamed_file"
    
    # Remove path separators and null bytes
    filename = filename.replace('/', '').replace('\\', '').replace('\x00', '')
    
    # Remove or replace dangerous characters
    filename = re.sub(r'[<>:"|?*]', '_', filename)
    
    # Limit length
    if len(filename) > 255:
        name, ext = os.path.splitext(filename)
        filename = name[:250] + ext
    
    # Ensure it's not empty after sanitization
    if not filename.strip():
        return "sanitized_file"
    
    return filename


def secure_file_upload_path(instance, filename: str, subfolder: str = '') -> str:
    """
    Generates a secure file upload path.
    
    Args:
        instance: Model instance
        filename: Original filename
        subfolder: Optional subfolder
        
    Returns:
        Secure file path
    """
    # Sanitize the filename
    safe_filename = sanitize_filename(filename)
    
    # Create a safe subfolder path
    if subfolder:
        subfolder = sanitize_filename(subfolder)
        return os.path.join('mom_files', subfolder, safe_filename)
    
    return os.path.join('mom_files', safe_filename)


def validate_file_type(filename: str, allowed_extensions: list = None) -> bool:
    """
    Validates file type based on extension.
    
    Args:
        filename: Filename to validate
        allowed_extensions: List of allowed extensions
        
    Returns:
        True if file type is allowed
    """
    if allowed_extensions is None:
        allowed_extensions = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png']
    
    file_ext = os.path.splitext(filename)[1].lower()
    return file_ext in allowed_extensions


def secure_delete_file(file_path: str) -> bool:
    """
    Securely deletes a file after validation.
    
    Args:
        file_path: Path to file to delete
        
    Returns:
        True if file was deleted successfully
    """
    try:
        # Validate the path first
        validated_path = validate_file_path(file_path)
        
        # Check if file exists and delete
        if os.path.exists(validated_path):
            os.remove(validated_path)
            return True
        return False
        
    except (SuspiciousOperation, OSError):
        return False