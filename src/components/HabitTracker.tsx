import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Check, Flame, TrendingUp, Target, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { HabitDetailView } from "./HabitDetailView";
import { z } from "zod";

// Zod validation schemas
const habitBaseSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Habit name is required")
    .max(50, "Habit name must be less than 50 characters"),
  frequency: z.enum(["daily", "weekly", "monthly", "custom"]),
  leavesAllowedPerMonth: z.number()
    .int("Must be a whole number")
    .min(0, "Cannot be negative")
    .max(31, "Cannot exceed 31 days"),
  status: z.enum(["active", "inactive"]),
});

const customFrequencySchema = z.object({
  customType: z.enum(["time-based", "count-based"]),
  daysPerWeek: z.number()
    .int("Must be a whole number")
    .min(1, "Must be at least 1 day")
    .max(7, "Cannot exceed 7 days"),
  minutesPerDay: z.number()
    .int("Must be a whole number")
    .min(1, "Must be at least 1 minute")
    .max(1440, "Cannot exceed 1440 minutes (24 hours)")
    .optional(),
  countPerDay: z.number()
    .int("Must be a whole number")
    .min(1, "Must be at least 1")
    .max(100, "Cannot exceed 100")
    .optional(),
}).refine(
  (data) => {
    if (data.customType === "time-based") {
      return data.minutesPerDay !== undefined && data.minutesPerDay > 0;
    }
    if (data.customType === "count-based") {
      return data.countPerDay !== undefined && data.countPerDay > 0;
    }
    return true;
  },
  {
    message: "Required field for selected custom type",
    path: ["customType"],
  }
);

const habitSchema = habitBaseSchema.extend({
  customType: z.enum(["time-based", "count-based"]).optional(),
  minutesPerDay: z.number().optional(),
  countPerDay: z.number().optional(),
  daysPerWeek: z.number().optional(),
}).superRefine((data, ctx) => {
  if (data.frequency === "custom") {
    const result = customFrequencySchema.safeParse(data);
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        ctx.addIssue(issue);
      });
    }
  }
});

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

type ValidationErrors = {
  [key: string]: string;
};

export const HabitTracker = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newHabit, setNewHabit] = useState({ 
    name: "", 
    frequency: "daily" as "daily" | "weekly" | "monthly" | "custom",
    customType: "time-based" as "time-based" | "count-based",
    minutesPerDay: 30,
    countPerDay: 1,
    daysPerWeek: 5,
    leavesAllowedPerMonth: 0,
    status: "active" as "active" | "inactive"
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ 
    name: "", 
    frequency: "daily" as "daily" | "weekly" | "monthly" | "custom",
    customType: "time-based" as "time-based" | "count-based",
    minutesPerDay: 30,
    countPerDay: 1,
    daysPerWeek: 5,
    leavesAllowedPerMonth: 0,
    status: "active" as "active" | "inactive"
  });
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [editValidationErrors, setEditValidationErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    const saved = localStorage.getItem("habits");
    if (saved) {
      setHabits(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("habits", JSON.stringify(habits));
  }, [habits]);

  const validateHabitForm = (formData: typeof newHabit, setErrors: (errors: ValidationErrors) => void): boolean => {
    try {
      habitSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: ValidationErrors = {};
        error.errors.forEach((err) => {
          const path = err.path.join(".");
          errors[path] = err.message;
        });
        setErrors(errors);
      }
      return false;
    }
  };

  const addHabit = () => {
    if (!validateHabitForm(newHabit, setValidationErrors)) {
      toast.error("Please fix the validation errors before submitting");
      return;
    }

    const baseHabit = {
      id: Date.now().toString(),
      name: newHabit.name,
      frequency: newHabit.frequency,
      leavesAllowedPerMonth: newHabit.leavesAllowedPerMonth,
      status: newHabit.status,
      completions: {},
      createdAt: new Date().toISOString(),
    };

    const habit: Habit = newHabit.frequency === "custom"
      ? {
          ...baseHabit,
          customType: newHabit.customType,
          daysPerWeek: newHabit.daysPerWeek,
          ...(newHabit.customType === "time-based" 
            ? { minutesPerDay: newHabit.minutesPerDay }
            : { countPerDay: newHabit.countPerDay }
          ),
        }
      : baseHabit;

    setHabits([...habits, habit]);
    setNewHabit({ 
      name: "", 
      frequency: "daily",
      customType: "time-based",
      minutesPerDay: 30,
      countPerDay: 1,
      daysPerWeek: 5,
      leavesAllowedPerMonth: 0,
      status: "active"
    });
    setValidationErrors({});
    setShowForm(false);
    toast.success("Habit added successfully!");
  };

  const startEditing = (habit: Habit) => {
    setEditingId(habit.id);
    setEditForm({
      name: habit.name,
      frequency: habit.frequency,
      customType: habit.customType || "time-based",
      minutesPerDay: habit.minutesPerDay || 30,
      countPerDay: habit.countPerDay || 1,
      daysPerWeek: habit.daysPerWeek || 5,
      leavesAllowedPerMonth: habit.leavesAllowedPerMonth,
      status: habit.status,
    });
  };

  const updateHabit = () => {
    if (!editingId) return;
    
    if (!validateHabitForm(editForm, setEditValidationErrors)) {
      toast.error("Please fix the validation errors before submitting");
      return;
    }

    const baseUpdate = {
      name: editForm.name,
      frequency: editForm.frequency,
      leavesAllowedPerMonth: editForm.leavesAllowedPerMonth,
      status: editForm.status,
    };

    const fullUpdate = editForm.frequency === "custom"
      ? {
          ...baseUpdate,
          customType: editForm.customType,
          daysPerWeek: editForm.daysPerWeek,
          ...(editForm.customType === "time-based" 
            ? { minutesPerDay: editForm.minutesPerDay, countPerDay: undefined }
            : { countPerDay: editForm.countPerDay, minutesPerDay: undefined }
          ),
        }
      : {
          ...baseUpdate,
          customType: undefined,
          minutesPerDay: undefined,
          countPerDay: undefined,
          daysPerWeek: undefined,
        };

    setHabits(
      habits.map((habit) =>
        habit.id === editingId
          ? { ...habit, ...fullUpdate }
          : habit
      )
    );
    setEditingId(null);
    toast.success("Habit updated successfully!");
  };

  const deleteHabit = (id: string) => {
    setHabits(habits.filter((habit) => habit.id !== id));
    setEditingId(null);
    toast.success("Habit deleted successfully!");
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
          <h3 className="text-lg font-semibold">Create New Habit</h3>
          
          <div className="space-y-2">
            <Label htmlFor="habit-name">Habit Name</Label>
            <Input
              id="habit-name"
              placeholder="Enter habit name"
              value={newHabit.name}
              onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
              onBlur={() => validateHabitForm(newHabit, setValidationErrors)}
              className={validationErrors.name ? "border-destructive" : ""}
              maxLength={50}
            />
            {validationErrors.name && (
              <p className="text-sm text-destructive">{validationErrors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Frequency</Label>
            <Select value={newHabit.frequency} onValueChange={(value: "daily" | "weekly" | "monthly" | "custom") => setNewHabit({ ...newHabit, frequency: value })}>
              <SelectTrigger id="frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {newHabit.frequency === "custom" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="custom-type">Goal Type</Label>
                <Select value={newHabit.customType} onValueChange={(value: "time-based" | "count-based") => setNewHabit({ ...newHabit, customType: value })}>
                  <SelectTrigger id="custom-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="time-based">x minutes per day, y days a week</SelectItem>
                    <SelectItem value="count-based">x count per day, y days a week</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {newHabit.customType === "time-based" ? (
                  <div className="space-y-2">
                    <Label htmlFor="minutes-per-day">Minutes per Day</Label>
                    <Input
                      id="minutes-per-day"
                      type="number"
                      min="1"
                      max="1440"
                      step="1"
                      value={newHabit.minutesPerDay}
                      onChange={(e) => setNewHabit({ ...newHabit, minutesPerDay: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                      onBlur={() => validateHabitForm(newHabit, setValidationErrors)}
                      className={validationErrors.minutesPerDay ? "border-destructive" : ""}
                    />
                    {validationErrors.minutesPerDay && (
                      <p className="text-sm text-destructive">{validationErrors.minutesPerDay}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="count-per-day">Count per Day</Label>
                    <Input
                      id="count-per-day"
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      value={newHabit.countPerDay}
                      onChange={(e) => setNewHabit({ ...newHabit, countPerDay: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                      onBlur={() => validateHabitForm(newHabit, setValidationErrors)}
                      className={validationErrors.countPerDay ? "border-destructive" : ""}
                    />
                    {validationErrors.countPerDay && (
                      <p className="text-sm text-destructive">{validationErrors.countPerDay}</p>
                    )}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="days-per-week">Days per Week</Label>
                  <Input
                    id="days-per-week"
                    type="number"
                    min="1"
                    max="7"
                    step="1"
                    value={newHabit.daysPerWeek}
                    onChange={(e) => setNewHabit({ ...newHabit, daysPerWeek: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                    onBlur={() => validateHabitForm(newHabit, setValidationErrors)}
                    className={validationErrors.daysPerWeek ? "border-destructive" : ""}
                  />
                  {validationErrors.daysPerWeek && (
                    <p className="text-sm text-destructive">{validationErrors.daysPerWeek}</p>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="leaves-allowed">Leaves Allowed per Month</Label>
            <Input
              id="leaves-allowed"
              type="number"
              min="0"
              max="31"
              step="1"
              value={newHabit.leavesAllowedPerMonth}
              onChange={(e) => setNewHabit({ ...newHabit, leavesAllowedPerMonth: e.target.value === '' ? 0 : parseInt(e.target.value) })}
              onBlur={() => validateHabitForm(newHabit, setValidationErrors)}
              className={validationErrors.leavesAllowedPerMonth ? "border-destructive" : ""}
            />
            {validationErrors.leavesAllowedPerMonth && (
              <p className="text-sm text-destructive">{validationErrors.leavesAllowedPerMonth}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={newHabit.status} onValueChange={(value: "active" | "inactive") => setNewHabit({ ...newHabit, status: value })}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={addHabit} className="flex-1">
              Create Habit
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-4">
        {habits.map((habit) => (
          <div key={habit.id}>
            {editingId === habit.id ? (
              <Card className="p-6 space-y-4 animate-in fade-in duration-200">
                <h3 className="text-lg font-semibold">Edit Habit</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-habit-name">Habit Name</Label>
                  <Input
                    id="edit-habit-name"
                    placeholder="Enter habit name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    onBlur={() => validateHabitForm(editForm, setEditValidationErrors)}
                    className={editValidationErrors.name ? "border-destructive" : ""}
                    maxLength={50}
                  />
                  {editValidationErrors.name && (
                    <p className="text-sm text-destructive">{editValidationErrors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-frequency">Frequency</Label>
                  <Select value={editForm.frequency} onValueChange={(value: "daily" | "weekly" | "monthly" | "custom") => setEditForm({ ...editForm, frequency: value })}>
                    <SelectTrigger id="edit-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editForm.frequency === "custom" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="edit-custom-type">Goal Type</Label>
                      <Select value={editForm.customType} onValueChange={(value: "time-based" | "count-based") => setEditForm({ ...editForm, customType: value })}>
                        <SelectTrigger id="edit-custom-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="time-based">x minutes per day, y days a week</SelectItem>
                          <SelectItem value="count-based">x count per day, y days a week</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {editForm.customType === "time-based" ? (
                        <div className="space-y-2">
                          <Label htmlFor="edit-minutes-per-day">Minutes per Day</Label>
                          <Input
                            id="edit-minutes-per-day"
                            type="number"
                            min="1"
                            max="1440"
                            step="1"
                            value={editForm.minutesPerDay}
                            onChange={(e) => setEditForm({ ...editForm, minutesPerDay: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                            onBlur={() => validateHabitForm(editForm, setEditValidationErrors)}
                            className={editValidationErrors.minutesPerDay ? "border-destructive" : ""}
                          />
                          {editValidationErrors.minutesPerDay && (
                            <p className="text-sm text-destructive">{editValidationErrors.minutesPerDay}</p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label htmlFor="edit-count-per-day">Count per Day</Label>
                          <Input
                            id="edit-count-per-day"
                            type="number"
                            min="1"
                            max="100"
                            step="1"
                            value={editForm.countPerDay}
                            onChange={(e) => setEditForm({ ...editForm, countPerDay: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                            onBlur={() => validateHabitForm(editForm, setEditValidationErrors)}
                            className={editValidationErrors.countPerDay ? "border-destructive" : ""}
                          />
                          {editValidationErrors.countPerDay && (
                            <p className="text-sm text-destructive">{editValidationErrors.countPerDay}</p>
                          )}
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <Label htmlFor="edit-days-per-week">Days per Week</Label>
                        <Input
                          id="edit-days-per-week"
                          type="number"
                          min="1"
                          max="7"
                          step="1"
                          value={editForm.daysPerWeek}
                          onChange={(e) => setEditForm({ ...editForm, daysPerWeek: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                          onBlur={() => validateHabitForm(editForm, setEditValidationErrors)}
                          className={editValidationErrors.daysPerWeek ? "border-destructive" : ""}
                        />
                        {editValidationErrors.daysPerWeek && (
                          <p className="text-sm text-destructive">{editValidationErrors.daysPerWeek}</p>
                        )}
                      </div>
                    </div>
                </>
              )}

              <div className="space-y-2">
                  <Label htmlFor="edit-leaves-allowed">Leaves Allowed per Month</Label>
                  <Input
                    id="edit-leaves-allowed"
                    type="number"
                    min="0"
                    max="31"
                    step="1"
                    value={editForm.leavesAllowedPerMonth}
                    onChange={(e) => setEditForm({ ...editForm, leavesAllowedPerMonth: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                    onBlur={() => validateHabitForm(editForm, setEditValidationErrors)}
                    className={editValidationErrors.leavesAllowedPerMonth ? "border-destructive" : ""}
                  />
                  {editValidationErrors.leavesAllowedPerMonth && (
                    <p className="text-sm text-destructive">{editValidationErrors.leavesAllowedPerMonth}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select value={editForm.status} onValueChange={(value: "active" | "inactive") => setEditForm({ ...editForm, status: value })}>
                    <SelectTrigger id="edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={updateHabit} className="flex-1">
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={() => deleteHabit(habit.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ) : (
              <Card
                className="p-6 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedHabit(habit)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-foreground">{habit.name}</h3>
                      <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                        {habit.frequency === "custom" 
                          ? (habit.customType === "time-based" 
                              ? `${habit.minutesPerDay} mins/day, ${habit.daysPerWeek} days/week`
                              : `${habit.countPerDay} count/day, ${habit.daysPerWeek} days/week`)
                          : habit.frequency.charAt(0).toUpperCase() + habit.frequency.slice(1)}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${habit.status === 'active' ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-600'}`}>
                        {habit.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {habit.frequency === "custom" && `${habit.leavesAllowedPerMonth} leaves/month`}
                      {habit.frequency !== "custom" && habit.frequency.charAt(0).toUpperCase() + habit.frequency.slice(1)}
                    </p>
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
                  <div className="flex gap-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(habit);
                      }}
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleHabit(habit.id);
                      }}
                      variant={isCompletedToday(habit) ? "default" : "outline"}
                      size="lg"
                      className="rounded-full w-12 h-12"
                    >
                      <Check className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
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

      {selectedHabit && (
      <HabitDetailView
        habit={selectedHabit}
        open={!!selectedHabit}
        onOpenChange={(open) => !open && setSelectedHabit(null)}
        onToggleCompletion={toggleHabit}
      />
      )}
    </div>
  );
};
