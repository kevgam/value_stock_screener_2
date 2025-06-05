import { useState } from 'react'
import { Stock } from '../src/types/stock'

interface StockTableProps {
  stocks: Stock[]
}

const StockTable = ({ stocks }: StockTableProps) => {
  const [sortField, setSortField] = useState<keyof Stock>('graham_value_score')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all')

  // Get unique industries
  const industries = Array.from(new Set(stocks.map(stock => stock.industry || 'Other')))

  // Filter stocks by industry
  const filteredStocks = selectedIndustry === 'all' 
    ? stocks 
    : stocks.filter(stock => stock.industry === selectedIndustry)

  // Sort stocks
  const sortedStocks = [...filteredStocks].sort((a, b) => {
    const aValue = typeof a[sortField] === 'number' ? a[sortField] : 0
    const bValue = typeof b[sortField] === 'number' ? b[sortField] : 0
    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
  })

  const handleSort = (field: keyof Stock) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getSortIcon = (field: keyof Stock) => {
    if (sortField !== field) return '↕️'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  const getValueColor = (value: number | null | undefined, isReversed = false) => {
    if (value === null || value === undefined) return 'text-gray-400'
    const threshold = isReversed ? 0.5 : 0.7
    return value > threshold ? 'text-green-600' : value > 0.3 ? 'text-yellow-600' : 'text-red-600'
  }

  const formatNumber = (value: number | null): string => {
    if (value === null) return 'N/A'
    return value.toLocaleString()
  }

  const formatMarketCap = (value: number | null | undefined, currency: string, isUSD: boolean): string => {
    if (value === null || value === undefined) return 'N/A';
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return `${formatter.format(value)} ${isUSD ? 'USD' : currency}`;
  };

  const formatPrice = (price: number | null | undefined, currency: string, isUSD: boolean): string => {
    if (price === null || price === undefined) return 'N/A';
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: isUSD ? 'USD' : currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(price);
  };

  const getGrahamVerdict = (stock: Stock): string => {
    const safetyScore = stock.graham_safety_score || 0;
    const valueScore = stock.graham_value_score || 0;
    const marginOfSafety = stock.margin_of_safety || 0;

    if (safetyScore >= 70 && valueScore >= 70 && marginOfSafety >= 35) {
      return 'Strong Buy';
    } else if (safetyScore >= 50 && valueScore >= 50 && marginOfSafety >= 20) {
      return 'Buy';
    } else if (safetyScore >= 30 && valueScore >= 30) {
      return 'Hold';
    } else {
      return 'Avoid';
    }
  };

  const getVerdictColor = (verdict: string): string => {
    switch (verdict) {
      case 'Strong Buy': return 'text-green-600 font-bold';
      case 'Buy': return 'text-green-500';
      case 'Hold': return 'text-yellow-500';
      default: return 'text-red-500';
    }
  };

  const StockRow = ({ stock }: { stock: Stock }) => {
    const verdict = getGrahamVerdict(stock);
    const hasNonUSDValues = !stock.is_price_usd;

    return (
      <tr key={stock.symbol} className="hover:bg-gray-50">
        <td className="px-4 py-2">{stock.symbol}</td>
        <td className="px-4 py-2">{stock.company_name}</td>
        <td className={`px-4 py-2 ${getVerdictColor(verdict)}`}>{verdict}</td>
        <td className="px-4 py-2">
          {formatPrice(stock.price, 'USD', true)}
          {hasNonUSDValues && (
            <div className="text-xs text-gray-500">
              Original: {formatPrice(stock.original_price, stock.currency, false)}
            </div>
          )}
        </td>
        <td className="px-4 py-2">
          {formatMarketCap(stock.market_cap, 'USD', true)}
          {hasNonUSDValues && (
            <div className="text-xs text-gray-500">
              Original: {formatMarketCap(stock.original_market_cap, stock.currency, false)}
            </div>
          )}
        </td>
        <td className={`px-4 py-2 ${getValueColor(stock.graham_safety_score)}`}>
          {stock.graham_safety_score?.toFixed(1)}%
        </td>
        <td className={`px-4 py-2 ${getValueColor(stock.graham_value_score)}`}>
          {stock.graham_value_score?.toFixed(1)}%
        </td>
        <td className={`px-4 py-2 ${getValueColor(stock.margin_of_safety)}`}>
          {stock.margin_of_safety?.toFixed(1)}%
        </td>
        <td className="px-4 py-2">{stock.industry || 'N/A'}</td>
        <td className="px-4 py-2">
          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
            {stock.exchange} ({stock.currency})
          </span>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-4">
      {/* Industry Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedIndustry('all')}
          className={`px-3 py-1 rounded-full text-sm ${
            selectedIndustry === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          All Industries
        </button>
        {industries.map(industry => (
          <button
            key={industry}
            onClick={() => setSelectedIndustry(industry)}
            className={`px-3 py-1 rounded-full text-sm ${
              selectedIndustry === industry
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {industry}
          </button>
        ))}
      </div>

      {/* Stock Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('symbol')}>
                Symbol {getSortIcon('symbol')}
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('company_name')}>
                Company {getSortIcon('company_name')}
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('graham_value_score')}>
                Graham Verdict {getSortIcon('graham_value_score')}
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price (USD)
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Market Cap (USD)
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('graham_safety_score')}>
                Safety Score {getSortIcon('graham_safety_score')}
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('graham_value_score')}>
                Value Score {getSortIcon('graham_value_score')}
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('margin_of_safety')}>
                Margin of Safety {getSortIcon('margin_of_safety')}
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('industry')}>
                Industry {getSortIcon('industry')}
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Exchange & Currency
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedStocks.map((stock) => (
              <StockRow key={stock.symbol} stock={stock} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default StockTable 