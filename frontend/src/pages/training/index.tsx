import React from 'react';
import { Routes, Route } from 'react-router-dom';
import TrainingPage from './TrainingPage';

const TrainingRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="*" element={<TrainingPage />} />
    </Routes>
  );
};

export default TrainingRoutes;
