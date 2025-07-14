import { prisma } from '@/lib/db';
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

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

    // Get user with refresh token
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        refreshToken: true,
        email: true
      }
    });

    if (!user || !user.refreshToken) {
      return NextResponse.json({ error: 'No refresh token found' }, { status: 401 });
    }

    // Use refresh token to get new access token
    oauth2Client.setCredentials({
      refresh_token: user.refreshToken
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    // Update user with new tokens
    await prisma.user.update({
      where: { id: userId },
      data: {
        accessToken: credentials.access_token!,
        tokenExpiry: new Date(credentials.expiry_date!),
        // Only update refresh token if Google provides a new one
        ...(credentials.refresh_token && { refreshToken: credentials.refresh_token })
      }
    });

    console.log('✅ Token refreshed successfully for user:', user.email);

    return NextResponse.json({ 
      success: true, 
      message: 'Token refreshed successfully',
      newExpiry: new Date(credentials.expiry_date!)
    });

  } catch (error) {
    console.error('❌ Token refresh failed:', error);
    
    return NextResponse.json({ 
      error: 'Token refresh failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}