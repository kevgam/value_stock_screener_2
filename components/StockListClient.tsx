"use client";

import React, { useState, useEffect } from "react";
import { Stock } from "@/types/stock";
import StockList from "./StockList";
import { refreshStocks } from "@/app/api/refreshStocks";

interface StockListClientProps {
  initialStocks: Stock[];
}

const StockListClient: React.FC<StockListClientProps> = ({ initialStocks }) => {
  const [stocks, setStocks] = useState<Stock[]>(initialStocks);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refresh the data when the component mounts or when initialStocks change
  useEffect(() => {
    setStocks(initialStocks);
  }, [initialStocks]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await refreshStocks();
      if (result.success && result.stocks) {
        setStocks(result.stocks);
      }
    } catch (error) {
      console.error("Error refreshing stocks:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded inline-flex items-center disabled:opacity-50"
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      <StockList stocks={stocks} />
    </div>
  );
};

export default StockListClient;
