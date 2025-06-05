import { NextResponse } from 'next/server';
import { ValueScreeningService } from '@/src/application/services/ValueScreeningService';
import { MonitoringService } from '@/src/application/services/MonitoringService';
import { AlertService } from '@/src/application/services/AlertService';

const valueScreeningService = new ValueScreeningService();
const monitoringService = new MonitoringService();
const alertService = new AlertService();

export async function GET(
  request: Request,
  { params }: { params: { symbol: string } }
) {
  try {
    const symbol = params.symbol.toUpperCase();

    // Screen the stock
    const stock = await valueScreeningService.screenStock(symbol);
    if (!stock) {
      return NextResponse.json(
        { error: 'Stock not found' },
        { status: 404 }
      );
    }

    // Monitor metrics and check alerts
    await monitoringService.trackStockMetrics(stock);
    await alertService.checkAlerts(stock);

    return NextResponse.json(stock);
  } catch (error) {
    console.error(`Error fetching stock ${params.symbol}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch stock' },
      { status: 500 }
    );
  }
} 