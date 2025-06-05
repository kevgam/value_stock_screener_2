import { Stock } from '@/types/stock'
import { useState } from 'react'

interface IndustryStocksProps {
  stocks: Stock[]
}

const IndustryStocks = ({ stocks }: IndustryStocksProps) => {
  const [sortField, setSortField] = useState<keyof Stock>('margin_of_safety')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [displayLimit, setDisplayLimit] = useState<number>(20)

  // Group stocks by industry
  const stocksByIndustry = stocks.reduce((acc, stock) => {
    const industry = stock.industry || 'Other'
    if (!acc[industry]) {
      acc[industry] = []
    }
    acc[industry].push(stock)
    return acc
  }, {} as Record<string, Stock[]>)

  // Sort industries by number of stocks
  const sortedIndustries = Object.keys(stocksByIndustry).sort((a, b) => 
    stocksByIndustry[b].length - stocksByIndustry[a].length
  )

  const getGrahamScore = (stock: Stock): number => {
    // Core Graham requirements
    const hasAdequateMargin = (stock.margin_of_safety ?? 0) >= 35 ? 3 : (stock.margin_of_safety ?? 0) >= 20 ? 2 : 1
    const isFinanciallyStrong = (stock.graham_safety_score ?? 0) >= 70 ? 3 : (stock.graham_safety_score ?? 0) >= 50 ? 2 : 1
    const hasGoodValue = (stock.graham_value_score ?? 0) >= 70 ? 3 : (stock.graham_value_score ?? 0) >= 50 ? 2 : 1
    
    return hasAdequateMargin + isFinanciallyStrong + hasGoodValue
  }

  const getValueColor = (value: number | null | undefined, type: 'margin' | 'pe' | 'pb' | 'safety' | 'value') => {
    if (value === null || value === undefined) return 'text-gray-400'
    
    switch (type) {
      case 'margin':
        return value >= 35 ? 'text-green-600' : value >= 20 ? 'text-yellow-600' : 'text-red-600'
      case 'pe':
        return value <= 15 ? 'text-green-600' : value <= 20 ? 'text-yellow-600' : 'text-red-600'
      case 'pb':
        return value <= 1.2 ? 'text-green-600' : value <= 1.5 ? 'text-yellow-600' : 'text-red-600'
      case 'safety':
      case 'value':
        return value >= 70 ? 'text-green-600' : value >= 50 ? 'text-yellow-600' : 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getValueIndicator = (value: number | null | undefined, type: 'margin' | 'pe' | 'pb' | 'safety' | 'value') => {
    if (value === null || value === undefined) return '❓'
    
    switch (type) {
      case 'margin':
        return value >= 35 ? '🟢' : value >= 20 ? '🟡' : '🔴'
      case 'pe':
        return value <= 15 ? '🟢' : value <= 20 ? '🟡' : '🔴'
      case 'pb':
        return value <= 1.2 ? '🟢' : value <= 1.5 ? '🟡' : '🔴'
      case 'safety':
      case 'value':
        return value >= 70 ? '🟢' : value >= 50 ? '🟡' : '🔴'
      default:
        return '❓'
    }
  }

  const getGrahamVerdict = (stock: Stock) => {
    // Core Graham requirements
    const hasAdequateMargin = (stock.margin_of_safety ?? 0) >= 35
    const isFinanciallyStrong = (stock.graham_safety_score ?? 0) >= 70
    const hasGoodValue = (stock.pe_ratio ?? Infinity) <= 15 && (stock.pb_ratio ?? Infinity) <= 1.2
    
    if (hasAdequateMargin && isFinanciallyStrong && hasGoodValue) {
      return {
        icon: '💎',
        text: 'Strong Buy',
        color: 'text-green-600',
        title: 'Meets all Graham criteria: High margin of safety, strong financials, and good value'
      }
    } else if (hasAdequateMargin && (isFinanciallyStrong || hasGoodValue)) {
      return {
        icon: '👍',
        text: 'Consider',
        color: 'text-yellow-600',
        title: 'Meets some key Graham criteria - Worth investigating further'
      }
    } else {
      return {
        icon: '⏳',
        text: 'Watch',
        color: 'text-gray-400',
        title: 'Does not meet enough Graham criteria at current price'
      }
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end mb-4">
        <select
          value={displayLimit}
          onChange={(e) => setDisplayLimit(Number(e.target.value))}
          className="block w-32 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value={20}>Top 20</option>
          <option value={50}>Top 50</option>
          <option value={100}>Top 100</option>
          <option value={1000}>Top 1000</option>
        </select>
      </div>

      {sortedIndustries.map(industry => {
        // Sort stocks by Graham's verdict score and then limit the number
        const industryStocks = [...stocksByIndustry[industry]]
          .sort((a, b) => {
            // First sort by Graham score
            const scoreA = getGrahamScore(a);
            const scoreB = getGrahamScore(b);
            if (scoreB !== scoreA) {
              return scoreB - scoreA;
            }
            // If Graham scores are equal, sort by the selected field
            const aValue = a[sortField] ?? -Infinity;
            const bValue = b[sortField] ?? -Infinity;
            return sortDirection === 'asc' ? 
              (aValue as number) - (bValue as number) : 
              (bValue as number) - (aValue as number);
          })
          .slice(0, displayLimit); // Limit the number of stocks shown

        return (
          <div key={industry} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">{industry}</h2>
              <p className="text-sm text-gray-600 mt-1">
                Showing top {Math.min(displayLimit, stocksByIndustry[industry].length)} of {stocksByIndustry[industry].length} stocks
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => {
                        setSortField('margin_of_safety')
                        setSortDirection(sortField === 'margin_of_safety' ? 
                          (sortDirection === 'asc' ? 'desc' : 'asc') : 'desc')
                      }}
                      title="Graham's Investment Verdict"
                    >
                      Graham's Verdict {sortField === 'margin_of_safety' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕️'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Symbol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Margin of Safety
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Safety Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      P/E
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      P/B
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Graham #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Market Cap (M)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Exchange
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Currency
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {industryStocks.map((stock) => {
                    const verdict = getGrahamVerdict(stock)
                    return (
                      <tr key={stock.symbol} className="hover:bg-gray-50">
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${verdict.color}`}
                            title={verdict.title}>
                          {verdict.icon} {verdict.text}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {stock.symbol}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {stock.company_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${stock.price.toFixed(2)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getValueColor(stock.margin_of_safety, 'margin')}`}
                            title="Margin of Safety (>35% is ideal)">
                          {getValueIndicator(stock.margin_of_safety, 'margin')} {stock.margin_of_safety?.toFixed(1)}%
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getValueColor(stock.graham_value_score, 'value')}`}
                            title="Value Score based on P/E, P/B, and Margin of Safety">
                          {getValueIndicator(stock.graham_value_score, 'value')} {stock.graham_value_score?.toFixed(1)}%
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getValueColor(stock.graham_safety_score, 'safety')}`}
                            title="Safety Score based on Current Ratio, Debt, Earnings Stability, and Dividends">
                          {getValueIndicator(stock.graham_safety_score, 'safety')} {stock.graham_safety_score?.toFixed(1)}%
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getValueColor(stock.pe_ratio, 'pe')}`}
                            title="Price to Earnings Ratio (<15 is ideal)">
                          {getValueIndicator(stock.pe_ratio, 'pe')} {stock.pe_ratio?.toFixed(2) || 'N/A'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getValueColor(stock.pb_ratio, 'pb')}`}
                            title="Price to Book Ratio (<1.2 is ideal)">
                          {getValueIndicator(stock.pb_ratio, 'pb')} {stock.pb_ratio?.toFixed(2) || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                            title="Graham Number (Fair Value)">
                          ${stock.graham_number?.toFixed(2) || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                            title="Market Capitalization in Millions">
                          {stock.market_cap ? `$${stock.market_cap.toLocaleString()}M` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {stock.exchange || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {stock.currency}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {stock.last_updated ? new Date(stock.last_updated).toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default IndustryStocks 