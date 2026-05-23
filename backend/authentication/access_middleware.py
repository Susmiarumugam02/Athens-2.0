from django.http import JsonResponse
from rest_framework_simplejwt.authentication import JWTAuthentication


class OnboardingAccessMiddleware:
    """
    Server-side API gate for regular company users in onboarding.

    Admin users are not affected. Regular users can only call the APIs needed for
    their current workflow stage: profile completion before approval, status/logout
    while waiting, and induction training while in training_only access.
    """

    ALWAYS_ALLOWED_PREFIXES = (
        '/api/auth/login/',
        '/api/auth/token/refresh/',
        '/api/auth/logout/',
        '/api/user/profile/submit',
        '/api/auth/projectadmin/status/',
        '/api/auth/training/status/',
        '/api/auth/training/accessible-modules/',
        '/api/auth/training/change-password/',
    )
    PROFILE_ALLOWED_PREFIXES = (
        '/api/user/profile/submit',
        '/api/auth/projectadmin/profile/',
        '/api/auth/projectadmin/status/',
        '/api/auth/training/status/',
    )
    WAITING_ALLOWED_PREFIXES = (
        '/api/auth/projectadmin/status/',
        '/api/auth/training/status/',
        '/api/auth/training/accessible-modules/',
        '/api/auth/logout/',
    )
    TRAINING_ALLOWED_PREFIXES = (
        '/api/training/my-induction/',
        '/api/training/complete/',
        '/api/auth/training/',
        '/api/auth/projectadmin/status/',
        '/api/auth/logout/',
    )
    PASSWORD_CHANGE_ALLOWED_PREFIXES = (
        '/api/auth/training/change-password/',
        '/api/auth/training/status/',
        '/api/auth/logout/',
    )

    def __init__(self, get_response):
        self.get_response = get_response
        self.jwt_auth = JWTAuthentication()

    def __call__(self, request):
        block = self._blocked_response(request)
        if block is not None:
            return block
        return self.get_response(request)

    def _blocked_response(self, request):
        path = request.path
        if not path.startswith('/api/'):
            return None
        if path.startswith(self.ALWAYS_ALLOWED_PREFIXES):
            return None

        user = getattr(request, 'user', None)
        if not getattr(user, 'is_authenticated', False):
            auth_header = request.headers.get('Authorization')
            if auth_header:
                try:
                    authenticated = self.jwt_auth.authenticate(request)
                    if authenticated:
                        user, _ = authenticated
                except Exception:
                    return None

        if not getattr(user, 'is_authenticated', False):
            return None
        if getattr(user, 'user_type', None) != 'companyuser' or getattr(user, 'role_type', None) != 'user':
            return None

        status = getattr(user, 'status', 'active')
        access_level = getattr(user, 'access_level', '')

        if status == 'active' and (not access_level or access_level == 'full_access'):
            return None

        # Block all modules if password change is pending after induction
        must_change_password = getattr(user, 'must_change_password', False)
        if must_change_password or access_level == 'pending_password_change':
            if path.startswith(self.PASSWORD_CHANGE_ALLOWED_PREFIXES):
                return None
            return JsonResponse({
                'error': 'Password change required',
                'detail': 'You must change your temporary password before accessing any modules.',
                'must_change_password': True,
                'access_level': 'pending_password_change',
            }, status=403)

        if status == 'pending_profile' and path.startswith(self.PROFILE_ALLOWED_PREFIXES):
            return None
        if status == 'pending_approval' and path.startswith(self.WAITING_ALLOWED_PREFIXES):
            return None
        if (status == 'approved_pending_induction' or access_level == 'training_only') and path.startswith(self.TRAINING_ALLOWED_PREFIXES):
            return None

        return JsonResponse({
            'error': 'Onboarding access restriction',
            'detail': 'Complete the required onboarding and induction steps before accessing this API.',
            'status': status,
            'access_level': access_level or 'restricted',
        }, status=403)
