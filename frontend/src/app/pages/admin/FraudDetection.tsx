import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { AlertTriangle, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import NetworkGraph from "../../components/NetworkGraph";

export default function FraudDetection() {
  const anomalies = [
    {
      id: "CMP-2024-1250",
      officer: "Amit Patel",
      contractor: "XYZ Construction",
      amount: "₹85,000",
      score: 92,
      reason: "Amount 45% higher than average",
      status: "Flagged",
    },
    {
      id: "CMP-2024-1248",
      officer: "Priya Sharma",
      contractor: "ABC Services",
      amount: "₹62,000",
      score: 78,
      reason: "Repeated contractor pattern",
      status: "Under Review",
    },
    {
      id: "CMP-2024-1245",
      officer: "Rajesh Kumar",
      contractor: "Quick Fix Ltd",
      amount: "₹48,000",
      score: 65,
      reason: "Time to resolution suspiciously fast",
      status: "Cleared",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Fraud Detection</h1>
        <p className="text-muted-foreground">AI-powered anomaly detection and analysis</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="p-6">
          <div className="text-2xl font-bold text-red-600">8</div>
          <div className="text-sm text-muted-foreground">Active Flags</div>
        </Card>
        <Card className="p-6">
          <div className="text-2xl font-bold text-yellow-600">12</div>
          <div className="text-sm text-muted-foreground">Under Review</div>
        </Card>
        <Card className="p-6">
          <div className="text-2xl font-bold text-green-600">34</div>
          <div className="text-sm text-muted-foreground">Cleared This Month</div>
        </Card>
        <Card className="p-6">
          <div className="text-2xl font-bold text-primary">₹2.4L</div>
          <div className="text-sm text-muted-foreground">Saved Amount</div>
        </Card>
      </div>

      {/* Anomaly Table */}
      <Card className="mb-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Complaint ID</TableHead>
              <TableHead>Officer</TableHead>
              <TableHead>Contractor</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Risk Score</TableHead>
              <TableHead>Flag Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {anomalies.map((anomaly) => (
              <TableRow key={anomaly.id}>
                <TableCell className="font-mono text-xs">{anomaly.id}</TableCell>
                <TableCell>{anomaly.officer}</TableCell>
                <TableCell>{anomaly.contractor}</TableCell>
                <TableCell className="font-medium">{anomaly.amount}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold text-red-600">{anomaly.score}</div>
                    {anomaly.score > 80 && <AlertTriangle className="size-4 text-red-600" />}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{anomaly.reason}</TableCell>
                <TableCell>
                  <Badge
                    className={
                      anomaly.status === "Flagged"
                        ? "bg-red-100 text-red-700"
                        : anomaly.status === "Under Review"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }
                  >
                    {anomaly.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline">
                    <Eye className="size-4 mr-2" />
                    Review
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Network Graph */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Officer-Contractor Network Graph</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Interactive visualization showing relationships between officers and contractors. Red nodes indicate high-risk connections.
        </p>
        <NetworkGraph
          nodes={[
            { id: "o1", label: "A. Patel", type: "officer", riskLevel: "high" },
            { id: "o2", label: "P. Sharma", type: "officer", riskLevel: "medium" },
            { id: "o3", label: "R. Kumar", type: "officer", riskLevel: "low" },
            { id: "c1", label: "XYZ Const.", type: "contractor", riskLevel: "high" },
            { id: "c2", label: "ABC Services", type: "contractor", riskLevel: "medium" },
            { id: "c3", label: "Quick Fix", type: "contractor", riskLevel: "low" },
          ]}
          edges={[
            { from: "o1", to: "c1", weight: 92 },
            { from: "o2", to: "c2", weight: 78 },
            { from: "o3", to: "c3", weight: 45 },
            { from: "o1", to: "c2", weight: 65 },
            { from: "o2", to: "c1", weight: 55 },
          ]}
        />
      </Card>
    </div>
  );
}