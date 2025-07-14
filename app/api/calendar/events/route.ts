import { prisma } from '@/lib/db';
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

async function refreshTokenIfNeeded(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      accessToken: true,
      refreshToken: true,
      tokenExpiry: true,
      email: true
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Check if token is expired or will expire in next 5 minutes
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
  
  if (user.tokenExpiry && user.tokenExpiry <= fiveMinutesFromNow) {
    console.log('🔄 Token expired or expiring soon, refreshing...');
    
    // Refresh the token
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
        ...(credentials.refresh_token && { refreshToken: credentials.refresh_token })
      }
    });

    console.log('✅ Token refreshed successfully for user:', user.email);
    return credentials.access_token!;
  }

  return user.accessToken!;
}

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

    // Get fresh access token (auto-refresh if needed)
    const accessToken = await refreshTokenIfNeeded(userId);

    // Set up Google Calendar API
    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Fetch calendar events
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];

    console.log(`📅 Fetched ${events.length} events successfully`);

    return NextResponse.json({ 
      success: true, 
      events: events.map(event => ({
        id: event.id,
        summary: event.summary,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        description: event.description,
        location: event.location
      }))
    });

  } catch (error) {
    console.error('❌ Calendar events fetch failed:', error);
    
    return NextResponse.json({ 
      error: 'Failed to fetch calendar events',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}