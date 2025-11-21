import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, ListTodo, Edit2, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format, isToday, isBefore, differenceInDays, parseISO } from "date-fns";

interface Task {
  id: string;
  text: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
  createdAt: string;
}

type QuadrantType = 'urgent-important' | 'not-urgent-important' | 'urgent-not-important' | 'not-urgent-not-important';

interface TasksByQuadrant {
  'urgent-important': Task[];
  'not-urgent-important': Task[];
  'urgent-not-important': Task[];
  'not-urgent-not-important': Task[];
}

interface QuadrantConfig {
  id: QuadrantType;
  title: string;
  subtitle: string;
  gradientClass: string;
  borderClass: string;
}

const quadrants: QuadrantConfig[] = [
  {
    id: 'urgent-important',
    title: 'Do First',
    subtitle: 'Urgent & Important',
    gradientClass: 'from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30',
    borderClass: 'border-red-200 dark:border-red-800',
  },
  {
    id: 'not-urgent-important',
    title: 'Schedule',
    subtitle: 'Important, Not Urgent',
    gradientClass: 'from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30',
    borderClass: 'border-blue-200 dark:border-blue-800',
  },
  {
    id: 'urgent-not-important',
    title: 'Delegate',
    subtitle: 'Urgent, Not Important',
    gradientClass: 'from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-yellow-900/30',
    borderClass: 'border-yellow-200 dark:border-yellow-800',
  },
  {
    id: 'not-urgent-not-important',
    title: 'Eliminate',
    subtitle: 'Not Urgent, Not Important',
    gradientClass: 'from-gray-50 to-gray-100 dark:from-gray-950/30 dark:to-gray-900/30',
    borderClass: 'border-gray-200 dark:border-gray-800',
  },
];

export const TaskList = () => {
  const [tasks, setTasks] = useState<TasksByQuadrant>({
    'urgent-important': [],
    'not-urgent-important': [],
    'urgent-not-important': [],
    'not-urgent-not-important': [],
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<{ task: Task; quadrant: QuadrantType } | null>(null);
  const [draggedTask, setDraggedTask] = useState<{ task: Task; sourceQuadrant: QuadrantType } | null>(null);
  const [dragOverQuadrant, setDragOverQuadrant] = useState<QuadrantType | null>(null);

  const [formData, setFormData] = useState({
    text: '',
    description: '',
    dueDate: '',
  });

  // Load tasks from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("tasks-matrix");
    if (saved) {
      setTasks(JSON.parse(saved));
    } else {
      // Migration: Check for old task format
      const oldTasks = localStorage.getItem("tasks");
      if (oldTasks) {
        const parsed = JSON.parse(oldTasks);
        if (Array.isArray(parsed)) {
          const migrated: TasksByQuadrant = {
            'urgent-important': [],
            'not-urgent-important': [],
            'urgent-not-important': [],
            'not-urgent-not-important': parsed,
          };
          setTasks(migrated);
          localStorage.setItem("tasks-matrix", JSON.stringify(migrated));
          localStorage.removeItem("tasks");
          toast.success("Tasks migrated to Eisenhower Matrix!");
        }
      }
    }
  }, []);

  // Save tasks to localStorage
  useEffect(() => {
    localStorage.setItem("tasks-matrix", JSON.stringify(tasks));
  }, [tasks]);

  const resetForm = () => {
    setFormData({ text: '', description: '', dueDate: '' });
  };

  const addTask = () => {
    if (!formData.text.trim()) {
      toast.error("Task title is required");
      return;
    }

    const task: Task = {
      id: Date.now().toString(),
      text: formData.text,
      description: formData.description || undefined,
      dueDate: formData.dueDate || undefined,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    setTasks(prev => ({
      ...prev,
      'not-urgent-not-important': [...prev['not-urgent-not-important'], task],
    }));
    
    resetForm();
    setIsAddDialogOpen(false);
    toast.success("Task added! Drag it to the appropriate quadrant.");
  };

  const updateTask = () => {
    if (!editingTask || !formData.text.trim()) {
      toast.error("Task title is required");
      return;
    }

    const updatedTask: Task = {
      ...editingTask.task,
      text: formData.text,
      description: formData.description || undefined,
      dueDate: formData.dueDate || undefined,
    };

    setTasks(prev => ({
      ...prev,
      [editingTask.quadrant]: prev[editingTask.quadrant].map(t =>
        t.id === updatedTask.id ? updatedTask : t
      ),
    }));

    resetForm();
    setIsEditDialogOpen(false);
    setEditingTask(null);
    toast.success("Task updated!");
  };

  const openEditDialog = (task: Task, quadrant: QuadrantType) => {
    setEditingTask({ task, quadrant });
    setFormData({
      text: task.text,
      description: task.description || '',
      dueDate: task.dueDate || '',
    });
    setIsEditDialogOpen(true);
  };

  const toggleTask = (quadrant: QuadrantType, taskId: string) => {
    setTasks(prev => ({
      ...prev,
      [quadrant]: prev[quadrant].map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      ),
    }));
  };

  const deleteTask = (quadrant: QuadrantType, taskId: string) => {
    setTasks(prev => ({
      ...prev,
      [quadrant]: prev[quadrant].filter(task => task.id !== taskId),
    }));
    toast.success("Task deleted");
  };

  // Drag & Drop handlers
  const handleDragStart = (task: Task, quadrant: QuadrantType) => {
    setDraggedTask({ task, sourceQuadrant: quadrant });
  };

  const handleDragOver = (e: React.DragEvent, quadrant: QuadrantType) => {
    e.preventDefault();
    setDragOverQuadrant(quadrant);
  };

  const handleDragLeave = () => {
    setDragOverQuadrant(null);
  };

  const handleDrop = (e: React.DragEvent, targetQuadrant: QuadrantType) => {
    e.preventDefault();
    setDragOverQuadrant(null);

    if (!draggedTask) return;

    const { task, sourceQuadrant } = draggedTask;

    if (sourceQuadrant === targetQuadrant) {
      setDraggedTask(null);
      return;
    }

    // Remove from source quadrant
    setTasks(prev => ({
      ...prev,
      [sourceQuadrant]: prev[sourceQuadrant].filter(t => t.id !== task.id),
      [targetQuadrant]: [...prev[targetQuadrant], task],
    }));

    setDraggedTask(null);
    toast.success(`Task moved to ${quadrants.find(q => q.id === targetQuadrant)?.title}`);
  };

  const getDueDateBadge = (dueDate?: string) => {
    if (!dueDate) return null;

    const date = parseISO(dueDate);
    const today = new Date();
    const isOverdue = isBefore(date, today) && !isToday(date);
    const isDueToday = isToday(date);
    const daysUntil = differenceInDays(date, today);
    const isUpcoming = daysUntil > 0 && daysUntil <= 3;

    let badgeClass = 'bg-muted text-muted-foreground';
    let label = format(date, 'MMM d');

    if (isOverdue) {
      badgeClass = 'bg-destructive/20 text-destructive border-destructive/30';
      label = 'Overdue';
    } else if (isDueToday) {
      badgeClass = 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800';
      label = 'Today';
    } else if (isUpcoming) {
      badgeClass = 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800';
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border ${badgeClass}`}>
        <CalendarIcon className="h-3 w-3" />
        {label}
      </span>
    );
  };

  const totalTasks = Object.values(tasks).reduce((acc, quadrant) => acc + quadrant.length, 0);
  const completedTasks = Object.values(tasks).reduce(
    (acc, quadrant) => acc + quadrant.filter(t => t.completed).length,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Eisenhower Matrix</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Organize tasks by urgency and importance
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {completedTasks}/{totalTasks} completed
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Task Title *</label>
                  <Input
                    placeholder="Enter task title..."
                    value={formData.text}
                    onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
                    onKeyPress={(e) => e.key === "Enter" && addTask()}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Description</label>
                  <Textarea
                    placeholder="Add details about this task..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Due Date</label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" onClick={() => {
                    setIsAddDialogOpen(false);
                    resetForm();
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={addTask}>Add Task</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {totalTasks === 0 ? (
        <Card className="p-12 text-center">
          <ListTodo className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
          <p className="text-muted-foreground mb-4">
            Add your first task to start organizing with the Eisenhower Matrix
          </p>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Your First Task
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quadrants.map((quadrant) => (
            <Card
              key={quadrant.id}
              className={`overflow-hidden ${dragOverQuadrant === quadrant.id ? 'ring-2 ring-primary' : ''}`}
              onDragOver={(e) => handleDragOver(e, quadrant.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, quadrant.id)}
            >
              <div className={`p-4 bg-gradient-to-br ${quadrant.gradientClass} border-b ${quadrant.borderClass}`}>
                <h3 className="font-bold text-lg text-foreground">{quadrant.title}</h3>
                <p className="text-sm text-muted-foreground">{quadrant.subtitle}</p>
                <span className="text-xs text-muted-foreground mt-1 block">
                  {tasks[quadrant.id].length} task{tasks[quadrant.id].length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="p-4 space-y-2 min-h-[200px]">
                {tasks[quadrant.id].length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Drag tasks here or add new ones
                  </div>
                ) : (
                  tasks[quadrant.id].map((task) => (
                    <Card
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task, quadrant.id)}
                      className={`p-3 cursor-move hover:shadow-md transition-all ${
                        task.completed ? 'bg-muted/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => toggleTask(quadrant.id, task.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <span className={`font-medium text-sm ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                              {task.text}
                            </span>
                            <div className="flex gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEditDialog(task, quadrant.id)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => deleteTask(quadrant.id, task.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          {task.dueDate && (
                            <div className="mt-2">
                              {getDueDateBadge(task.dueDate)}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Task Title *</label>
              <Input
                placeholder="Enter task title..."
                value={formData.text}
                onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <Textarea
                placeholder="Add details about this task..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Due Date</label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => {
                setIsEditDialogOpen(false);
                setEditingTask(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button onClick={updateTask}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
