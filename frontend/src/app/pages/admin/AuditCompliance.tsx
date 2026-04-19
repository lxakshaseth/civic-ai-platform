import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Key,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Progress } from "../../components/ui/progress";

export default function AuditCompliance() {
  const metrics = [
    { label: "Audit readiness score", value: "91%", helper: "Quarterly review status", color: "text-emerald-700" },
    { label: "Pending approvals", value: "4", helper: "Need sign-off today", color: "text-amber-600" },
    { label: "Access reviews due", value: "7", helper: "Admin roles and privileges", color: "text-blue-700" },
    { label: "Policy exceptions", value: "2", helper: "Need documented reasons", color: "text-red-600" },
  ];

  const approvalQueue = [
    {
      title: "Emergency procurement note",
      owner: "Infrastructure",
      detail: "Needs budget exception note and final admin sign-off.",
      status: "Urgent",
    },
    {
      title: "Vendor anomaly closure",
      owner: "Fraud desk",
      detail: "Evidence has been attached; reviewer confirmation is pending.",
      status: "Review",
    },
    {
      title: "Broadcast policy waiver",
      owner: "Citizen communications",
      detail: "Fast-track notice requested for service disruption update.",
      status: "Ready",
    },
  ];

  const accessReviews = [
    { team: "Operations admins", scope: "Shift escalation and command tools", progress: 84 },
    { team: "Finance admins", scope: "Budget approvals and export access", progress: 67 },
    { team: "Fraud desk reviewers", scope: "Investigation review permissions", progress: 91 },
  ];

  const auditTrail = [
    {
      action: "Emergency budget draft approved",
      actor: "Ayush Sharma",
      time: "10:40 AM",
      detail: "Infrastructure emergency repair request moved to finance release.",
    },
    {
      action: "High-risk reimbursement case escalated",
      actor: "Fraud desk",
      time: "9:55 AM",
      detail: "Manual review requested for repeated contractor pattern.",
    },
    {
      action: "Citizen outage advisory prepared",
      actor: "Communications admin",
      time: "9:10 AM",
      detail: "Draft ready for legal and compliance review.",
    },
  ];

  const checklist = [
    { label: "Department approvals indexed", progress: 94, helper: "7 of 8 packets complete" },
    { label: "Access review evidence captured", progress: 81, helper: "Need finance admin notes" },
    { label: "Fraud investigation records bundled", progress: 88, helper: "One manual review pending" },
    { label: "Broadcast policy logs updated", progress: 76, helper: "Fast-track waiver still open" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <ShieldCheck className="size-3.5" />
            Audit-ready admin controls
          </div>
          <h1 className="text-3xl font-bold text-gray-950">Audit and Compliance</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Centralize approvals, access reviews, evidence packets, and policy exceptions before internal or external audits.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button className="bg-[#15803d] hover:bg-[#166534]">
            <CheckCircle2 className="mr-2 size-4" />
            Start compliance review
          </Button>
          <Button variant="outline" className="border-gray-300">
            <FileText className="mr-2 size-4" />
            Export audit packet
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

      <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <Card className="border-gray-200 p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-950">Approval Queue</h2>
              <p className="text-sm text-muted-foreground">Items waiting for policy or leadership sign-off</p>
            </div>
            <Badge className="border-0 bg-amber-100 text-amber-700 shadow-none">4 pending</Badge>
          </div>

          <div className="space-y-4">
            {approvalQueue.map((item) => (
              <div key={item.title} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-950">{item.title}</p>
                    <p className="mt-1 text-xs text-gray-500">{item.owner}</p>
                    <p className="mt-3 text-sm leading-6 text-gray-600">{item.detail}</p>
                  </div>
                  <div className="flex min-w-40 flex-col items-start gap-2">
                    <Badge
                      className={`border-0 shadow-none ${
                        item.status === "Urgent"
                          ? "bg-red-100 text-red-700"
                          : item.status === "Ready"
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {item.status}
                    </Badge>
                    <Button size="sm" className="bg-[#15803d] hover:bg-[#166534]">
                      Review item
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-gray-200 p-6">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-gray-950">Access Review Monitor</h2>
            <p className="text-sm text-muted-foreground">Role access and privilege cleanup status</p>
          </div>

          <div className="space-y-4">
            {accessReviews.map((item) => (
              <div key={item.team} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-950">{item.team}</p>
                    <p className="mt-1 text-xs text-gray-500">{item.scope}</p>
                  </div>
                  <span className="text-sm font-semibold text-[#1e3a8a]">{item.progress}%</span>
                </div>
                <Progress value={item.progress} className="h-2.5" />
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <Key className="mt-0.5 size-4 text-blue-700" />
            <p className="text-sm leading-6 text-gray-700">
              Finance admin access is the main cleanup risk. Complete that review to close the quarter with a green audit posture.
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.9fr)]">
        <Card className="border-gray-200 p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-950">Recent Audit Trail</h2>
              <p className="text-sm text-muted-foreground">Latest tracked admin actions with context</p>
            </div>
            <Badge className="border-0 bg-slate-100 text-slate-700 shadow-none">Tracked actions</Badge>
          </div>

          <div className="space-y-4">
            {auditTrail.map((item) => (
              <div key={`${item.action}-${item.time}`} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-950">{item.action}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {item.actor} | {item.time}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-gray-600">{item.detail}</p>
                  </div>
                  <Button size="sm" variant="outline" className="border-gray-300">
                    <Eye className="mr-2 size-4" />
                    View log
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-gray-200 p-6">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-gray-950">Compliance Checklist</h2>
            <p className="text-sm text-muted-foreground">What still needs to be completed</p>
          </div>

          <div className="space-y-4">
            {checklist.map((item) => (
              <div key={item.label} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-950">{item.label}</p>
                  <span className="text-sm font-semibold text-[#15803d]">{item.progress}%</span>
                </div>
                <Progress value={item.progress} className="h-2.5" />
                <p className="mt-2 text-xs text-gray-500">{item.helper}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <Clock className="mt-0.5 size-4 text-amber-700" />
              <p className="text-sm leading-6 text-gray-700">Two approvals and one policy waiver should be closed before end of day.</p>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">
              <AlertTriangle className="mt-0.5 size-4 text-red-700" />
              <p className="text-sm leading-6 text-gray-700">Leaving the broadcast waiver open could create a compliance gap in public notice workflows.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
