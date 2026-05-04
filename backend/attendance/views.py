from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.models import CustomUser
from authentication.usertype_utils import is_master_type

from .models import AttendanceEvent
from .serializers import AttendanceEventInputSerializer
from .services import create_attendance_event


class AttendanceEventBulkView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        payload = request.data
        events = payload.get("events") if isinstance(payload, dict) else payload

        if not isinstance(events, list):
            return Response({"error": "events must be a list"}, status=status.HTTP_400_BAD_REQUEST)

        created = []
        duplicates = []
        rejected = []

        tenant_id = getattr(request, "athens_tenant_id", None) or getattr(request.user, "athens_tenant_id", None)

        for raw_event in events:
            serializer = AttendanceEventInputSerializer(data=raw_event)
            if not serializer.is_valid():
                rejected.append({
                    "client_event_id": raw_event.get("client_event_id"),
                    "reason": "invalid_payload",
                    "detail": serializer.errors,
                })
                continue

            data = serializer.validated_data
            user_id = data.get("user_id")
            target_user = request.user

            if user_id and user_id != request.user.id:
                if is_master_type(request.user.user_type):
                    target_user = CustomUser.objects.filter(id=user_id).first()
                    if not target_user:
                        rejected.append({
                            "client_event_id": data.get("client_event_id"),
                            "reason": "user_not_found",
                        })
                        continue
                else:
                    rejected.append({
                        "client_event_id": data.get("client_event_id"),
                        "reason": "user_id_not_allowed",
                    })
                    continue

            status_label, _event, reason = create_attendance_event(tenant_id, target_user, data)

            if status_label == "created":
                created.append(data.get("client_event_id"))
            elif status_label == "duplicate":
                duplicates.append(data.get("client_event_id"))
            else:
                rejected.append({
                    "client_event_id": data.get("client_event_id"),
                    "reason": reason or "rejected",
                })

        return Response({
            "created": created,
            "duplicates": duplicates,
            "rejected": rejected,
        })


class AttendanceSyncStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant_id = getattr(request, "athens_tenant_id", None) or getattr(request.user, "athens_tenant_id", None)
        queryset = AttendanceEvent.objects.filter(athens_tenant_id=tenant_id)
        last_event = queryset.order_by("-received_at").first()

        return Response({
            "last_received_at": last_event.received_at if last_event else None,
            "total_events": queryset.count(),
        })
