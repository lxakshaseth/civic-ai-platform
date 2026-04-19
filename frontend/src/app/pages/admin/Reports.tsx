import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { FileText, Download, Calendar, TrendingUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import ExportData from "../../components/ExportData";

export default function Reports() {
  const reports = [
    {
      name: "Monthly Performance Report",
      description: "Comprehensive overview of all departments",
      date: "March 2026",
      size: "2.4 MB",
    },
    {
      name: "Fraud Detection Summary",
      description: "AI-flagged anomalies and investigations",
      date: "March 2026",
      size: "1.8 MB",
    },
    {
      name: "City Health Index Report",
      description: "Quarterly wellness metrics analysis",
      date: "Q1 2026",
      size: "3.1 MB",
    },
    {
      name: "Sustainability Metrics",
      description: "Environmental performance data",
      date: "March 2026",
      size: "2.2 MB",
    },
    {
      name: "Budget Utilization Report",
      description: "Department-wise spending analysis",
      date: "FY 2025-26",
      size: "1.5 MB",
    },
  ];

  // Sample data for export
  const exportData = reports.map((report, index) => ({
    id: index + 1,
    reportName: report.name,
    description: report.description,
    period: report.date,
    fileSize: report.size,
    status: "Available",
  }));

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Reports & Analytics</h1>
          <p className="text-muted-foreground">Generate and download comprehensive reports</p>
        </div>
        <div className="flex gap-2">
          <ExportData data={exportData} filename="saip-reports" />
          <Button>
            <FileText className="size-4 mr-2" />
            Generate New Report
          </Button>
        </div>
      </div>

      <Card className="p-6 mb-6 bg-gradient-to-r from-blue-50 to-green-50">
        <h2 className="text-xl font-semibold mb-4">Generate Custom Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select defaultValue="performance">
            <SelectTrigger>
              <SelectValue placeholder="Report Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="performance">Performance Report</SelectItem>
              <SelectItem value="fraud">Fraud Detection</SelectItem>
              <SelectItem value="health">City Health</SelectItem>
              <SelectItem value="sustainability">Sustainability</SelectItem>
              <SelectItem value="budget">Budget Analysis</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="month">
            <SelectTrigger>
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>

          <Button className="w-full">
            <TrendingUp className="size-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        {reports.map((report, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                <div className="bg-primary/10 p-3 rounded-xl">
                  <FileText className="size-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{report.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{report.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {report.date}
                    </span>
                    <span>{report.size}</span>
                  </div>
                </div>
              </div>
              <Button>
                <Download className="size-4 mr-2" />
                Download
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}