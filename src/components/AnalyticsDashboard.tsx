import { useAnalytics } from "@/hooks/useAnalytics";
import { Loader2, Target, CheckSquare } from "lucide-react";
import { HabitAnalytics } from "./HabitAnalytics";
import { TaskAnalytics } from "./TaskAnalytics";

export const AnalyticsDashboard = () => {
    const { data, loading } = useAnalytics();

    if (loading || !data) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
            
            <div className="space-y-8">
                <section>
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Habit Insights
                    </h3>
                    <HabitAnalytics data={data} />
                </section>

                <section>
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <CheckSquare className="h-5 w-5" />
                        Task Insights
                    </h3>
                    <TaskAnalytics data={data} />
                </section>
            </div>
        </div>
    );
};
