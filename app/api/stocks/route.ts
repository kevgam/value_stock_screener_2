import { NextResponse } from 'next/server'
import { ValueScreeningService } from '@/src/application/services/ValueScreeningService'
import { MonitoringService } from '@/src/application/services/MonitoringService'
import { AlertService } from '@/src/application/services/AlertService'

const valueScreeningService = new ValueScreeningService()
const monitoringService = new MonitoringService()
const alertService = new AlertService()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const threshold = Number(searchParams.get('threshold')) || 20

    // Get undervalued stocks
    const stocks = await valueScreeningService.getUndervaluedStocks(threshold)

    // Monitor and check alerts for each stock
    for (const stock of stocks) {
      await monitoringService.trackStockMetrics(stock)
      await alertService.checkAlerts(stock)
    }

    return NextResponse.json(stocks)
  } catch (error) {
    console.error('Error fetching stocks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stocks' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { symbol } = await request.json()
    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      )
    }

    // Screen the stock
    const stock = await valueScreeningService.screenStock(symbol)
    if (!stock) {
      return NextResponse.json(
        { error: 'Stock not found' },
        { status: 404 }
      )
    }

    // Monitor metrics and check alerts
    await monitoringService.trackStockMetrics(stock)
    await alertService.checkAlerts(stock)

    return NextResponse.json(stock)
  } catch (error) {
    console.error('Error adding stock:', error)
    return NextResponse.json(
      { error: 'Failed to add stock' },
      { status: 500 }
    )
  }
} 