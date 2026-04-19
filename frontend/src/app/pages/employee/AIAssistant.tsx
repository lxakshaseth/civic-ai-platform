import { useState } from "react";
import { Link } from "react-router";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import {
  Bell,
  Bot,
  CheckCircle2,
  Clock,
  Map,
  Send,
  Target,
  TrendingUp,
  User,
} from "lucide-react";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  meta?: string;
};

const suggestedPrompts = [
  "What is my next best task?",
  "Show the fastest route",
  "Draft a work note",
  "Write a delay update message",
  "What materials should I carry?",
  "How can I improve today's performance?",
];

const assistantFeatures = [
  {
    title: "Smart Route Advice",
    detail: "Suggests the best task order based on nearby jobs and urgency.",
    icon: Map,
  },
  {
    title: "Work Note Drafting",
    detail: "Drafts a quick status note and citizen update after a site visit.",
    icon: CheckCircle2,
  },
  {
    title: "Priority Guidance",
    detail: "Suggests the next action for delays, escalations, and due-soon tasks.",
    icon: Bell,
  },
  {
    title: "Performance Tips",
    detail: "Provides actionable ideas to improve completion rate and shift efficiency.",
    icon: TrendingUp,
  },
];

function getAssistantReply(message: string) {
  const text = message.toLowerCase();

  if (text.includes("route") || text.includes("map")) {
    return {
      content:
        "Recommended order for today: first close the high-priority street-light task on MG Road, then Park Street drainage, and then Main Square sidewalk. This order can save about 45 minutes and 8.2 km.",
      meta: "Route optimization",
    };
  }

  if (text.includes("note") || text.includes("draft") || text.includes("message")) {
    return {
      content:
        "Draft: Site visit completed. The team inspected the issue and started repair work. Expected resolution is today before the shift ends. A final closure update will be shared after the work proof is uploaded.",
      meta: "Ready-to-use response",
    };
  }

  if (text.includes("delay") || text.includes("late")) {
    return {
      content:
        "If there is a delay, first post a status update in the notification, then add the reason in the supervisor note: material delay, traffic blockage, or access issue. Keep the citizen-facing message short and clear.",
      meta: "Escalation guidance",
    };
  }

  if (text.includes("material") || text.includes("checklist")) {
    return {
      content:
        "Recommended checklist for the street-light task: insulated gloves, ladder, voltage tester, replacement bulb, wiring tape, and before/after image capture. Verify the signature and invoice before leaving the site.",
      meta: "Field checklist",
    };
  }

  if (text.includes("performance") || text.includes("improve")) {
    return {
      content:
        "Focus on three actions today: close the high-priority task first, upload evidence during the same visit, and clear the notification backlog by mid-shift. This will improve both efficiency and response score.",
      meta: "Performance coaching",
    };
  }

  return {
    content:
      "I can help with shift planning, task priority, route planning, work-note drafting, and escalation messages. Ask for a route, checklist, task-closure draft, or performance guidance.",
    meta: "AI support",
  };
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello Adarsh. I reviewed today's task queue. Your top-priority issue is the street-light repair on MG Road. I can prepare a route, material checklist, or ready-to-use work note.",
      meta: "Shift briefing",
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
            <Bot className="size-3.5" />
            AI-powered field help
          </div>
          <h1 className="text-3xl font-bold text-gray-950">Employee AI Assistant</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Smart assistant for route planning, work-note drafting, delay messaging, and daily task prioritization.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="min-w-32 p-4">
            <p className="text-xs text-muted-foreground">Priority</p>
            <p className="mt-2 text-lg font-bold text-red-600">High</p>
          </Card>
          <Card className="min-w-32 p-4">
            <p className="text-xs text-muted-foreground">Route Save</p>
            <p className="mt-2 text-lg font-bold text-blue-700">45 min</p>
          </Card>
          <Card className="min-w-32 p-4">
            <p className="text-xs text-muted-foreground">Due Soon</p>
            <p className="mt-2 text-lg font-bold text-amber-600">2 tasks</p>
          </Card>
          <Card className="min-w-32 p-4">
            <p className="text-xs text-muted-foreground">Assist Status</p>
            <p className="mt-2 text-lg font-bold text-green-700">Ready</p>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
        <Card className="flex min-h-[720px] flex-col overflow-hidden border-gray-200">
          <div className="border-b bg-white px-6 py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-950">Conversation Workspace</h2>
                <p className="text-sm text-muted-foreground">
                  Ask about routes, checklists, delay updates, or complaint closure notes.
                </p>
              </div>
              <Badge className="w-fit bg-blue-100 text-blue-700 shadow-none">Live task context</Badge>
            </div>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto bg-gradient-to-b from-slate-50 to-white p-6">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#15803d] text-white shadow-sm">
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
                        message.role === "user" ? "text-blue-100" : "text-[#15803d]"
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
                onChange={(e) => setInput(e.target.value)}
                placeholder="Example: Show the fastest route or draft a work note..."
                className="h-12 flex-1 rounded-2xl border-gray-300"
              />
              <Button type="submit" className="h-12 rounded-2xl bg-[#15803d] px-5 hover:bg-[#166534]">
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
                <p className="text-sm text-muted-foreground">Send useful prompts with one tap</p>
              </div>
              <Badge className="bg-green-100 text-green-700 shadow-none">6 prompts</Badge>
            </div>
            <div className="space-y-2.5">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-800 transition-all hover:border-green-200 hover:bg-green-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </Card>

          <Card className="border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-950">Today's Smart Brief</h3>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <Target className="mt-0.5 size-4 text-red-600" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">First task: Fix Street Light</p>
                    <p className="mt-1 text-xs text-gray-600">High urgency, 1.2 km away, due before noon.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <Map className="mt-0.5 size-4 text-blue-700" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Best route available</p>
                    <p className="mt-1 text-xs text-gray-600">MG Road to Park Street to Main Square reduces travel overhead.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 size-4 text-amber-700" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Watch item</p>
                    <p className="mt-1 text-xs text-gray-600">2 tasks need closure update before shift end.</p>
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
                        <Icon className="size-4 text-[#15803d]" />
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
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <Link to="/employee/map">
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 transition-all hover:border-green-200 hover:bg-green-50">
                  <p className="text-sm font-semibold text-gray-900">Open Map View</p>
                  <p className="mt-1 text-xs text-gray-500">View nearby complaints and routes</p>
                </div>
              </Link>
              <Link to="/employee/assigned">
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 transition-all hover:border-green-200 hover:bg-green-50">
                  <p className="text-sm font-semibold text-gray-900">Task Queue</p>
                  <p className="mt-1 text-xs text-gray-500">Manage assigned complaints and status</p>
                </div>
              </Link>
              <Link to="/employee/evidence/CMP-2024-1240">
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 transition-all hover:border-green-200 hover:bg-green-50">
                  <p className="text-sm font-semibold text-gray-900">Upload Evidence</p>
                  <p className="mt-1 text-xs text-gray-500">Complete work proof and signature</p>
                </div>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
