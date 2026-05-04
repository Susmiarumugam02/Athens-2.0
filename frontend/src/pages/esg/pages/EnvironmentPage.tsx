import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import EnvironmentAspectList from '../components/EnvironmentAspectList';
import GenerationDataList from '../components/GenerationDataList';
import WasteManifestList from '../components/WasteManifestList';
import BiodiversityEventList from '../components/BiodiversityEventList';

const EnvironmentPage: React.FC = () => {
  const location = useLocation();
  const [activeMenu, setActiveMenu] = useState('aspects');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveMenu(tab);
    }
  }, [location.search]);

  const renderContent = () => {
    switch (activeMenu) {
      case 'aspects':
        return <EnvironmentAspectList />;
      case 'generation':
        return <GenerationDataList />;
      case 'waste':
        return <WasteManifestList />;
      case 'biodiversity':
        return <BiodiversityEventList />;
      default:
        return <EnvironmentAspectList />;
    }
  };

  return (
    <div>
      {renderContent()}
    </div>
  );
};

export default EnvironmentPage;