import { NextResponse } from 'next/server';
import { cleanupAvailableStocks } from '@/services/stockService';

export async function POST() {
  try {
    console.log('Starting cleanup of available stocks...');
    const encoder = new TextEncoder();
    const customReadable = new ReadableStream({
      async start(controller) {
        const writer = {
          write: async (data: string) => {
            controller.enqueue(encoder.encode(data));
          },
          close: async () => {
            controller.close();
          }
        };

        try {
          await cleanupAvailableStocks(writer, encoder);
        } catch (error) {
          console.error('Error in cleanup process:', error);
          controller.error(error);
        }
      }
    });

    return new Response(customReadable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error cleaning up available stocks:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return new Response(null, { status: 405 }); // Method not allowed
} 