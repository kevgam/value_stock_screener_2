'use client';

import { useEffect, useState } from 'react';
import { getStockStats, StockStats } from '@/services/StockDataService';

export default function StockDataInformation() {
  const [stats, setStats] = useState<StockStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await getStockStats();
        setStats(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError('Failed to fetch statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5 * 60 * 1000); // Refresh every 5 minutes

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="text-red-500">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">Stock Data Overview</h2>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Total Available Stocks:</span>
          <span className="font-medium">{stats?.totalAvailableStocks.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Total Processed Stocks:</span>
          <span className="font-medium">{stats?.totalStocksV2.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Strong Buy Recommendations:</span>
          <span className="font-medium text-green-600">{stats?.totalStrongBuys.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
} 