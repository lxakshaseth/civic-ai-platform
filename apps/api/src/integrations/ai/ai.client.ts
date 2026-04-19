import axios from "axios";

import { env } from "config/env";

const aiApi = axios.create({
  baseURL: env.AI_SERVICE_URL,
  timeout: env.AI_SERVICE_TIMEOUT_MS,
  headers: {
    "x-api-key": env.AI_SERVICE_API_KEY
  }
});

const groqApi = axios.create({
  baseURL: env.GROQ_BASE_URL,
  timeout: env.AI_SERVICE_TIMEOUT_MS,
  headers: {
    Authorization: `Bearer ${env.GROQ_API_KEY || env.AI_SERVICE_API_KEY}`,
    "Content-Type": "application/json"
  }
});

interface ComplaintAnalysisResponse {
  category: string;
  priority: string;
  confidence: number;
}

interface OcrResponse {
  text: string;
  confidence: number;
}

interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

interface ChatReplyResponse {
  answer: string;
  provider?: string;
  model?: string;
}

interface DailyBoostResponse {
  text: string;
  prompt: string;
  provider: "groq";
  model: string;
}

interface GroqChatCompletionPayload {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

function shouldUseDirectGroq() {
  return Boolean(env.GROQ_API_KEY || env.AI_SERVICE_API_KEY.startsWith("gsk_"));
}

export const aiClient = {
  async classifyComplaint(payload: { complaintId: string; title: string; description: string }) {
    const response = await aiApi.post<ComplaintAnalysisResponse>("/v1/complaints/classify", payload);
    return response.data;
  },

  async detectUrgency(payload: { complaintId: string; title: string; description: string }) {
    const response = await aiApi.post<ComplaintAnalysisResponse>("/v1/complaints/priority", payload);
    return response.data;
  },

  async extractInvoiceText(payload: { evidenceId: string; filePath: string }) {
    const response = await aiApi.post<OcrResponse>("/v1/evidence/ocr", payload);
    return response.data;
  },

  async generateChatReply(payload: {
    question: string;
    userRole?: string;
    history?: ChatHistoryItem[];
  }) {
    try {
      const response = await aiApi.post<ChatReplyResponse>("/v1/chat/reply", payload);
      return response.data;
    } catch (error) {
      if (!shouldUseDirectGroq()) {
        throw error;
      }

      const response = await groqApi.post<GroqChatCompletionPayload>("/chat/completions", {
        model: env.GROQ_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are the SAIP civic assistant for an Indian smart-city complaint platform. Answer clearly, professionally, and briefly. Focus on complaint tracking, departments, transparency metrics, evidence handling, and civic workflows."
          },
          ...(payload.history ?? []).map((item) => ({
            role: item.role,
            content: item.content
          })),
          {
            role: "user",
            content: payload.question
          }
        ],
        max_tokens: 220,
        temperature: 0.4
      });

      const answer = response.data.choices?.[0]?.message?.content?.trim();

      return {
        answer: answer || "I could not generate a live response right now. Please try again.",
        provider: "groq",
        model: env.GROQ_MODEL
      } satisfies ChatReplyResponse;
    }
  },

  async generateDailyBoost(payload: {
    type: "joke" | "thought" | "tip" | "quote";
    mood: "happy" | "stress" | "angry";
    pincode?: string | null;
  }) {
    if (!shouldUseDirectGroq()) {
      throw new Error("Groq credentials are not configured.");
    }

    const contentLabel = {
      joke: "light civic joke",
      thought: "reflective civic thought",
      tip: "practical civic awareness tip",
      quote: "motivational civic quote"
    }[payload.type];

    const moodTone = {
      happy: "upbeat and warm",
      stress: "calming and reassuring",
      angry: "de-escalating, constructive, and respectful"
    }[payload.mood];

    const locationContext = payload.pincode?.trim()
      ? ` Use pincode ${payload.pincode.trim()} only as local context without inventing exact landmarks or false facts.`
      : "";

    const prompt = `Generate one short ${contentLabel} for Indian citizens with a ${moodTone} tone about civic life, public cleanliness, roads, water, safety, or responsible community action.${locationContext} Keep it under 2 lines, plain text only, no bullets, no hashtags, no quotation marks, and no emojis.`;

    const execute = async () => {
      const response = await groqApi.post<GroqChatCompletionPayload>("/chat/completions", {
        model: env.GROQ_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You create short, uplifting, non-political civic micro-content for Indian citizens. Respond with plain text only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 120,
        temperature: 0.8
      });

      const text = response.data.choices?.[0]?.message?.content
        ?.replace(/^["'\s]+|["'\s]+$/g, "")
        .trim();

      if (!text) {
        throw new Error("Groq daily boost response was empty.");
      }

      return {
        text,
        prompt,
        provider: "groq",
        model: env.GROQ_MODEL
      } satisfies DailyBoostResponse;
    };

    try {
      return await execute();
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === "ECONNABORTED") {
        return execute();
      }

      throw error;
    }
  }
};
