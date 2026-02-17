import React, { useState, useEffect, useCallback } from 'react'; // Import React, useState, useEffect, useCallback
import StockInForm from '../components/StockInForm'
import AllSales from '../components/AllSales'
import StockInHistory from '../components/StockInHistory'
import SalesSummary from '../components/SalesSummary'
import FastMovingItems from '../components/FastMovingItems'
import HighProfitItems from '../components/HighProfitItems'
import ProductMetrics from '../components/ProductMetrics'
import LowStockItems from '../components/LowStockItems'
import DailySalesCalendar from '../components/DailySalesCalendar';
import DailySalesProfitChart from '../components/DailySalesProfitChart'; // New Import
import { getGrossSaleItems, getStockInItems } from '../services/products'; // DEBUG: Use getGrossSaleItems
import { getAllSchedules } from '../services/schedule'; // New Import
import { useAuth } from '../utils/AuthContext';


export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [dailyData, setDailyData] = useState({});
  const [loadingDailyData, setLoadingDailyData] = useState(true);
  const [chartPeriod, setChartPeriod] = useState('daily'); // Default to daily for chart

  const fetchAndAggregateDailyData = useCallback(async () => {
    setLoadingDailyData(true);
    try {
      const allSaleItems = await getGrossSaleItems(); // DEBUG: Use getGrossSaleItems
      const allStockInItems = await getStockInItems();
      const allSchedules = await getAllSchedules();

      const aggregatedData = {};

      // Aggregate sales data
      allSaleItems.forEach(item => {
        const itemDate = new Date(item.date);
        const date = `${itemDate.getFullYear()}-${(itemDate.getMonth() + 1).toString().padStart(2, '0')}-${itemDate.getDate().toString().padStart(2, '0')}`;
        if (!aggregatedData[date]) {
          aggregatedData[date] = { sales: 0, profit: 0, hasStockActivity: false, hasSchedule: false };
        }
        aggregatedData[date].sales += item.amount;
        aggregatedData[date].profit += item.gross_profit;
        aggregatedData[date].hasStockActivity = true;
      });

      // Aggregate stock-in data
      allStockInItems.forEach(item => {
        const itemDate = new Date(item.date);
        const date = `${itemDate.getFullYear()}-${(itemDate.getMonth() + 1).toString().padStart(2, '0')}-${itemDate.getDate().toString().padStart(2, '0')}`;
        if (!aggregatedData[date]) {
          aggregatedData[date] = { sales: 0, profit: 0, hasStockActivity: false, hasSchedule: false };
        }
        aggregatedData[date].hasStockActivity = true;
      });

      // Aggregate schedule data
      allSchedules.forEach(schedule => {
        const scheduleDate = new Date(schedule.date);
        const date = `${scheduleDate.getFullYear()}-${(scheduleDate.getMonth() + 1).toString().padStart(2, '0')}-${scheduleDate.getDate().toString().padStart(2, '0')}`;
        if (!aggregatedData[date]) {
          aggregatedData[date] = { sales: 0, profit: 0, hasStockActivity: false, hasSchedule: false };
        }
        aggregatedData[date].hasSchedule = true;
      });

      setDailyData(aggregatedData);
    } catch (error) {
      console.error('Error fetching and aggregating daily data:', error.message);
    } finally {
      setLoadingDailyData(false);
    }
  }, []); 

  useEffect(() => {
    if (user) {
      fetchAndAggregateDailyData();
    } else if (!authLoading) {
      setDailyData({});
      setLoadingDailyData(false);
    }
  }, [fetchAndAggregateDailyData, user, authLoading]);

  if (authLoading) {
    return <div className="p-6 text-center">Loading authentication...</div>;
  }

  if (!user) {
    return <div className="p-6 text-center">Please log in to view the dashboard.</div>;
  }
  
  return (
    <div className="p-6 max-w-5xl mx-auto ">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="my-6">
        <LowStockItems />
      </div>

      {/* Pass dailyData to SalesSummary */}
      {/* <SalesSummary dailyData={dailyData} loading={loadingDailyData} /> */}

      {/* Pass dailyData to DailySalesCalendar */}
      <DailySalesCalendar dailyData={dailyData} loading={loadingDailyData} fetchDailySalesData={fetchAndAggregateDailyData} />

            {/* DailySalesProfitChart */}
      <DailySalesProfitChart
        dailyData={dailyData}
        loading={loadingDailyData}
        chartPeriod={chartPeriod}
        setChartPeriod={setChartPeriod}
      />

      <div className="my-6">
        <ProductMetrics />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
        <FastMovingItems />
        <HighProfitItems />
      </div>

{/* 
      <div className="mt-6">
      <StockInHistory />
      </div>

      <div className="mt-6">
        <AllSales />
      </div> */}

    </div>
  )
}