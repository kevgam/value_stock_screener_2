"use client";

import React, { useState } from "react";
import { loadStocks } from "@/app/api/loadStocks";

const LoadDataButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; count?: number; error?: string } | null>(null);

  const handleLoadData = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await loadStocks();
      setResult(response);
    } catch (error) {
      setResult({ success: false, error: String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-8">
      <button
        onClick={handleLoadData}
        disabled={isLoading}
        className="bg-primary hover:bg-secondary text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Loading..." : "Load Stock Data"}
      </button>
      
      {result && (
        <div className={`mt-4 p-4 rounded ${result.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {result.success 
            ? `Successfully loaded ${result.count} stocks` 
            : `Error: ${result.error}`
          }
        </div>
      )}
    </div>
  );
};

export default LoadDataButton;
