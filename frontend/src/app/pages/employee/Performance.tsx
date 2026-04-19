import { Card } from "../../components/ui/card";
import { TrendingUp, CheckCircle, Clock, Star } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function Performance() {
  const performanceData = [
    { month: "Oct", completed: 45, avgTime: 2.8 },
    { month: "Nov", completed: 52, avgTime: 2.5 },
    { month: "Dec", completed: 48, avgTime: 2.6 },
    { month: "Jan", completed: 56, avgTime: 2.3 },
    { month: "Feb", completed: 51, avgTime: 2.4 },
    { month: "Mar", completed: 58, avgTime: 2.1 },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Performance Metrics</h1>
        <p className="text-muted-foreground">Track your efficiency and achievements</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Completion Rate</span>
            <CheckCircle className="size-4 text-accent" />
          </div>
          <div className="text-3xl font-bold">96.5%</div>
          <div className="text-sm text-accent font-medium mt-1">+4.2% vs last month</div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Efficiency Score</span>
            <TrendingUp className="size-4 text-primary" />
          </div>
          <div className="text-3xl font-bold">92%</div>
          <div className="text-sm text-accent font-medium mt-1">Top 15% in dept</div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Avg Resolution Time</span>
            <Clock className="size-4 text-yellow-600" />
          </div>
          <div className="text-3xl font-bold">2.1 days</div>
          <div className="text-sm text-accent font-medium mt-1">-0.4 days improved</div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Citizen Rating</span>
            <Star className="size-4 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold">4.8/5</div>
          <div className="text-sm text-muted-foreground mt-1">Based on 124 reviews</div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Monthly Completions</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar key="completed-bar" dataKey="completed" fill="#2563EB" name="Tasks Completed" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Average Resolution Time (days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line key="avgtime-line" type="monotone" dataKey="avgTime" stroke="#16A34A" strokeWidth={2} name="Avg Time" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}