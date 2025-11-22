import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Trophy, Target, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DateRangePicker } from "./DateRangePicker";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";
import { useAnalytics } from "@/hooks/useAnalytics";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

interface HabitAnalyticsProps {
  data: any; // Using any for now to avoid type duplication, ideally import AnalyticsData
}

export const HabitAnalytics = ({ data: initialData }: HabitAnalyticsProps) => {
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 6),
    to: new Date(),
  });
  
  // Re-fetch analytics based on local date state
  const { data: localData } = useAnalytics(date);
  
  // Use localData if available (for filtering), otherwise fallback to initialData
  const displayData = localData || initialData;

  const [selectedDay, setSelectedDay] = useState<{ date: string; label: string } | null>(null);

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const payload = data.activePayload[0].payload;
      setSelectedDay({
        date: payload.date,
        label: payload.day
      });
    }
  };

  const dailyHabits = selectedDay && displayData.dailyDetails 
    ? displayData.dailyDetails[selectedDay.date] 
    : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-end">
        <DateRangePicker date={date} setDate={setDate} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
            <Trophy className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Best Streak</p>
            <h3 className="text-2xl font-bold">{displayData.bestStreak} Days</h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
            <Target className="h-6 w-6 text-green-600 dark:text-green-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Completion Rate</p>
            <h3 className="text-2xl font-bold">{displayData.completionRate}%</h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
            <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Best Day</p>
            <h3 className="text-2xl font-bold">{displayData.mostProductiveDay}</h3>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6">Habit Progress (Click bar for details)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayData.weeklyProgress} onClick={handleBarClick} className="cursor-pointer">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="day" className="text-xs" />
              <YAxis allowDecimals={false} className="text-xs" />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Habits for {selectedDay?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {dailyHabits && dailyHabits.length > 0 ? (
              dailyHabits.map((habit: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="font-medium">{habit.name}</span>
                  {habit.completed ? (
                    <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      <XCircle className="w-3 h-3 mr-1" /> Missed
                    </Badge>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground">No habits tracked for this day.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
