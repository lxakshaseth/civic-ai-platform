"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Languages, Mic, MicOff, Send, Square, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { apiRequest } from "@/src/lib/api";
import { formatShortDate } from "@/src/lib/presentation";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "./ui/select";
import { Textarea } from "./ui/textarea";

type ChatMessage = {
  id: string;
  complaintId: string;
  senderId: string;
  receiverId: string;
  message: string;
  translatedMessage?: string | null;
  language?: string | null;
  translatedLanguage?: string | null;
  audioUrl?: string | null;
  audioMimeType?: string | null;
  audioDurationMs?: number | null;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    role: string;
  };
  receiver: {
    id: string;
    name: string;
    role: string;
  };
};

type TranslationResponse = {
  translatedText: string;
  targetLanguage: string;
  sourceLanguage: string;
};

type ComplaintConversationProps = {
  complaintId: string;
  currentUserId?: string | null;
  title?: string;
  emptyStateText?: string;
  disabledReason?: string | null;
};

type BrowserSpeechRecognitionResult = {
  0?: { transcript: string };
  isFinal?: boolean;
  length: number;
};

type BrowserSpeechRecognitionEvent = {
  resultIndex?: number;
  results: ArrayLike<BrowserSpeechRecognitionResult>;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type ReadLanguageOption = {
  code: string;
  label: string;
};

const refreshIntervalMs = 3000;

const readLanguageOptions: ReadLanguageOption[] = [
  { code: "auto", label: "Auto (profile language)" },
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "mr", label: "Marathi" },
  { code: "bn", label: "Bangla" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "gu", label: "Gujarati" },
  { code: "kn", label: "Kannada" },
  { code: "ml", label: "Malayalam" },
  { code: "pa", label: "Punjabi" },
  { code: "ur", label: "Urdu" }
];

const speechLocaleByLanguage: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
  bn: "bn-IN",
  ta: "ta-IN",
  te: "te-IN",
  gu: "gu-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  pa: "pa-IN",
  ur: "ur-IN"
};

const voiceRecordingMimeTypes = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg"
];

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("");
}

function normalizeLanguage(value?: string | null) {
  return value?.trim().toLowerCase() || "en";
}

function getReadLanguageLabel(languageCode: string) {
  return (
    readLanguageOptions.find((option) => option.code === languageCode)?.label ||
    languageCode.toUpperCase()
  );
}

function getSpeechLocale(languageCode?: string | null) {
  return speechLocaleByLanguage[normalizeLanguage(languageCode)] || "en-IN";
}

function selectRecordingMimeType() {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return "";
  }

  for (const mimeType of voiceRecordingMimeTypes) {
    if (typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return "";
}

function formatAudioDuration(durationMs?: number | null) {
  if (!durationMs || durationMs < 1000) {
    return "Short clip";
  }

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function ComplaintConversation({
  complaintId,
  currentUserId,
  title = "Citizen-Employee Chat",
  emptyStateText = "Chat will appear here after the complaint is assigned. You can send text or voice messages.",
  disabledReason
}: ComplaintConversationProps) {
  const currentUser = useCurrentUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedAudioMimeType, setRecordedAudioMimeType] = useState("");
  const [recordedAudioDurationMs, setRecordedAudioDurationMs] = useState<number | null>(null);
  const [readLanguage, setReadLanguage] = useState("auto");
  const [translationCache, setTranslationCache] = useState<Record<string, Record<string, string>>>({});
  const [translatingKeys, setTranslatingKeys] = useState<Record<string, boolean>>({});
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const conversationEndRef = useRef<HTMLDivElement | null>(null);
  const baseDraftBeforeListeningRef = useRef("");
  const recordingStartedAtRef = useRef<number | null>(null);

  const chatDisabled = Boolean(disabledReason);
  const selectedReadLanguage = readLanguage === "auto" ? null : normalizeLanguage(readLanguage);
  const composeLanguage = normalizeLanguage(currentUser?.language);

  const clearRecordedAudio = useCallback(() => {
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
    }

    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
    setRecordedAudioMimeType("");
    setRecordedAudioDurationMs(null);
  }, [recordedAudioUrl]);

  const cleanupRecordingResources = useCallback(() => {
    mediaRecorderRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    audioChunksRef.current = [];
    recordingStartedAtRef.current = null;
  }, []);

  const loadMessages = useCallback(async () => {
    if (chatDisabled) {
      setMessages([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await apiRequest<ChatMessage[]>(`/chat/${complaintId}`);
      setMessages(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load chat messages.");
    } finally {
      setLoading(false);
    }
  }, [chatDisabled, complaintId]);

  useEffect(() => {
    void loadMessages();

    if (chatDisabled) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void loadMessages();
    }, refreshIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [chatDisabled, loadMessages]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({
      block: "end"
    });
  }, [messages]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;

      if (mediaRecorderRef.current?.state !== "inactive") {
        mediaRecorderRef.current?.stop();
      }

      cleanupRecordingResources();

      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
    };
  }, [cleanupRecordingResources, recordedAudioUrl]);

  useEffect(() => {
    if (chatDisabled || !selectedReadLanguage || messages.length === 0) {
      return undefined;
    }

    const messagesNeedingTranslation = messages.filter((message) => {
      const trimmedMessage = message.message.trim();

      return (
        Boolean(trimmedMessage) &&
        normalizeLanguage(message.language) !== selectedReadLanguage &&
        !translationCache[message.id]?.[selectedReadLanguage] &&
        !translatingKeys[`${message.id}:${selectedReadLanguage}`]
      );
    });

    if (!messagesNeedingTranslation.length) {
      return undefined;
    }

    const nextTranslatingKeys = Object.fromEntries(
      messagesNeedingTranslation.map((message) => [`${message.id}:${selectedReadLanguage}`, true])
    );
    setTranslatingKeys((currentKeys) => ({
      ...currentKeys,
      ...nextTranslatingKeys
    }));

    let isActive = true;

    void Promise.allSettled(
      messagesNeedingTranslation.map(async (message) => {
        const translation = await apiRequest<TranslationResponse>("/chat/translate", {
          method: "POST",
          body: {
            complaintId,
            text: message.message,
            targetLanguage: selectedReadLanguage,
            sourceLanguage: message.language || undefined
          }
        });

        return {
          messageId: message.id,
          translatedText: translation.translatedText
        };
      })
    ).then((results) => {
      if (!isActive) {
        return;
      }

      setTranslationCache((currentCache) => {
        const nextCache = { ...currentCache };

        for (const result of results) {
          if (result.status !== "fulfilled") {
            continue;
          }

          nextCache[result.value.messageId] = {
            ...(nextCache[result.value.messageId] ?? {}),
            [selectedReadLanguage]: result.value.translatedText
          };
        }

        return nextCache;
      });

      setTranslatingKeys((currentKeys) => {
        const nextKeys = { ...currentKeys };

        for (const key of Object.keys(nextTranslatingKeys)) {
          delete nextKeys[key];
        }

        return nextKeys;
      });
    });

    return () => {
      isActive = false;

      setTranslatingKeys((currentKeys) => {
        const nextKeys = { ...currentKeys };

        for (const key of Object.keys(nextTranslatingKeys)) {
          delete nextKeys[key];
        }

        return nextKeys;
      });
    };
  }, [chatDisabled, complaintId, messages, selectedReadLanguage, translationCache, translatingKeys]);

  const canSend = (draft.trim().length > 0 || Boolean(recordedAudioBlob)) && !sending && !chatDisabled && !recording;

  const groupedMessages = useMemo(
    () =>
      messages.map((message) => {
        const isCurrentUser = message.senderId === currentUserId;
        const receiverTranslation =
          !isCurrentUser &&
          message.receiverId === currentUserId &&
          message.translatedMessage &&
          message.translatedMessage.trim()
            ? message.translatedMessage
            : null;
        const languageSpecificTranslation = selectedReadLanguage
          ? translationCache[message.id]?.[selectedReadLanguage] ?? null
          : null;
        const baseMessage = message.message.trim();
        let primaryText = baseMessage;
        let secondaryText: string | null = null;
        let translationLabel: string | null = null;
        const isTranslationPending = selectedReadLanguage
          ? Boolean(translatingKeys[`${message.id}:${selectedReadLanguage}`])
          : false;

        if (selectedReadLanguage) {
          if (normalizeLanguage(message.language) === selectedReadLanguage) {
            primaryText = baseMessage;
          } else if (languageSpecificTranslation) {
            primaryText = languageSpecificTranslation;
            secondaryText = baseMessage || null;
            translationLabel = `Translated to ${getReadLanguageLabel(selectedReadLanguage)}`;
          }
        } else if (receiverTranslation) {
          primaryText = receiverTranslation;
          secondaryText = baseMessage || null;
          translationLabel = "Translated to your language";
        } else if (isCurrentUser && message.translatedMessage?.trim()) {
          secondaryText = message.translatedMessage.trim();
          translationLabel = `Receiver language: ${getReadLanguageLabel(
            normalizeLanguage(message.translatedLanguage)
          )}`;
        }

        return {
          ...message,
          isCurrentUser,
          primaryText,
          secondaryText,
          translationLabel,
          isTranslationPending
        };
      }),
    [currentUserId, messages, selectedReadLanguage, translationCache, translatingKeys]
  );

  const handleSendText = async () => {
    const trimmedMessage = draft.trim();

    if (!trimmedMessage || sending || chatDisabled) {
      return;
    }

    try {
      setSending(true);
      const createdMessage = await apiRequest<ChatMessage>("/chat", {
        method: "POST",
        body: {
          complaintId,
          message: trimmedMessage
        }
      });

      setMessages((currentMessages) => [...currentMessages, createdMessage]);
      setDraft("");
    } catch (sendError) {
      toast.error(sendError instanceof Error ? sendError.message : "Unable to send the chat message.");
    } finally {
      setSending(false);
    }
  };

  const handleSendVoiceMessage = async () => {
    if (!recordedAudioBlob || sending || chatDisabled) {
      return;
    }

    const fileExtension =
      recordedAudioMimeType.includes("mp4")
        ? "m4a"
        : recordedAudioMimeType.includes("mpeg")
          ? "mp3"
          : recordedAudioMimeType.includes("ogg")
            ? "ogg"
            : recordedAudioMimeType.includes("wav")
              ? "wav"
              : "webm";

    const payload = new FormData();
    payload.append("complaintId", complaintId);
    payload.append("message", draft.trim());
    payload.append("durationMs", String(recordedAudioDurationMs ?? 0));
    payload.append("audio", recordedAudioBlob, `voice-message.${fileExtension}`);

    try {
      setSending(true);
      const createdMessage = await apiRequest<ChatMessage>("/chat/voice", {
        method: "POST",
        body: payload
      });

      setMessages((currentMessages) => [...currentMessages, createdMessage]);
      setDraft("");
      clearRecordedAudio();
    } catch (sendError) {
      toast.error(
        sendError instanceof Error ? sendError.message : "Unable to send the voice message."
      );
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (recordedAudioBlob) {
      await handleSendVoiceMessage();
      return;
    }

    await handleSendText();
  };

  const toggleVoiceCompose = () => {
    if (recording) {
      toast.error("A voice note is currently recording. Please stop the recording first.");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const RecognitionConstructor =
      (window as unknown as {
        SpeechRecognition?: BrowserSpeechRecognitionConstructor;
        webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
      }).SpeechRecognition ||
      (window as unknown as {
        webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
      }).webkitSpeechRecognition;

    if (!RecognitionConstructor) {
      toast.error("Voice compose is not supported in this browser. Text chat is still available.");
      return;
    }

    const recognition = new RecognitionConstructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = getSpeechLocale(composeLanguage);
    baseDraftBeforeListeningRef.current = draft.trim();
    recognition.onresult = (event) => {
      const spokenText = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      setDraft([baseDraftBeforeListeningRef.current, spokenText].filter(Boolean).join(" "));
    };
    recognition.onerror = (event) => {
      const errorKey = event.error?.trim().toLowerCase();

      if (errorKey === "not-allowed" || errorKey === "service-not-allowed") {
        toast.error("Microphone access is blocked. Please allow microphone access in your browser.");
      } else if (errorKey === "no-speech") {
        toast.error("No speech was detected. Please speak closer to the microphone and try again.");
      } else {
        toast.error("Voice capture could not be completed. Please try again.");
      }

      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    setListening(true);

    try {
      recognition.start();
    } catch {
      setListening(false);
      toast.error("Voice input could not be started. Please try again.");
    }
  };

  const toggleVoiceRecording = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Voice message recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = selectRecordingMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      cleanupRecordingResources();
      clearRecordedAudio();

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recordingStartedAtRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const nextMimeType = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: nextMimeType });

        if (!blob.size) {
          cleanupRecordingResources();
          return;
        }

        const audioUrl = URL.createObjectURL(blob);
        const durationMs = recordingStartedAtRef.current
          ? Math.max(Date.now() - recordingStartedAtRef.current, 0)
          : null;

        setRecordedAudioBlob(blob);
        setRecordedAudioUrl(audioUrl);
        setRecordedAudioMimeType(nextMimeType);
        setRecordedAudioDurationMs(durationMs);
        cleanupRecordingResources();
      };

      recorder.onerror = () => {
        toast.error("Voice message could not be recorded. Please try again.");
        setRecording(false);
        cleanupRecordingResources();
      };

      recorder.start();
      setRecording(true);
    } catch {
      toast.error("Microphone access was not granted. Please check your browser permissions.");
    }
  };

  return (
    <Card className="border-gray-200 p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-950">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Live conversation between the citizen and employee. Text messages, voice notes, and translated chat are available to both sides.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={readLanguage} onValueChange={setReadLanguage}>
            <SelectTrigger
              size="sm"
              className="w-[220px] border-blue-200 bg-blue-50 text-blue-700"
            >
              <div className="flex items-center gap-2">
                <Languages className="size-3.5" />
                <SelectValue placeholder="Read language" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-white">
              {readLanguageOptions.map((option) => (
                <SelectItem key={option.code} value={option.code}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Badge className="border-0 bg-slate-100 text-slate-700 shadow-none">
            <Volume2 className="mr-1 size-3.5" />
            {listening ? "Voice compose active" : "Voice compose ready"}
          </Badge>
        </div>
      </div>

      {chatDisabled ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-muted-foreground">
          {disabledReason}
        </div>
      ) : (
        <>
          <ScrollArea className="h-[360px] rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
            <div className="space-y-4">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading chat history...</div>
              ) : error ? (
                <div className="text-sm text-red-600">{error}</div>
              ) : groupedMessages.length === 0 ? (
                <div className="text-sm text-muted-foreground">{emptyStateText}</div>
              ) : (
                groupedMessages.map((message) => {
                  const hasText = Boolean(message.primaryText?.trim());
                  const hasOriginalText = Boolean(message.secondaryText?.trim());

                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.isCurrentUser ? "justify-end" : "justify-start"
                      }`}
                    >
                      {!message.isCurrentUser ? (
                        <Avatar className="size-9 border border-gray-200">
                          <AvatarFallback className="bg-white text-xs font-semibold text-gray-700">
                            {getInitials(message.sender.name)}
                          </AvatarFallback>
                        </Avatar>
                      ) : null}

                      <div
                        className={`max-w-[82%] rounded-2xl px-4 py-3 ${
                          message.isCurrentUser
                            ? "bg-[#1e3a8a] text-white"
                            : "border border-gray-200 bg-white text-gray-900"
                        }`}
                      >
                        <div className="mb-1 flex items-center gap-2 text-[11px]">
                          <span className={message.isCurrentUser ? "text-blue-100" : "text-gray-500"}>
                            {message.isCurrentUser ? "You" : message.sender.name}
                          </span>
                          <span className={message.isCurrentUser ? "text-blue-200" : "text-gray-400"}>
                            {formatShortDate(message.createdAt)}
                          </span>
                        </div>

                        {message.audioUrl ? (
                          <div className="mt-2 rounded-xl border border-white/10 bg-black/5 p-3">
                            <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                              <span className={message.isCurrentUser ? "text-blue-100" : "text-gray-500"}>
                                Voice message
                              </span>
                              <span className={message.isCurrentUser ? "text-blue-200" : "text-gray-500"}>
                                {formatAudioDuration(message.audioDurationMs)}
                              </span>
                            </div>
                            <audio controls preload="none" src={message.audioUrl} className="w-full" />
                          </div>
                        ) : null}

                        {hasText ? <p className="mt-2 text-sm leading-6">{message.primaryText}</p> : null}

                        {message.translationLabel ? (
                          <div
                            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] ${
                              message.isCurrentUser
                                ? "bg-white/10 text-blue-100"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {message.translationLabel}
                          </div>
                        ) : null}

                        {message.isTranslationPending ? (
                          <div
                            className={`mt-2 rounded-xl px-3 py-2 text-xs ${
                              message.isCurrentUser
                                ? "bg-white/10 text-blue-100"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            Translating into {getReadLanguageLabel(selectedReadLanguage || "en")}...
                          </div>
                        ) : null}

                        {hasOriginalText ? (
                          <div
                            className={`mt-2 rounded-xl px-3 py-2 text-xs ${
                              message.isCurrentUser
                                ? "bg-white/10 text-blue-100"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {selectedReadLanguage ? "Original" : message.isCurrentUser ? "Sent translation" : "Original"}:{" "}
                            {message.secondaryText}
                          </div>
                        ) : null}
                      </div>

                      {message.isCurrentUser ? (
                        <Avatar className="size-9 border border-blue-200">
                          <AvatarFallback className="bg-blue-100 text-xs font-semibold text-blue-700">
                            {getInitials(message.sender.name)}
                          </AvatarFallback>
                        </Avatar>
                      ) : null}
                    </div>
                  );
                })
              )}
              <div ref={conversationEndRef} />
            </div>
          </ScrollArea>

          <div className="mt-4 space-y-3">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type a message, speak to compose, or record a voice note..."
              rows={3}
              className="min-h-[108px] border-gray-300"
            />

            {recordedAudioUrl ? (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-blue-900">Voice message ready</p>
                    <p className="text-xs text-blue-700">
                      {formatAudioDuration(recordedAudioDurationMs)}
                      {draft.trim() ? " | Caption will be sent too" : ""}
                    </p>
                  </div>
                  <Button type="button" variant="outline" onClick={clearRecordedAudio}>
                    Clear Voice
                  </Button>
                </div>
                <audio controls preload="metadata" src={recordedAudioUrl} className="mt-3 w-full" />
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-muted-foreground">
                Use the read-language dropdown to view the chat in multiple languages. Voice notes and text messages are visible to both the citizen and the employee.
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={toggleVoiceCompose}>
                  {listening ? <MicOff className="mr-2 size-4" /> : <Mic className="mr-2 size-4" />}
                  {listening ? "Stop Voice" : "Speak to Type"}
                </Button>
                <Button type="button" variant="outline" onClick={() => void toggleVoiceRecording()}>
                  {recording ? <Square className="mr-2 size-4" /> : <Volume2 className="mr-2 size-4" />}
                  {recording ? "Stop Recording" : recordedAudioUrl ? "Re-record Voice" : "Record Voice"}
                </Button>
                <Button type="button" onClick={() => void handleSend()} disabled={!canSend}>
                  <Send className="mr-2 size-4" />
                  {sending ? "Sending..." : recordedAudioBlob ? "Send Voice" : "Send"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
