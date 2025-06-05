import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function DatabaseOperations() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleUpdateStocks = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch('/api/stocks/update', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.error) {
        console.error('Error updating stocks:', data.error);
      } else {
        console.log('Stocks updated successfully:', data);
      }
    } catch (error) {
      console.error('Error updating stocks:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCleanupStocks = async () => {
    setIsCleaning(true);
    try {
      const response = await fetch('/api/stocks/cleanup', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.error) {
        console.error('Error cleaning up stocks:', data.error);
      } else {
        console.log('Stocks cleaned up successfully:', data);
      }
    } catch (error) {
      console.error('Error cleaning up stocks:', error);
    } finally {
      setIsCleaning(false);
    }
  };

  const handleCleanupInvalidStocks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/stocks/cleanup-invalid', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.error) {
        console.error('Error cleaning up invalid stocks:', data.error);
      } else {
        console.log('Invalid stocks cleaned up successfully:', data);
      }
    } catch (error) {
      console.error('Error cleaning up invalid stocks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecalculateMetrics = async () => {
    setIsRecalculating(true);
    try {
      const response = await fetch('/api/stocks/recalculate', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.error) {
        console.error('Error recalculating metrics:', data.error);
      } else {
        console.log('Metrics recalculated successfully:', data);
      }
    } catch (error) {
      console.error('Error recalculating metrics:', error);
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleResetDatabase = async () => {
    if (!confirm('Are you sure you want to reset the database? This will clear all stock data.')) {
      return;
    }
    setIsUpdating(true);
    try {
      const response = await fetch('/api/stocks/reset', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.error) {
        console.error('Error resetting database:', data.error);
      } else {
        console.log('Database reset successfully:', data);
      }
    } catch (error) {
      console.error('Error resetting database:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Database Operations</h2>
      <div className="space-y-4">
        <button
          onClick={handleUpdateStocks}
          disabled={isUpdating}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isUpdating ? 'Updating...' : 'Update Stock Database'}
        </button>
        
        <button
          onClick={handleCleanupStocks}
          disabled={isCleaning}
          className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isCleaning ? 'Cleaning...' : 'Cleanup Available Stocks'}
        </button>
        
        <button
          onClick={handleCleanupInvalidStocks}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isLoading ? 'Cleaning up...' : 'Cleanup Invalid Stocks'}
        </button>
        
        <button
          onClick={handleRecalculateMetrics}
          disabled={isRecalculating}
          className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isRecalculating ? 'Recalculating...' : 'Recalculate Metrics'}
        </button>

        <button
          onClick={handleResetDatabase}
          disabled={isUpdating || isRecalculating}
          className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          Reset Database
        </button>
      </div>
    </div>
  );
} 