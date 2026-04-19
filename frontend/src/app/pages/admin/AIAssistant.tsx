import { useState } from "react";
import { Link } from "react-router";
import {
  BarChart3,
  Bot,
  CheckCircle2,
  Clock,
  FileText,
  Megaphone,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  meta?: string;
};

const suggestedPrompts = [
  "Show today's admin priority plan",
  "Give me a budget overspend risk summary",
  "Draft a citizen advisory",
  "What are the next steps for fraud review?",
  "Suggest a department staffing rebalance",
  "Create a short board meeting summary",
];

const assistantFeatures = [
  {
    title: "Operational Planning",
    detail: "Suggests the next best admin actions based on backlog, team load, and SLA risk.",
    icon: BarChart3,
  },
  {
    title: "Policy and Audit Help",
    detail: "Quickly prepares approval notes, audit responses, and compliance summaries.",
    icon: ShieldCheck,
  },
  {
    title: "Citizen Communication",
    detail: "Drafts outage notices, advisories, and public updates in clear language.",
    icon: Megaphone,
  },
  {
    title: "Executive Briefing",
    detail: "Creates short dashboard summaries and board-ready talking points for leadership.",
    icon: FileText,
  },
];

function getAssistantReply(message: string) {
  const text = message.toLowerCase();

  if (text.includes("priority") || text.includes("plan")) {
    return {
      content:
        "Recommended order for today: 1) approve the emergency repair budget, 2) publish the Ward 11 water outage advisory, 3) authorize a temporary staff shift for the sanitation backlog, 4) send two high-risk fraud cases for final review.",
      meta: "Priority plan",
    };
  }

  if (text.includes("budget") || text.includes("overspend")) {
    return {
      content:
        "The highest overspend risk is in Infrastructure and Sanitation. Infrastructure has already used 85 percent of its budget and still has three pending emergency jobs. Sanitation is tracking 7 percent above projection due to weekend overtime. Immediate actions: place non-critical purchases on hold and use shared crews where possible.",
      meta: "Budget insight",
    };
  }

  if (text.includes("citizen") || text.includes("advisory") || text.includes("draft")) {
    return {
      content:
        "Draft: Residents of Ward 11 are informed that water supply may remain intermittent until 6:30 PM due to urgent pipeline repair. Repair teams are on site and backup tankers have been positioned in high-demand pockets. We appreciate your patience and will share the restoration update as soon as work is completed.",
      meta: "Public draft",
    };
  }

  if (text.includes("fraud") || text.includes("review") || text.includes("risk")) {
    return {
      content:
        "For fraud review, first validate the high-score reimbursement case against vendor history, then compare officer assignment history for the case showing repeated contractor patterns. If both show overlap, place a manual payment hold and export the audit trail.",
      meta: "Risk guidance",
    };
  }

  if (text.includes("staff") || text.includes("team") || text.includes("rebalance")) {
    return {
      content:
        "Recommended rebalance: move 2 mixed crews from Electricity to Sanitation for the evening block, and add one roving supervisor to Infrastructure. This could reduce the predicted SLA breach queue from 18 to 11 and stabilize complaint aging.",
      meta: "Staffing recommendation",
    };
  }

  if (text.includes("board") || text.includes("summary") || text.includes("meeting")) {
    return {
      content:
        "Leadership summary: Resolution time is down 12 percent month-over-month, citizen satisfaction is stable above 94 percent, and fraud flags have declined after tighter review rules. Current focus areas are sanitation backlog, emergency repair approvals, and faster citizen advisories for service disruptions.",
      meta: "Executive summary",
    };
  }

  return {
    content:
      "I can help with admin planning, budget review, fraud escalation, citizen communications, staffing allocation, and executive summaries. Ask for a priority plan, public draft, compliance note, or board summary.",
    meta: "AI support",
  };
}

export default function AdminAIAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello Ayush. I reviewed the current admin queue. The most urgent items are the emergency budget approval, the Ward 11 advisory, and two fraud review cases. I can prepare an action plan, public draft, or board summary now.",
      meta: "Opening brief",
    },
  ]);
  const [input, setInput] = useState("");

  const sendMessage = (message: string) => {
    if (!message.trim()) return;

    const reply = getAssistantReply(message);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: message },
      { role: "assistant", content: reply.content, meta: reply.meta },
    ]);
    setInput("");
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
            <Sparkles className="size-3.5" />
            Admin copilot ready
          </div>
          <h1 className="text-3xl font-bold text-gray-950">Admin AI Assistant</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Built-in admin copilot for budget summaries, policy guidance, citizen advisories, staffing recommendations, and executive briefs.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="min-w-32 border-gray-200 p-4">
            <p className="text-xs text-muted-foreground">Urgent items</p>
            <p className="mt-2 text-lg font-bold text-red-600">3</p>
          </Card>
          <Card className="min-w-32 border-gray-200 p-4">
            <p className="text-xs text-muted-foreground">SLA risk</p>
            <p className="mt-2 text-lg font-bold text-amber-600">18</p>
          </Card>
          <Card className="min-w-32 border-gray-200 p-4">
            <p className="text-xs text-muted-foreground">AI confidence</p>
            <p className="mt-2 text-lg font-bold text-blue-700">92%</p>
          </Card>
          <Card className="min-w-32 border-gray-200 p-4">
            <p className="text-xs text-muted-foreground">Assist status</p>
            <p className="mt-2 text-lg font-bold text-green-700">Ready</p>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.95fr)]">
        <Card className="flex min-h-[720px] flex-col overflow-hidden border-gray-200">
          <div className="border-b bg-white px-6 py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-950">Conversation Workspace</h2>
                <p className="text-sm text-muted-foreground">
                  Ask for action plans, budget insights, citizen drafts, or executive summaries.
                </p>
              </div>
              <Badge className="w-fit border-0 bg-blue-100 text-blue-700 shadow-none">Live admin context</Badge>
            </div>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto bg-gradient-to-b from-slate-50 to-white p-6">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#1e3a8a] text-white shadow-sm">
                    <Bot className="size-5" />
                  </div>
                )}

                <div
                  className={`max-w-[82%] rounded-3xl px-4 py-3 shadow-sm ${
                    message.role === "user"
                      ? "bg-[#1d4ed8] text-white"
                      : "border border-gray-200 bg-white text-gray-900"
                  }`}
                >
                  {message.meta && (
                    <p
                      className={`mb-1 text-[11px] font-semibold uppercase tracking-wide ${
                        message.role === "user" ? "text-blue-100" : "text-[#1e3a8a]"
                      }`}
                    >
                      {message.meta}
                    </p>
                  )}
                  <p className="text-sm leading-6">{message.content}</p>
                </div>

                {message.role === "user" && (
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-200 text-slate-700 shadow-sm">
                    <User className="size-5" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border-t bg-white p-5">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Example: Give me a budget overspend risk summary..."
                className="h-12 flex-1 rounded-2xl border-gray-300"
              />
              <Button type="submit" className="h-12 rounded-2xl bg-[#1e3a8a] px-5 hover:bg-[#1e40af]">
                <Send className="mr-2 size-4" />
                Send
              </Button>
            </form>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="border-gray-200 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-950">AI Shortcuts</h3>
                <p className="text-sm text-muted-foreground">Send common admin prompts with one tap</p>
              </div>
              <Badge className="border-0 bg-violet-100 text-violet-700 shadow-none">6 prompts</Badge>
            </div>
            <div className="space-y-2.5">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-800 transition-all hover:border-blue-200 hover:bg-blue-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </Card>

          <Card className="border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-950">Today&apos;s AI Brief</h3>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 size-4 text-red-600" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">First action: approve emergency budget</p>
                    <p className="mt-1 text-xs text-gray-600">Infrastructure request is time-sensitive and blocks two repair teams.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <Users className="mt-0.5 size-4 text-blue-700" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Suggested team shift</p>
                    <p className="mt-1 text-xs text-gray-600">Move 2 crews from electricity to sanitation for the evening slot.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <Megaphone className="mt-0.5 size-4 text-amber-700" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Pending citizen communication</p>
                    <p className="mt-1 text-xs text-gray-600">Ward 11 outage advisory is ready to draft and publish.</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-950">Useful Features</h3>
            <div className="mt-4 space-y-3">
              {assistantFeatures.map((feature) => {
                const Icon = feature.icon;

                return (
                  <div key={feature.title} className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-white p-2 shadow-sm">
                        <Icon className="size-4 text-[#1e3a8a]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{feature.title}</p>
                        <p className="mt-1 text-xs leading-5 text-gray-600">{feature.detail}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-950">Quick Jump</h3>
            <div className="mt-4 grid gap-3">
              <Link to="/admin/command-center">
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 transition-all hover:border-blue-200 hover:bg-blue-50">
                  Open Command Center
                </div>
              </Link>
              <Link to="/admin/compliance">
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 transition-all hover:border-green-200 hover:bg-green-50">
                  Review Audit and Compliance
                </div>
              </Link>
              <Link to="/admin/broadcasts">
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 transition-all hover:border-amber-200 hover:bg-amber-50">
                  Draft Citizen Broadcast
                </div>
              </Link>
              <Link to="/admin/reports">
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 transition-all hover:border-slate-200 hover:bg-slate-50">
                  Generate Executive Report
                </div>
              </Link>
            </div>
          </Card>

          <Card className="border-gray-200 p-5">
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <CheckCircle2 className="mt-0.5 size-5 text-emerald-700" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Copilot can be used across admin decisions</p>
                <p className="mt-1 text-xs leading-5 text-gray-600">
                  Use it for summaries, approval notes, staffing recommendations, audit replies, and public messaging before you act.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
