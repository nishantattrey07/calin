import { prisma } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    
    
    // Get Google webhook headers
    const channelId = request.headers.get('X-Goog-Channel-ID');
    const resourceState = request.headers.get('X-Goog-Resource-State');
    const resourceId = request.headers.get('X-Goog-Resource-ID');
    
    console.log('📋 Webhook details:', {
      channelId,
      resourceState,
      resourceId,
      timestamp: new Date().toISOString()
    });

    // Verify this is a valid webhook
    if (!channelId || !resourceState) {
    
      return new Response('Invalid webhook', { status: 400 });
    }

    // Verify the channel exists in our database
    const webhook = await prisma.webhook.findUnique({
      where: { channelId },
      include: { user: true }
    });

    if (!webhook) {
      
      return new Response('Unknown channel', { status: 404 });
    }

    // Handle different resource states
    if (resourceState === 'sync') {
      
      return new Response('OK', { status: 200 });
    }

    if (resourceState === 'exists') {
    
      
      // Here you could trigger immediate sync, send notifications, etc.
      // For now, we'll just log it - the client polling will pick it up
      
      // Optional: You could implement a job queue here for immediate processing
      // await queueSyncJob(webhook.userId);
      
      return new Response('OK', { status: 200 });
    }

    console.log('ℹ️ Unhandled resource state:', resourceState);
    return new Response('OK', { status: 200 });
    
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Handle webhook verification (Google sometimes sends GET requests)
export async function GET() {
  console.log('🔍 Webhook verification request');
  return new Response('Webhook endpoint active', { status: 200 });
}