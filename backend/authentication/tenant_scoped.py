from django.core.exceptions import PermissionDenied
from rest_framework import viewsets

from control_plane.models import CollaborationMembership, CollaborationSharePolicy
from .project_isolation import apply_project_isolation, validate_project_access


class CollaborationAwareMixin:
    """Read-only federated collaboration support (writes are always denied)."""

    collaboration_param = 'collaboration_project_id'
    collaboration_enabled = False
    collaboration_domain = None

    def is_collaboration_request(self) -> bool:
        return bool(self.request.query_params.get(self.collaboration_param))

    def enforce_collaboration_read_only(self):
        if self.is_collaboration_request() and self.request.method not in {'GET', 'HEAD', 'OPTIONS'}:
            raise PermissionDenied('Cross-tenant writes are not allowed.')

    def enforce_collaboration_access(self):
        if not self.is_collaboration_request():
            return None

        if not self.collaboration_enabled:
            raise PermissionDenied('Collaboration access is not enabled for this endpoint.')

        if not self.collaboration_domain:
            raise PermissionDenied('Collaboration domain is not configured.')

        collaboration_project_id = self.request.query_params.get(self.collaboration_param)
        tenant_id = getattr(self.request, 'athens_tenant_id', None)
        if not tenant_id:
            raise PermissionDenied('Tenant context is required.')

        membership = CollaborationMembership.objects.filter(
            collaboration_project_id=collaboration_project_id,
            tenant_id=tenant_id,
            status=CollaborationMembership.Status.ACTIVE,
        ).exists()

        if not membership:
            raise PermissionDenied('Tenant is not a member of this collaboration project.')

        policy = CollaborationSharePolicy.objects.filter(
            collaboration_project_id=collaboration_project_id,
            domain=self.collaboration_domain,
        ).first()

        if not policy or 'READ' not in policy.allowed_actions:
            raise PermissionDenied('Collaboration policy does not allow READ for this domain.')

    def initial(self, request, *args, **kwargs):
        self.enforce_collaboration_read_only()
        self.enforce_collaboration_access()
        return super().initial(request, *args, **kwargs)


class TenantScopedViewSet(CollaborationAwareMixin, viewsets.ModelViewSet):
    """Base ViewSet enforcing tenant + project scoping from authenticated user."""

    project_required = True
    project_lookup = None

    def get_db_alias(self):
        return getattr(self.request, 'tenant_db', None)

    def get_user_project(self):
        return getattr(self.request.user, 'project', None)

    def _resolve_base_queryset(self):
        queryset = getattr(self, 'queryset', None)
        if queryset is not None:
            return queryset.all() if hasattr(queryset, 'all') else queryset

        model = getattr(self, 'model', None)
        if model is None:
            serializer_class = getattr(self, 'serializer_class', None)
            if serializer_class is None:
                try:
                    serializer_class = self.get_serializer_class()
                except Exception:
                    serializer_class = None
            model = getattr(getattr(serializer_class, 'Meta', None), 'model', None) if serializer_class else None

        if model is None:
            raise AssertionError(
                f"'{self.__class__.__name__}' should include a `queryset` attribute, "
                "a `model` attribute, or a serializer with Meta.model."
            )

        return model.objects.all()

    def get_queryset(self):
        queryset = self._resolve_base_queryset()
        db_alias = self.get_db_alias()
        if db_alias:
            queryset = queryset.using(db_alias)

        if not self.project_required:
            return queryset

        project = self.get_user_project()
        if not project:
            return queryset.none()

        if self.project_lookup:
            return queryset.filter(**{self.project_lookup: project})

        return apply_project_isolation(queryset, self.request.user)

    def _enforce_project_write(self, serializer):
        if not self.project_required:
            return None

        project = self.get_user_project()
        if not project:
            raise PermissionDenied('User must be assigned to a project.')

        if 'project' in serializer.validated_data and serializer.validated_data['project'] != project:
            raise PermissionDenied('Project mismatch for write.')

        if 'project_id' in serializer.validated_data and serializer.validated_data['project_id'] != project.id:
            raise PermissionDenied('Project mismatch for write.')

        if self.project_lookup and '__' in self.project_lookup:
            root_field = self.project_lookup.split('__', 1)[0]
            related_obj = serializer.validated_data.get(root_field)
            if related_obj:
                validate_project_access(self.request.user, related_obj)

        return project

    def perform_create(self, serializer):
        project = self._enforce_project_write(serializer)
        if project and hasattr(serializer.Meta.model, 'project'):
            serializer.save(project=project)
        else:
            serializer.save()

    def perform_update(self, serializer):
        self._enforce_project_write(serializer)
        serializer.save()


class TenantScopedReadOnlyViewSet(CollaborationAwareMixin, viewsets.ReadOnlyModelViewSet):
    project_required = True
    project_lookup = None

    def get_db_alias(self):
        return getattr(self.request, 'tenant_db', None)

    def get_user_project(self):
        return getattr(self.request.user, 'project', None)

    def _resolve_base_queryset(self):
        queryset = getattr(self, 'queryset', None)
        if queryset is not None:
            return queryset.all() if hasattr(queryset, 'all') else queryset

        model = getattr(self, 'model', None)
        if model is None:
            serializer_class = getattr(self, 'serializer_class', None)
            if serializer_class is None:
                try:
                    serializer_class = self.get_serializer_class()
                except Exception:
                    serializer_class = None
            model = getattr(getattr(serializer_class, 'Meta', None), 'model', None) if serializer_class else None

        if model is None:
            raise AssertionError(
                f"'{self.__class__.__name__}' should include a `queryset` attribute, "
                "a `model` attribute, or a serializer with Meta.model."
            )

        return model.objects.all()

    def get_queryset(self):
        queryset = self._resolve_base_queryset()
        db_alias = self.get_db_alias()
        if db_alias:
            queryset = queryset.using(db_alias)

        if not self.project_required:
            return queryset

        project = self.get_user_project()
        if not project:
            return queryset.none()

        if self.project_lookup:
            return queryset.filter(**{self.project_lookup: project})

        return apply_project_isolation(queryset, self.request.user)
