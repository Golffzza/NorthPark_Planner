// ./components/assistant/assistant-chat.tsx

"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { DEFAULT_CHAT_MESSAGE_MAX_LENGTH } from "@/lib/chat/shared/limits";

import {
  appendAssistantMessage,
  appendUserMessage,
  type ChatMessage,
} from "./chat-messages";

/*
 * ต้องตรงกับ backend:
 *
 * ChatRequest
 * {
 *   message: string;
 *   conversationId?: string;
 * }
 */
type ChatRequest = {
  message: string;
  conversationId?: string;
};

type ChatErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

const examples = [
  "มีอุทยานอะไรในเชียงใหม่",
  "อยากเที่ยวน้ำตกที่เชียงใหม่ แต่ไม่อยากเดินเยอะ",
  "อยากกางเต็นท์ดูทะเลหมอกแบบไม่ต้องเดินหนัก",
];

export function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);

  const busy = useRef(false);
  const log = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!log.current) {
      return;
    }

    log.current.scrollTop = log.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      controller.current?.abort();
    };
  }, []);

  async function sendText(value: string) {
    const text = value.trim();

    if (!text || busy.current || expired) {
      return;
    }

    busy.current = true;

    setLoading(true);
    setError("");
    setInput("");

    setMessages((current) => appendUserMessage(current, text));

    const abort = new AbortController();
    controller.current = abort;

    const timer = setTimeout(() => abort.abort(), 115_000);

    let assistantStarted = false;

    try {
      const body: ChatRequest = {
        message: text,

        ...(conversationId
          ? {
              conversationId,
            }
          : {}),
      };

      const response = await fetch("/api/v2/assistant/chat/stream", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(body),

        signal: abort.signal,
      });

      if (!response.ok) {
        let errorResult: ChatErrorResponse = {};

        try {
          errorResult = (await response.json()) as ChatErrorResponse;
        } catch {
          // response body อาจไม่ใช่ JSON
        }

        const message =
          errorResult.error?.message ??
          "ผู้ช่วยยังไม่พร้อม กรุณาลองอีกครั้งครับ";

        const code = errorResult.error?.code;

        if (code === "conversation_expired" || code === "unauthorized") {
          setExpired(true);
        }

        throw new Error(message);
      }

      const nextConversationId = response.headers.get("X-Conversation-Id");

      if (!nextConversationId) {
        throw new Error("ไม่ได้รับ conversationId จากผู้ช่วย");
      }

      if (!response.body) {
        throw new Error("ไม่ได้รับข้อมูลตอบกลับจากผู้ช่วย");
      }

      setConversationId(nextConversationId);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let fullText = "";
      let displayedText = "";
      let updateTimer: ReturnType<typeof setTimeout> | null = null;

      const flushAssistantText = () => {
        updateTimer = null;

        if (displayedText === fullText) {
          return;
        }

        displayedText = fullText;
        assistantStarted = true;

        setMessages((current) => {
          const next = [...current];
          const lastIndex = next.length - 1;
          const last = next[lastIndex];

          if (!last || last.role !== "assistant") {
            return appendAssistantMessage(current, displayedText);
          }

          next[lastIndex] = {
            ...last,
            content: displayedText,
          };

          return next;
        });
      };

      const scheduleFlush = () => {
        if (updateTimer) {
          return;
        }

        updateTimer = setTimeout(() => {
          flushAssistantText();
        }, 40);
      };

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, {
          stream: true,
        });

        if (!chunk) {
          continue;
        }

        fullText += chunk;
        scheduleFlush();
      }

      const tail = decoder.decode();

      if (tail) {
        fullText += tail;
      }

      if (updateTimer) {
        clearTimeout(updateTimer);
        updateTimer = null;
      }

      flushAssistantText();

      if (!fullText.trim()) {
        throw new Error("ผู้ช่วยไม่ได้ส่งข้อความตอบกลับ");
      }
    } catch (failure) {
      setMessages((current) => {
        if (
          assistantStarted &&
          current[current.length - 1]?.role === "assistant"
        ) {
          return current.slice(0, -2);
        }

        return current.slice(0, -1);
      });

      setInput(text);

      if (failure instanceof Error && failure.name !== "AbortError") {
        setError(failure.message);
      } else {
        setError("รอคำตอบนานเกินไป กรุณาลองอีกครั้งครับ");
      }
    } finally {
      clearTimeout(timer);

      controller.current = null;
      busy.current = false;

      setLoading(false);
    }
  }

  function send(event: FormEvent) {
    event.preventDefault();

    void sendText(input);
  }

  function startNewConversation() {
    controller.current?.abort();

    setConversationId(undefined);
    setMessages([]);
    setInput("");
    setError("");
    setExpired(false);

    busy.current = false;

    setLoading(false);
  }

  return (
    <section
      className="glass-panel mx-auto max-w-3xl overflow-hidden rounded-[30px]"
      aria-labelledby="assistant-title"
    >
      <header className="border-b border-[var(--border)] p-5 sm:p-6">
        <span className="guide-chip">เพื่อนร่วมทางของคุณ</span>

        <h1 id="assistant-title" className="mt-3 text-2xl font-bold">
          NorthPark Assistant
        </h1>

        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          คุยเรื่องอุทยาน และช่วยค้นหาสถานที่ที่เหมาะกับทริปของคุณ
        </p>
      </header>

      <div
        ref={log}
        role="log"
        aria-label="บทสนทนา"
        aria-live="polite"
        aria-relevant="additions"
        tabIndex={0}
        className="h-[48dvh] min-h-64 overflow-y-auto overscroll-contain p-4 sm:h-[52dvh] sm:p-6"
      >
        {!messages.length ? (
          <div className="flex min-h-full flex-col justify-center py-6">
            <h2 className="text-xl font-semibold">วันนี้อยากไปที่ไหนครับ?</h2>

            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              เริ่มจากจังหวัดที่สนใจ ลักษณะสถานที่ หรือกิจกรรมที่อยากทำได้เลย
              แล้วคุยต่อจากบริบทเดิมได้ครับ
            </p>

            <div className="mt-5 flex flex-col gap-3">
              {examples.map((text) => (
                <button
                  key={text}
                  type="button"
                  disabled={loading}
                  onClick={() => void sendText(text)}
                  className="soft-card rounded-2xl px-4 py-3 text-left text-sm leading-6 hover:border-[var(--brand)] focus-visible:outline-2 focus-visible:outline-[var(--brand)] disabled:opacity-50"
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`mb-5 flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[94%] rounded-[24px] px-4 py-3 sm:max-w-[88%] ${
                  message.role === "user"
                    ? "bg-[var(--brand-soft)]"
                    : "soft-card"
                }`}
              >
                <p className="mb-1 text-xs font-semibold text-[var(--muted)]">
                  {message.role === "user" ? "คุณ" : "NorthPark"}
                </p>

                <p className="whitespace-pre-wrap break-words text-sm leading-7 sm:text-base">
                  {message.content}
                </p>

                {message.role === "assistant" && message.sources?.length ? (
                  <div className="mt-4 border-t border-[var(--border)] pt-3">
                    <p className="text-xs font-semibold text-[var(--muted)]">
                      แหล่งข้อมูล
                    </p>
                    <ul className="mt-2 space-y-2 text-xs leading-5">
                      {message.sources.map((source) => (
                        <li key={source.id}>
                          {source.url ? (
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                              className="break-words text-[var(--brand)] underline decoration-transparent underline-offset-4 transition hover:decoration-current focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
                            >
                              {source.title} <span aria-hidden="true">↗</span>
                            </a>
                          ) : (
                            <span className="text-[var(--muted)]">
                              {source.title}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}

        {loading ? (
          <p role="status" className="py-3 text-sm text-[var(--muted)]">
            กำลังค้นข้อมูลให้ครับ…
          </p>
        ) : null}
      </div>

      <form
        onSubmit={send}
        className="border-t border-[var(--border)] p-4 sm:p-5"
      >
        {error ? (
          <p role="alert" className="mb-3 text-sm text-[var(--foreground)]">
            {error}
          </p>
        ) : null}

        {expired ? (
          <button
            type="button"
            onClick={startNewConversation}
            className="glass-button mb-3 rounded-full px-4 py-3"
          >
            เริ่มบทสนทนาใหม่
          </button>
        ) : null}

        {messages.length > 0 && !expired ? (
          <button
            type="button"
            disabled={loading}
            onClick={startNewConversation}
            className="mb-3 text-xs text-[var(--muted)] underline underline-offset-4 disabled:opacity-50"
          >
            เริ่มบทสนทนาใหม่
          </button>
        ) : null}

        <label htmlFor="assistant-message" className="sr-only">
          ข้อความถึง NorthPark Assistant
        </label>

        <div className="flex items-end gap-2">
          <textarea
            id="assistant-message"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();

                if (!loading && !expired && input.trim()) {
                  void sendText(input);
                }
              }
            }}
            maxLength={DEFAULT_CHAT_MESSAGE_MAX_LENGTH}
            rows={2}
            placeholder="ถามเรื่องอุทยานหรือทริปของคุณ…"
            disabled={loading || expired}
            className="form-control resize-none !py-3 disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={loading || expired || !input.trim()}
            className="glass-button min-h-14 rounded-2xl px-5 font-semibold disabled:opacity-50"
          >
            ส่ง
          </button>
        </div>

        <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
          Enter เพื่อส่ง · Shift + Enter เพื่อขึ้นบรรทัดใหม่ ·
          บทสนทนาจะเริ่มใหม่เมื่อโหลดหน้าอีกครั้ง
        </p>
      </form>
    </section>
  );
}
