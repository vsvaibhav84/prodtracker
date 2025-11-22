import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface TaskAnalyticsProps {
    data: {
        totalTasksCompleted: number;
        taskDistribution: { name: string; value: number; color: string }[];
    };
}

export const TaskAnalytics = ({ data }: TaskAnalyticsProps) => {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-500" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Total Tasks Done</p>
                        <h3 className="text-2xl font-bold">{data.totalTasksCompleted}</h3>
                    </div>
                </Card>
            </div>

            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-6">Task Distribution</h3>
                <div className="h-[300px] w-full flex items-center justify-center">
                    {data.taskDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.taskDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.taskDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center text-muted-foreground">
                            No tasks added yet
                        </div>
                    )}
                </div>
                <div className="flex justify-center gap-4 mt-4 flex-wrap">
                    {data.taskDistribution.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-sm text-muted-foreground">{entry.name}</span>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
};
