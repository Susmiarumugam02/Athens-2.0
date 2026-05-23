"""
Athens AI — Real-time WebSocket consumer.
Streams AI events, agent actions, permit updates, and emergency alerts.
Tenant-isolated: each connection joins only its tenant group.
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger('athens.ai')


class AICommandCenterConsumer(AsyncWebsocketConsumer):
    """
    WebSocket endpoint: ws/ai/command-center/
    Broadcasts real-time AI events to all connected clients of the same tenant.
    """

    async def connect(self):
        user = self.scope.get('user')
        if not user or isinstance(user, AnonymousUser) or not user.is_authenticated:
            await self.close(code=4001)
            return

        self.user = user
        self.tenant_id = await self._get_tenant_id(user)
        self.group_name = f'ai_command_{self.tenant_id}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.info(f'[AIWs] User {user.id} connected to tenant {self.tenant_id} command center')

        # Send initial snapshot on connect
        snapshot = await self._get_snapshot()
        await self.send(text_data=json.dumps({
            'type': 'snapshot',
            'data': snapshot,
        }))

    async def disconnect(self, code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        """Handle client messages — e.g. subscribe to specific event types."""
        try:
            data = json.loads(text_data)
            msg_type = data.get('type', '')
            if msg_type == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
            elif msg_type == 'request_snapshot':
                snapshot = await self._get_snapshot()
                await self.send(text_data=json.dumps({'type': 'snapshot', 'data': snapshot}))
        except Exception:
            pass

    # ── Group message handlers ─────────────────────────────────────────────────

    async def ai_event(self, event):
        """Forward AI industrial event to WebSocket client."""
        await self.send(text_data=json.dumps({
            'type': 'ai_event',
            'data': event.get('data', {}),
        }))

    async def ai_alert(self, event):
        """Forward AI alert to WebSocket client."""
        await self.send(text_data=json.dumps({
            'type': 'ai_alert',
            'data': event.get('data', {}),
        }))

    async def ai_agent_action(self, event):
        """Forward agent action to WebSocket client."""
        await self.send(text_data=json.dumps({
            'type': 'agent_action',
            'data': event.get('data', {}),
        }))

    async def permit_update(self, event):
        """Forward permit status update."""
        await self.send(text_data=json.dumps({
            'type': 'permit_update',
            'data': event.get('data', {}),
        }))

    async def emergency_alert(self, event):
        """Forward emergency alert — highest priority."""
        await self.send(text_data=json.dumps({
            'type': 'emergency_alert',
            'data': event.get('data', {}),
        }))

    # ── DB helpers ─────────────────────────────────────────────────────────────

    @database_sync_to_async
    def _get_tenant_id(self, user) -> int:
        try:
            from authentication.tenant_utils import get_tenant_id_for_filtering
            return get_tenant_id_for_filtering(user) or 0
        except Exception:
            return getattr(user, 'company_id', 0) or 0

    @database_sync_to_async
    def _get_snapshot(self) -> dict:
        """Build initial dashboard snapshot for this tenant."""
        from django.utils import timezone
        now = timezone.now()
        snapshot = {
            'active_permits': 0,
            'open_incidents': 0,
            'pending_approvals': 0,
            'high_risk_permits': 0,
            'recent_events': [],
            'agent_actions': [],
            'emergency_events': [],
        }
        try:
            from ptw.models import Permit
            snapshot['active_permits'] = Permit.objects.filter(
                status__in=['active', 'approved']
            ).count()
            snapshot['pending_approvals'] = Permit.objects.filter(
                status__in=['submitted', 'under_review']
            ).count()
            snapshot['high_risk_permits'] = Permit.objects.filter(
                status__in=['active', 'approved'],
                risk_level__in=['high', 'extreme'],
            ).count()
        except Exception:
            pass

        try:
            from incidentmanagement.models import Incident
            snapshot['open_incidents'] = Incident.objects.filter(
                status__in=['open', 'under_investigation']
            ).count()
        except Exception:
            pass

        try:
            from .phase5_models import AIIndustrialEvent, AIAgentAction, AIEmergencyEvent
            snapshot['recent_events'] = list(
                AIIndustrialEvent.objects.filter(
                    tenant_id=self.tenant_id
                ).order_by('-created_at').values(
                    'id', 'event_type', 'severity', 'title', 'created_at'
                )[:10]
            )
            snapshot['agent_actions'] = list(
                AIAgentAction.objects.filter(
                    tenant_id=self.tenant_id, status='pending'
                ).order_by('-created_at').values(
                    'id', 'action_type', 'title', 'severity', 'created_at'
                )[:10]
            )
            snapshot['emergency_events'] = list(
                AIEmergencyEvent.objects.filter(
                    tenant_id=self.tenant_id, status='active'
                ).order_by('-triggered_at').values(
                    'id', 'title', 'severity', 'triggered_at'
                )[:5]
            )
        except Exception:
            pass

        # Serialize datetimes
        for key in ('recent_events', 'agent_actions', 'emergency_events'):
            for item in snapshot.get(key, []):
                for k, v in item.items():
                    if hasattr(v, 'isoformat'):
                        item[k] = v.isoformat()

        return snapshot


def broadcast_ai_event(tenant_id: int, event_type: str, data: dict) -> None:
    """
    Broadcast an AI event to all WebSocket clients of a tenant.
    Call this from views/signals after creating AIIndustrialEvent records.
    Uses async_to_sync for calling from synchronous Django views.
    """
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        channel_layer = get_channel_layer()
        if not channel_layer:
            return
        group_name = f'ai_command_{tenant_id}'
        async_to_sync(channel_layer.group_send)(
            group_name,
            {'type': event_type.replace('.', '_'), 'data': data},
        )
    except Exception as e:
        logger.debug(f'[AIWs] Broadcast failed (non-critical): {e}')
