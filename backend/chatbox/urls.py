from django.urls import path
from .views import (
    UserListView,
    MessageListCreateView,
    ReadReceiptView,
    TypingIndicatorView,
    ChatNotificationSummaryView,
    FileDownloadView,
    FileViewView
)

urlpatterns = [
    path('users/', UserListView.as_view(), name='chatbox-user-list'),
    path('messages/', MessageListCreateView.as_view(), name='chatbox-message-list-create'),
    path('read-receipts/', ReadReceiptView.as_view(), name='chatbox-read-receipts'),
    path('typing-indicator/', TypingIndicatorView.as_view(), name='chatbox-typing-indicator'),
    path('notification-summary/', ChatNotificationSummaryView.as_view(), name='chatbox-notification-summary'),
    path('download/<int:message_id>/', FileDownloadView.as_view(), name='chatbox-file-download'),
    path('view/<int:message_id>/', FileViewView.as_view(), name='chatbox-file-view'),
]
