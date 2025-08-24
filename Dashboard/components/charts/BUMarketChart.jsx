import React from 'react';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-800">{data.market}</p>
        <p className="text-sm text-gray-600">Total Jobs: {data.totalJobs}</p>
      </div>
    );
  }
  return null;
};

const BUMarketChart = ({ data }) => {
  const chartData = data && data.length > 0 ? data.map(item => ({
    market: item["BU/Markets"],
    totalJobs: item["Year-to-date"]["Number of Compliant JO Invoices"] +
               item["Year-to-date"]["Number of of Non-Compliant JO Invoices"]
  })) : [];

  // Define different colors for each BU/Market category
  const COLORS = {
    'A/E': '#C21A2C',      // Red
    'APAC': '#2D3748',     // Dark Blue
    'DOMESTIC': '#718096', // Gray
    'COE': '#10B981',      // Green
    'MEA': '#F59E0B',      // Orange
    'default': '#A0AEC0'   // Light Gray for any other categories
  };

  return (
    <div className="card h-full flex flex-col">
      <h3 className="font-signika font-bold text-xl mb-4 text-gray-800">BU/Market Distribution</h3>
      <div className="flex-1 w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ market, percent }) => `${market} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="totalJobs"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[entry.market] || COLORS.default}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value, entry) => (
                  <span className="text-sm font-medium text-gray-700">
                    {value}
                  </span>
                )}
              />
            </RechartsPieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <i className="fas fa-chart-pie text-4xl mb-2 text-gray-300"></i>
              <p className="font-helvetica">No data available</p>
              <p className="text-sm text-gray-400">Charts will populate when data is loaded</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BUMarketChart;
