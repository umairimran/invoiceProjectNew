import React from 'react';

const MetricCard = ({ title, value, icon, iconColor, trend }) => {
  return (
    <div className="card bg-white rounded-xl shadow-md p-6 flex flex-col border-t-4 border-secondary">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-signika font-light text-gray-500">{title}</h3>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconColor || 'bg-secondary bg-opacity-10'}`}>
          <i className={`${icon || 'fas fa-chart-line'} text-lg ${iconColor ? 'text-white' : 'text-secondary'}`}></i>
        </div>
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <p className="font-helveticaBlack text-3xl">{value}</p>
        </div>
        
        {trend && (
          <div className={`flex items-center ${
            trend.direction === 'up' ? 'text-green-500' : 'text-red-500'
          }`}>
            <i className={`fas fa-arrow-${trend.direction} mr-1`}></i>
            <span className="text-sm font-helvetica">{trend.value}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;