// @ts-ignore - eventsource-polyfill doesn't have perfect TypeScript support
import EventSourcePolyfill from 'eventsource-polyfill';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const SSE_EVENTS_STORAGE_KEY = 'sse_events';
const LAST_EVENT_ID_KEY = 'sse_last_event_id';
const MAX_RECONNECT_ATTEMPTS = 5;

export type SSEEventType =
  | 'connected'
  | 'message'
  | 'message:new'
  | 'message:status'
  | 'conversation:new'
  | 'conversation:updated'
  | 'user:typing'
  | 'user:online'
  | 'user:offline'
  | 'notification';

export interface SSEEvent {
  id?: string;
  type: SSEEventType;
  data: any;
  timestamp: string;
}

export type SSEEventHandler = (event: SSEEvent) => void;

class SSEService {
  private eventSource: EventSourcePolyfill | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isConnected = false;
  private lastEventId: string | null = null;
  private eventHandlers: Set<SSEEventHandler> = new Set();
  private jwtToken: string | null = null;

  /**
   * Connect to SSE stream
   */
  connectSSE = async (jwt: string, onEvent?: SSEEventHandler): Promise<void> => {
    if (this.isConnecting || this.isConnected) {
      console.log('SSE already connected or connecting');
      return;
    }

    this.jwtToken = jwt;
    this.isConnecting = true;
    this.reconnectAttempts = 0;

    // Load last event ID from storage
    const storedLastEventId = await AsyncStorage.getItem(LAST_EVENT_ID_KEY);
    this.lastEventId = storedLastEventId;

    // Add event handler if provided
    if (onEvent) {
      this.eventHandlers.add(onEvent);
    }

    await this.establishConnection();
  };

  /**
   * Establish SSE connection
   */
  private establishConnection = async (): Promise<void> => {
    if (!this.jwtToken) {
      console.error('No JWT token provided for SSE connection');
      return;
    }

    try {
      // Build URL with token and last-event-id
      const url = `${API_BASE_URL}/sse/connect?token=${encodeURIComponent(this.jwtToken)}`;
      
      const headers: Record<string, string> = {};
      if (this.lastEventId) {
        headers['Last-Event-ID'] = this.lastEventId;
      }

      // Create EventSource with polyfill
      this.eventSource = new EventSourcePolyfill(url, {
        headers,
        withCredentials: false,
      });

      // Handle connection open
      this.eventSource.onopen = () => {
        console.log('SSE connection opened');
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
      };

      // Handle connection error
      this.eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        this.isConnected = false;
        this.isConnecting = false;

        // Close current connection
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }

        // Attempt reconnection with exponential backoff
        this.handleReconnection();
      };

      // Handle generic message event
      this.eventSource.onmessage = (event) => {
        this.handleEvent(event, 'message');
      };

      // Handle specific event types
      this.eventSource.addEventListener('connected', (event: any) => {
        this.handleEvent(event, 'connected');
      });

      this.eventSource.addEventListener('message:new', (event: any) => {
        this.handleEvent(event, 'message:new');
      });

      this.eventSource.addEventListener('message:status', (event: any) => {
        this.handleEvent(event, 'message:status');
      });

      this.eventSource.addEventListener('conversation:new', (event: any) => {
        this.handleEvent(event, 'conversation:new');
      });

      this.eventSource.addEventListener('conversation:updated', (event: any) => {
        this.handleEvent(event, 'conversation:updated');
      });

      this.eventSource.addEventListener('user:typing', (event: any) => {
        this.handleEvent(event, 'user:typing');
      });

      this.eventSource.addEventListener('user:online', (event: any) => {
        this.handleEvent(event, 'user:online');
      });

      this.eventSource.addEventListener('user:offline', (event: any) => {
        this.handleEvent(event, 'user:offline');
      });

      this.eventSource.addEventListener('notification', (event: any) => {
        this.handleEvent(event, 'notification');
      });
    } catch (error) {
      console.error('Error establishing SSE connection:', error);
      this.isConnecting = false;
      this.handleReconnection();
    }
  };

  /**
   * Handle incoming SSE event
   */
  private handleEvent = async (event: MessageEvent, eventType: SSEEventType): Promise<void> => {
    try {
      // Parse event data
      const data = JSON.parse(event.data);
      const eventId = event.lastEventId || event.id || Date.now().toString();

      // Update last event ID
      this.lastEventId = eventId;
      await AsyncStorage.setItem(LAST_EVENT_ID_KEY, eventId);

      // Create SSE event object
      const sseEvent: SSEEvent = {
        id: eventId,
        type: eventType,
        data,
        timestamp: new Date().toISOString(),
      };

      // Store event locally
      await this.storeEvent(sseEvent);

      // Call all registered handlers
      this.eventHandlers.forEach((handler) => {
        try {
          handler(sseEvent);
        } catch (error) {
          console.error('Error in SSE event handler:', error);
        }
      });
    } catch (error) {
      console.error('Error handling SSE event:', error);
    }
  };

  /**
   * Store event in local storage
   */
  private storeEvent = async (event: SSEEvent): Promise<void> => {
    try {
      // Get existing events
      const stored = await AsyncStorage.getItem(SSE_EVENTS_STORAGE_KEY);
      const events: SSEEvent[] = stored ? JSON.parse(stored) : [];

      // Add new event
      events.push(event);

      // Keep only last 1000 events (prevent storage bloat)
      const trimmedEvents = events.slice(-1000);

      // Save back to storage
      await AsyncStorage.setItem(SSE_EVENTS_STORAGE_KEY, JSON.stringify(trimmedEvents));
    } catch (error) {
      console.error('Error storing SSE event:', error);
    }
  };

  /**
   * Handle reconnection with exponential backoff
   */
  private handleReconnection = (): void => {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 16000);
    this.reconnectAttempts += 1;

    console.log(`Reconnecting SSE in ${delay}ms (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

    this.reconnectTimeout = setTimeout(() => {
      if (this.jwtToken) {
        this.establishConnection();
      }
    }, delay);
  };

  /**
   * Disconnect SSE connection
   */
  disconnectSSE = (): void => {
    console.log('Disconnecting SSE');

    // Clear reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Close EventSource
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // Reset state
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.jwtToken = null;
    this.eventHandlers.clear();
  };

  /**
   * Add event handler
   */
  addEventHandler = (handler: SSEEventHandler): void => {
    this.eventHandlers.add(handler);
  };

  /**
   * Remove event handler
   */
  removeEventHandler = (handler: SSEEventHandler): void => {
    this.eventHandlers.delete(handler);
  };

  /**
   * Get connection status
   */
  getConnectionStatus = (): { connected: boolean; connecting: boolean } => {
    return {
      connected: this.isConnected,
      connecting: this.isConnecting,
    };
  };

  /**
   * Get stored events
   */
  getStoredEvents = async (): Promise<SSEEvent[]> => {
    try {
      const stored = await AsyncStorage.getItem(SSE_EVENTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting stored events:', error);
      return [];
    }
  };

  /**
   * Clear stored events
   */
  clearStoredEvents = async (): Promise<void> => {
    await AsyncStorage.removeItem(SSE_EVENTS_STORAGE_KEY);
    await AsyncStorage.removeItem(LAST_EVENT_ID_KEY);
  };
}

// Export singleton instance
export const sseService = new SSEService();

