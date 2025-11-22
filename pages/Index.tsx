import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HabitTracker } from "@/components/HabitTracker";
import { TaskList } from "@/components/TaskList";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { Target, CheckSquare, BarChart3 } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground font-bold text-lg">
                F
              </div>
              <h1 className="text-2xl font-bold text-foreground">Focus</h1>
            </div>
            <DarkModeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="habits" className="space-y-6">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
              <TabsTrigger value="habits" className="gap-2">
                <Target className="h-4 w-4" />
                Habits
              </TabsTrigger>
              <TabsTrigger value="tasks" className="gap-2">
                <CheckSquare className="h-4 w-4" />
                Tasks
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="habits" className="space-y-4">
              <HabitTracker />
            </TabsContent>

            <TabsContent value="tasks" className="space-y-4">
              <TaskList />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <AnalyticsDashboard />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Index;
