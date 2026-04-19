import { useState } from "react";
import {
  Bell,
  Bot,
  CheckCircle2,
  Megaphone,
  RadioTower,
  Send,
  Users,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";

export default function BroadcastCenter() {
  const [title, setTitle] = useState("Ward 11 Water Service Advisory");
  const [audience, setAudience] = useState("Ward 11 residents");
  const [channel, setChannel] = useState("Push + SMS");
  const [message, setMessage] = useState(
    "Residents of Ward 11 are informed that water supply may remain intermittent until 6:30 PM due to urgent pipeline repair. Backup tankers have been positioned in high-demand pockets. We will share the restoration update as soon as work is completed.",
  );

  const templates = [
    "Water disruption notice",
    "Emergency repair update",
    "Fraud awareness advisory",
    "Service restoration confirmation",
  ];

  const recentBroadcasts = [
    {
      title: "Road repair reroute notice",
      audience: "Zone B commuters",
      status: "Sent",
      reach: "18.4K",
    },
    {
      title: "Sanitation shift delay update",
      audience: "Sector 5 households",
      status: "Scheduled",
      reach: "9.2K",
    },
    {
      title: "High heat public advisory",
      audience: "City-wide",
      status: "Draft",
      reach: "42K",
    },
  ];

  const aiSuggestions = [
    "Make the tone more official while remaining reassuring",
    "Draft a 160-character SMS version",
    "Prepare a bilingual notice in Hindi and English",
    "Draft a follow-up restoration update",
  ];

  const stats = [
    { label: "Active campaigns", value: "5", color: "text-blue-700" },
    { label: "Avg read rate", value: "82%", color: "text-emerald-700" },
    { label: "Urgent drafts", value: "2", color: "text-red-600" },
    { label: "Citizens reached", value: "69K", color: "text-amber-700" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            <Megaphone className="size-3.5" />
            Citizen communication hub
          </div>
          <h1 className="text-3xl font-bold text-gray-950">Broadcast Center</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Create, refine, and send resident advisories with AI-assisted drafts, audience targeting, and quick templates.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button className="bg-[#c2410c] hover:bg-[#9a3412]">
            <Send className="mr-2 size-4" />
            Send broadcast
          </Button>
          <Button variant="outline" className="border-gray-300">
            <Bot className="mr-2 size-4" />
            Ask AI to improve
          </Button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-gray-200 p-6">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className={`mt-2 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.9fr)]">
        <div className="space-y-6">
          <Card className="border-gray-200 p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-950">Compose Broadcast</h2>
                <p className="text-sm text-muted-foreground">Prepare a citizen-facing update and keep the message clear</p>
              </div>
              <Badge className="border-0 bg-amber-100 text-amber-700 shadow-none">Draft mode</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">Title</p>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} className="border-gray-300" />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">Audience</p>
                <Input
                  value={audience}
                  onChange={(event) => setAudience(event.target.value)}
                  className="border-gray-300"
                />
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-gray-700">Channels</p>
              <div className="flex flex-wrap gap-2">
                {["Push + SMS", "App only", "SMS only", "Email + App"].map((item) => (
                  <button
                    key={item}
                    onClick={() => setChannel(item)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                      channel === item
                        ? "border-[#c2410c] bg-orange-50 text-[#c2410c]"
                        : "border-gray-300 bg-white text-gray-700 hover:border-orange-200 hover:bg-orange-50"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-gray-700">Message</p>
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="min-h-48 border-gray-300 bg-white"
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button className="bg-[#c2410c] hover:bg-[#9a3412]">
                <Send className="mr-2 size-4" />
                Send now
              </Button>
              <Button variant="outline" className="border-gray-300">
                Save draft
              </Button>
              <Button variant="outline" className="border-gray-300">
                Schedule send
              </Button>
            </div>
          </Card>

          <Card className="border-gray-200 p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-950">Recent Broadcasts</h2>
                <p className="text-sm text-muted-foreground">Track what has been sent or scheduled recently</p>
              </div>
              <Badge className="border-0 bg-slate-100 text-slate-700 shadow-none">Latest 3</Badge>
            </div>

            <div className="space-y-4">
              {recentBroadcasts.map((item) => (
                <div key={item.title} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-950">{item.title}</p>
                      <p className="mt-1 text-xs text-gray-500">{item.audience}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        className={`border-0 shadow-none ${
                          item.status === "Sent"
                            ? "bg-green-100 text-green-700"
                            : item.status === "Scheduled"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {item.status}
                      </Badge>
                      <Badge className="border-0 bg-white text-slate-700 shadow-none">{item.reach}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-gray-200 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-950">AI Suggestions</h3>
                <p className="text-sm text-muted-foreground">One tap improvements for the draft</p>
              </div>
              <Badge className="border-0 bg-violet-100 text-violet-700 shadow-none">Assist</Badge>
            </div>

            <div className="space-y-2.5">
              {aiSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-800 transition-all hover:border-violet-200 hover:bg-violet-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </Card>

          <Card className="border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-950">Quick Templates</h3>
            <div className="mt-4 space-y-3">
              {templates.map((template) => (
                <button
                  key={template}
                  onClick={() => setTitle(template)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-800 transition-all hover:border-orange-200 hover:bg-orange-50"
                >
                  {template}
                </button>
              ))}
            </div>
          </Card>

          <Card className="border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-950">Draft Preview</h3>
            <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-950">{title}</p>
                <Badge className="border-0 bg-orange-100 text-orange-700 shadow-none">{channel}</Badge>
              </div>
              <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
                <Users className="size-3.5" />
                <span>{audience}</span>
              </div>
              <p className="text-sm leading-6 text-gray-700">{message}</p>
            </div>
          </Card>

          <Card className="border-gray-200 p-5">
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <RadioTower className="mt-0.5 size-4 text-blue-700" />
                <p className="text-sm leading-6 text-gray-700">Recommended channel for this draft is {channel} based on reach and urgency.</p>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <CheckCircle2 className="mt-0.5 size-4 text-emerald-700" />
                <p className="text-sm leading-6 text-gray-700">Message is clear and action-oriented. Add one more line only if tanker pickup locations need to be mentioned.</p>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <Bell className="mt-0.5 size-4 text-amber-700" />
                <p className="text-sm leading-6 text-gray-700">Urgent service disruptions perform best when sent within 15 minutes of the operational update.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
