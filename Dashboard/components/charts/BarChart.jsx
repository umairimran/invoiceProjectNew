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
    return (
      <div className="bg-white p-3 shadow-md rounded-md border border-gray-100">
        <p className="font-helvetica text-sm">{`${label}: ${payload[0].value.toLocaleString()}`}</p>
      </div>
    );
  }

  return null;
};

const BarChart = ({ title, data, dataKey = 'value', nameKey = 'name', barColor = '#2196F3' }) => {
  return (
    <div className="card h-full flex flex-col">
      <h3 className="font-signika font-bold text-xl mb-4">{title}</h3>
      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart
            data={data}
            margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey={nameKey}
              tick={{ fontFamily: 'Helvetica', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#E0E0E0' }}
            />
            <YAxis
              tick={{ fontFamily: 'Helvetica', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#E0E0E0' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey={dataKey} fill={barColor} radius={[4, 4, 0, 0]} />
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BarChart;
