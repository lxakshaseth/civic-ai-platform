import { DailyBoostMood, DailyBoostType, UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

import { safeRedisGet, safeRedisSet } from "database/clients/redis";
import { aiClient } from "integrations/ai/ai.client";
import { GoogleTranslateClient } from "integrations/translation/google-translate.client";
import { AppError } from "shared/errors/app-error";

import {
  AiContentRepository,
  type DailyBoostRecordWithState
} from "./ai-content.repository";

type Actor = {
  id: string;
  role: UserRole;
};

type DailyBoostInput = {
  type: "joke" | "thought" | "tip" | "quote";
  mood: "happy" | "stress" | "angry";
  language: "en" | "hi" | "mr";
  pincode?: string;
  forceRefresh?: boolean;
};

const DAILY_BOOST_TTL_MS = 60 * 60 * 1000;
const DAILY_BOOST_TTL_SECONDS = DAILY_BOOST_TTL_MS / 1000;

const memoryCache = new Map<string, { contentId: string; expiresAt: number }>();

const typeMap: Record<DailyBoostInput["type"], DailyBoostType> = {
  joke: DailyBoostType.JOKE,
  thought: DailyBoostType.THOUGHT,
  tip: DailyBoostType.TIP,
  quote: DailyBoostType.QUOTE
};

const moodMap: Record<DailyBoostInput["mood"], DailyBoostMood> = {
  happy: DailyBoostMood.HAPPY,
  stress: DailyBoostMood.STRESS,
  angry: DailyBoostMood.ANGRY
};

const emojiMap: Record<DailyBoostInput["type"], Record<DailyBoostInput["mood"], string>> = {
  joke: {
    happy: "😂",
    stress: "🙂",
    angry: "😌"
  },
  thought: {
    happy: "🌤️",
    stress: "🫶",
    angry: "🌱"
  },
  tip: {
    happy: "💡",
    stress: "🛟",
    angry: "🧭"
  },
  quote: {
    happy: "✨",
    stress: "🌼",
    angry: "🕊️"
  }
};

const fallbackBoostLibrary: Record<DailyBoostInput["type"], Record<DailyBoostInput["mood"], string[]>> =
  {
    joke: {
      happy: [
        "If potholes had attendance, citizens would mark them present before sunrise.",
        "A clean street is the only place where even wrappers feel unemployed."
      ],
      stress: [
        "Even civic chaos pauses when one calm citizen reports the issue properly.",
        "One complaint ticket can be more powerful than ten worried sighs."
      ],
      angry: [
        "Road rage fixes nothing, but one sharp complaint with photos can start repairs.",
        "When dust rises, let the report rise faster than the temper."
      ]
    },
    thought: {
      happy: [
        "A better city is built each time a citizen chooses action over silence.",
        "Public spaces improve when small acts of care become daily habits."
      ],
      stress: [
        "Order returns faster when frustration turns into a clear civic report.",
        "Calm citizens create the kind of public trust cities depend on."
      ],
      angry: [
        "Strong cities need strong voices, but the strongest voice is still a constructive one.",
        "Civic anger becomes progress when it is directed into evidence and action."
      ]
    },
    tip: {
      happy: [
        "Tip: add a clear photo, exact location, and short description to speed up civic action.",
        "Tip: reporting early keeps small civic issues from becoming expensive ones."
      ],
      stress: [
        "Tip: when you feel overwhelmed, report one issue at a time with precise details.",
        "Tip: save complaint IDs so follow-ups stay quick and organized."
      ],
      angry: [
        "Tip: use respectful language and strong evidence; it escalates better than insults.",
        "Tip: note pincode, landmarks, and time of issue before submitting the complaint."
      ]
    },
    quote: {
      happy: [
        "A responsible citizen is the quiet engine behind a stronger city.",
        "Cities feel brighter when people participate instead of just pointing out problems."
      ],
      stress: [
        "Civic change begins when concern becomes a clear next step.",
        "Patience matters, but informed follow-up matters more."
      ],
      angry: [
        "Let your complaint carry facts, not just fire.",
        "Public accountability works best when citizens stay firm, clear, and constructive."
      ]
    }
  };

export class AiContentService {
  constructor(
    private readonly repository: AiContentRepository = new AiContentRepository(),
    private readonly translateClient: GoogleTranslateClient = new GoogleTranslateClient()
  ) {}

  async generate(actor: Actor, input: DailyBoostInput) {
    if (actor.role !== UserRole.CITIZEN) {
      throw new AppError("Forbidden", StatusCodes.FORBIDDEN, "FORBIDDEN");
    }

    const normalizedPincode = input.pincode?.trim() || null;
    const filters = {
      type: typeMap[input.type],
      mood: moodMap[input.mood],
      language: input.language,
      pincode: normalizedPincode
    };
    const cacheKey = this.buildCacheKey(filters);

    if (!input.forceRefresh) {
      const cachedContentId = await this.getCachedContentId(cacheKey);

      if (cachedContentId) {
        const cachedRecord = await this.repository.findByIdForUser(cachedContentId, actor.id);

        if (cachedRecord) {
          return this.presentContent(cachedRecord, "cache");
        }
      }

      const recentRecord = await this.repository.findRecentContent(
        filters,
        actor.id,
        new Date(Date.now() - DAILY_BOOST_TTL_MS)
      );

      if (recentRecord) {
        await this.setCachedContentId(cacheKey, recentRecord.id);
        return this.presentContent(recentRecord, "cache");
      }
    }

    const generated = await this.generateLocalizedContent(input);
    const createdRecord = await this.repository.createContent(
      {
        ...filters,
        content: generated.text,
        emoji: emojiMap[input.type][input.mood],
        prompt: generated.prompt,
        model: generated.model,
        source: generated.source,
        expiresAt: new Date(Date.now() + DAILY_BOOST_TTL_MS)
      },
      actor.id
    );

    if (!createdRecord) {
      throw new AppError(
        "Unable to store generated content",
        StatusCodes.INTERNAL_SERVER_ERROR,
        "AI_CONTENT_CREATE_FAILED"
      );
    }

    await this.setCachedContentId(cacheKey, createdRecord.id);

    return this.presentContent(createdRecord, generated.source);
  }

  async toggleSave(actor: Actor, contentId: string) {
    if (actor.role !== UserRole.CITIZEN) {
      throw new AppError("Forbidden", StatusCodes.FORBIDDEN, "FORBIDDEN");
    }

    const record = await this.repository.findByIdForUser(contentId, actor.id);

    if (!record) {
      throw new AppError("Content not found", StatusCodes.NOT_FOUND, "AI_CONTENT_NOT_FOUND");
    }

    const isSaved = await this.repository.toggleSave(actor.id, contentId);
    const refreshedRecord = await this.repository.findByIdForUser(contentId, actor.id);

    if (!refreshedRecord) {
      throw new AppError("Content not found", StatusCodes.NOT_FOUND, "AI_CONTENT_NOT_FOUND");
    }

    return {
      saved: isSaved,
      item: this.presentContent(refreshedRecord)
    };
  }

  async toggleLike(actor: Actor, contentId: string) {
    if (actor.role !== UserRole.CITIZEN) {
      throw new AppError("Forbidden", StatusCodes.FORBIDDEN, "FORBIDDEN");
    }

    const result = await this.repository.toggleLike(actor.id, contentId);

    if (!result) {
      throw new AppError("Content not found", StatusCodes.NOT_FOUND, "AI_CONTENT_NOT_FOUND");
    }

    const refreshedRecord = await this.repository.findByIdForUser(contentId, actor.id);

    if (!refreshedRecord) {
      throw new AppError("Content not found", StatusCodes.NOT_FOUND, "AI_CONTENT_NOT_FOUND");
    }

    return {
      liked: result.isLiked,
      likesCount: result.likesCount,
      item: this.presentContent(refreshedRecord)
    };
  }

  async listSaved(actor: Actor, limit: number) {
    if (actor.role !== UserRole.CITIZEN) {
      throw new AppError("Forbidden", StatusCodes.FORBIDDEN, "FORBIDDEN");
    }

    const records = await this.repository.listSavedContent(actor.id, limit);
    return records.map((record) => this.presentContent(record.content));
  }

  private presentContent(record: DailyBoostRecordWithState, sourceOverride?: string) {
    return {
      id: record.id,
      type: record.type.toLowerCase(),
      mood: record.mood.toLowerCase(),
      language: record.language,
      pincode: record.pincode,
      text: record.content,
      emoji: record.emoji || "✨",
      likesCount: Math.max(0, record.likesCount),
      isLiked: record.likedBy.length > 0,
      isSaved: record.savedBy.length > 0,
      source: sourceOverride ?? record.source ?? "database",
      createdAt: record.createdAt
    };
  }

  private buildCacheKey(filters: {
    type: DailyBoostType;
    mood: DailyBoostMood;
    language: string;
    pincode?: string | null;
  }) {
    return `daily-boost:${filters.type}:${filters.mood}:${filters.language}:${filters.pincode ?? "all"}`;
  }

  private async getCachedContentId(cacheKey: string) {
    const memoryValue = memoryCache.get(cacheKey);

    if (memoryValue && memoryValue.expiresAt > Date.now()) {
      return memoryValue.contentId;
    }

    if (memoryValue) {
      memoryCache.delete(cacheKey);
    }

    try {
      const redisValue = await safeRedisGet(cacheKey);

      if (!redisValue) {
        return null;
      }

      const parsed = JSON.parse(redisValue) as { contentId?: string };
      return parsed.contentId ?? null;
    } catch {
      return null;
    }
  }

  private async setCachedContentId(cacheKey: string, contentId: string) {
    memoryCache.set(cacheKey, {
      contentId,
      expiresAt: Date.now() + DAILY_BOOST_TTL_MS
    });

    try {
      await safeRedisSet(cacheKey, JSON.stringify({ contentId }), DAILY_BOOST_TTL_SECONDS);
    } catch {
      // Redis is optional for this feature. Memory cache and database fallback are enough.
    }
  }

  private async generateLocalizedContent(input: DailyBoostInput) {
    try {
      const generated = await aiClient.generateDailyBoost({
        type: input.type,
        mood: input.mood,
        pincode: input.pincode?.trim() || null
      });

      if (input.language === "en") {
        return {
          text: generated.text,
          prompt: generated.prompt,
          model: generated.model,
          source: generated.provider
        };
      }

      const translated = await this.translateClient.translateText({
        text: generated.text,
        sourceLanguage: "en",
        targetLanguage: input.language
      });

      return {
        text: translated.translatedText?.trim() || generated.text,
        prompt: generated.prompt,
        model: generated.model,
        source: generated.provider
      };
    } catch {
      const fallbackEnglish = this.pickFallbackText(input);

      if (input.language === "en") {
        return {
          text: fallbackEnglish,
          prompt: "fallback",
          model: "local-fallback",
          source: "fallback"
        } as const;
      }

      const translated = await this.translateClient.translateText({
        text: fallbackEnglish,
        sourceLanguage: "en",
        targetLanguage: input.language
      });

      return {
        text: translated.translatedText?.trim() || fallbackEnglish,
        prompt: "fallback",
        model: "local-fallback",
        source: "fallback"
      } as const;
    }
  }

  private pickFallbackText(input: DailyBoostInput) {
    const options = fallbackBoostLibrary[input.type][input.mood];
    const seed = `${input.type}:${input.mood}:${input.pincode ?? ""}`;
    const index =
      [...seed].reduce((total, character) => total + character.charCodeAt(0), 0) % options.length;

    return options[index];
  }
}
