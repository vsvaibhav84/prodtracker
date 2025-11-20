import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Flame, Target, TrendingUp, CheckCircle2, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, getDaysInMonth, isToday, subMonths, addMonths } from "date-fns";

interface Habit {
  id: string;
  name: string;
  frequency: "daily" | "weekly" | "monthly" | "custom";
  
  // Only applicable when frequency is "custom"
  customType?: "time-based" | "count-based";
  
  // For time-based custom (x minutes per day, y days per week)
  minutesPerDay?: number;
  
  // For count-based custom (x count per day, y days per week)
  countPerDay?: number;
  
  // For custom frequency types
  daysPerWeek?: number;
  
  // Common fields
  leavesAllowedPerMonth: number;
  status: "active" | "inactive";
  completions: { [date: string]: boolean };
  createdAt: string;
}

interface HabitDetailViewProps {
  habit: Habit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleCompletion: (habitId: string, date: string) => void;
}

export const HabitDetailView = ({ habit, open, onOpenChange, onToggleCompletion }: HabitDetailViewProps) => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  const [viewedMonth, setViewedMonth] = useState(new Date());
  
  const goToPreviousMonth = () => {
    setViewedMonth(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setViewedMonth(prev => addMonths(prev, 1));
  };

  const goToToday = () => {
    setViewedMonth(new Date());
  };
  
  // Calculate monthly check-ins
  const getMonthlyCheckIns = () => {
    let count = 0;
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = format(d, 'yyyy-MM-dd');
      if (habit.completions[dateStr]) count++;
    }
    return count;
  };

  // Calculate total check-ins
  const getTotalCheckIns = () => {
    return Object.values(habit.completions).filter(Boolean).length;
  };

  // Calculate monthly check-in rate
  const getMonthlyRate = () => {
    const daysInMonth = getDaysInMonth(today);
    const monthlyCheckIns = getMonthlyCheckIns();
    return Math.round((monthlyCheckIns / daysInMonth) * 100);
  };

  // Calculate current streak
  const getCurrentStreak = () => {
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      if (habit.completions[dateStr]) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  // Calculate leaves taken this month
  const getLeavesThisMonth = () => {
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    let leavesCount = 0;
    
    for (let d = new Date(start); d <= end && d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = format(d, 'yyyy-MM-dd');
      // Count days that were NOT completed
      if (!habit.completions[dateStr]) {
        leavesCount++;
      }
    }
    
    return leavesCount;
  };

  // Get last 7 days for week view
  const getWeekView = () => {
    const week = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      week.push({
        date: date,
        dateStr: dateStr,
        completed: habit.completions[dateStr] || false,
        label: format(date, 'EEE'),
        day: format(date, 'd')
      });
    }
    return week;
  };

  const monthlyCheckIns = getMonthlyCheckIns();
  const totalCheckIns = getTotalCheckIns();
  const monthlyRate = getMonthlyRate();
  const currentStreak = getCurrentStreak();
  const leavesThisMonth = getLeavesThisMonth();
  const daysInMonth = getDaysInMonth(today);
  const weekView = getWeekView();

  // Custom day renderer for calendar
  const modifiers = {
    completed: Object.keys(habit.completions)
      .filter(date => habit.completions[date])
      .map(date => new Date(date))
  };

  const modifiersStyles = {
    completed: {
      backgroundColor: 'hsl(var(--primary))',
      color: 'hsl(var(--primary-foreground))',
      fontWeight: 'bold',
      borderRadius: '50%'
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto w-full">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{habit.name}</DialogTitle>
        </DialogHeader>

        <div className="grid lg:grid-cols-2 gap-6 mt-4">
          {/* Left Panel - Calendar */}
          <div className="space-y-6">
            {/* Week View */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Last 7 Days</h3>
              <div className="grid grid-cols-7 gap-2">
                {weekView.map((day) => (
                  <div
                    key={day.dateStr}
                    className="flex flex-col items-center gap-1"
                  >
                    <span className="text-xs text-muted-foreground">{day.label}</span>
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        day.completed
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      } ${isToday(day.date) ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                    >
                      {day.day}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Month Calendar */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Month Calendar</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                  className="text-xs"
                >
                  Today
                </Button>
              </div>
              
              <Card className="p-4">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToPreviousMonth}
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  
                  <h4 className="text-lg font-semibold min-w-[200px] text-center">
                    {format(viewedMonth, 'MMMM yyyy')}
                  </h4>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToNextMonth}
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
                
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    month={viewedMonth}
                    onMonthChange={setViewedMonth}
                    modifiers={modifiers}
                    modifiersStyles={modifiersStyles}
                    className="pointer-events-auto"
                    components={{
                      Caption: () => null,
                    }}
                    onDayClick={(date) => {
                      const dateStr = format(date, 'yyyy-MM-dd');
                      onToggleCompletion(habit.id, dateStr);
                    }}
                  />
                </div>
              </Card>
            </div>
          </div>

          {/* Right Panel - Statistics */}
          <div className="space-y-4">
            {/* Habit Icon/Avatar */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                <Target className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{habit.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {habit.frequency === "custom" 
                    ? (habit.customType === "time-based" 
                        ? `${habit.minutesPerDay} mins/day, ${habit.daysPerWeek} days/week`
                        : `${habit.countPerDay} count/day, ${habit.daysPerWeek} days/week`)
                    : habit.frequency.charAt(0).toUpperCase() + habit.frequency.slice(1)}
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Monthly Check-Ins</span>
                </div>
                <span className="text-2xl font-bold">{monthlyCheckIns}</span>
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Total Check-Ins</span>
                </div>
                <span className="text-2xl font-bold">{totalCheckIns}</span>
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Monthly Rate</span>
                </div>
                <span className="text-2xl font-bold">{monthlyRate}%</span>
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-warning" />
                  <span className="text-sm text-muted-foreground">Current Streak</span>
                </div>
                <span className="text-2xl font-bold">{currentStreak}</span>
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Leaves This Month</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{leavesThisMonth}</span>
                  <span className="text-sm text-muted-foreground">/ {habit.leavesAllowedPerMonth}</span>
                </div>
              </div>
              
              {leavesThisMonth > habit.leavesAllowedPerMonth && (
                <div className="text-xs text-destructive">
                  Exceeded monthly leave allowance
                </div>
              )}
              {leavesThisMonth === habit.leavesAllowedPerMonth && (
                <div className="text-xs text-warning">
                  All leaves used this month
                </div>
              )}
            </Card>

            {/* Progress Indicator */}
            <Card className="p-4 bg-primary/5">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">
                  {monthlyCheckIns}/{daysInMonth}
                </div>
                <div className="text-sm text-muted-foreground">
                  {daysInMonth - today.getDate()} days left this month
                </div>
              </div>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
