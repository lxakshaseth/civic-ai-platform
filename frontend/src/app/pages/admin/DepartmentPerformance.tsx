import { Card } from "../../components/ui/card";
import { TrendingUp, Award, AlertCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function DepartmentPerformance() {
  const performanceData = [
    { dept: "Infrastructure", resolved: 245, pending: 32, avgTime: 2.8, efficiency: 95 },
    { dept: "Sanitation", resolved: 198, pending: 28, avgTime: 3.1, efficiency: 92 },
    { dept: "Electricity", resolved: 176, pending: 24, avgTime: 3.4, efficiency: 89 },
    { dept: "Water Supply", resolved: 154, pending: 18, avgTime: 3.6, efficiency: 87 },
    { dept: "Roads", resolved: 187, pending: 22, avgTime: 3.2, efficiency: 90 },
  ];

  const chartData = [
    { name: "Infrastructure", resolved: 245, pending: 32 },
    { name: "Sanitation", resolved: 198, pending: 28 },
    { name: "Electricity", resolved: 176, pending: 24 },
    { name: "Water", resolved: 154, pending: 18 },
    { name: "Roads", resolved: 187, pending: 22 },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Department Performance</h1>
        <p className="text-muted-foreground">Comparative analysis across all departments</p>
      </div>

      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Department Workload</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar key="resolved-bar" dataKey="resolved" fill="#16A34A" name="Resolved" />
            <Bar key="pending-bar" dataKey="pending" fill="#F59E0B" name="Pending" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        {performanceData.map((dept) => (
          <Card key={dept.dept} className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">{dept.dept}</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Resolved</div>
                    <div className="text-2xl font-bold text-accent">{dept.resolved}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                    <div className="text-2xl font-bold text-yellow-600">{dept.pending}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Avg Time</div>
                    <div className="text-2xl font-bold">{dept.avgTime}d</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Efficiency</div>
                    <div className="text-2xl font-bold text-primary">{dept.efficiency}%</div>
                  </div>
                </div>
              </div>
              {dept.efficiency >= 90 && (
                <div className="ml-6">
                  <Award className="size-12 text-yellow-500" />
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}