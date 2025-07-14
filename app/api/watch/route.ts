import { setupWebhook } from '@/lib/google-calendar';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get session from cookies
    const sessionToken = request.cookies.get('session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    // Verify and decode session
    const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET!) as { userId: string; email: string };
    const userId = decoded.userId;

    console.log('🔗 Setting up webhook for user:', decoded.email);

    // Set up webhook subscription
    await setupWebhook(userId);
    
    return NextResponse.json({
      success: true,
      message: 'Webhook set up successfully'
    });
    
  } catch (error) {
    console.error('❌ Webhook setup error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Webhook setup failed'
    }, { status: 500 });
  }
}
