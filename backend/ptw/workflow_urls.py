from django.urls import path
from . import workflow_views

urlpatterns = [
    # Workflow management
    path('permits/<int:permit_id>/workflow/initiate/', workflow_views.initiate_workflow, name='initiate_workflow'),
    path('permits/<int:permit_id>/workflow/assign-verifier/', workflow_views.assign_verifier, name='assign_verifier'),
    path('permits/<int:permit_id>/workflow/verify/', workflow_views.verify_permit, name='verify_permit'),
    path('permits/<int:permit_id>/workflow/assign-approver/', workflow_views.assign_approver, name='assign_approver'),
    path('permits/<int:permit_id>/workflow/approve/', workflow_views.approve_permit, name='approve_permit'),
    path('permits/<int:permit_id>/workflow/status/', workflow_views.get_workflow_status, name='get_workflow_status'),
    path('permits/<int:permit_id>/workflow/resubmit/', workflow_views.resubmit_permit, name='resubmit_permit'),
    
    # User management
    path('workflow/verifiers/', workflow_views.get_available_verifiers, name='get_available_verifiers'),
    path('workflow/approvers/', workflow_views.get_available_approvers, name='get_available_approvers'),
    path('workflow/my-tasks/', workflow_views.get_my_workflow_tasks, name='get_my_workflow_tasks'),
]