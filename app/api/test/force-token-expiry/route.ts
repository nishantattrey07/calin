import { prisma } from '@/lib/db';
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

    // Force token expiry by setting it to 1 hour ago
    const expiredTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

    await prisma.user.update({
      where: { id: userId },
      data: {
        tokenExpiry: expiredTime
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Token expiry forced - token is now expired',
      expiredAt: expiredTime
    });

  } catch (error) {
    console.error('❌ Force expiry failed:', error);
    
    return NextResponse.json({ 
      error: 'Force expiry failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
