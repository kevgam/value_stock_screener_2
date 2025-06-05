import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function AvailableStocks() {
  const [isUpdating, setIsUpdating] = useState(false);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleUpdateAvailableStocks = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch('/api/stocks/load', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.error) {
        console.error('Error updating available stocks:', data.error);
      } else {
        console.log('Available stocks updated successfully:', data);
      }
    } catch (error) {
      console.error('Error updating available stocks:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Available Stocks</h2>
      <div className="space-y-4">
        <button
          onClick={handleUpdateAvailableStocks}
          disabled={isUpdating}
          className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isUpdating ? 'Updating...' : 'Update Available Stocks'}
        </button>
      </div>
    </div>
  );
} 