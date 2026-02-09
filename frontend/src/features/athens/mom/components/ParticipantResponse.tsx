import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Typography, Button, Spin, Avatar, Row, Col, App } from 'antd';
import api from '../../../common/utils/axiosetup';
import useAuthStore from '../../../common/store/authStore';

const { Title, Paragraph } = Typography;

interface ParticipantResponse {
  status?: 'accepted' | 'rejected' | 'pending';
  company_name?: string;
  designation?: string;
  signature?: string;
  name?: string;
  email?: string;
  error?: boolean;
  errorType?: string;
  errorMessage?: string;
  meetingTitle?: string;
  meetingDateTime?: string;
}

const ParticipantResponse: React.FC = () => {
  const { momId } = useParams<{ momId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [responseStatus, setResponseStatus] = useState<ParticipantResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { message } = App.useApp();
  const { username, usertype, userId: currentUserId } = useAuthStore();

  // Create user object for compatibility
  const user = username ? {
    id: currentUserId,
    username,
    usertype,
    email: username // Assuming username is email
  } : null;

  // Get userId from URL parameters first, fallback to current logged-in user
  const userIdFromUrl = searchParams.get('userId');
  const userId = userIdFromUrl ? parseInt(userIdFromUrl, 10) : currentUserId;

  // Get action from URL parameters (accept/reject)
  const action = searchParams.get('action');

  console.log('ParticipantResponse Debug:', {
    userIdFromUrl,
    currentUserId: user?.id,
    resolvedUserId: userId,
    userMatch: userId === user?.id
  });

  const handleResponse = async (status: 'accepted' | 'rejected') => {
    if (!momId || !userId) {
      message.error('Invalid meeting or user ID.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post(`/api/v1/mom/${momId}/participants/${userId}/response/`, { status });
      if (res.status === 200) {
        setResponseStatus({ ...responseStatus, status });
        message.success(res.data.message || `You have ${status} the meeting invitation.`);

        // Navigate to MOM list after successful response
        setTimeout(() => {
          navigate('/mom');
        }, 2000); // Wait 2 seconds to show the success message
      } else {
        message.error('Failed to send your response.');
      }
    } catch (error: any) {
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.meeting_status === 'live') {
          message.warning('This meeting is currently in progress. You cannot respond to the invitation at this time.');
        } else if (errorData.meeting_status === 'completed') {
          message.info('This meeting has already been completed.');
        } else if (errorData.meeting_status === 'cancelled') {
          message.info('This meeting has been cancelled.');
        } else {
          message.error(errorData.message || 'Failed to send your response.');
        }
      } else if (error.response?.status === 403) {
        message.error('You are not invited to this meeting.');
      } else {
        message.error('Failed to send your response.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    console.log('ParticipantResponse useEffect Debug:', {
      momId,
      userId,
      user: user ? { id: user.id, usertype: user.usertype, email: user.email } : null,
      action,
      authState: {
        token: !!useAuthStore.getState().token,
        isAuthenticated: useAuthStore.getState().isAuthenticated(),
        usertype: useAuthStore.getState().usertype
      }
    });

    const fetchResponseStatus = async () => {
      if (!momId || !userId) {
        if (!user) {
          message.error('Please log in to respond to the meeting invitation.');
          navigate('/login');
        } else {
          message.error('Invalid meeting ID.');
        }
        setLoading(false);
        return;
      }

      // Security check: User can only respond for themselves
      if (userId !== user?.id) {
        console.log('User ID mismatch:', {
          urlUserId: userId,
          currentUserId: user?.id
        });
        message.error('You can only respond to your own meeting invitations.');
        navigate('/dashboard');
        setLoading(false);
        return;
      }
      setLoading(true);
      try {

        // Add a small delay to ensure auth state is stable
        await new Promise(resolve => setTimeout(resolve, 100));

        // First, check if user is a participant using the new endpoint
        const meetingInfoRes = await api.get(`/api/v1/mom/${momId}/info/`);

        if (!meetingInfoRes.data.is_participant) {
          // User is not a participant, show error state
          setResponseStatus({
            error: true,
            errorType: 'NOT_A_PARTICIPANT',
            errorMessage: `You are not invited to the meeting "${meetingInfoRes.data.title}". Please contact the meeting organizer if you believe this is an error.`,
            meetingTitle: meetingInfoRes.data.title,
            meetingDateTime: meetingInfoRes.data.meeting_datetime
          });
          setLoading(false);
          return;
        }

        // User is a participant, now fetch their response status
        const res = await api.get(`/api/v1/mom/${momId}/participants/${userId}/response/`);
        setResponseStatus(res.data);
      } catch (error: any) {
        console.log('Error fetching response status:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });

        // Check if this is a session expiry issue
        if (error.message === 'Session expired') {
          return; // Let the axios interceptor handle this
        }

        // Handle specific error cases gracefully
        const errorData = error.response?.data;
        const errorCode = errorData?.code;

        if (error.response?.status === 401) {
          message.error('Your session has expired. Please log in again.');
          navigate('/login');
        } else if (error.response?.status === 403) {

          if (errorCode === 'NOT_A_PARTICIPANT') {
            // User is not a participant in this meeting
            message.error(errorData.message || 'You are not invited to this meeting.');
            // Show a more informative error page instead of just redirecting
            setResponseStatus({
              error: true,
              errorType: 'NOT_A_PARTICIPANT',
              errorMessage: errorData.message,
              meetingTitle: errorData.meeting_title,
              meetingDateTime: errorData.meeting_datetime
            });
          } else {
            message.error('You are not authorized to view this meeting response.');
            navigate('/dashboard');
          }
        } else if (error.response?.status === 404) {
          message.error('Meeting not found.');
          setResponseStatus({
            error: true,
            errorType: 'MEETING_NOT_FOUND',
            errorMessage: 'The meeting you are looking for does not exist.'
          });
        } else {
          // For other errors, show error but don't navigate away
          message.error('Failed to load meeting details. Please try again.');
          setResponseStatus({
            error: true,
            errorType: 'NETWORK_ERROR',
            errorMessage: 'Failed to load meeting details. Please check your connection and try again.'
          });
        }
      } finally {
        setLoading(false);
      }
    };

    const handleAutoAction = async () => {
      if (action && (action === 'accept' || action === 'reject')) {
        const status = action === 'accept' ? 'accepted' : 'rejected';
        await handleResponse(status);
      }
    };

    fetchResponseStatus().then(() => {
      // Only auto-handle action after we've loaded the current status
      if (action && !responseStatus?.status) {
        handleAutoAction();
      }
    });
  }, [momId, userId, navigate, message, user, action]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: 50 }}>
        <Spin size="large" />
        <div style={{ marginTop: 20, fontSize: '12px', color: '#666' }}>
          <p>Loading meeting details...</p>
          <p>Target User ID: {userId}</p>
          <p>Current User ID: {user?.id}</p>
          <p>Meeting ID: {momId}</p>
          <p>User Type: {user?.usertype}</p>
          <p>Auth Status: {user ? 'Authenticated' : 'Not Authenticated'}</p>
          <p>User Match: {userId === user?.id ? 'Yes' : 'No'}</p>
        </div>
      </div>
    );
  }

  // Handle error states
  if (responseStatus?.error) {
    return (
      <div style={{ textAlign: 'center', marginTop: 50, padding: '20px' }}>
        <Card style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ textAlign: 'center' }}>
            {responseStatus.errorType === 'NOT_A_PARTICIPANT' ? (
              <>
                <h2>🚫 Not Invited</h2>
                <p style={{ fontSize: '16px', marginBottom: '20px' }}>
                  {responseStatus.errorMessage}
                </p>
                {responseStatus.meetingTitle && (
                  <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                    <h3>Meeting Details:</h3>
                    <p><strong>Title:</strong> {responseStatus.meetingTitle}</p>
                    {responseStatus.meetingDateTime && (
                      <p><strong>Date:</strong> {new Date(responseStatus.meetingDateTime).toLocaleString()}</p>
                    )}
                  </div>
                )}
                <p style={{ color: '#666', fontSize: '14px' }}>
                  If you believe you should be invited to this meeting, please contact the meeting organizer.
                </p>
              </>
            ) : responseStatus.errorType === 'MEETING_NOT_FOUND' ? (
              <>
                <h2>❌ Meeting Not Found</h2>
                <p style={{ fontSize: '16px', marginBottom: '20px' }}>
                  {responseStatus.errorMessage}
                </p>
              </>
            ) : (
              <>
                <h2>⚠️ Error Loading Meeting</h2>
                <p style={{ fontSize: '16px', marginBottom: '20px' }}>
                  {responseStatus.errorMessage}
                </p>
              </>
            )}
            <Button type="primary" onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <Card style={{ maxWidth: 600, margin: '50px auto', textAlign: 'center' }}>
      <Title level={3}>Meeting Invitation Response</Title>
      {responseStatus ? (
        <>
          <Row justify="center" align="middle" gutter={[16, 16]} style={{ marginBottom: 16 }}>
            {responseStatus.signature && (
              <Col>
                <Avatar src={responseStatus.signature} size={64} alt="Signature" />
              </Col>
            )}
            <Col>
              <Title level={4}>{responseStatus.name || 'Participant'}</Title>
              <Paragraph>{responseStatus.email}</Paragraph>
              <Paragraph>{responseStatus.company_name}</Paragraph>
              <Paragraph>{responseStatus.designation}</Paragraph>
            </Col>
          </Row>
          <Paragraph>
            Your current response status is: <strong>{responseStatus.status?.toUpperCase() || 'UNKNOWN'}</strong>
          </Paragraph>
          {responseStatus.status === 'pending' && (
            <>
              <Button
                type="primary"
                onClick={() => handleResponse('accepted')}
                loading={submitting}
                style={{ marginRight: 16 }}
              >
                Accept
              </Button>
              <Button
                danger
                onClick={() => handleResponse('rejected')}
                loading={submitting}
              >
                Reject
              </Button>
            </>
          )}
          {responseStatus.status !== 'pending' && (
            <Paragraph>Thank you for your response.</Paragraph>
          )}
        </>
      ) : (
        <Paragraph>Unable to load your response status.</Paragraph>
      )}
    </Card>
  );
};

export default ParticipantResponse;
