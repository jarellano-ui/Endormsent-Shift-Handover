/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Task, Handover } from '../types';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const safeJsonFetch = async (url: string, options?: RequestInit, retries = 3, backoff = 1000) => {
  let lastError: any;
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include'
      });
      
      if (response.status === 429) {
        if (i < retries - 1) {
          console.warn(`Rate limited (429) for ${url}. Retrying in ${backoff}ms (attempt ${i + 1}/${retries})...`);
          await sleep(backoff);
          backoff *= 2;
          continue;
        }
      }

      if (response.status === 401) {
        throw new Error('Unauthorized: Please log in.');
      }

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const text = await response.text();
          try {
            const errorData = JSON.parse(text);
            errorMessage = errorData.hint || errorData.message || errorData.error || errorMessage;
          } catch (e) {
            // Not JSON
            if (text.includes('<!doctype html>')) {
              errorMessage = `Server returned HTML instead of JSON (Status ${response.status})`;
            }
          }
        } catch (e) {
          // Failed to read text
        }
        throw new Error(errorMessage);
      }
      
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        if (text.includes('<!doctype html>')) {
          throw new Error('Server returned HTML instead of a JSON response');
        }
        throw new Error('Failed to parse JSON response');
      }
    } catch (e) {
      lastError = e;
      // For network errors, retry as well if we have retries left
      if (i < retries - 1 && (e instanceof TypeError || (e as any).message?.includes('Failed to fetch'))) {
        await sleep(backoff);
        backoff *= 2;
        continue;
      }
      throw e;
    }
  }
  
  throw lastError || new Error(`Failed to fetch ${url} after ${retries} attempts`);
};

export const storage = {
  getTasks: async (): Promise<Task[]> => {
    try {
      return await safeJsonFetch('/api/tasks');
    } catch (e: any) {
      if (e.message?.includes('Failed to fetch')) {
        console.error('Network error fetching tasks:', e.message);
      } else {
        console.error('Error fetching tasks:', e.message);
      }
      return [];
    }
  },

  saveTasks: async (tasks: Task[]): Promise<void> => {
    try {
      await safeJsonFetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tasks),
      });
    } catch (e: any) {
      console.error('Error saving tasks:', e.message);
    }
  },

  getHandovers: async (): Promise<Handover[]> => {
    try {
      const data: any[] = await safeJsonFetch('/api/handovers');
      return data.map(h => ({
        ...h,
        endorsedBy: Array.isArray(h.endorsedBy) ? h.endorsedBy : (h.endorsedBy ? [h.endorsedBy] : []),
        endorsedTo: Array.isArray(h.endorsedTo) ? h.endorsedTo : (h.endorsedTo ? [h.endorsedTo] : []),
        urgency: h.urgency || 'medium',
        status: h.status || 'pending',
        title: h.title || '',
        description: h.description || h.notes || ''
      }));
    } catch (e: any) {
      if (e.message?.includes('Failed to fetch')) {
        console.error('Network error fetching handovers:', e.message);
      } else {
        console.error('Error fetching handovers:', e.message);
      }
      return [];
    }
  },

  updateHandovers: async (handovers: Handover[]): Promise<void> => {
    try {
      await safeJsonFetch('/api/handovers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(handovers),
      });
    } catch (e: any) {
      console.error('Error updating handovers:', e.message);
    }
  },

  saveHandover: async (handover: Handover): Promise<void> => {
    try {
      await safeJsonFetch('/api/handovers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(handover),
      });
    } catch (e: any) {
      console.error('Error saving handover:', e.message);
    }
  },

  getNotifications: async (): Promise<any[]> => {
    try {
      return await safeJsonFetch('/api/notifications');
    } catch (e: any) {
      if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
        console.error('Network error (Failed to fetch). The server might be restarting or unreachable.', e);
      } else {
        console.error('Error fetching notifications:', e.message);
      }
      return [];
    }
  },

  markNotificationRead: async (notificationId: string | 'all'): Promise<void> => {
    try {
      await safeJsonFetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
    } catch (e: any) {
      console.error('Error marking notification as read:', e.message);
    }
  },

  getFeedback: async (): Promise<any[]> => {
    try {
      return await safeJsonFetch('/api/feedback');
    } catch (e: any) {
      console.error('Error fetching feedback:', e.message);
      return [];
    }
  },

  sendFeedback: async (feedback: any): Promise<void> => {
    try {
      await safeJsonFetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedback),
      });
    } catch (e: any) {
      console.error('Error sending feedback:', e.message);
    }
  },

  updateFeedbackStatus: async (id: string, status: string): Promise<void> => {
    try {
      await safeJsonFetch(`/api/feedback/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch (e: any) {
      console.error('Error updating feedback status:', e.message);
    }
  },

  deleteFeedback: async (id: string): Promise<void> => {
    try {
      await safeJsonFetch(`/api/feedback/${id}`, {
        method: 'DELETE',
      });
    } catch (e: any) {
      console.error('Error deleting feedback:', e.message);
    }
  }
};
