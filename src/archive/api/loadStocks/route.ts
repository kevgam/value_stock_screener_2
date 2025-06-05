import { NextResponse } from 'next/server';
import { loadStocks } from '@/services/stockService';

export async function POST() {
  console.log('API Route: Starting loadStocks request');
  
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log('API Route: Starting stream');
        
        // Send initial message
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          current: 0,
          total: 0,
          success: 0,
          errors: 0,
          skipped: 0,
          message: 'Starting stock database refresh...'
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

        console.log('API Route: Calling loadStocks service');
        await loadStocks(writer, encoder);
        console.log('API Route: loadStocks service completed');
      } catch (error) {
        console.error('API Route: Error in loadStocks:', error);
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

// Add OPTIONS handler for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 