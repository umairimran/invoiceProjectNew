import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const formattedValue = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
    
    return (
      <div className="bg-white p-3 shadow-md rounded-md border border-gray-100">
        <p className="font-helvetica text-sm font-semibold">{label}</p>
        <p className="font-helvetica text-sm text-gray-600">
          Total Value: {formattedValue}
        </p>
      </div>
    );
  }
  return null;
};

const FinancialValueChart = ({ data }) => {
  // Transform data for the chart
  const chartData = data && data.length > 0 ? data.map(item => ({
    market: item["BU/Markets"],
    totalValue: item["Year-to-date"]["Value of the Compliant JO Invoices (SAR)"] + 
                item["Year-to-date"]["Value of Non-Compliant JO Invoices (SAR)"]
  })) : [];

  return (
    <div className="card h-full flex flex-col">
      <h3 className="font-signika font-bold text-xl mb-4 text-gray-800">
        Financial Value by Market
      </h3>
      <div className="flex-1 w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
              <XAxis 
                dataKey="market"
                tick={{ fontFamily: 'Helvetica', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#E0E0E0' }}
              />
              <YAxis
                tick={{ fontFamily: 'Helvetica', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#E0E0E0' }}
                tickFormatter={(value) => {
                  if (value >= 1000000) {
                    return `${(value / 1000000).toFixed(1)}M`;
                  } else if (value >= 1000) {
                    return `${(value / 1000).toFixed(0)}K`;
                  }
                  return value;
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="totalValue" 
                fill="#10B981" 
                radius={[4, 4, 0, 0]}
                name="Total Value (SAR)"
              />
            </RechartsBarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <i className="fas fa-chart-line text-4xl mb-2 text-gray-300"></i>
              <p className="font-helvetica">No data available</p>
              <p className="text-sm text-gray-400">Charts will populate when data is loaded</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialValueChart;
