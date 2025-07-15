import { prisma } from '@/lib/db';
import { stopWebhook } from '@/lib/google-calendar';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get session from cookies
    const sessionToken = request.cookies.get('session')?.value;
    
    if (sessionToken) {
      try {
        // Verify and decode session
        const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET!) as { userId: string; email: string };
        const userId = decoded.userId;

        console.log('🔄 Cleaning up webhooks for user:', decoded.email);

        // Get all active webhooks for this user
        const webhooks = await prisma.webhook.findMany({
          where: { userId }
        });

        // Stop all webhooks
        for (const webhook of webhooks) {
          try {
            await stopWebhook(webhook.channelId, webhook.resourceId);
            console.log('✅ Stopped webhook:', webhook.channelId);
          } catch (error) {
            console.warn('⚠️ Failed to stop webhook:', webhook.channelId, error);
          }
        }

        // Delete webhook records from database
        await prisma.webhook.deleteMany({
          where: { userId }
        });

        console.log('🧹 Cleaned up all webhooks for user:', decoded.email);
      } catch (error) {
        console.error('❌ Error during logout cleanup:', error);
        // Continue with logout even if cleanup fails
      }
    }

    // Clear session cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    response.cookies.set('session', '', {
      path: '/',
      expires: new Date(0),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return response;
    
  } catch (error) {
    console.error('❌ Logout error:', error);
    
    // Even if there's an error, clear the session cookie
    const response = NextResponse.json({
      success: false,
      error: 'Logout failed'
    }, { status: 500 });

    response.cookies.set('session', '', {
      path: '/',
      expires: new Date(0),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return response;
  }
}
