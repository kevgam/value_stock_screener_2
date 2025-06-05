'use client'

import { useEffect, useState } from 'react'
import { Stock } from '@/types/stock'
import { ValueScreeningService } from '@/src/application/services/ValueScreeningService'
import IndustryStocks from '@/components/IndustryStocks'
import StockManager from '@/components/StockManager'

const valueScreeningService = new ValueScreeningService()

export default function Home() {
  const [stocks, setStocks] = useState<Stock[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const handleDatabaseRefresh = () => {
    setLastRefresh(new Date())
  }

  useEffect(() => {
    const fetchStocks = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const stocks = await valueScreeningService.getUndervaluedStocks()
        setStocks(stocks)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stocks')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStocks()
  }, [lastRefresh])

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold">Value Stock Screener</h1>
        
        <StockManager />
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 text-red-700 p-4 rounded-md">
            {error}
          </div>
        ) : (
          <IndustryStocks stocks={stocks} />
        )}
      </div>
    </main>
  )
}
