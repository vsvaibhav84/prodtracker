import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DateRange } from "react-day-picker";
import { format, startOfDay, endOfDay, eachDayOfInterval } from "date-fns";

export interface AnalyticsData {
  bestStreak: number;
  completionRate: number;
  mostProductiveDay: string;
  weeklyProgress: Array<{
    day: string;
    completed: number;
    date: string;
  }>;
  dailyDetails: Record<string, Array<{
    name: string;
    completed: boolean;
  }>> | null;
}

export const useAnalytics = (dateRange: DateRange | undefined) => {
  return useQuery({
    queryKey: ["habit-analytics", dateRange],
    queryFn: async (): Promise<AnalyticsData> => {
      const { data: habits, error } = await supabase
        .from("habits")
        .select("*")
        .eq("archived", false);

      if (error) throw error;

      if (!habits || habits.length === 0) {
        return {
          bestStreak: 0,
          completionRate: 0,
          mostProductiveDay: "N/A",
          weeklyProgress: [],
          dailyDetails: null,
        };
      }

      const from = dateRange?.from || new Date();
      const to = dateRange?.to || new Date();
      
      const dateArray = eachDayOfInterval({
        start: startOfDay(from),
        end: endOfDay(to),
      });

      // Calculate daily progress
      const dailyDetails: Record<string, Array<{ name: string; completed: boolean }>> = {};
      const dailyCompletions: Record<string, number> = {};
      const dayCounts: Record<string, number> = {};

      dateArray.forEach((date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        dailyDetails[dateStr] = [];
        dailyCompletions[dateStr] = 0;
        dayCounts[dateStr] = 0;
      });

      habits.forEach((habit) => {
        const completionDates = (habit.completion_dates || []) as string[];
        
        dateArray.forEach((date) => {
          const dateStr = format(date, "yyyy-MM-dd");
          const isCompleted = completionDates.includes(dateStr);
          
          dailyDetails[dateStr].push({
            name: habit.name,
            completed: isCompleted,
          });

          if (isCompleted) {
            dailyCompletions[dateStr]++;
          }
          dayCounts[dateStr]++;
        });
      });

      // Weekly progress for chart
      const weeklyProgress = dateArray.map((date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        return {
          day: format(date, "EEE"),
          completed: dailyCompletions[dateStr] || 0,
          date: dateStr,
        };
      });

      // Calculate completion rate
      const totalPossible = dateArray.length * habits.length;
      const totalCompleted = Object.values(dailyCompletions).reduce((sum, count) => sum + count, 0);
      const completionRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

      // Find most productive day
      const dayOfWeekCounts: Record<string, { completed: number; total: number }> = {};
      dateArray.forEach((date) => {
        const dayName = format(date, "EEEE");
        const dateStr = format(date, "yyyy-MM-dd");
        
        if (!dayOfWeekCounts[dayName]) {
          dayOfWeekCounts[dayName] = { completed: 0, total: 0 };
        }
        
        dayOfWeekCounts[dayName].completed += dailyCompletions[dateStr] || 0;
        dayOfWeekCounts[dayName].total += dayCounts[dateStr] || 0;
      });

      let mostProductiveDay = "N/A";
      let highestRate = 0;
      
      Object.entries(dayOfWeekCounts).forEach(([day, counts]) => {
        const rate = counts.total > 0 ? (counts.completed / counts.total) : 0;
        if (rate > highestRate) {
          highestRate = rate;
          mostProductiveDay = day;
        }
      });

      // Calculate best streak
      let bestStreak = 0;
      let currentStreak = 0;
      
      dateArray.forEach((date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        const expectedCount = habits.length;
        const actualCount = dailyCompletions[dateStr] || 0;
        
        if (actualCount === expectedCount && expectedCount > 0) {
          currentStreak++;
          bestStreak = Math.max(bestStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      });

      return {
        bestStreak,
        completionRate,
        mostProductiveDay,
        weeklyProgress,
        dailyDetails,
      };
    },
    enabled: !!dateRange,
  });
};
