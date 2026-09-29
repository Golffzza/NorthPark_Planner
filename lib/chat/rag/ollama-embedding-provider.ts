import { assertKnowledgeEmbeddingDimension } from "@/lib/chat/rag/embedding-config";

type OllamaEmbedResponse = {
  embeddings?: number[][];
};

export class OllamaEmbeddingProvider {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly keepAlive: string;

  constructor() {
    this.baseUrl = (
      process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434"
    ).replace(/\/$/, "");

    this.model =
      process.env.OLLAMA_EMBEDDING_MODEL ?? "embeddinggemma";

    this.timeoutMs = Number(
      process.env.OLLAMA_EMBEDDING_TIMEOUT_MS
        ?? process.env.OLLAMA_REQUEST_TIMEOUT_MS
        ?? 60_000,
    );
    this.keepAlive = process.env.OLLAMA_EMBEDDING_KEEP_ALIVE ?? "1m";
  }

  async embed(text: string, signal?: AbortSignal): Promise<number[]> {
    const embeddings = await this.embedMany([text], signal);

    const embedding = embeddings[0];

    if (!embedding) {
      throw new Error("Ollama returned an empty embedding");
    }

    return embedding;
  }

  async embedMany(texts: string[], signal?: AbortSignal): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/api/embed`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        signal: signal
          ? AbortSignal.any([controller.signal, signal])
          : controller.signal,
        cache: "no-store",

        body: JSON.stringify({
          model: this.model,
          input: texts,
          keep_alive: this.keepAlive,
        }),
      });

      if (!response.ok) {
        const body = await response.text();

        throw new Error(
          `Ollama embedding request failed (${response.status}): ${body}`,
        );
      }

      const data =
        (await response.json()) as OllamaEmbedResponse;

      const embeddings = data.embeddings;

      if (
        !embeddings ||
        embeddings.length !== texts.length
      ) {
        throw new Error(
          `Expected ${texts.length} embeddings, got ${embeddings?.length ?? 0}`,
        );
      }

      for (const embedding of embeddings) {
        assertKnowledgeEmbeddingDimension(embedding);
      }

      return embeddings;
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        throw new Error(
          signal?.aborted
            ? "Ollama embedding request was aborted"
            : `Ollama embedding request timed out after ${this.timeoutMs}ms`,
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
