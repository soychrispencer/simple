'use client';

import { useState, useCallback } from 'react';
import { requestsApi, groupsApi, routesApi } from '@/lib/api';

interface Serenata {
  id: string;
  clientName: string;
  address: string;
  dateTime: string;
  status: string;
  price: string;
  urgency: string;
}

interface Group {
  id: string;
  name: string;
  date: string;
  status: string;
  members: number;
  serenatas: number;
}

export function useSerenatas() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAvailableRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await requestsApi.getAvailable();
      if (res.ok && res.data) {
        return res.data.requests;
      }
      throw new Error(res.error || 'Failed to fetch requests');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getUrgentRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await requestsApi.getUrgent();
      if (res.ok && res.data) {
        return res.data.requests as Serenata[];
      }
      throw new Error(res.error || 'Failed to fetch urgent requests');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const acceptRequest = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Implement accept endpoint
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getMyGroups = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await groupsApi.list();
      if (res.ok && res.data) {
        return res.data.groups as Group[];
      }
      throw new Error(res.error || 'Failed to fetch groups');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createGroup = useCallback(async (name: string, date: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await groupsApi.create({ name, date });
      if (res.ok && res.data) {
        const data = res.data as { group?: Group };
        if (data.group) return data.group;
      }
      throw new Error(res.error || 'Failed to create group');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    getAvailableRequests,
    getUrgentRequests,
    acceptRequest,
    getMyGroups,
    createGroup,
  };
}
