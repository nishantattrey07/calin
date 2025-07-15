import { google } from 'googleapis';
import { prisma } from './db';
import { CalendarEvent } from './types';


const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);


const calendar = google.calendar({ version: 'v3' });


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
      eventType: event.eventType,
      visibility: event.visibility,
      source: event.source,
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
          eventType: event.eventType,
          visibility: event.visibility,
          source: event.source,
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
  console.log('🔧 Setting up webhook for user:', userId);
  
  // 🆕 CLEANUP: Remove existing webhooks for this user
  const existingWebhooks = await prisma.webhook.findMany({
    where: { userId }
  });
  
  // Stop and delete existing webhooks
  for (const webhook of existingWebhooks) {
    try {
      await stopWebhook(webhook.channelId, webhook.resourceId);
      console.log('🧹 Cleaned up old webhook:', webhook.channelId);
    } catch (error) {
      console.warn('⚠️ Failed to stop old webhook:', webhook.channelId, error);
      // Force delete from DB even if Google call fails
      await prisma.webhook.delete({
        where: { id: webhook.id }
      }).catch(() => {}); // Ignore deletion errors
    }
  }
  
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
    
    console.log('✅ New webhook created:', channelId);
  } catch (error) {
    console.error('❌ Webhook setup failed:', error);
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
    // First, try to get the event to check if it's editable
    const eventResponse = await calendar.events.get({
      auth: authClient,
      calendarId: 'primary',
      eventId: eventId,
    });

    const existingEvent = eventResponse.data;
    
    // Check if this is a birthday or system event that cannot be updated
    if (existingEvent.eventType === 'birthday') {
      throw new Error('Cannot update birthday events. These events are managed by Google and cannot be modified.');
    }
    
    // Check for birthday events based on source properties
    if (existingEvent.source?.title?.toLowerCase()?.includes('birthday')) {
      throw new Error('Cannot update birthday events. These events are managed by Google and cannot be modified.');
    }
    
    // Check for Google+ sourced events (usually system events)
    if (existingEvent.source?.url?.includes('plus.google.com')) {
      throw new Error('Cannot update system events. These events are managed by Google and cannot be modified.');
    }
    
    // Check if the event is read-only
    if (existingEvent.status === 'cancelled') {
      throw new Error('Cannot update cancelled events.');
    }

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
      eventType: event.eventType,
      visibility: event.visibility,
      source: event.source,
    };
  } catch (error: unknown) {
    // Handle specific Google Calendar API errors for updates
    const apiError = error as { code?: number; message?: string };
    
    if (apiError.code === 400) {
      if (apiError.message?.includes('birthday') || apiError.message?.includes('not valid for this event type')) {
        throw new Error('Cannot update birthday or system events. These events are managed by Google.');
      }
    }
    
    if (apiError.code === 403) {
      throw new Error('You do not have permission to update this event.');
    }
    
    if (apiError.code === 404) {
      throw new Error('Event not found or has been deleted.');
    }
    
    console.error('Error updating event:', error);
    throw error;
  }
}


export async function deleteEvent(userId: string, eventId: string): Promise<void> {
  
  const authClient = await setupOAuthClient(userId);
  
  try {
    // First, try to get the event to check if it's deletable
    const eventResponse = await calendar.events.get({
      auth: authClient,
      calendarId: 'primary',
      eventId: eventId,
    });

    const event = eventResponse.data;
    
    // Check if this is a birthday or system event that cannot be deleted
    if (event.eventType === 'birthday') {
      throw new Error('Cannot delete birthday events. These events are managed by Google and cannot be removed.');
    }
    
    // Check for birthday events based on source properties
    if (event.source?.title?.toLowerCase()?.includes('birthday')) {
      throw new Error('Cannot delete birthday events. These events are managed by Google and cannot be removed.');
    }
    
    // Check for Google+ sourced events (usually system events)
    if (event.source?.url?.includes('plus.google.com')) {
      throw new Error('Cannot delete system events. These events are managed by Google and cannot be removed.');
    }
    
    // Check if the event is read-only
    if (event.status === 'cancelled') {
      throw new Error('Event is already cancelled');
    }

    await calendar.events.delete({
      auth: authClient,
      calendarId: 'primary',
      eventId: eventId,
    });
    
  } catch (error: unknown) {
    // Handle specific Google Calendar API errors
    const apiError = error as { code?: number; message?: string };
    
    if (apiError.code === 400) {
      if (apiError.message?.includes('birthday') || apiError.message?.includes('not valid for this event type')) {
        throw new Error('Cannot delete birthday or system events. These events are managed by Google.');
      }
      if (apiError.message?.includes('deleted')) {
        throw new Error('Event has already been deleted.');
      }
    }
    
    if (apiError.code === 403) {
      throw new Error('You do not have permission to delete this event.');
    }
    
    if (apiError.code === 404) {
      throw new Error('Event not found or has already been deleted.');
    }
    
    console.error('Error deleting event:', error);
    throw error;
  }
}
