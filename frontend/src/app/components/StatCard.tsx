import { Card } from "./ui/card";
import { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: "blue" | "green" | "red" | "yellow" | "purple";
  animate?: boolean;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  color = "blue",
  animate = true,
}: StatCardProps) {
  const colorClasses = {
    blue: {
      bg: "bg-blue-100",
      text: "text-primary",
      gradient: "from-blue-500 to-blue-600",
    },
    green: {
      bg: "bg-green-100",
      text: "text-accent",
      gradient: "from-green-500 to-green-600",
    },
    red: {
      bg: "bg-red-100",
      text: "text-red-600",
      gradient: "from-red-500 to-red-600",
    },
    yellow: {
      bg: "bg-yellow-100",
      text: "text-yellow-600",
      gradient: "from-yellow-500 to-yellow-600",
    },
    purple: {
      bg: "bg-purple-100",
      text: "text-purple-600",
      gradient: "from-purple-500 to-purple-600",
    },
  };

  const colors = colorClasses[color];

  const CardWrapper = animate ? motion.div : "div";
  const cardProps = animate
    ? {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3 },
      }
    : {};

  return (
    <CardWrapper {...cardProps}>
      <Card className="p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className={`${colors.bg} p-3 rounded-xl`}>
            <Icon className={`size-6 ${colors.text}`} />
          </div>
          {trend && (
            <div
              className={`text-sm font-medium ${
                trend.isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}%
            </div>
          )}
        </div>
        <div>
          <div className="text-3xl font-bold mb-1">{value}</div>
          <div className="text-sm font-medium text-gray-700 mb-1">{title}</div>
          {description && (
            <div className="text-xs text-muted-foreground">{description}</div>
          )}
        </div>
      </Card>
    </CardWrapper>
  );
}
