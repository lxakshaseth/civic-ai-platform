import { ChatbotResponseSource, type Prisma } from "@prisma/client";

import { prisma } from "database/clients/prisma";

const knowledgeEntrySelect = {
  id: true,
  question: true,
  normalizedQuestion: true,
  answer: true,
  keywords: true,
  category: true,
  isSeed: true,
  createdAt: true,
  updatedAt: true
} as const;

const messageSelect = {
  id: true,
  role: true,
  content: true,
  responseSource: true,
  createdAt: true
} as const;

export type ChatbotKnowledgeRecord = Prisma.ChatbotKnowledgeEntryGetPayload<{
  select: typeof knowledgeEntrySelect;
}>;

export type ChatbotMessageRecord = Prisma.ChatbotMessageGetPayload<{
  select: typeof messageSelect;
}>;

interface CreateExchangeInput {
  userId: string;
  question: string;
  answer: string;
  responseSource: ChatbotResponseSource;
  knowledgeEntryId?: string;
}

interface UpsertKnowledgeEntryInput {
  question: string;
  normalizedQuestion: string;
  answer: string;
  keywords: string[];
  category?: string;
  isSeed?: boolean;
}

export class ChatbotRepository {
  listKnowledgeEntries() {
    return prisma.chatbotKnowledgeEntry.findMany({
      orderBy: [{ isSeed: "desc" }, { updatedAt: "desc" }],
      select: knowledgeEntrySelect
    });
  }

  listMessagesByUser(userId: string, limit: number) {
    return prisma.chatbotMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: messageSelect
    });
  }

  upsertKnowledgeEntry(data: UpsertKnowledgeEntryInput) {
    return prisma.chatbotKnowledgeEntry.upsert({
      where: { normalizedQuestion: data.normalizedQuestion },
      update: {
        question: data.question,
        answer: data.answer,
        keywords: data.keywords,
        category: data.category,
        isSeed: data.isSeed ?? false
      },
      create: {
        question: data.question,
        normalizedQuestion: data.normalizedQuestion,
        answer: data.answer,
        keywords: data.keywords,
        category: data.category,
        isSeed: data.isSeed ?? false
      },
      select: knowledgeEntrySelect
    });
  }

  createExchange(data: CreateExchangeInput) {
    return prisma.$transaction(async (tx) => {
      const userMessage = await tx.chatbotMessage.create({
        data: {
          userId: data.userId,
          role: "USER",
          content: data.question
        },
        select: messageSelect
      });

      const assistantMessage = await tx.chatbotMessage.create({
        data: {
          userId: data.userId,
          role: "ASSISTANT",
          content: data.answer,
          responseSource: data.responseSource,
          knowledgeEntryId: data.knowledgeEntryId
        },
        select: messageSelect
      });

      return { userMessage, assistantMessage };
    });
  }
}
