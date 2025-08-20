import React from 'react';
import MetricCard from './MetricCard';

const ClientMetrics = ({ metrics }) => {
  const { totalClients, withRateCard } = metrics;
  
  // Calculate rate card percentage
  const rateCardPercentage = totalClients > 0 
    ? Math.round((withRateCard / totalClients) * 100) 
    : 0;
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
      <MetricCard 
        title="Total Clients" 
        value={totalClients} 
        icon="fas fa-users" 
        iconColor="bg-secondary" 
      />
      <MetricCard 
        title="With Rate Card" 
        value={withRateCard} 
        icon="fas fa-file-invoice" 
        iconColor="bg-secondary" 
        trend={{ direction: rateCardPercentage >= 50 ? 'up' : 'down', value: rateCardPercentage }}
      />
    </div>
  );
};

export default ClientMetrics;