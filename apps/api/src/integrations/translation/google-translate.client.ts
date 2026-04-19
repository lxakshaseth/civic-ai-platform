import { env } from "config/env";
import { logger } from "utils/logger";

interface TranslateTextInput {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string | null;
}

interface TranslateTextResult {
  translatedText: string | null;
  detectedSourceLanguage: string | null;
  translatedLanguage: string;
}

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const TRANSLATE_TIMEOUT_MS = Math.min(env.AI_SERVICE_TIMEOUT_MS, 4000);

export class GoogleTranslateClient {
  async translateText(input: TranslateTextInput): Promise<TranslateTextResult> {
    const normalizedText = input.text.trim();
    const normalizedTargetLanguage = input.targetLanguage.trim().toLowerCase();
    const normalizedSourceLanguage = input.sourceLanguage?.trim().toLowerCase() || null;

    if (!normalizedText) {
      return {
        translatedText: null,
        detectedSourceLanguage: normalizedSourceLanguage,
        translatedLanguage: normalizedTargetLanguage
      };
    }

    if (!env.GOOGLE_TRANSLATE_API_KEY.trim()) {
      return {
        translatedText: null,
        detectedSourceLanguage: normalizedSourceLanguage,
        translatedLanguage: normalizedTargetLanguage
      };
    }

    const endpoint = new URL(env.GOOGLE_TRANSLATE_BASE_URL);
    endpoint.searchParams.set("key", env.GOOGLE_TRANSLATE_API_KEY);

    const body = new URLSearchParams();
    body.set("q", normalizedText);
    body.set("target", normalizedTargetLanguage);
    body.set("format", "text");

    if (normalizedSourceLanguage) {
      body.set("source", normalizedSourceLanguage);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TRANSLATE_TIMEOUT_MS);

      let response: Response;

      try {
        response = await fetch(endpoint.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
          },
          body,
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Google Translate request failed with ${response.status}: ${errorBody.slice(0, 240)}`
        );
      }

      const payload = (await response.json()) as {
        data?: {
          translations?: Array<{
            translatedText?: string;
            detectedSourceLanguage?: string;
          }>;
        };
      };

      const translation = payload.data?.translations?.[0];
      const translatedText = translation?.translatedText
        ? decodeHtmlEntities(translation.translatedText)
        : null;
      const detectedSourceLanguage =
        translation?.detectedSourceLanguage?.trim().toLowerCase() || normalizedSourceLanguage;

      if (!translatedText || translatedText.trim() === normalizedText) {
        return {
          translatedText: null,
          detectedSourceLanguage,
          translatedLanguage: normalizedTargetLanguage
        };
      }

      return {
        translatedText,
        detectedSourceLanguage,
        translatedLanguage: normalizedTargetLanguage
      };
    } catch (error) {
      logger.warn(
        {
          error,
          targetLanguage: normalizedTargetLanguage,
          sourceLanguage: normalizedSourceLanguage,
          timeoutMs: TRANSLATE_TIMEOUT_MS
        },
        "Falling back to untranslated text because translation was unavailable"
      );

      return {
        translatedText: null,
        detectedSourceLanguage: normalizedSourceLanguage,
        translatedLanguage: normalizedTargetLanguage
      };
    }
  }
}
