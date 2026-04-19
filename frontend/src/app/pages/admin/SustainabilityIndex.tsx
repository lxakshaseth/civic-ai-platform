import { Card } from "../../components/ui/card";
import { Leaf } from "lucide-react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

export default function SustainabilityIndex() {
  const radarData = [
    { category: "Air Quality", value: 78, fullMark: 100 },
    { category: "Water Conservation", value: 85, fullMark: 100 },
    { category: "Waste Management", value: 72, fullMark: 100 },
    { category: "Green Spaces", value: 68, fullMark: 100 },
    { category: "Energy Efficiency", value: 81, fullMark: 100 },
    { category: "Carbon Footprint", value: 75, fullMark: 100 },
  ];

  const envMetrics = [
    { label: "Trees Planted", value: "12,450", change: "+1,245 this year", color: "text-green-600" },
    { label: "Waste Recycled", value: "68%", change: "+8% vs last year", color: "text-blue-600" },
    { label: "Carbon Emissions", value: "15.2K tons", change: "-12% reduction", color: "text-green-600" },
    { label: "Water Saved", value: "2.4M liters", change: "+18% improvement", color: "text-blue-600" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Sustainability Index</h1>
        <p className="text-muted-foreground">Environmental performance and green initiatives</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {envMetrics.map((metric) => (
          <Card key={metric.label} className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Leaf className="size-5 text-accent" />
              <span className="text-sm text-muted-foreground">{metric.label}</span>
            </div>
            <div className={`text-3xl font-bold ${metric.color} mb-1`}>{metric.value}</div>
            <div className="text-sm text-muted-foreground">{metric.change}</div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Environmental Metrics Radar</h2>
        <ResponsiveContainer width="100%" height={500}>
          <RadarChart data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="category" />
            <PolarRadiusAxis angle={90} domain={[0, 100]} />
            <Radar
              key="sustainability-radar"
              name="Sustainability Score"
              dataKey="value"
              stroke="#16A34A"
              fill="#16A34A"
              fillOpacity={0.6}
            />
          </RadarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}