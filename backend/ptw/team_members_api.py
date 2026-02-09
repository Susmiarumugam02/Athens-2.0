from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from authentication.models import CustomUser
from authentication.tenant_scoped_utils import ensure_tenant_context, ensure_project
from django.db.models import Q

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_users_by_type_and_grade(request):
    """Get users filtered by type and grade for PTW workflow"""
    ensure_tenant_context(request)
    user_type = request.GET.get('user_type')
    grade = request.GET.get('grade')
    search = request.GET.get('q', '')
    
    user_project = ensure_project(request)
    
    # Base query: users in same project, active, not self
    users = CustomUser.objects.filter(
        project=user_project,
        is_active=True
    ).exclude(id=request.user.id)
    
    # Filter by user type if provided (can be comma-separated)
    if user_type:
        user_types = [ut.strip() for ut in user_type.split(',')]
        users = users.filter(admin_type__in=user_types)
    
    # Filter by grade if provided (can be comma-separated)
    if grade:
        grades = [g.strip() for g in grade.split(',')]
        users = users.filter(grade__in=grades)
    
    # Apply search filter
    if search:
        users = users.filter(
            Q(name__icontains=search) |
            Q(surname__icontains=search) |
            Q(username__icontains=search) |
            Q(email__icontains=search) |
            Q(designation__icontains=search) |
            Q(department__icontains=search) |
            Q(company_name__icontains=search)
        )
    
    # Order by name
    users = users.order_by('name', 'surname')
    
    user_data = []
    for user in users:
        user_data.append({
            'id': user.id,
            'username': user.username,
            'full_name': user.get_full_name(),
            'email': user.email,
            'admin_type': user.admin_type,
            'grade': user.grade,
            'name': user.name,
            'surname': user.surname,
            'designation': user.designation,
            'department': user.department,
            'company_name': user.company_name
        })
    
    return Response(user_data)
