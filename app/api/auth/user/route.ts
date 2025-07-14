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

    return NextResponse.json({ 
      success: true,
      userId: decoded.userId,
      email: decoded.email
    });

  } catch (error) {
    console.error('❌ User info fetch failed:', error);
    
    return NextResponse.json({ 
      error: 'Failed to fetch user info',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 401 });
  }
}
