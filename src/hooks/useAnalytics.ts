import { useState, useEffect } from "react";
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, subDays, startOfDay, endOfDay, isWithinInterval, parseISO } from "date-fns";

export interface AnalyticsData {
  completionRate: number;
  totalHabits: number;
  totalTasksCompleted: number;
  currentStreak: number;
  bestStreak: number;
  mostProductiveDay: string;
  weeklyProgress: { day: string; completed: number; total: number; date: string }[];
  taskDistribution: { name: string; value: number; color: string }[];
  dailyDetails: Record<string, { name: string; completed: boolean }[]>;
}

interface DateRange {
  from: Date;
  to?: Date;
}

export const useAnalytics = (dateRange?: DateRange) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculateAnalytics = () => {
      try {
        // 1. Fetch Data
        const habitsStr = localStorage.getItem("habits");
        const tasksStr = localStorage.getItem("tasks-matrix");
        
        const habits = habitsStr ? JSON.parse(habitsStr) : [];
        const tasksMatrix = tasksStr ? JSON.parse(tasksStr) : {
          'urgent-important': [],
          'not-urgent-important': [],
          'urgent-not-important': [],
          'not-urgent-not-important': []
        };

        const today = new Date();
        // Default to last 7 days if no range provided
        const start = dateRange?.from ? startOfDay(dateRange.from) : startOfWeek(today, { weekStartsOn: 1 });
        // If to is undefined but from is defined, default end to end of start day (single day selection)
        // Otherwise default to end of current week
        const end = dateRange?.to 
          ? endOfDay(dateRange.to) 
          : (dateRange?.from ? endOfDay(dateRange.from) : endOfWeek(today, { weekStartsOn: 1 }));

        // 2. Calculate Habit Stats (Scoped to Range)
        let totalCompletions = 0;
        let totalPossibleCompletions = 0;
        const daysInterval = eachDayOfInterval({ start, end });
        const dailyDetails: Record<string, { name: string; completed: boolean }[]> = {};

        daysInterval.forEach(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          dailyDetails[dateStr] = [];
          
          habits.forEach((habit: any) => {
            // Check if habit should be active on this day (simplified: assume all active)
            // In a real app, check creation date and frequency
            totalPossibleCompletions++;
            const isCompleted = habit.completions[dateStr];
            if (isCompleted) {
              totalCompletions++;
            }
            dailyDetails[dateStr].push({
              name: habit.name,
              completed: !!isCompleted
            });
          });
        });

        const completionRate = totalPossibleCompletions > 0 
          ? Math.round((totalCompletions / totalPossibleCompletions) * 100) 
          : 0;

        // 3. Calculate Streaks (Global - All Time)
        // Streaks should generally be all-time, but if user wants range-specific, we could adjust.
        // For now, keeping Best Streak as All-Time, but Current Streak is from Today.
        let currentStreak = 0;
        let bestStreak = 0;
        let tempStreak = 0;
        
        // Check last 365 days for streaks to be safe
        for (let i = 0; i < 365; i++) {
          const d = subDays(today, i);
          const dateStr = format(d, 'yyyy-MM-dd');
          const anyCompleted = habits.some((h: any) => h.completions[dateStr]);
          
          if (anyCompleted) {
            tempStreak++;
          } else {
            bestStreak = Math.max(bestStreak, tempStreak);
            tempStreak = 0;
          }
          
          if (i === currentStreak && anyCompleted) { // Contiguous from today
             currentStreak++;
          }
        }
        bestStreak = Math.max(bestStreak, tempStreak);

        // 4. Progress Chart (Scoped to Range)
        // If range is large, we might want to group by week/month, but for now daily is fine
        const weeklyProgress = daysInterval.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const completedCount = habits.reduce((acc: number, h: any) => 
            acc + (h.completions[dateStr] ? 1 : 0), 0);
          
          return {
            day: format(day, 'EEE'), // Mon, Tue...
            date: dateStr,
            completed: completedCount,
            total: habits.length
          };
        });

        // 5. Most Productive Day (All Time)
        const dayCounts: Record<string, number> = {
          'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0
        };
        
        habits.forEach((habit: any) => {
          Object.keys(habit.completions).forEach(dateStr => {
            if (habit.completions[dateStr]) {
              const dayName = format(new Date(dateStr), 'EEE');
              if (dayCounts[dayName] !== undefined) {
                dayCounts[dayName]++;
              }
            }
          });
        });
        
        const mostProductiveDay = Object.entries(dayCounts).reduce((a, b) => 
          a[1] > b[1] ? a : b
        )[0];

        // 6. Task Stats (All Time - Tasks don't have completion dates in this simple model usually)
        // If tasks had completion dates, we could filter. Assuming all-time for now.
        const allTasks = [
          ...tasksMatrix['urgent-important'],
          ...tasksMatrix['not-urgent-important'],
          ...tasksMatrix['urgent-not-important'],
          ...tasksMatrix['not-urgent-not-important']
        ];
        
        const totalTasksCompleted = allTasks.filter((t: any) => t.completed).length;

        const taskDistribution = [
          { name: 'Do First', value: tasksMatrix['urgent-important'].length, color: '#ef4444' },
          { name: 'Schedule', value: tasksMatrix['not-urgent-important'].length, color: '#3b82f6' },
          { name: 'Delegate', value: tasksMatrix['urgent-not-important'].length, color: '#eab308' },
          { name: 'Eliminate', value: tasksMatrix['not-urgent-not-important'].length, color: '#6b7280' },
        ].filter(item => item.value > 0);

        setData({
          completionRate,
          totalHabits: habits.length,
          totalTasksCompleted,
          currentStreak,
          bestStreak,
          mostProductiveDay,
          weeklyProgress,
          taskDistribution,
          dailyDetails
        });
        setLoading(false);
      } catch (error) {
        console.error("Failed to calculate analytics", error);
        setLoading(false);
      }
    };

    calculateAnalytics();
    
    window.addEventListener('storage', calculateAnalytics);
    return () => window.removeEventListener('storage', calculateAnalytics);
  }, [dateRange]); // Re-run when dateRange changes

  return { data, loading };
};
