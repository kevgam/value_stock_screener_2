import { NextResponse } from 'next/server';
import { StockService } from '@/src/application/services/StockService';

const stockService = new StockService();

export async function POST() {
  console.log('API Route: Starting recalculate-metrics request');
  
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log('API Route: Starting stream');
        
        // Send initial message
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          current: 0,
          total: 0,
          updated: 0,
          message: 'Starting metric recalculation...'
        })}\n\n`));

        // Create a custom writer that writes to the controller
        const writer = {
          write: async (data: string) => {
            controller.enqueue(encoder.encode(data));
          },
          close: async () => {
            controller.close();
          }
        };

        console.log('API Route: Starting metric recalculation');
        const stocks = await stockService.getUndervaluedStocks();
        const totalStocks = stocks.length;
        let updatedCount = 0;
        let errorCount = 0;

        for (let i = 0; i < totalStocks; i++) {
          const stock = stocks[i];
          try {
            const updatedStock = await stockService.fetchStockData(stock.symbol);
            if (updatedStock) {
              await stockService.updateStockDatabase(updatedStock);
              updatedCount++;
            }
          } catch (error) {
            console.error(`Error updating stock ${stock.symbol}:`, error);
            errorCount++;
          }

          // Send progress update
          await writer.write(`data: ${JSON.stringify({
            current: i + 1,
            total: totalStocks,
            updated: updatedCount,
            errors: errorCount,
            message: `Processed ${i + 1}/${totalStocks} stocks`
          })}\n\n`);
        }

        // Send completion message
        await writer.write(`data: ${JSON.stringify({
          current: totalStocks,
          total: totalStocks,
          updated: updatedCount,
          errors: errorCount,
          message: `Metric recalculation completed. Updated ${updatedCount} stocks with ${errorCount} errors.`
        })}\n\n`);

        console.log('API Route: Metric recalculation completed');
      } catch (error) {
        console.error('API Route: Error in recalculate-metrics:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
      } finally {
        controller.close();
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
} 