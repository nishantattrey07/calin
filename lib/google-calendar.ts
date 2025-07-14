import { google } from 'googleapis';
import { prisma } from './db';


const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);


const calendar = google.calendar({ version: 'v3' });

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  description?: string | null;
  location?: string | null;
  etag?: string | null;
  status?: string | null;
  updated?: string | null;
}


export async function setupOAuthClient(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Checking if token is expired
  const now = new Date();
  if (user.tokenExpiry <= now) {
    
    const newTokens = await refreshAccessToken(user.refreshToken);
    
    // Updating user with new tokens
    await prisma.user.update({
      where: { id: userId },
      data: {
        accessToken: newTokens.access_token || '',
        tokenExpiry: new Date(Date.now() + 3600000) // 1 hour default
      }
    });

    oauth2Client.setCredentials({
      access_token: newTokens.access_token,
      refresh_token: user.refreshToken,
    });
  } else {
    oauth2Client.setCredentials({
      access_token: user.accessToken,
      refresh_token: user.refreshToken,
    });
  }

  return oauth2Client;
}


export async function refreshAccessToken(refreshToken: string) {
  const tempClient = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  tempClient.setCredentials({
    refresh_token: refreshToken
  });

  const { credentials } = await tempClient.refreshAccessToken();
  return credentials;
}


export async function fetchAllEvents(userId: string): Promise<CalendarEvent[]> {
  
  
  const authClient = await setupOAuthClient(userId);
  
  try {
    const response = await calendar.events.list({
      auth: authClient,
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    

    return events.map(event => ({
      id: event.id!,
      summary: event.summary || 'Untitled Event',
      start: event.start?.dateTime || event.start?.date || '',
      end: event.end?.dateTime || event.end?.date || '',
      description: event.description,
      location: event.location,
      etag: event.etag,
      status: event.status,
      updated: event.updated,
    }));
  } catch (error) {
    console.error('❌ Error fetching events:', error);
    throw error;
  }
}


export async function syncCalendarEvents(userId: string): Promise<{ events: CalendarEvent[], hasChanges: boolean }> {
  
  const authClient = await setupOAuthClient(userId);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  if (!user) {
    throw new Error('User not found');
  }

  const syncToken = user.syncToken;
  let pageToken: string | null | undefined;
  const allChanges: CalendarEvent[] = [];
  let hasChanges = false;

  try {
    do {
    
      
      const response = await calendar.events.list({
        auth: authClient,
        calendarId: 'primary',
        syncToken: syncToken || undefined,
        pageToken: pageToken || undefined,
        maxResults: 50,
        singleEvents: true,
      });

      const events = response.data.items || [];
      
      if (events.length > 0) {
        hasChanges = true;
        allChanges.push(...events.map(event => ({
          id: event.id!,
          summary: event.summary || 'Untitled Event',
          start: event.start?.dateTime || event.start?.date || '',
          end: event.end?.dateTime || event.end?.date || '',
          description: event.description,
          location: event.location,
          etag: event.etag,
          status: event.status,
          updated: event.updated,
        })));
      }

      pageToken = response.data.nextPageToken;
      
      
      if (!pageToken && response.data.nextSyncToken) {
        await prisma.user.update({
          where: { id: userId },
          data: { syncToken: response.data.nextSyncToken }
        });
        
      }
    } while (pageToken);
    
    
    return { events: allChanges, hasChanges };
    
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 410) {
      
    
      await prisma.user.update({
        where: { id: userId },
        data: { syncToken: null }
      });
      
      // Recursive call for full sync
      return syncCalendarEvents(userId);
    }
    
    console.error('❌ Error during sync:', error);
    throw error;
  }
}


export async function setupWebhook(userId: string): Promise<void> {
  
  
  const authClient = await setupOAuthClient(userId);
  
  // Generate unique channel ID
  const channelId = `${userId}-${Date.now()}`;
  const expiration = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
  
  try {
    const response = await calendar.events.watch({
      auth: authClient,
      calendarId: 'primary',
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: `${process.env.WEBHOOK_URL}`,
        expiration: expiration.toString(),
      }
    });
    
    await prisma.webhook.create({
      data: {
        userId,
        channelId,
        resourceId: response.data.resourceId!,
        expiration: new Date(expiration),
      }
    });
    
  } catch (error) {
    console.error(' Webhook setup failed:', error);
    throw error;
  }
}


export async function stopWebhook(channelId: string, resourceId: string): Promise<void> {
  try {
    await calendar.channels.stop({
      requestBody: {
        id: channelId,
        resourceId: resourceId,
      }
    });
    
    await prisma.webhook.delete({
      where: { channelId }
    });
    
    
  } catch (error) {
    console.error(' Error stopping webhook:', error);
    throw error;
  }
}


export async function createEvent(userId: string, eventData: Partial<CalendarEvent>): Promise<CalendarEvent> {
  
  
  const authClient = await setupOAuthClient(userId);
  
  try {
    const response = await calendar.events.insert({
      auth: authClient,
      calendarId: 'primary',
      requestBody: {
        summary: eventData.summary,
        description: eventData.description,
        location: eventData.location,
        start: {
          dateTime: eventData.start,
        },
        end: {
          dateTime: eventData.end,
        },
      }
    });
    
    const event = response.data;
    
    return {
      id: event.id!,
      summary: event.summary || 'Untitled Event',
      start: event.start?.dateTime || event.start?.date || '',
      end: event.end?.dateTime || event.end?.date || '',
      description: event.description,
      location: event.location,
      etag: event.etag,
      status: event.status,
      updated: event.updated,
    };
  } catch (error) {
    console.error(' Error creating event:', error);
    throw error;
  }
}



export async function updateEvent(userId: string, eventId: string, eventData: Partial<CalendarEvent>): Promise<CalendarEvent> {
  
  const authClient = await setupOAuthClient(userId);
  
  try {
    const response = await calendar.events.update({
      auth: authClient,
      calendarId: 'primary',
      eventId: eventId,
      requestBody: {
        summary: eventData.summary,
        description: eventData.description,
        location: eventData.location,
        start: {
          dateTime: eventData.start,
        },
        end: {
          dateTime: eventData.end,
        },
      }
    });
    
    const event = response.data;
    
    return {
      id: event.id!,
      summary: event.summary || 'Untitled Event',
      start: event.start?.dateTime || event.start?.date || '',
      end: event.end?.dateTime || event.end?.date || '',
      description: event.description,
      location: event.location,
      etag: event.etag,
      status: event.status,
      updated: event.updated,
    };
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
}


export async function deleteEvent(userId: string, eventId: string): Promise<void> {
  
  const authClient = await setupOAuthClient(userId);
  
  try {
    await calendar.events.delete({
      auth: authClient,
      calendarId: 'primary',
      eventId: eventId,
    });
    
  } catch (error) {
    throw error;
  }
}
