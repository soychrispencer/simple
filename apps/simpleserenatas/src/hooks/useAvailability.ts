'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { musiciansApi } from '@/lib/api';
import { API_BASE } from '@simple/config';

export function useAvailability() {
  const { musicianProfile, refreshProfile } = useAuth();
  const [isAvailable, setIsAvailableState] = useState(false);
  const [availableNow, setAvailableNowState] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sync with profile
  useEffect(() => {
    if (musicianProfile) {
      setIsAvailableState(musicianProfile.isAvailable);
      setAvailableNowState(musicianProfile.availableNow);
    }
  }, [musicianProfile]);

  const toggleAvailability = useCallback(async () => {
    setIsLoading(true);
    try {
      const newValue = !isAvailable;
      const res = await fetch(`${API_BASE}/api/serenatas/musicians/me/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: newValue }),
        credentials: 'include',
      });
      
      const data = await res.json();
      if (data.ok) {
        setIsAvailableState(newValue);
        await refreshProfile();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to toggle availability:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, refreshProfile]);

  const toggleAvailableNow = useCallback(async () => {
    setIsLoading(true);
    try {
      const newValue = !availableNow;
      const res = await fetch(`${API_BASE}/api/serenatas/musicians/me/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availableNow: newValue }),
        credentials: 'include',
      });
      
      const data = await res.json();
      if (data.ok) {
        setAvailableNowState(newValue);
        await refreshProfile();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to toggle available now:', error);
    } finally {
      setIsLoading(false);
    }
  }, [availableNow, refreshProfile]);

  return {
    isAvailable,
    availableNow,
    isLoading,
    toggleAvailability,
    toggleAvailableNow,
  };
}
