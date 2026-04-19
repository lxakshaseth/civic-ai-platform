import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldCheck,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Progress } from "../../components/ui/progress";

export default function CommandCenter() {
  const metrics = [
    { label: "Critical queue", value: "12", helper: "Needs action now", color: "text-red-600" },
    { label: "SLA at risk", value: "18", helper: "Next 12 hours", color: "text-amber-600" },
    { label: "Automation uptime", value: "99.1%", helper: "Last 24 hours", color: "text-blue-700" },
    { label: "Field coverage", value: "86%", helper: "Shift capacity used", color: "text-emerald-700" },
  ];

  const incidents = [
    {
      title: "Ward 11 water supply disruption",
      dept: "Water Supply",
      severity: "Critical",
      eta: "Advisory needed in 20 min",
      owner: "Control room",
    },
    {
      title: "Sanitation backlog rising in Zone B",
      dept: "Sanitation",
      severity: "High",
      eta: "Crew rebalance before 5 PM",
      owner: "Operations desk",
    },
    {
      title: "Vendor reimbursement anomaly",
      dept: "Fraud desk",
      severity: "Review",
      eta: "Manual check pending",
      owner: "Audit team",
    },
  ];

  const resourcePlan = [
    {
      dept: "Infrastructure",
      backlog: 24,
      teams: 7,
      utilization: 88,
      recommendation: "Keep stable and approve emergency budget first.",
    },
    {
      dept: "Sanitation",
      backlog: 32,
      teams: 5,
      utilization: 94,
      recommendation: "Add 2 temporary crews from electricity for evening route.",
    },
    {
      dept: "Electricity",
      backlog: 13,
      teams: 6,
      utilization: 68,
      recommendation: "Can spare mixed staff without service impact.",
    },
  ];

  const automations = [
    {
      name: "Daily escalation digest",
      successRate: 92,
      nextRun: "6:00 PM",
      impact: "Summarizes SLA, fraud, and outage exceptions.",
    },
    {
      name: "Broadcast draft helper",
      successRate: 78,
      nextRun: "On demand",
      impact: "Creates resident-ready advisories from live incidents.",
    },
    {
      name: "Compliance packet builder",
      successRate: 88,
      nextRun: "9:30 PM",
      impact: "Packages evidence for policy and access reviews.",
    },
  ];

  const nextActions = [
    "Approve the pending emergency repair budget for Infrastructure.",
    "Publish the Ward 11 citizen advisory before the next complaint spike.",
    "Move two mixed crews to sanitation to reduce the evening backlog.",
    "Trigger manual review on the repeated contractor anomaly.",
  ];

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <Activity className="size-3.5" />
            Live operational command
          </div>
          <h1 className="text-3xl font-bold text-gray-950">Command Center</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Watch incident pressure, team balance, automation health, and the next operational moves the admin desk should make.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button className="bg-[#1e3a8a] hover:bg-[#1e40af]">
            <RefreshCw className="mr-2 size-4" />
            Refresh board
          </Button>
          <Button variant="outline" className="border-gray-300">
            <Bot className="mr-2 size-4" />
            Ask AI for replan
          </Button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="border-gray-200 p-6">
            <p className="text-sm text-muted-foreground">{metric.label}</p>
            <p className={`mt-2 text-3xl font-bold ${metric.color}`}>{metric.value}</p>
            <p className="mt-2 text-xs text-gray-500">{metric.helper}</p>
          </Card>
        ))}
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <Card className="border-gray-200 p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-950">Live Operations Queue</h2>
              <p className="text-sm text-muted-foreground">Events that need direct admin attention</p>
            </div>
            <Badge className="border-0 bg-red-100 text-red-700 shadow-none">3 active</Badge>
          </div>

          <div className="space-y-4">
            {incidents.map((incident) => (
              <div key={incident.title} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-950">{incident.title}</p>
                    <p className="mt-1 text-xs text-gray-500">{incident.dept}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge
                        className={`border-0 shadow-none ${
                          incident.severity === "Critical"
                            ? "bg-red-100 text-red-700"
                            : incident.severity === "High"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {incident.severity}
                      </Badge>
                      <Badge className="border-0 bg-slate-100 text-slate-700 shadow-none">{incident.owner}</Badge>
                    </div>
                  </div>

                  <div className="min-w-48">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Next deadline</p>
                    <p className="mt-1 text-sm font-medium text-gray-800">{incident.eta}</p>
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" className="bg-[#1e3a8a] hover:bg-[#1e40af]">
                        Take action
                      </Button>
                      <Button size="sm" variant="outline" className="border-gray-300">
                        Delegate
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-gray-200 p-6">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-gray-950">Recommended Next Actions</h2>
            <p className="text-sm text-muted-foreground">AI-ranked sequence for the next hour</p>
          </div>

          <div className="space-y-3">
            {nextActions.map((action, index) => (
              <div key={action} className="flex gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a] text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-gray-700">{action}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-4 text-emerald-700" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Outcome if plan is followed</p>
                <p className="mt-1 text-xs leading-5 text-gray-600">
                  Predicted SLA breach count drops from 18 to 11 and complaint aging stays within the weekly target.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <Card className="border-gray-200 p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-950">Resource Balancing</h2>
              <p className="text-sm text-muted-foreground">Where teams are stretched and where capacity exists</p>
            </div>
            <Badge className="border-0 bg-blue-100 text-blue-700 shadow-none">Crew planning</Badge>
          </div>

          <div className="space-y-4">
            {resourcePlan.map((item) => (
              <div key={item.dept} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-950">{item.dept}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Backlog: {item.backlog} | Teams available: {item.teams}
                    </p>
                  </div>
                  <Badge className="border-0 bg-slate-100 text-slate-700 shadow-none">
                    Utilization {item.utilization}%
                  </Badge>
                </div>
                <Progress value={item.utilization} className="h-2.5" />
                <p className="mt-3 text-sm leading-6 text-gray-600">{item.recommendation}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-gray-200 p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-950">Automation Watchlist</h2>
              <p className="text-sm text-muted-foreground">Processes keeping the desk moving</p>
            </div>
            <Badge className="border-0 bg-violet-100 text-violet-700 shadow-none">3 pipelines</Badge>
          </div>

          <div className="space-y-4">
            {automations.map((automation) => (
              <div key={automation.name} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-950">{automation.name}</p>
                    <p className="mt-1 text-xs text-gray-500">Next run: {automation.nextRun}</p>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#1e3a8a]">
                    {automation.successRate}%
                  </div>
                </div>
                <Progress value={automation.successRate} className="h-2.5" />
                <p className="mt-3 text-sm leading-6 text-gray-600">{automation.impact}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3">
            <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <Workflow className="mt-0.5 size-4 text-blue-700" />
              <p className="text-sm leading-6 text-gray-700">Automation reduces manual admin follow-up for recurring daily summaries and notices.</p>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <Zap className="mt-0.5 size-4 text-amber-700" />
              <p className="text-sm leading-6 text-gray-700">Broadcast drafting still needs one final tone review before it can auto-publish city advisories.</p>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <Users className="mt-0.5 size-4 text-emerald-700" />
              <p className="text-sm leading-6 text-gray-700">Resource shift recommendations are ready and can be sent to supervisors in one click.</p>
            </div>
          </div>

          <Button variant="outline" className="mt-5 w-full border-gray-300">
            Open automation controls
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </Card>
      </div>
    </div>
  );
}
