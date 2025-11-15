import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Check, Flame, TrendingUp, Target } from "lucide-react";
import { toast } from "sonner";

interface Habit {
  id: string;
  name: string;
  description?: string;
  frequency: string;
  completions: { [date: string]: boolean };
  createdAt: string;
}

export const HabitTracker = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newHabit, setNewHabit] = useState({ name: "", description: "", frequency: "daily" });

  useEffect(() => {
    const saved = localStorage.getItem("habits");
    if (saved) {
      setHabits(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("habits", JSON.stringify(habits));
  }, [habits]);

  const addHabit = () => {
    if (!newHabit.name.trim()) return;

    const habit: Habit = {
      id: Date.now().toString(),
      name: newHabit.name,
      description: newHabit.description,
      frequency: newHabit.frequency,
      completions: {},
      createdAt: new Date().toISOString(),
    };

    setHabits([...habits, habit]);
    setNewHabit({ name: "", description: "", frequency: "daily" });
    setShowForm(false);
    toast.success("Habit added successfully!");
  };

  const toggleHabit = (id: string) => {
    const today = new Date().toISOString().split("T")[0];
    setHabits(
      habits.map((habit) => {
        if (habit.id === id) {
          const newCompletions = { ...habit.completions };
          newCompletions[today] = !newCompletions[today];
          return { ...habit, completions: newCompletions };
        }
        return habit;
      })
    );
  };

  const getStreak = (habit: Habit) => {
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      
      if (habit.completions[dateStr]) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const getTotalCompletions = (habit: Habit) => {
    return Object.values(habit.completions).filter(Boolean).length;
  };

  const isCompletedToday = (habit: Habit) => {
    const today = new Date().toISOString().split("T")[0];
    return habit.completions[today] || false;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Habits</h2>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Habit
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 space-y-4 animate-in fade-in duration-200">
          <Input
            placeholder="Habit name"
            value={newHabit.name}
            onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
          />
          <Textarea
            placeholder="Description (optional)"
            value={newHabit.description}
            onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })}
          />
          <select
            className="w-full px-3 py-2 bg-background border border-input rounded-md"
            value={newHabit.frequency}
            onChange={(e) => setNewHabit({ ...newHabit, frequency: e.target.value })}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <div className="flex gap-2">
            <Button onClick={addHabit} className="flex-1">
              Add Habit
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-4">
        {habits.map((habit) => (
          <Card
            key={habit.id}
            className="p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-foreground">{habit.name}</h3>
                  <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                    {habit.frequency}
                  </span>
                </div>
                {habit.description && (
                  <p className="text-sm text-muted-foreground">{habit.description}</p>
                )}
                <div className="flex items-center gap-6 pt-2">
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-warning" />
                    <span className="text-sm font-medium">{getStreak(habit)} day streak</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      {getTotalCompletions(habit)} total
                    </span>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => toggleHabit(habit.id)}
                variant={isCompletedToday(habit) ? "default" : "outline"}
                size="lg"
                className="rounded-full w-12 h-12"
              >
                <Check className="h-5 w-5" />
              </Button>
            </div>
          </Card>
        ))}
        
        {habits.length === 0 && !showForm && (
          <Card className="p-12 text-center">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No habits yet</h3>
            <p className="text-muted-foreground mb-4">
              Start building better habits today
            </p>
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Habit
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};
