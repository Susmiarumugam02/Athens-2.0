import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, CheckCircle, Clock, TrendingUp, Users } from 'lucide-react';

const SafetyObservationLandingPage: React.FC = () => {
  const navigate = useNavigate();
  
  const cards = [
    { title: 'New Observation', icon: AlertTriangle, color: 'orange', path: '/app/safety-observation/new' },
    { title: 'My Observations', icon: Shield, color: 'blue', path: '/app/safety-observation/list' },
    { title: 'Pending Review', icon: Clock, color: 'yellow', path: '/app/safety-observation/pending' },
    { title: 'Completed', icon: CheckCircle, color: 'green', path: '/app/safety-observation/completed' },
  ];
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">Safety Observation</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.path}
              onClick={() => navigate(card.path)}
              className="p-6 bg-card border border-border rounded-xl hover:shadow-lg transition-all text-left group"
            >
              <Icon className={`h-8 w-8 text-${card.color}-500 mb-3 group-hover:scale-110 transition-transform`} />
              <h3 className="text-lg font-semibold text-foreground">{card.title}</h3>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SafetyObservationLandingPage;
