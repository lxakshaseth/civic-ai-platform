import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Navigation, MapPin } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import InteractiveMap from "../../components/InteractiveMap";
import { useState } from "react";
import { useNavigate } from "react-router";

export default function MapView() {
  const navigate = useNavigate();
  const [selectedUrgency, setSelectedUrgency] = useState("all");

  const tasks = [
    { id: "CMP-2024-1240", title: "Fix Street Light", location: "MG Road", urgency: "High" as const, lat: 19.0760, lng: 72.8777, category: "Electricity" },
    { id: "CMP-2024-1241", title: "Clean Drainage", location: "Park Street", urgency: "Medium" as const, lat: 19.0820, lng: 72.8850, category: "Sanitation" },
    { id: "CMP-2024-1242", title: "Repair Sidewalk", location: "Main Square", urgency: "Low" as const, lat: 19.0700, lng: 72.8720, category: "Infrastructure" },
    { id: "CMP-2024-1243", title: "Fix Water Leak", location: "Station Road", urgency: "High" as const, lat: 19.0790, lng: 72.8810, category: "Water Supply" },
    { id: "CMP-2024-1244", title: "Repair Park Bench", location: "Central Park", urgency: "Low" as const, lat: 19.0730, lng: 72.8790, category: "Parks" },
  ];

  const filteredTasks = selectedUrgency === "all" 
    ? tasks 
    : tasks.filter(task => task.urgency.toLowerCase() === selectedUrgency);

  const handleMarkerClick = (marker: typeof tasks[0]) => {
    navigate(`/employee/evidence/${marker.id.split('-')[2]}`);
  };

  return (
    <div className="min-h-full flex flex-col">
      <div className="p-6 border-b bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Map View</h1>
            <p className="text-sm text-muted-foreground">Geo-distributed task overview</p>
          </div>
          <div className="flex gap-4">
            <Select defaultValue="all" onValueChange={setSelectedUrgency}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="low">Low Priority</SelectItem>
              </SelectContent>
            </Select>
            <Button>
              <Navigation className="size-4 mr-2" />
              Optimize Route
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Map */}
        <div className="flex-1 relative">
          <InteractiveMap 
            markers={filteredTasks}
            center={{ lat: 19.0760, lng: 72.8777 }}
            onMarkerClick={handleMarkerClick}
          />
        </div>

        {/* Task List Sidebar */}
        <div className="w-80 border-l bg-white p-6 overflow-y-auto">
          <h3 className="font-semibold mb-4">Tasks on Map ({filteredTasks.length})</h3>
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <Card key={task.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="font-mono text-xs text-muted-foreground">{task.id}</div>
                  <Badge className={
                    task.urgency === "High" ? "bg-red-100 text-red-700" :
                    task.urgency === "Medium" ? "bg-yellow-100 text-yellow-700" :
                    "bg-green-100 text-green-700"
                  }>
                    {task.urgency}
                  </Badge>
                </div>
                <div className="font-medium mb-2">{task.title}</div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                  <MapPin className="size-3" />
                  {task.location}
                </div>
                <Button size="sm" className="w-full">
                  <Navigation className="size-3 mr-2" />
                  Navigate
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
