import { NextResponse } from 'next/server';
import { cleanupInvalidStocks } from '@/services/stockService';

export async function POST() {
  try {
    console.log('Starting stock cleanup...');
    
    // Create a TransformStream to handle the response
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Start the cleanup process in the background
    cleanupInvalidStocks(writer, encoder).catch(error => {
      console.error('Error in cleanupInvalidStocks:', error);
      writer.write(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
      writer.close();
    });

    // Return the readable stream as the response
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in cleanupStocks API:', error);
    return NextResponse.json(
      { error: 'Failed to start stock cleanup' },
      { status: 500 }
    );
  }
}

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