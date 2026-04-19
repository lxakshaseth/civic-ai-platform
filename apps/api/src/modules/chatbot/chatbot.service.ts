import { ChatbotResponseSource, type UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

import { aiClient } from "integrations/ai/ai.client";
import { queueAuditLogJob } from "queues/jobs/audit.job";
import { AppError } from "shared/errors/app-error";

import {
  ChatbotKnowledgeRecord,
  ChatbotMessageRecord,
  ChatbotRepository
} from "./chatbot.repository";

const DEFAULT_CHATBOT_KNOWLEDGE = [
  {
    question: "Why is my road complaint still in progress?",
    answer:
      "Road complaints usually remain in progress while the field team completes site work and the department verifies the uploaded evidence before final closure.",
    keywords: ["road", "complaint", "progress", "status", "pothole", "repair"],
    category: "Complaint Status"
  },
  {
    question: "Which department handles water leakage complaints?",
    answer:
      "Water leakage complaints are typically routed to the Water Supply department so inspection, pipe repair, and restoration can be scheduled.",
    keywords: ["water", "leakage", "pipe", "supply", "department"],
    category: "Departments"
  },
  {
    question: "How do I file a new complaint?",
    answer:
      "Open File Complaint, add the title and description, choose the category and department, mark the location on the map, upload issue photos, sign digitally, and submit.",
    keywords: ["file", "new", "complaint", "submit", "upload", "location"],
    category: "Process"
  },
  {
    question: "Show me transparency data for Public Works.",
    answer:
      "You can review department-level transparency metrics from the Transparency page, including resolution rates, public performance indicators, and complaint trends for Public Works.",
    keywords: ["transparency", "public works", "department", "metrics", "data"],
    category: "Transparency"
  },
  {
    question: "How long does complaint resolution usually take?",
    answer:
      "Resolution time depends on the category, assigned department, and evidence verification, but complaints with complete details and clear photos are generally resolved faster.",
    keywords: ["resolution", "time", "how long", "eta", "delay"],
    category: "SLA"
  },
  {
    question: "How do I upload before and after evidence?",
    answer:
      "Employees can upload before and after evidence from the Operations Desk by selecting the assigned complaint and attaching the relevant images and invoice documents.",
    keywords: ["before", "after", "evidence", "upload", "invoice", "employee"],
    category: "Evidence"
  }
] as const;

interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

interface Actor {
  id: string;
  email: string;
  role: UserRole;
}

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (value: string) =>
  normalizeText(value)
    .split(" ")
    .filter((part) => part.length > 2);

export class ChatbotService {
  constructor(private readonly chatbotRepository: ChatbotRepository = new ChatbotRepository()) {}

  async getPublicSession() {
    await this.seedKnowledgeBase();
    const knowledgeEntries = await this.chatbotRepository.listKnowledgeEntries();

    return {
      messages: [],
      suggestions: knowledgeEntries.slice(0, 6).map((entry) => ({
        id: entry.id,
        question: entry.question,
        category: entry.category
      }))
    };
  }

  async getSession(actor: Actor, limit: number) {
    await this.seedKnowledgeBase();

    const [messages, knowledgeEntries] = await Promise.all([
      this.chatbotRepository.listMessagesByUser(actor.id, limit),
      this.chatbotRepository.listKnowledgeEntries()
    ]);

    return {
      messages: [...messages].reverse().map((message) => this.mapMessage(message)),
      suggestions: knowledgeEntries.slice(0, 6).map((entry) => ({
        id: entry.id,
        question: entry.question,
        category: entry.category
      }))
    };
  }

  async sendMessage(actor: Actor, message: string, requestContext?: RequestContext) {
    await this.seedKnowledgeBase();

    const [knowledgeEntries, recentMessages] = await Promise.all([
      this.chatbotRepository.listKnowledgeEntries(),
      this.chatbotRepository.listMessagesByUser(actor.id, 8)
    ]);

    const knowledgeMatch = this.findBestKnowledgeMatch(message, knowledgeEntries);

    let answer: string;
    let responseSource: ChatbotResponseSource;
    let knowledgeEntryId: string | undefined;

    if (knowledgeMatch) {
      answer = knowledgeMatch.answer;
      responseSource = ChatbotResponseSource.KNOWLEDGE_BASE;
      knowledgeEntryId = knowledgeMatch.id;
    } else {
      try {
        const aiResponse = await aiClient.generateChatReply({
          question: message,
          userRole: actor.role,
          history: [...recentMessages].reverse().map((item) => ({
            role: item.role === "USER" ? "user" : "assistant",
            content: item.content
          }))
        });

        answer = aiResponse.answer.trim();
        responseSource = ChatbotResponseSource.AI;
      } catch {
        answer =
          "I could not retrieve a live AI answer right now. Please try again in a moment or ask about complaint status, departments, or transparency metrics.";
        responseSource = ChatbotResponseSource.FALLBACK;
      }
    }

    if (!answer) {
      throw new AppError(
        "Unable to generate a chatbot response",
        StatusCodes.BAD_GATEWAY,
        "CHATBOT_RESPONSE_UNAVAILABLE"
      );
    }

    const exchange = await this.chatbotRepository.createExchange({
      userId: actor.id,
      question: message,
      answer,
      responseSource,
      knowledgeEntryId
    });

    await Promise.allSettled([
      queueAuditLogJob({
        userId: actor.id,
        action: "chatbot.message_processed",
        entity: "Chatbot",
        entityId: exchange.assistantMessage.id,
        ipAddress: requestContext?.ipAddress,
        userAgent: requestContext?.userAgent,
        metadata: {
          source: responseSource,
          knowledgeEntryId: knowledgeEntryId ?? null,
          promptLength: message.length
        }
      })
    ]);

    return {
      userMessage: this.mapMessage(exchange.userMessage),
      assistantMessage: this.mapMessage(exchange.assistantMessage)
    };
  }

  async sendPublicMessage(message: string) {
    await this.seedKnowledgeBase();

    const knowledgeEntries = await this.chatbotRepository.listKnowledgeEntries();
    const knowledgeMatch = this.findBestKnowledgeMatch(message, knowledgeEntries);

    if (knowledgeMatch) {
      return {
        userMessage: {
          id: `public-user-${Date.now()}`,
          role: "user" as const,
          content: message,
          source: null,
          createdAt: new Date()
        },
        assistantMessage: {
          id: `public-assistant-${Date.now()}`,
          role: "assistant" as const,
          content: knowledgeMatch.answer,
          source: "database" as const,
          createdAt: new Date()
        }
      };
    }

    const aiResponse = await aiClient.generateChatReply({
      question: message,
      history: []
    });

    return {
      userMessage: {
        id: `public-user-${Date.now()}`,
        role: "user" as const,
        content: message,
        source: null,
        createdAt: new Date()
      },
      assistantMessage: {
        id: `public-assistant-${Date.now()}`,
        role: "assistant" as const,
        content: aiResponse.answer,
        source: aiResponse.provider === "groq" || aiResponse.provider === "openai" ? "ai" as const : "fallback" as const,
        createdAt: new Date()
      }
    };
  }

  private async seedKnowledgeBase() {
    await Promise.all(
      DEFAULT_CHATBOT_KNOWLEDGE.map((entry) =>
        this.chatbotRepository.upsertKnowledgeEntry({
          question: entry.question,
          normalizedQuestion: normalizeText(entry.question),
          answer: entry.answer,
          keywords: entry.keywords.map((keyword: string) => normalizeText(keyword)),
          category: entry.category,
          isSeed: true
        })
      )
    );
  }

  private findBestKnowledgeMatch(question: string, entries: ChatbotKnowledgeRecord[]) {
    const normalizedQuestion = normalizeText(question);
    const tokens = tokenize(question);

    let bestMatch: { entry: ChatbotKnowledgeRecord; score: number } | null = null;

    for (const entry of entries) {
      const score = this.scoreKnowledgeEntry(normalizedQuestion, tokens, entry);

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { entry, score };
      }
    }

    if (!bestMatch || bestMatch.score < 24) {
      return null;
    }

    return bestMatch.entry;
  }

  private scoreKnowledgeEntry(
    normalizedQuestion: string,
    tokens: string[],
    entry: ChatbotKnowledgeRecord
  ) {
    if (normalizedQuestion === entry.normalizedQuestion) {
      return 100;
    }

    let score = 0;

    if (
      normalizedQuestion.includes(entry.normalizedQuestion) ||
      entry.normalizedQuestion.includes(normalizedQuestion)
    ) {
      score += 40;
    }

    const entryTokens = new Set(tokenize(entry.normalizedQuestion));
    const entryKeywords = new Set(entry.keywords.map((keyword) => normalizeText(keyword)));

    for (const token of tokens) {
      if (entryKeywords.has(token)) {
        score += 12;
      } else if (entryTokens.has(token)) {
        score += 8;
      }
    }

    return score;
  }

  private mapMessage(message: ChatbotMessageRecord) {
    return {
      id: message.id,
      role: message.role === "USER" ? "user" : "assistant",
      content: message.content,
      source:
        message.responseSource === ChatbotResponseSource.KNOWLEDGE_BASE
          ? "database"
          : message.responseSource === ChatbotResponseSource.AI
            ? "ai"
            : message.responseSource === ChatbotResponseSource.FALLBACK
              ? "fallback"
              : null,
      createdAt: message.createdAt
    } satisfies {
      id: string;
      role: ChatHistoryItem["role"];
      content: string;
      source: "database" | "ai" | "fallback" | null;
      createdAt: Date;
    };
  }
}
