import { Card } from "../../components/ui/card";
import { Heart, TrendingUp, AlertCircle } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function CityHealthIndex() {
  const trendData = [
    { month: "Oct", score: 72 },
    { month: "Nov", score: 75 },
    { month: "Dec", score: 74 },
    { month: "Jan", score: 78 },
    { month: "Feb", score: 80 },
    { month: "Mar", score: 82 },
  ];

  const metrics = [
    { name: "Infrastructure Quality", value: 85, color: "#2563EB" },
    { name: "Public Safety", value: 78, color: "#16A34A" },
    { name: "Sanitation", value: 82, color: "#F59E0B" },
    { name: "Water Quality", value: 88, color: "#06B6D4" },
    { name: "Air Quality", value: 75, color: "#8B5CF6" },
    { name: "Waste Management", value: 80, color: "#EC4899" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">City Health Index</h1>
        <p className="text-muted-foreground">Comprehensive city wellness metrics</p>
      </div>

      {/* Main Score */}
      <Card className="p-8 mb-6">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Heart className="size-8 text-primary mr-3" />
            <h2 className="text-2xl font-semibold">Overall City Health Score</h2>
          </div>
          <div className="relative inline-flex items-center justify-center mb-4">
            <svg className="size-48">
              <circle
                className="text-gray-200"
                strokeWidth="16"
                stroke="currentColor"
                fill="transparent"
                r="88"
                cx="96"
                cy="96"
              />
              <circle
                className="text-primary"
                strokeWidth="16"
                strokeDasharray={2 * Math.PI * 88}
                strokeDashoffset={2 * Math.PI * 88 * (1 - 0.82)}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="88"
                cx="96"
                cy="96"
                style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
              />
            </svg>
            <div className="absolute">
              <p className="text-6xl font-bold text-primary">82</p>
              <p className="text-sm text-muted-foreground">out of 100</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <TrendingUp className="size-5 text-accent" />
            <span className="text-lg text-accent font-medium">+6 points from last month</span>
          </div>
        </div>
      </Card>

      {/* Breakdown Metrics */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-6">Breakdown by Category</h2>
        <div className="space-y-6">
          {metrics.map((metric) => (
            <div key={metric.name}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{metric.name}</span>
                <span className="text-2xl font-bold" style={{ color: metric.color }}>
                  {metric.value}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all"
                  style={{
                    width: `${metric.value}%`,
                    backgroundColor: metric.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 6-Month Trend */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">6-Month Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis domain={[60, 100]} />
            <Tooltip />
            <Legend />
            <Line
              key="health-score-line"
              type="monotone"
              dataKey="score"
              stroke="#2563EB"
              strokeWidth={3}
              name="Health Score"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}