import { useEffect, useRef, useState } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

interface Node {
  id: string;
  label: string;
  type: "officer" | "contractor";
  riskLevel: "high" | "medium" | "low";
}

interface Edge {
  from: string;
  to: string;
  weight: number;
}

interface NetworkGraphProps {
  nodes: Node[];
  edges: Edge[];
}

export default function NetworkGraph({ nodes, edges }: NetworkGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;

    // Calculate positions (simple circular layout)
    const positions = new Map<string, { x: number; y: number }>();
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI - Math.PI / 2;
      positions.set(node.id, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    });

    setNodePositions(positions);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw edges
    edges.forEach((edge) => {
      const from = positions.get(edge.from);
      const to = positions.get(edge.to);
      if (!from || !to) return;

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      
      // Edge color based on weight
      const opacity = edge.weight / 100;
      ctx.strokeStyle = `rgba(239, 68, 68, ${opacity})`;
      ctx.lineWidth = 1 + (edge.weight / 50);
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach((node) => {
      const pos = positions.get(node.id);
      if (!pos) return;

      // Node circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 20, 0, 2 * Math.PI);
      
      // Color based on type and risk
      if (node.type === "officer") {
        ctx.fillStyle = node.riskLevel === "high" ? "#DC2626" : "#2563EB";
      } else {
        ctx.fillStyle = node.riskLevel === "high" ? "#EF4444" : "#16A34A";
      }
      ctx.fill();
      ctx.strokeStyle = "#FFF";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Node label
      ctx.fillStyle = "#1F2937";
      ctx.font = "12px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(node.label, pos.x, pos.y + 35);
    });
  }, [nodes, edges]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if hovering over any node
    let foundNode: Node | null = null;
    for (const node of nodes) {
      const pos = nodePositions.get(node.id);
      if (!pos) continue;

      const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
      if (distance <= 20) {
        foundNode = node;
        break;
      }
    }

    setHoveredNode(foundNode);
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full h-96 rounded-xl cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredNode(null)}
      />
      
      {hoveredNode && (
        <Card className="absolute top-4 left-4 p-4 shadow-lg">
          <div className="font-semibold mb-1">{hoveredNode.label}</div>
          <div className="text-sm text-muted-foreground mb-2">
            {hoveredNode.type === "officer" ? "Officer" : "Contractor"}
          </div>
          <Badge
            className={
              hoveredNode.riskLevel === "high"
                ? "bg-red-100 text-red-700"
                : hoveredNode.riskLevel === "medium"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-green-100 text-green-700"
            }
          >
            {hoveredNode.riskLevel.toUpperCase()} Risk
          </Badge>
        </Card>
      )}

      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="size-4 rounded-full bg-primary" />
          <span className="text-muted-foreground">Officer (Low Risk)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded-full bg-red-600" />
          <span className="text-muted-foreground">Officer (High Risk)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded-full bg-accent" />
          <span className="text-muted-foreground">Contractor (Low Risk)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded-full bg-red-500" />
          <span className="text-muted-foreground">Contractor (High Risk)</span>
        </div>
      </div>
    </div>
  );
}
