import React from 'react'; // Keep React import
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatChartPrice } from '../utils/formatChartPrice';

// Helper function to aggregate data based on period
const aggregateChartData = (data, period) => {
  const aggregated = {};

  Object.entries(data).forEach(([dateStr, values]) => {
    const date = new Date(dateStr);
    let key;

    switch (period) {
      case 'daily':
        key = date.toLocaleDateString(); // e.g., "1/20/2026"
        break;
      case 'monthly':
        key = `${date.getFullYear()}-${date.getMonth()}`; // e.g., "2026-0" for Jan 2026
        break;
      case 'yearly':
        key = `${date.getFullYear()}`; // e.g., "2026"
        break;
      default:
        key = date.toLocaleDateString();
    }

    if (!aggregated[key]) {
      aggregated[key] = { sales: 0, profit: 0 };
    }
    aggregated[key].sales += values.sales;
    aggregated[key].profit += values.profit;
  });

  const sortedKeys = Object.keys(aggregated).sort((a, b) => {
    // Custom sort for date keys
    const dateA = new Date(period === 'yearly' ? a : period === 'monthly' ? `${a.split('-')[0]}-${parseInt(a.split('-')[1]) + 1}-01` : a);
    const dateB = new Date(period === 'yearly' ? b : period === 'monthly' ? `${b.split('-')[0]}-${parseInt(b.split('-')[1]) + 1}-01` : b);
    return dateA - dateB;
  });

  const finalChartData = sortedKeys.map(key => {
    const item = aggregated[key];
    let name;
    switch (period) {
      case 'daily':
        name = new Date(key).toLocaleDateString();
        break;
      case 'monthly':
        name = new Date(parseInt(key.split('-')[0]), parseInt(key.split('-')[1]), 1).toLocaleString('en-US', { month: 'short' });
        break;
      case 'yearly':
        name = key;
        break;
      default:
        name = key;
    }
    return {
      name,
      sales: item.sales,
      profit: item.profit,
    };
  }).filter(item => item.sales > 0 || item.profit > 0); // Filter out entries with no sales/profit

  return finalChartData;
};


export default function DailySalesProfitChart({ dailyData, loading, chartPeriod, setChartPeriod }) {
  const chartData = aggregateChartData(dailyData, chartPeriod);

  // Determine chart title based on period
  const chartTitle =
    chartPeriod === 'daily'
      ? 'Daily Sales & Profit Chart'
      : chartPeriod === 'monthly'
      ? 'Monthly Sales & Profit Chart'
      : 'Yearly Sales & Profit Chart';

  // Determine X-Axis data key based on period
  const xAxisDataKey = 'name'; // Always 'name' from aggregateChartData

  if (loading) {
    return <p className="text-center p-4">Loading chart data...</p>;
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-xl font-bold mb-4">{chartTitle}</h2>
        <p className="text-center text-gray-500">No sales data for this period to display chart.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <h2 className="text-xl font-bold mb-4">{chartTitle}</h2>
      <div className="flex justify-center space-x-2 mb-4">
        <button
          onClick={() => setChartPeriod('daily')}
          className={`px-4 py-2 rounded-md ${
            chartPeriod === 'daily' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
          }`}
        >
          Daily
        </button>
        <button
          onClick={() => setChartPeriod('monthly')}
          className={`px-4 py-2 rounded-md ${
            chartPeriod === 'monthly' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setChartPeriod('yearly')}
          className={`px-4 py-2 rounded-md ${
            chartPeriod === 'yearly' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
          }`}
        >
          Yearly
        </button>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{
            top: 5,
            right: 10,
            left: 10,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xAxisDataKey} />
          <YAxis tickFormatter={(value) => formatChartPrice(value)} width={80} />
          <Tooltip formatter={(value) => formatChartPrice(value)} />
          <Legend />
          <Bar dataKey="sales" name="Total Sales" fill="#4CAF50" /> {/* Green for sales */}
          <Bar dataKey="profit" name="Gross Profit" fill="#2196F3" /> {/* Blue for profit */}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
