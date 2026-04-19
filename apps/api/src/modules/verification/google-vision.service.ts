import fs from "node:fs/promises";

import axios from "axios";

import { env } from "config/env";
import { logger } from "utils/logger";

export type VisionLabel = {
  description: string;
  score: number;
  topicality?: number | null;
};

type VisionDetectionResult = {
  labels: VisionLabel[];
  visionAvailable: boolean;
  provider: "google-vision" | "disabled" | "fallback";
  errorMessage?: string;
};

type GoogleVisionAnnotateResponse = {
  responses?: Array<{
    labelAnnotations?: Array<{
      description?: string;
      score?: number;
      topicality?: number;
    }>;
    error?: {
      message?: string;
    };
  }>;
};

export class GoogleVisionService {
  async detectLabels(imagePath: string): Promise<VisionDetectionResult> {
    if (!env.GOOGLE_VISION_API_KEY) {
      return {
        labels: [],
        visionAvailable: false,
        provider: "disabled",
        errorMessage: "Google Vision API key is not configured"
      };
    }

    try {
      const imageBuffer = await fs.readFile(imagePath);
      const response = await axios.post<GoogleVisionAnnotateResponse>(
        `https://vision.googleapis.com/v1/images:annotate?key=${env.GOOGLE_VISION_API_KEY}`,
        {
          requests: [
            {
              image: {
                content: imageBuffer.toString("base64")
              },
              features: [
                {
                  type: "LABEL_DETECTION",
                  maxResults: 12
                }
              ]
            }
          ]
        },
        {
          headers: {
            "Content-Type": "application/json"
          },
          timeout: env.AI_SERVICE_TIMEOUT_MS
        }
      );

      const visionResponse = response.data.responses?.[0];
      const visionError = visionResponse?.error?.message;

      if (visionError) {
        logger.warn({ visionError }, "Google Vision label detection returned an error");

        return {
          labels: [],
          visionAvailable: false,
          provider: "fallback",
          errorMessage: visionError
        };
      }

      return {
        labels:
          visionResponse?.labelAnnotations
            ?.filter((item): item is NonNullable<typeof item> => Boolean(item?.description))
            .map((item) => ({
              description: item.description?.trim() ?? "",
              score: Number(item.score ?? 0),
              topicality: item.topicality ?? null
            }))
            .filter((item) => item.description.length > 0) ?? [],
        visionAvailable: true,
        provider: "google-vision"
      };
    } catch (error) {
      logger.warn({ err: error }, "Google Vision label detection unavailable");

      return {
        labels: [],
        visionAvailable: false,
        provider: "fallback",
        errorMessage: "Google Vision label detection is currently unavailable"
      };
    }
  }
}
