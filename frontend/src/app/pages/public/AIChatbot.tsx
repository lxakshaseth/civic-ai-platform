import { useState } from "react";
import { Link } from "react-router";
import {
  AlertTriangle,
  Bot,
  Camera,
  CheckCircle2,
  FileText,
  Globe2,
  HeartHandshake,
  Languages,
  MapPin,
  MessageSquareText,
  Navigation,
  Send,
  ShieldAlert,
  Sparkles,
  User,
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
  "There is a large pothole on MG Road",
  "What is the status of my complaint?",
  "What problems are active in my area?",
  "There has been a road accident. What should I do?",
  "I need a water connection",
  "The road is damaged",
  "Identify the issue from this photo",
];

const assistantCapabilities = [
  {
    title: "Easy Complaint Filing",
    detail: "The citizen can describe the issue, and the AI can autofill the category, urgency, and key form fields.",
    icon: FileText,
  },
  {
    title: "Smart Understanding",
    detail: "The AI understands the problem, suggests the correct department, and reduces incorrect submissions.",
    icon: Sparkles,
  },
  {
    title: "Status Without Navigation",
    detail: "Complaint status can be shared directly in chat without opening multiple pages.",
    icon: MessageSquareText,
  },
  {
    title: "Nearby Issues Awareness",
    detail: "Shows ongoing issues in the area to reduce duplicate complaints and confusion.",
    icon: MapPin,
  },
  {
    title: "Emergency Guidance",
    detail: "Provides helpline numbers, immediate guidance, and nearby support for accidents or urgent issues.",
    icon: ShieldAlert,
  },
  {
    title: "Smart Navigation",
    detail: "Provides shortcuts to open the most relevant page directly from chat.",
    icon: Navigation,
  },
  {
    title: "Schemes and Services Guide",
    detail: "Explains water connections, required documents, application flow, and related service steps.",
    icon: Globe2,
  },
  {
    title: "Personalized Suggestions",
    detail: "Can proactively suggest next actions based on pending complaints and recurring local issues.",
    icon: HeartHandshake,
  },
  {
    title: "Multilingual Support",
    detail: "Understands Hindi, Hinglish, and mixed-language requests without breaking the support flow.",
    icon: Languages,
  },
  {
    title: "Image-based Complaint Help",
    detail: "Detects the probable issue type from an uploaded photo and speeds up complaint filing.",
    icon: Camera,
  },
];

function getAssistantReply(message: string) {
  const text = message.toLowerCase();

  if (
    text.includes("pothole") ||
    text.includes("sadak toot") ||
    text.includes("road broken") ||
    text.includes("mg road")
  ) {
    return {
      content:
        "AI suggestion: Category Infrastructure, urgency High, probable location MG Road. I can prefill the complaint form for a pothole report so you only need to review and submit it.",
      meta: "Auto-fill complaint",
    };
  }

  if (text.includes("status") || text.includes("complaint id")) {
    return {
      content:
        "Your latest complaint is currently marked In Progress and a field team has been assigned. If you want, I can open My Complaints or the complaint detail page as the next step.",
      meta: "Live status",
    };
  }

  if (text.includes("area") || text.includes("nearby") || text.includes("problems chal")) {
    return {
      content:
        "There are currently 3 similar active issues in your area: garbage collection delay, broken street light, and a cluster of road potholes. This helps avoid duplicate filings, and I can also open the relevant existing issues.",
      meta: "Nearby awareness",
    };
  }

  if (text.includes("accident") || text.includes("emergency") || text.includes("kya karu")) {
    return {
      content:
        "Immediate guidance: call 112 or 108 first, move the injured person to a safer location if possible, and open the Emergency Contacts page. For women's safety situations, you can also call 181.",
      meta: "Emergency support",
    };
  }

  if (text.includes("water connection") || text.includes("water") || text.includes("connection")) {
    return {
      content:
        "Standard steps for a water connection include applicant details, address proof, identity proof, property proof, and local department verification. I can take you to the Services section or the relevant complaint support page.",
      meta: "Service guidance",
    };
  }

  if (text.includes("photo") || text.includes("image") || text.includes("upload")) {
    return {
      content:
        "In image-based mode, the AI can detect the probable issue type, such as a pothole, garbage overflow, or a broken light. It can then suggest the category and urgency to speed up complaint filing.",
      meta: "Image understanding",
    };
  }

  if (text.includes("hindi") || text.includes("sadak") || text.includes("toot")) {
    return {
      content:
        "I can understand Hindi, Hinglish, and English. Describe the issue in your normal language, and I will convert it into a complaint-ready summary, the correct department, and the next action.",
      meta: "Multilingual ready",
    };
  }

  return {
    content:
      "I can help with complaint filing, smart categorization, complaint status, emergency guidance, nearby issues, service information, and navigation shortcuts. Describe your request naturally and I will suggest the next best action.",
    meta: "Citizen AI support",
  };
}

export default function AIChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello. I am your AI Assistant. You can describe a complaint, ask for status, check nearby issues, or request emergency guidance. Example: 'There is a large pothole on MG Road.'",
      meta: "Welcome brief",
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
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <Bot className="size-3.5" />
            Citizen AI Assistant
          </div>
          <h1 className="text-3xl font-bold text-gray-950">AI Assistant in the navigation bar and citizen flow</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Make complaint filing easier, explain status, provide emergency support, and offer smart navigation shortcuts.
            This assistant works with natural-language requests.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="min-w-32 border-gray-200 p-4">
            <p className="text-xs text-muted-foreground">User effort</p>
            <p className="mt-2 text-lg font-bold text-green-700">-80%</p>
          </Card>
          <Card className="min-w-32 border-gray-200 p-4">
            <p className="text-xs text-muted-foreground">Smart abilities</p>
            <p className="mt-2 text-lg font-bold text-blue-700">10</p>
          </Card>
          <Card className="min-w-32 border-gray-200 p-4">
            <p className="text-xs text-muted-foreground">Language mode</p>
            <p className="mt-2 text-lg font-bold text-amber-700">Multi</p>
          </Card>
          <Card className="min-w-32 border-gray-200 p-4">
            <p className="text-xs text-muted-foreground">Assist status</p>
            <p className="mt-2 text-lg font-bold text-green-700">Ready</p>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.95fr)]">
        <Card className="flex min-h-[760px] flex-col overflow-hidden border-gray-200">
          <div className="border-b bg-white px-6 py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-950">Conversation Workspace</h2>
                <p className="text-sm text-muted-foreground">
                  Ask naturally about complaints, status, nearby issues, emergencies, services, or navigation shortcuts.
                </p>
              </div>
              <Badge className="w-fit border-0 bg-blue-100 text-blue-700 shadow-none">Natural language ready</Badge>
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
                placeholder="Example: There is a large pothole on MG Road"
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
                <p className="text-sm text-muted-foreground">Send common citizen prompts with one tap</p>
              </div>
              <Badge className="border-0 bg-amber-100 text-amber-700 shadow-none">7 prompts</Badge>
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
            <h3 className="text-lg font-semibold text-gray-950">Smart Navigation</h3>
            <div className="mt-4 grid gap-3">
              <Link to="/public/file-complaint">
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 transition-all hover:border-blue-200 hover:bg-blue-50">
                  <p className="text-sm font-semibold text-gray-900">Open File Complaint</p>
                  <p className="mt-1 text-xs text-gray-500">For complaint auto-fill support</p>
                </div>
              </Link>
              <Link to="/public/my-complaints">
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 transition-all hover:border-blue-200 hover:bg-blue-50">
                  <p className="text-sm font-semibold text-gray-900">Open My Complaints</p>
                  <p className="mt-1 text-xs text-gray-500">For status and complaint details</p>
                </div>
              </Link>
              <Link to="/public/services">
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 transition-all hover:border-blue-200 hover:bg-blue-50">
                  <p className="text-sm font-semibold text-gray-900">Open Services Guide</p>
                  <p className="mt-1 text-xs text-gray-500">For water connection and government service guidance</p>
                </div>
              </Link>
              <Link to="/public/emergency-contacts">
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 transition-all hover:border-red-200 hover:bg-red-50">
                  <p className="text-sm font-semibold text-gray-900">Open Emergency Contacts</p>
                  <p className="mt-1 text-xs text-gray-500">For accident and urgent-response support</p>
                </div>
              </Link>
            </div>
          </Card>

          <Card className="border-gray-200 p-5">
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <CheckCircle2 className="mt-0.5 size-5 text-emerald-700" />
              <div>
                <p className="text-sm font-semibold text-gray-900">AI Assistant is now a navigation feature too</p>
                <p className="mt-1 text-xs leading-5 text-gray-600">
                  Citizens can open the assistant directly to file complaints, check status, get emergency guidance,
                  and access service help without searching the entire portal.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-6 border-gray-200 p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-950">What this AI Assistant can do</h2>
            <p className="text-sm text-muted-foreground">
              These are the citizen-facing capabilities highlighted inside the assistant experience.
            </p>
          </div>
          <Badge className="border-0 bg-blue-100 text-blue-700 shadow-none">Public assistant roadmap</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {assistantCapabilities.map((feature) => {
            const Icon = feature.icon;

            return (
              <div key={feature.title} className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-50">
                  <Icon className="size-5 text-[#1e3a8a]" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-xs leading-5 text-gray-600">{feature.detail}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 size-5 text-blue-700" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Complaint filing becomes simpler</p>
                <p className="mt-1 text-xs leading-5 text-gray-600">
                  The citizen can write: "There is a large pothole on MG Road," and the AI can suggest the category,
                  urgency, and probable location.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 text-amber-700" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Emergency help becomes faster</p>
                <p className="mt-1 text-xs leading-5 text-gray-600">
                  In a road accident, medical emergency, or women's safety case, the assistant provides immediate
                  guidance and the nearest support flow.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
            <div className="flex items-start gap-3">
              <Languages className="mt-0.5 size-5 text-emerald-700" />
              <div>
                <p className="text-sm font-semibold text-gray-900">India-scale language support</p>
                <p className="mt-1 text-xs leading-5 text-gray-600">
                  The assistant continues helping even when the user writes in Hindi, Hinglish, or mixed language.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
