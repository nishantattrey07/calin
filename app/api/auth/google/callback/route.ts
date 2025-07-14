import { prisma } from '@/lib/db';
import { setupWebhook } from '@/lib/google-calendar';
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url));
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();

    // Storing data in database
    const user = await prisma.user.upsert({
      where: { email: data.email! },
      update: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        tokenExpiry: new Date(tokens.expiry_date!),
      },
      create: {
        email: data.email!,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        tokenExpiry: new Date(tokens.expiry_date!),
      },
    });

    console.log('✅ User authenticated successfully:', user.email);

    // Set up webhook subscription for real-time updates
    try {
      await setupWebhook(user.id);
      console.log('🔗 Webhook set up successfully for user:', user.email);
    } catch (webhookError) {
      console.warn('⚠️ Webhook setup failed (non-blocking):', webhookError);
      // Don't fail the auth flow if webhook setup fails
    }

    // Creating session token
    const sessionToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Redirecting with cookie
    const response = NextResponse.redirect(new URL('/calendar', request.url));
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error('OAuth error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      code: code,
      searchParams: Object.fromEntries(searchParams.entries())
    });
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
  }
}