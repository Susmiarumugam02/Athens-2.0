"""
MasterAdmin Placeholder Module
This module provides placeholder endpoints while MasterAdmin is being rebuilt.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


@api_view(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def masteradmin_placeholder(request, *args, **kwargs):
    """Placeholder for all MasterAdmin endpoints during rebuild"""
    return Response(
        {
            "detail": "MasterAdmin module is being rebuilt.",
            "code": "MASTERADMIN_REBUILD"
        },
        status=status.HTTP_501_NOT_IMPLEMENTED
    )