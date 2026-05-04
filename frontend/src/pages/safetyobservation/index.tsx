import React from 'react';
import { Routes, Route } from 'react-router-dom';
import SafetyObservationPage from './SafetyObservationPage';

const SafetyObservationRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="*" element={<SafetyObservationPage />} />
    </Routes>
  );
};

export default SafetyObservationRoutes;
