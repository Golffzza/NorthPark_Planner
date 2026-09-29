// ./lib/chat/llm/ollama-provider.ts

import type { ChatMessage, LlmProvider, LlmChatOptions } from "@/lib/chat/shared/contracts";

type OllamaChatResponse = {
  message?: {
    role?: string;
    content?: string;
  };
  error?: string;
  done_reason?: string;
};

function keepAliveDurationMs(value: string): number {
  const normalized = value.trim().toLowerCase();
  if (normalized === "-1") return Number.POSITIVE_INFINITY;
  const match = normalized.match(/^(\d+(?:\.\d+)?)(ms|s|m|h)$/);
  if (!match) return 0;
  const amount = Number(match[1]);
  let multiplier: number;
  switch (match[2]) {
    case "ms": multiplier = 1; break;
    case "s": multiplier = 1_000; break;
    case "m": multiplier = 60_000; break;
    case "h": multiplier = 3_600_000; break;
    default: return 0;
  }
  return amount * multiplier;
}

export class OllamaProvider implements LlmProvider {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly requestTimeoutMs: number;
  private readonly numCtx: number;
  private readonly numPredict: number;
  private readonly keepAlive: string;
  private readonly warmupTimeoutMs: number;
  private readonly warmupRetryMs: number;
  private preparedUntil = 0;
  private preparation?: Promise<void>;
  private retryPreparationAfter = 0;

  constructor() {
    this.baseUrl = (
      process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434"
    ).replace(/\/$/, "");

    this.model = process.env.OLLAMA_MODEL ?? "llama3.2:3b";

    this.requestTimeoutMs = Number(
      process.env.OLLAMA_REQUEST_TIMEOUT_MS ?? 60_000,
    );

    this.numCtx = Number(process.env.OLLAMA_NUM_CTX ?? 4096);

    this.numPredict = Number(process.env.OLLAMA_NUM_PREDICT ?? 256);

    this.keepAlive = process.env.OLLAMA_KEEP_ALIVE ?? "30m";
    this.warmupTimeoutMs = Number(
      process.env.OLLAMA_WARMUP_TIMEOUT_MS ?? this.requestTimeoutMs,
    );
    this.warmupRetryMs = Number(process.env.OLLAMA_WARMUP_RETRY_MS ?? 30_000);
  }

  isPrepared(): boolean {
    return Date.now() < this.preparedUntil;
  }

  private markPrepared(): void {
    const duration = keepAliveDurationMs(this.keepAlive);
    this.preparedUntil = Number.isFinite(duration)
      ? Date.now() + duration
      : Number.POSITIVE_INFINITY;
  }

  prepare(): Promise<void> {
    if (this.isPrepared()) return Promise.resolve();
    if (this.preparation) return this.preparation;
    if (Date.now() < this.retryPreparationAfter) return Promise.resolve();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.warmupTimeoutMs);
    const work = (async () => {
      try {
        const response = await fetch(`${this.baseUrl}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          cache: "no-store",
          body: JSON.stringify({
            model: this.model,
            prompt: "พร้อม",
            stream: false,
            keep_alive: this.keepAlive,
            options: {
              temperature: 0,
              num_ctx: this.numCtx,
              num_predict: 1,
            },
          }),
        });
        if (!response.ok) {
          throw new Error(`Ollama warmup failed (${response.status})`);
        }
        this.markPrepared();
      } catch (error) {
        this.preparedUntil = 0;
        this.retryPreparationAfter = Date.now() + this.warmupRetryMs;
        console.warn("Ollama warmup did not complete; deterministic answers remain available.", error);
      } finally {
        clearTimeout(timeout);
      }
    })();

    this.preparation = work.finally(() => {
      this.preparation = undefined;
    });
    return this.preparation;
  }

  async chat(messages: ChatMessage[], options: LlmChatOptions = {}): Promise<string> {
    const controller = new AbortController();
    const effectiveTimeoutMs = Math.min(
      options.timeoutMs ?? this.requestTimeoutMs,
      this.requestTimeoutMs,
    );

    const timeout = setTimeout(() => {
      controller.abort();
    }, effectiveTimeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        signal: options.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal,
        cache: "no-store",

        body: JSON.stringify({
          model: this.model,
          stream: false,
          keep_alive: this.keepAlive,
          ...(options.format ? { format: options.format } : {}),

          messages,

          options: {
            temperature: options.temperature ?? 0.4,
            top_p: 0.9,
            num_ctx: this.numCtx,
            num_predict: options.numPredict ?? this.numPredict,
          },
        }),
      });

      if (!response.ok) {
        const text = await response.text();

        throw new Error(`Ollama request failed (${response.status}): ${text}`);
      }

      const data = (await response.json()) as OllamaChatResponse;

      if (data.error) {
        throw new Error(`Ollama error: ${data.error}`);
      }

      if (data.done_reason === "length") {
        throw new Error("Ollama response reached the token limit before completion");
      }

      const content = data.message?.content?.trim();

      if (!content) {
        throw new Error("Ollama returned an empty response");
      }

      this.markPrepared();
      return content;
    } catch (error) {
      this.preparedUntil = 0;
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(
          options.signal?.aborted
            ? "Ollama request was aborted"
            : `Ollama request timed out after ${effectiveTimeoutMs}ms`,
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
