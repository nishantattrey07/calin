import { syncCalendarEvents } from '@/lib/google-calendar';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 API: Starting incremental sync...');
    
    // Get session from cookies
    const sessionToken = request.cookies.get('session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    // Verify and decode session
    const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET!) as { userId: string; email: string };
    const userId = decoded.userId;

    // Perform incremental sync
    const syncResult = await syncCalendarEvents(userId);
    
    console.log(`✅ Sync complete: ${syncResult.events.length} changes, hasChanges: ${syncResult.hasChanges}`);

    return NextResponse.json({
      success: true,
      hasChanges: syncResult.hasChanges,
      changes: syncResult.events,
      changeCount: syncResult.events.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ API Error during sync:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed',
      hasChanges: false,
      changes: []
    }, { status: 500 });
  }
}
