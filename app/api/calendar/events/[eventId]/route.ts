import { deleteEvent, updateEvent } from '@/lib/google-calendar';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const sessionToken = request.cookies.get('session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET!) as { userId: string };
    const eventData = await request.json();
    const { eventId } = await params;

    const updatedEvent = await updateEvent(decoded.userId, eventId, eventData);
    
    return NextResponse.json({ success: true, event: updatedEvent });
  } catch (error) {
    console.error('❌ Update event failed:', error);
    return NextResponse.json({ 
      error: 'Failed to update event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const sessionToken = request.cookies.get('session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET!) as { userId: string };
    const { eventId } = await params;

    await deleteEvent(decoded.userId, eventId);
    
    return NextResponse.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    console.error('❌ Delete event failed:', error);
    return NextResponse.json({ 
      error: 'Failed to delete event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}