import { useState, useEffect, useCallback, useRef } from 'react';
import { format, subDays, subWeeks, isSameDay } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Workout, CalendarDateEntry } from '../types';

interface UseCalendarDatesOptions {
  initialWeeks?: number;
  lazyLoadWeeks?: number;
  lazyLoadThresholdDays?: number;
}

interface UseCalendarDatesReturn {
  dates: CalendarDateEntry[];
  isLoading: boolean;
  isLoadingMore: boolean;
  oldestLoadedDate: Date | null;
  loadMoreHistory: () => Promise<void>;
  refreshData: () => Promise<void>;
  checkLazyLoadTrigger: (topVisibleIndex: number) => void;
  prependedCount: number;
  clearPrependedCount: () => void;
}

// Helper to get ordinal suffix
const getOrdinal = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export function useCalendarDates({
  initialWeeks = 4,
  lazyLoadWeeks = 4,
  lazyLoadThresholdDays = 14, // 2 weeks
}: UseCalendarDatesOptions = {}): UseCalendarDatesReturn {
  const { session } = useAuth();
  const [dates, setDates] = useState<CalendarDateEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [oldestLoadedDate, setOldestLoadedDate] = useState<Date | null>(null);
  const [prependedCount, setPrependedCount] = useState(0);
  const isLoadingMoreRef = useRef(false);

  const clearPrependedCount = useCallback(() => {
    setPrependedCount(0);
  }, []);

  // Generate date entries with month labels (oldest first)
  const generateDateEntries = useCallback(
    (startDate: Date, endDate: Date, workouts: Workout[]): CalendarDateEntry[] => {
      const entries: CalendarDateEntry[] = [];
      const today = new Date();
      let lastMonth = '';

      // Iterate from oldest to newest
      let current = new Date(startDate);
      while (current <= endDate) {
        const dateStr = format(current, 'yyyy-MM-dd');
        const workout = workouts.find((w) => w.workout_date === dateStr) || null;
        const monthLabel = format(current, 'MMM');
        const showMonth = monthLabel !== lastMonth;
        if (showMonth) lastMonth = monthLabel;

        entries.push({
          date: new Date(current),
          workout,
          isToday: isSameDay(current, today),
          monthLabel: showMonth ? monthLabel : null,
        });

        current = new Date(current);
        current.setDate(current.getDate() + 1);
      }

      return entries;
    },
    []
  );

  // Fetch workouts for a date range
  const fetchWorkouts = async (startDate: Date, endDate: Date): Promise<Workout[]> => {
    if (!session?.user) return [];

    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('workout_date', format(startDate, 'yyyy-MM-dd'))
      .lte('workout_date', format(endDate, 'yyyy-MM-dd'))
      .order('workout_date', { ascending: true });

    if (error) {
      console.error('Error fetching workouts:', error);
      return [];
    }

    return data || [];
  };

  // Initial load
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    const today = new Date();
    const startDate = subWeeks(today, initialWeeks);

    const workouts = await fetchWorkouts(startDate, today);
    const entries = generateDateEntries(startDate, today, workouts);

    setDates(entries);
    setOldestLoadedDate(startDate);
    setIsLoading(false);
  }, [session?.user, initialWeeks, generateDateEntries]);

  // Load more history (prepend older dates)
  const loadMoreHistory = useCallback(async () => {
    if (isLoadingMoreRef.current || !oldestLoadedDate) return;

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    const newOldest = subWeeks(oldestLoadedDate, lazyLoadWeeks);
    const newEnd = subDays(oldestLoadedDate, 1);

    const workouts = await fetchWorkouts(newOldest, newEnd);
    const newEntries = generateDateEntries(newOldest, newEnd, workouts);

    // Track how many entries we're prepending for scroll adjustment
    const countPrepended = newEntries.length;

    // Prepend new entries, but need to update month labels
    setDates((prev) => {
      // The first entry of existing dates might need month label removed
      // if the new entries end with the same month
      const combined = [...newEntries, ...prev];

      // Recalculate month labels for the combined array
      let lastMonth = '';
      return combined.map((entry) => {
        const monthLabel = format(entry.date, 'MMM');
        const showMonth = monthLabel !== lastMonth;
        if (showMonth) lastMonth = monthLabel;
        return {
          ...entry,
          monthLabel: showMonth ? monthLabel : null,
        };
      });
    });

    // Set prepended count so CalendarPanel can adjust scroll
    setPrependedCount(countPrepended);

    setOldestLoadedDate(newOldest);
    setIsLoadingMore(false);
    isLoadingMoreRef.current = false;
  }, [oldestLoadedDate, lazyLoadWeeks, generateDateEntries]);

  // Check if we need to lazy load based on scroll position
  const checkLazyLoadTrigger = useCallback(
    (topVisibleIndex: number) => {
      // If user is within threshold days of oldest loaded date, load more
      if (topVisibleIndex <= lazyLoadThresholdDays && !isLoadingMoreRef.current) {
        loadMoreHistory();
      }
    },
    [lazyLoadThresholdDays, loadMoreHistory]
  );

  // Refresh data (reload current range)
  const refreshData = useCallback(async () => {
    if (!oldestLoadedDate) return;

    setIsLoading(true);
    const today = new Date();
    const workouts = await fetchWorkouts(oldestLoadedDate, today);
    const entries = generateDateEntries(oldestLoadedDate, today, workouts);
    setDates(entries);
    setIsLoading(false);
  }, [oldestLoadedDate, generateDateEntries]);

  // Load initial data on mount
  useEffect(() => {
    if (session?.user) {
      loadInitialData();
    }
  }, [session?.user]);

  return {
    dates,
    isLoading,
    isLoadingMore,
    oldestLoadedDate,
    loadMoreHistory,
    refreshData,
    checkLazyLoadTrigger,
    prependedCount,
    clearPrependedCount,
  };
}
