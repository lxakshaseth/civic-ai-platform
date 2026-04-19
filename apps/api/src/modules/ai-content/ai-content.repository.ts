import {
  DailyBoostContent,
  DailyBoostMood,
  DailyBoostType,
  type SavedContent
} from "@prisma/client";

import { prisma } from "database/clients/prisma";

const buildStateInclude = (userId: string) => ({
  savedBy: {
    where: { userId },
    select: { id: true }
  },
  likedBy: {
    where: { userId },
    select: { id: true }
  }
});

export type DailyBoostRecordWithState = DailyBoostContent & {
  savedBy: Array<{ id: string }>;
  likedBy: Array<{ id: string }>;
};

export class AiContentRepository {
  async findByIdForUser(id: string, userId: string) {
    return prisma.dailyBoostContent.findUnique({
      where: { id },
      include: buildStateInclude(userId)
    }) as Promise<DailyBoostRecordWithState | null>;
  }

  async findRecentContent(
    filters: {
      type: DailyBoostType;
      mood: DailyBoostMood;
      language: string;
      pincode?: string | null;
    },
    userId: string,
    since: Date
  ) {
    return prisma.dailyBoostContent.findFirst({
      where: {
        type: filters.type,
        mood: filters.mood,
        language: filters.language,
        pincode: filters.pincode ?? null,
        createdAt: {
          gte: since
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      include: buildStateInclude(userId)
    }) as Promise<DailyBoostRecordWithState | null>;
  }

  async createContent(
    data: {
      type: DailyBoostType;
      mood: DailyBoostMood;
      language: string;
      pincode?: string | null;
      content: string;
      emoji?: string | null;
      prompt?: string | null;
      model?: string | null;
      source?: string | null;
      expiresAt?: Date | null;
    },
    userId: string
  ) {
    const created = await prisma.dailyBoostContent.create({
      data: {
        type: data.type,
        mood: data.mood,
        language: data.language,
        pincode: data.pincode ?? null,
        content: data.content,
        emoji: data.emoji ?? null,
        prompt: data.prompt ?? null,
        model: data.model ?? null,
        source: data.source ?? null,
        expiresAt: data.expiresAt ?? null
      }
    });

    return this.findByIdForUser(created.id, userId);
  }

  async toggleSave(userId: string, contentId: string) {
    const existing = await prisma.savedContent.findUnique({
      where: {
        userId_contentId: {
          userId,
          contentId
        }
      }
    });

    if (existing) {
      await prisma.savedContent.delete({
        where: {
          userId_contentId: {
            userId,
            contentId
          }
        }
      });

      return false;
    }

    await prisma.savedContent.create({
      data: {
        userId,
        contentId
      }
    });

    return true;
  }

  async toggleLike(userId: string, contentId: string) {
    return prisma.$transaction(async (tx) => {
      const content = await tx.dailyBoostContent.findUnique({
        where: { id: contentId },
        select: { likesCount: true }
      });

      if (!content) {
        return null;
      }

      const existing = await tx.userLike.findUnique({
        where: {
          userId_contentId: {
            userId,
            contentId
          }
        }
      });

      const updated = existing
        ? await (async () => {
            await tx.userLike.delete({
              where: {
                userId_contentId: {
                  userId,
                  contentId
                }
              }
            });

            return tx.dailyBoostContent.update({
              where: { id: contentId },
              data: {
                likesCount: {
                  decrement: 1
                }
              }
            });
          })()
        : await (async () => {
            await tx.userLike.create({
              data: {
                userId,
                contentId
              }
            });

            return tx.dailyBoostContent.update({
              where: { id: contentId },
              data: {
                likesCount: {
                  increment: 1
                }
              }
            });
          })();

      return {
        isLiked: !existing,
        likesCount: Math.max(0, updated.likesCount)
      };
    });
  }

  async listSavedContent(userId: string, limit: number) {
    return prisma.savedContent.findMany({
      where: {
        userId
      },
      orderBy: {
        createdAt: "desc"
      },
      take: limit,
      include: {
        content: {
          include: buildStateInclude(userId)
        }
      }
    }) as Promise<Array<SavedContent & { content: DailyBoostRecordWithState }>>;
  }
}
