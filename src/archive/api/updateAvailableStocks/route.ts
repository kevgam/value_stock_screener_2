import { NextResponse } from 'next/server';
import { StockService } from '@/src/application/services/StockService';

export async function POST() {
  try {
    const stockService = new StockService();
    const response = await stockService.updateAvailableStocks();
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating available stocks:', error);
    return NextResponse.json(
      { error: 'Failed to update available stocks' },
      { status: 500 }
    );
  }
} 