'use client';

import { useState } from 'react';
import { Stock } from '../src/types/stock';
import { ValueScreeningService } from '@/src/application/services/ValueScreeningService';
import StockDataInformation from './StockDataInformation';
import DatabaseOperations from './DatabaseOperations';
import AvailableStocks from './AvailableStocks';
import StockList from './StockList';

export default function StockManager() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Stock Database Manager</h1>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <DatabaseOperations />
            <AvailableStocks />
          </div>
          <StockDataInformation />
        </div>
        <StockList />
      </div>
    </div>
  );
} 