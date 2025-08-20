import React from 'react';
import BarChart from './charts/BarChart';
import PieChart from './charts/PieChart';

const ClientsCharts = ({ clientsData }) => {
  // Generate data for "Clients Added per Month" chart
  const generateMonthlyData = () => {
    // In a real app, this would process actual client creation dates
    // For now, using dummy data
    return [
      { name: 'Jan', value: 2, fill: '#C21A2C' },
      { name: 'Feb', value: 1, fill: '#C21A2C' },
      { name: 'Mar', value: 3, fill: '#C21A2C' },
      { name: 'Apr', value: 2, fill: '#C21A2C' },
      { name: 'May', value: 1, fill: '#C21A2C' },
      { name: 'Jun', value: 3, fill: '#C21A2C' },
    ];
  };

  // Generate data for "Clients by Agency" chart
  const generateAgencyData = () => {
    // In a real app, this would process client-agency relationships
    // For now, using dummy data
    return [
      { name: 'Agency A', value: 40, fill: '#C21A2C' },
      { name: 'Agency B', value: 30, fill: '#2D3748' },
      { name: 'Agency C', value: 20, fill: '#718096' },
      { name: 'Agency D', value: 10, fill: '#A0AEC0' },
    ];
  };

  // Generate data for "Rate Card Status" chart
  const generateRateCardData = () => {
    // In a real app, this would count clients with and without rate cards
    // For now, using dummy data
    return [
      { name: 'With Rate Card', value: 70, fill: '#4CAF50' },
      { name: 'Without Rate Card', value: 30, fill: '#F44336' },
    ];
  };

  const clientsPerMonthData = generateMonthlyData();
  const clientsByAgencyData = generateAgencyData();
  const rateCardStatusData = generateRateCardData();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
      <div className="h-80">
        <BarChart 
          title="Clients Added per Month" 
          data={clientsPerMonthData}
        />
      </div>
      <div className="h-80">
        <PieChart 
          title="Clients by Agency" 
          data={clientsByAgencyData}
        />
      </div>
      <div className="h-80">
        <PieChart 
          title="Rate Card Status" 
          data={rateCardStatusData}
        />
      </div>
    </div>
  );
};

export default ClientsCharts;
