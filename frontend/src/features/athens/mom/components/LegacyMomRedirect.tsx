import React, { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Spin } from 'antd';

/**
 * Legacy redirect component for old MOM notification links
 * Redirects /mom/meeting/:momId/respond to /meeting/:momId/respond
 */
const LegacyMomRedirect: React.FC = () => {
  const { momId } = useParams<{ momId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (momId) {
      // Preserve all search parameters (like userId)
      const newPath = `/meeting/${momId}/respond`;
      const searchString = searchParams.toString();
      const fullPath = searchString ? `${newPath}?${searchString}` : newPath;

      console.log('Legacy MOM redirect:', {
        oldPath: `/mom/meeting/${momId}/respond`,
        newPath: fullPath,
        searchParams: searchString
      });
      
      // Replace the current history entry to avoid back button issues
      navigate(fullPath, { replace: true });
    }
  }, [momId, searchParams, navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '200px',
      flexDirection: 'column'
    }}>
      <Spin size="large" />
      <div style={{ marginTop: '16px', color: '#666' }}>
        Redirecting to meeting response...
      </div>
    </div>
  );
};

export default LegacyMomRedirect;
