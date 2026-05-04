import React from 'react';
import { useNavigate } from 'react-router-dom';

const qualityLandingPage: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Quality</h1>
      <p className="text-gray-600">Module landing page - routes coming soon</p>
    </div>
  );
};

export default qualityLandingPage;
