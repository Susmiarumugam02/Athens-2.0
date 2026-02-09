import React, { useEffect, useState, useMemo } from 'react';
import { Card, List, Typography, Spin, App } from 'antd';
import api from '../../../common/utils/axiosetup';
import { handleApiError } from '../../../common/utils/errorHandler';

const { Title } = Typography;

interface Participant {
  id: number;
  name: string;
  email: string;
  status: 'accepted' | 'rejected' | 'pending' | 'noresponse';
  company_name?: string;
  designation?: string;
  signature?: string;
}

interface ParticipantListProps {
  momId: string;
}

const ParticipantList: React.FC<ParticipantListProps> = ({ momId }) => {
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { message } = App.useApp();

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        setLoading(true);
        // Fetch participants from the selected participants list in MomCreationForm
        // This assumes you pass the participants list as a prop or fetch from a shared store or API
        // For now, we will fetch from an API endpoint that returns participants with their response status
        const res = await api.get(`/api/v1/mom/${momId}/participants/`);
        setParticipants(res.data);
      } catch (err) {
        const error = handleApiError(err, { component: 'ParticipantList', action: 'fetchParticipants' });
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchParticipants();
  }, [momId, message]);

  if (loading) {
    return <Spin tip="Loading participants..." style={{ marginTop: 50 }} />;
  }

  if (error) {
    return (
      <Card style={{ maxWidth: 600, margin: '50px auto' }}>
        <Title level={4}>Error</Title>
        <p>{error}</p>
      </Card>
    );
  }

  const { acceptedParticipants, rejectedParticipants, noResponseParticipants } = useMemo(() => {
    const accepted = [];
    const rejected = [];
    const noResponse = [];
    
    for (const participant of participants) {
      switch (participant.status) {
        case 'accepted':
          accepted.push(participant);
          break;
        case 'rejected':
          rejected.push(participant);
          break;
        case 'noresponse':
          noResponse.push(participant);
          break;
      }
    }
    
    return {
      acceptedParticipants: accepted,
      rejectedParticipants: rejected,
      noResponseParticipants: noResponse
    };
  }, [participants]);

  return (
    <Card style={{ maxWidth: 600, margin: '50px auto' }}>
      <Title level={3}>Participants</Title>
      <Title level={4}>Accepted</Title>
      <List
        dataSource={acceptedParticipants}
        renderItem={participant => (
          <List.Item key={participant.id}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <List.Item.Meta
                  title={participant.name}
                  description={participant.email}
                />
                <div>
                  <small>{participant.company_name || 'N/A'}</small><br />
                  <small>{participant.designation || 'N/A'}</small>
                </div>
              </div>
              <div>
                {participant.signature ? (
                  <img src={participant.signature} alt="Signature" style={{ height: 40 }} />
                ) : (
                  'N/A'
                )}
              </div>
            </div>
          </List.Item>
        )}
        locale={{ emptyText: 'No accepted participants' }}
      />
      <Title level={4} style={{ marginTop: 24 }}>Rejected</Title>
      <List
        dataSource={rejectedParticipants}
        renderItem={item => (
          <List.Item key={item.id}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <List.Item.Meta
                  title={item.name}
                  description={item.email}
                />
                <div>
                  <small>{item.company_name || 'N/A'}</small><br />
                  <small>{item.designation || 'N/A'}</small>
                </div>
              </div>
              <div>
                {item.signature ? (
                  <img src={item.signature} alt="Signature" style={{ height: 40 }} />
                ) : (
                  'N/A'
                )}
              </div>
            </div>
          </List.Item>
        )}
        locale={{ emptyText: 'No rejected participants' }}
      />
      <Title level={4} style={{ marginTop: 24 }}>No Response</Title>
      <List
        dataSource={noResponseParticipants}
        renderItem={item => (
          <List.Item key={item.id}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <List.Item.Meta
                  title={item.name}
                  description={item.email}
                />
                <div>
                  <small>{item.company_name || 'N/A'}</small><br />
                  <small>{item.designation || 'N/A'}</small>
                </div>
              </div>
              <div>
                {item.signature ? (
                  <img src={item.signature} alt="Signature" style={{ height: 40 }} />
                ) : (
                  'N/A'
                )}
              </div>
            </div>
          </List.Item>
        )}
        locale={{ emptyText: 'No participants without response' }}
      />
    </Card>
  );
};

export default ParticipantList;
