import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Check, Flame, TrendingUp, Target, Pencil, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { HabitDetailView } from "./HabitDetailView";
import { z } from "zod";

// Category types and configuration
type HabitCategory = 
  | "health-fitness"
  | "learning"
  | "productivity"
  | "wellness"
  | "social"
  | "finance"
  | "hobbies"
  | "home"
  | "other";

interface CategoryConfig {
  id: HabitCategory;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

const HABIT_CATEGORIES: CategoryConfig[] = [
  { 
    id: "health-fitness", 
    label: "Health & Fitness", 
    icon: "💪",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/30"
  },
  { 
    id: "learning", 
    label: "Learning", 
    icon: "📚",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30"
  },
  { 
    id: "productivity", 
    label: "Productivity", 
    icon: "💼",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/30"
  },
  { 
    id: "wellness", 
    label: "Wellness", 
    icon: "🧘",
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-50 dark:bg-pink-950/30"
  },
  { 
    id: "social", 
    label: "Social", 
    icon: "👥",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/30"
  },
  { 
    id: "finance", 
    label: "Finance", 
    icon: "💰",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30"
  },
  { 
    id: "hobbies", 
    label: "Hobbies", 
    icon: "🎨",
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-50 dark:bg-rose-950/30"
  },
  { 
    id: "home", 
    label: "Home", 
    icon: "🏠",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/30"
  },
  { 
    id: "other", 
    label: "Other", 
    icon: "📌",
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-50 dark:bg-gray-950/30"
  },
];

const getCategoryConfig = (categoryId: HabitCategory): CategoryConfig => {
  return HABIT_CATEGORIES.find(cat => cat.id === categoryId) || HABIT_CATEGORIES[HABIT_CATEGORIES.length - 1];
};

// Zod validation schemas
const habitBaseSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Habit name is required")
    .max(50, "Habit name must be less than 50 characters"),
  category: z.enum([
    "health-fitness",
    "learning", 
    "productivity",
    "wellness",
    "social",
    "finance",
    "hobbies",
    "home",
    "other"
  ]),
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
  category: HabitCategory;
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
    category: "other" as HabitCategory,
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
    category: "other" as HabitCategory,
    frequency: "daily" as "daily" | "weekly" | "monthly" | "custom",
    customType: "time-based" as "time-based" | "count-based",
    minutesPerDay: 30,
    countPerDay: 1,
    daysPerWeek: 5,
    leavesAllowedPerMonth: 0,
    status: "active" as "active" | "inactive"
  });
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<HabitCategory | "all">("all");
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [editValidationErrors, setEditValidationErrors] = useState<ValidationErrors>({});
  const [draggedHabit, setDraggedHabit] = useState<string | null>(null);
  const [dragOverHabit, setDragOverHabit] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("habits");
    if (saved) {
      const storedHabits = JSON.parse(saved);
      // Migration: add category to existing habits
      const migratedHabits = storedHabits.map((habit: Habit) => ({
        ...habit,
        category: habit.category || "other"
      }));
      setHabits(migratedHabits);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("habits", JSON.stringify(habits));
  }, [habits]);

  // Keep selectedHabit in sync with the habits array for immediate visual feedback
  useEffect(() => {
    if (selectedHabit) {
      const updatedHabit = habits.find(h => h.id === selectedHabit.id);
      if (updatedHabit) {
        setSelectedHabit(updatedHabit);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits]); // Only depend on habits, not selectedHabit to avoid infinite loop

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
      category: newHabit.category,
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
      category: "other",
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
      category: habit.category,
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
      category: editForm.category,
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

  const toggleHabit = (id: string, date?: string) => {
    const targetDate = date || new Date().toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];
    
    // Prevent logging for future dates
    if (targetDate > today) {
      toast.error("Cannot log habits for future dates");
      return;
    }
    
    setHabits(
      habits.map((habit) => {
        if (habit.id === id) {
          const newCompletions = { ...habit.completions };
          newCompletions[targetDate] = !newCompletions[targetDate];
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

  // Filter habits by category
  const filteredHabits = selectedCategoryFilter === "all" 
    ? habits 
    : habits.filter(h => h.category === selectedCategoryFilter);

  // Drag handlers for reordering
  const handleDragStart = (e: React.DragEvent, habitId: string) => {
    setDraggedHabit(habitId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, habitId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverHabit(habitId);
  };

  const handleDrop = (e: React.DragEvent, targetHabitId: string) => {
    e.preventDefault();
    
    if (!draggedHabit || draggedHabit === targetHabitId) {
      setDraggedHabit(null);
      setDragOverHabit(null);
      return;
    }

    // Find indices in the FILTERED habits array
    const draggedIndex = filteredHabits.findIndex(h => h.id === draggedHabit);
    const targetIndex = filteredHabits.findIndex(h => h.id === targetHabitId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Create a new array with reordered habits
    const reorderedFiltered = [...filteredHabits];
    const [draggedItem] = reorderedFiltered.splice(draggedIndex, 1);
    reorderedFiltered.splice(targetIndex, 0, draggedItem);

    // Now we need to merge this back into the full habits array
    // maintaining the order of filtered habits and position of non-filtered habits
    const newHabits = [...habits];
    
    // If filtering by category, only reorder within that category
    if (selectedCategoryFilter !== "all") {
      // Remove all habits of the filtered category
      const otherHabits = newHabits.filter(h => h.category !== selectedCategoryFilter);
      
      // Find the position of the first habit of this category in the original array
      const firstCategoryIndex = newHabits.findIndex(h => h.category === selectedCategoryFilter);
      
      // Insert reordered category habits at the original position
      if (firstCategoryIndex !== -1) {
        const before = otherHabits.slice(0, otherHabits.findIndex((_, i, arr) => {
          // Find where to insert based on original positions
          return newHabits.indexOf(arr[i]) > firstCategoryIndex;
        }));
        const after = otherHabits.slice(before.length);
        setHabits([...before, ...reorderedFiltered, ...after]);
      } else {
        setHabits([...otherHabits, ...reorderedFiltered]);
      }
    } else {
      // If "all" filter is active, simply use the reordered array
      setHabits(reorderedFiltered);
    }

    setDraggedHabit(null);
    setDragOverHabit(null);
    toast.success("Habit order updated!");
  };

  const handleDragEnd = () => {
    setDraggedHabit(null);
    setDragOverHabit(null);
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

      {/* Category Filter */}
      {habits.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={selectedCategoryFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategoryFilter("all")}
          >
            All ({habits.length})
          </Button>
          {HABIT_CATEGORIES.map((cat) => {
            const count = habits.filter(h => h.category === cat.id).length;
            if (count === 0) return null;
            return (
              <Button
                key={cat.id}
                variant={selectedCategoryFilter === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategoryFilter(cat.id)}
              >
                <span className="mr-1">{cat.icon}</span>
                {cat.label} ({count})
              </Button>
            );
          })}
        </div>
      )}

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
            <Label htmlFor="category">Category</Label>
            <Select 
              value={newHabit.category} 
              onValueChange={(value: HabitCategory) => setNewHabit({ ...newHabit, category: value })}
            >
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HABIT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validationErrors.category && (
              <p className="text-sm text-destructive">{validationErrors.category}</p>
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
        {filteredHabits.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              {selectedCategoryFilter === "all" 
                ? "No habits yet. Create one to get started!"
                : `No habits in ${getCategoryConfig(selectedCategoryFilter).label} category.`}
            </p>
          </Card>
        ) : (
          filteredHabits.map((habit) => (
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
                  <Label htmlFor="edit-category">Category</Label>
                  <Select 
                    value={editForm.category} 
                    onValueChange={(value: HabitCategory) => setEditForm({ ...editForm, category: value })}
                  >
                    <SelectTrigger id="edit-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HABIT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <span className="flex items-center gap-2">
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editValidationErrors.category && (
                    <p className="text-sm text-destructive">{editValidationErrors.category}</p>
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
                draggable
                onDragStart={(e) => handleDragStart(e, habit.id)}
                onDragOver={(e) => handleDragOver(e, habit.id)}
                onDrop={(e) => handleDrop(e, habit.id)}
                onDragEnd={handleDragEnd}
                className={`p-6 hover:shadow-md transition-all cursor-pointer ${
                  draggedHabit === habit.id ? 'opacity-50' : ''
                } ${
                  dragOverHabit === habit.id ? 'border-2 border-primary border-dashed' : ''
                }`}
                onClick={() => setSelectedHabit(habit)}
              >
                <div className="flex items-start gap-3">
                  {/* Drag Handle */}
                  <div
                    className="cursor-grab active:cursor-grabbing pt-1 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <GripVertical className="h-5 w-5" />
                  </div>

                  {/* Rest of the habit content */}
                  <div className="flex-1 flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      {/* Category badge */}
                      <div className="mb-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getCategoryConfig(habit.category).bgColor} ${getCategoryConfig(habit.category).color}`}>
                          <span>{getCategoryConfig(habit.category).icon}</span>
                          <span>{getCategoryConfig(habit.category).label}</span>
                        </span>
                      </div>
                      
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
                        Leaves allowed: {habit.leavesAllowedPerMonth}/month
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
                </div>
              </Card>
            )}
          </div>
        ))
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
