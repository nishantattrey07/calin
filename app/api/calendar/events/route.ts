import { fetchAllEvents } from '@/lib/google-calendar';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get session from cookies
    const sessionToken = request.cookies.get('session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    // Verify and decode session
    const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET!) as { userId: string; email: string };
    const userId = decoded.userId;

    // Use our beautiful google-calendar function!
    const events = await fetchAllEvents(userId);

    console.log(`📅 Fetched ${events.length} events successfully`);

    return NextResponse.json({ 
      success: true, 
      events: events
    });

  } catch (error) {
    console.error('❌ Calendar events fetch failed:', error);
    
    return NextResponse.json({ 
      error: 'Failed to fetch calendar events',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}