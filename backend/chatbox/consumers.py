import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser


def room_name(id_a: int, id_b: int) -> str:
    """Deterministic room: always smaller id first."""
    a, b = sorted([id_a, id_b])
    return f'chat_{a}_{b}'


class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        user = self.scope.get('user')
        if not user or isinstance(user, AnonymousUser) or not user.is_authenticated:
            await self.close(code=4001)
            return

        self.user = user
        # room_id comes from the URL: ws/chat/<other_user_id>/
        other_id = int(self.scope['url_route']['kwargs']['other_user_id'])
        self.room_group = room_name(user.id, other_id)

        await self.channel_layer.group_add(self.room_group, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, 'room_group'):
            await self.channel_layer.group_discard(self.room_group, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except (json.JSONDecodeError, TypeError):
            return

        content     = data.get('message', '').strip()
        receiver_id = data.get('receiver_id')

        if not content or not receiver_id:
            return

        # Persist to DB
        message = await self._save_message(self.user.id, receiver_id, content)
        if not message:
            return

        # Broadcast to both participants
        await self.channel_layer.group_send(
            self.room_group,
            {
                'type':        'chat_message',
                'id':          message['id'],
                'sender_id':   message['sender_id'],
                'receiver_id': message['receiver_id'],
                'content':     message['content'],
                'timestamp':   message['timestamp'],
                'status':      message['status'],
            }
        )

    async def chat_message(self, event):
        """Forward group message to this WebSocket client."""
        await self.send(text_data=json.dumps({
            'id':          event['id'],
            'sender':      event['sender_id'],
            'receiver':    event['receiver_id'],
            'content':     event['content'],
            'timestamp':   event['timestamp'],
            'status':      event['status'],
        }))

    # ── DB helpers ────────────────────────────────────────────────────────────

    @database_sync_to_async
    def _save_message(self, sender_id, receiver_id, content):
        from authentication.models import User
        from .models import Message
        try:
            sender   = User.objects.get(id=sender_id)
            receiver = User.objects.get(id=receiver_id)
            msg = Message.objects.create(
                sender=sender,
                receiver=receiver,
                content=content,
                status='sent',
            )
            return {
                'id':          msg.id,
                'sender_id':   msg.sender_id,
                'receiver_id': msg.receiver_id,
                'content':     msg.content,
                'timestamp':   msg.timestamp.isoformat(),
                'status':      msg.status,
            }
        except User.DoesNotExist:
            return None
