import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendMessage as sendMessageAPI, getAuthToken } from '../utils/api';
import { storageService, Message, MessageStatus } from './storage';

const QUEUE_KEY = 'outgoing_message_queue';

export interface QueuedMessage {
  id: string; // temp ID
  conversationId: string;
  senderId: string;
  text?: string;
  attachments?: Array<{
    type: string;
    url: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
  }>;
  clientId: string;
  createdAt: string;
  retryCount: number;
  lastAttemptAt?: string;
}

class MessageQueueService {
  private isFlushing = false;
  private flushListeners: Set<() => void> = new Set();

  /**
   * Queue an outgoing message for later sending
   */
  queueOutgoing = async (message: Message): Promise<void> => {
    try {
      // Get current queue
      const queue = await this.getQueue();

      // Check if message already queued (by clientId)
      const existingIndex = queue.findIndex((q) => q.clientId === message.clientId);
      
      if (existingIndex !== -1) {
        // Update existing queue entry
        queue[existingIndex] = {
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          text: message.text,
          attachments: message.attachments,
          clientId: message.clientId,
          createdAt: message.createdAt,
          retryCount: queue[existingIndex].retryCount,
          lastAttemptAt: queue[existingIndex].lastAttemptAt,
        };
      } else {
        // Add new queue entry
        queue.push({
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          text: message.text,
          attachments: message.attachments,
          clientId: message.clientId,
          createdAt: message.createdAt,
          retryCount: 0,
        });
      }

      // Save queue
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

      // Update message status to 'queued' in storage
      await storageService.updateMessage(message.conversationId, message.id, {
        status: 'queued' as MessageStatus,
      });

      console.log(`Message queued: ${message.clientId}`);
    } catch (error) {
      console.error('Error queueing message:', error);
      throw error;
    }
  };

  /**
   * Get current queue
   */
  private getQueue = async (): Promise<QueuedMessage[]> => {
    try {
      const data = await AsyncStorage.getItem(QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting queue:', error);
      return [];
    }
  };

  /**
   * Save queue
   */
  private saveQueue = async (queue: QueuedMessage[]): Promise<void> => {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  };

  /**
   * Remove message from queue
   */
  private removeFromQueue = async (clientId: string): Promise<void> => {
    const queue = await this.getQueue();
    const filtered = queue.filter((q) => q.clientId !== clientId);
    await this.saveQueue(filtered);
  };

  /**
   * Flush queue - send all pending messages
   */
  flushQueue = async (): Promise<void> => {
    if (this.isFlushing) {
      console.log('Queue flush already in progress');
      return;
    }

    this.isFlushing = true;
    console.log('Starting queue flush...');

    try {
      const queue = await this.getQueue();
      
      if (queue.length === 0) {
        console.log('Queue is empty');
        this.isFlushing = false;
        return;
      }

      console.log(`Flushing ${queue.length} queued messages`);

      // Check auth token
      const token = await getAuthToken();
      if (!token) {
        console.log('No auth token, skipping queue flush');
        this.isFlushing = false;
        return;
      }

      // Process queue in order
      for (const queuedMessage of queue) {
        try {
          // Update retry count and last attempt
          queuedMessage.retryCount += 1;
          queuedMessage.lastAttemptAt = new Date().toISOString();
          await this.saveQueue(queue);

          // Send message
          const response = await sendMessageAPI({
            conversationId: queuedMessage.conversationId,
            text: queuedMessage.text,
            clientId: queuedMessage.clientId,
            attachments: queuedMessage.attachments,
          });

          if (response.success && response.message) {
            // Reconcile: Update local message with server response
            await this.reconcileMessage(queuedMessage, response.message);

            // Remove from queue
            await this.removeFromQueue(queuedMessage.clientId);
            console.log(`Successfully sent queued message: ${queuedMessage.clientId}`);
          } else {
            // Mark as failed if max retries exceeded
            if (queuedMessage.retryCount >= 5) {
              console.error(`Max retries exceeded for message: ${queuedMessage.clientId}`);
              await this.markAsFailed(queuedMessage);
              await this.removeFromQueue(queuedMessage.clientId);
            } else {
              console.log(`Failed to send message, will retry: ${queuedMessage.clientId}`);
            }
          }
        } catch (error: any) {
          console.error(`Error sending queued message ${queuedMessage.clientId}:`, error);
          
          // Mark as failed if max retries exceeded
          if (queuedMessage.retryCount >= 5) {
            await this.markAsFailed(queuedMessage);
            await this.removeFromQueue(queuedMessage.clientId);
          }
        }
      }

      // Notify listeners
      this.flushListeners.forEach((listener) => listener());
    } catch (error) {
      console.error('Error flushing queue:', error);
    } finally {
      this.isFlushing = false;
      console.log('Queue flush completed');
    }
  };

  /**
   * Reconcile local message with server response
   * Matches by clientId and updates local message with server data
   */
  private reconcileMessage = async (
    queuedMessage: QueuedMessage,
    serverMessage: Message
  ): Promise<void> => {
    try {
      // Find local message by clientId
      const localMessages = await storageService.loadConversation(queuedMessage.conversationId);
      const localMessage = localMessages.find((m) => m.clientId === queuedMessage.clientId);

      if (localMessage) {
        // Update local message with server response
        await storageService.updateMessage(
          queuedMessage.conversationId,
          localMessage.id,
          {
            id: serverMessage.id,
            status: serverMessage.status,
            createdAt: serverMessage.createdAt,
            deliveredTo: serverMessage.deliveredTo,
            readBy: serverMessage.readBy,
            attachments: serverMessage.attachments,
          }
        );
      } else {
        // If local message not found, add server message
        await storageService.appendMessage(queuedMessage.conversationId, serverMessage);
      }
    } catch (error) {
      console.error('Error reconciling message:', error);
    }
  };

  /**
   * Mark queued message as failed
   */
  private markAsFailed = async (queuedMessage: QueuedMessage): Promise<void> => {
    try {
      const localMessages = await storageService.loadConversation(queuedMessage.conversationId);
      const localMessage = localMessages.find((m) => m.clientId === queuedMessage.clientId);

      if (localMessage) {
        await storageService.updateMessage(queuedMessage.conversationId, localMessage.id, {
          status: 'failed',
        });
      }
    } catch (error) {
      console.error('Error marking message as failed:', error);
    }
  };

  /**
   * Get queue size
   */
  getQueueSize = async (): Promise<number> => {
    const queue = await this.getQueue();
    return queue.length;
  };

  /**
   * Clear queue (useful for testing or logout)
   */
  clearQueue = async (): Promise<void> => {
    await AsyncStorage.removeItem(QUEUE_KEY);
  };

  /**
   * Add flush listener (called when queue is flushed)
   */
  addFlushListener = (listener: () => void): void => {
    this.flushListeners.add(listener);
  };

  /**
   * Remove flush listener
   */
  removeFlushListener = (listener: () => void): void => {
    this.flushListeners.delete(listener);
  };

  /**
   * Check if queue is currently flushing
   */
  isQueueFlushing = (): boolean => {
    return this.isFlushing;
  };
}

// Export singleton instance
export const messageQueue = new MessageQueueService();

