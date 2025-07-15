import { createEvent } from '@/lib/google-calendar';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET!) as { userId: string };
    const eventData = await request.json();

    const newEvent = await createEvent(decoded.userId, eventData);
    
    return NextResponse.json({ success: true, event: newEvent });
  } catch (error) {
    console.error('❌ Create event failed:', error);
    return NextResponse.json({ 
      error: 'Failed to create event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}