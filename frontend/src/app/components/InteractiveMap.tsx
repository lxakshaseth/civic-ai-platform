import { useState, useRef, useEffect } from "react";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { MapPin, Navigation2 } from "lucide-react";

interface MapMarker {
  id: string;
  title: string;
  lat: number;
  lng: number;
  urgency: "High" | "Medium" | "Low";
  category: string;
}

interface InteractiveMapProps {
  markers: MapMarker[];
  center?: { lat: number; lng: number };
  onMarkerClick?: (marker: MapMarker) => void;
}

export default function InteractiveMap({
  markers,
  center = { lat: 19.076, lng: 72.8777 },
  onMarkerClick,
}: InteractiveMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredMarker, setHoveredMarker] = useState<MapMarker | null>(null);
  const [markerPositions, setMarkerPositions] = useState<Map<string, { x: number; y: number }>>(new Map());

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

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background with grid
    const gridSize = 50;
    ctx.strokeStyle = "#E5E7EB";
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Calculate marker positions based on lat/lng
    const positions = new Map<string, { x: number; y: number }>();
    const latRange = { min: 19.05, max: 19.1 };
    const lngRange = { min: 72.85, max: 72.9 };

    markers.forEach((marker) => {
      // Normalize coordinates to canvas
      const x = ((marker.lng - lngRange.min) / (lngRange.max - lngRange.min)) * (width - 100) + 50;
      const y = height - ((marker.lat - latRange.min) / (latRange.max - latRange.min)) * (height - 100) - 50;
      positions.set(marker.id, { x, y });
    });

    setMarkerPositions(positions);

    // Draw markers
    markers.forEach((marker) => {
      const pos = positions.get(marker.id);
      if (!pos) return;

      // Marker pin
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 12, 0, 2 * Math.PI);
      
      // Color based on urgency
      switch (marker.urgency) {
        case "High":
          ctx.fillStyle = "#DC2626";
          break;
        case "Medium":
          ctx.fillStyle = "#F59E0B";
          break;
        case "Low":
          ctx.fillStyle = "#16A34A";
          break;
      }
      
      ctx.fill();
      ctx.strokeStyle = "#FFF";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Marker label
      ctx.fillStyle = marker.urgency === "High" ? "#DC2626" : "#1F2937";
      ctx.font = "bold 10px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(marker.urgency.charAt(0), pos.x, pos.y + 4);

      // Pulse effect for high urgency
      if (marker.urgency === "High") {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 18, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(220, 38, 38, 0.3)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    // Draw center marker
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 6, 0, 2 * Math.PI);
    ctx.fillStyle = "#2563EB";
    ctx.fill();
    ctx.strokeStyle = "#FFF";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [markers]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if hovering over any marker
    let foundMarker: MapMarker | null = null;
    for (const marker of markers) {
      const pos = markerPositions.get(marker.id);
      if (!pos) continue;

      const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
      if (distance <= 12) {
        foundMarker = marker;
        break;
      }
    }

    setHoveredMarker(foundMarker);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !onMarkerClick) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked on any marker
    for (const marker of markers) {
      const pos = markerPositions.get(marker.id);
      if (!pos) continue;

      const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
      if (distance <= 12) {
        onMarkerClick(marker);
        break;
      }
    }
  };

  return (
    <div className="relative">
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-10">
        <div className="flex items-center gap-2 text-sm">
          <Navigation2 className="size-4 text-primary" />
          <span className="font-medium">Map Center</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-xl cursor-pointer bg-gradient-to-br from-blue-50 to-green-50"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredMarker(null)}
        onClick={handleClick}
      />

      {hoveredMarker && (
        <Card className="absolute top-20 left-4 p-4 shadow-lg z-10 max-w-xs">
          <div className="flex items-start justify-between mb-2">
            <div className="font-mono text-xs text-muted-foreground">{hoveredMarker.id}</div>
            <Badge
              className={
                hoveredMarker.urgency === "High"
                  ? "bg-red-100 text-red-700"
                  : hoveredMarker.urgency === "Medium"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-green-100 text-green-700"
              }
            >
              {hoveredMarker.urgency}
            </Badge>
          </div>
          <div className="font-semibold mb-1">{hoveredMarker.title}</div>
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="size-3" />
            {hoveredMarker.lat.toFixed(4)}, {hoveredMarker.lng.toFixed(4)}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Category: {hoveredMarker.category}
          </div>
        </Card>
      )}

      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <div className="text-xs font-medium mb-2">Legend</div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <div className="size-3 rounded-full bg-red-600" />
            <span>High Priority ({markers.filter(m => m.urgency === "High").length})</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="size-3 rounded-full bg-yellow-500" />
            <span>Medium Priority ({markers.filter(m => m.urgency === "Medium").length})</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="size-3 rounded-full bg-green-600" />
            <span>Low Priority ({markers.filter(m => m.urgency === "Low").length})</span>
          </div>
        </div>
      </div>
    </div>
  );
}
