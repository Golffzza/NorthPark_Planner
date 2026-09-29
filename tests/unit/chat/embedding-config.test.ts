import { describe, expect, it } from "vitest";

import {
  assertKnowledgeEmbeddingDimension,
  KNOWLEDGE_EMBEDDING_DIMENSION,
} from "@/lib/chat/rag/embedding-config";

describe("knowledge embedding configuration", () => {
  it("uses the embeddinggemma vector dimension", () => {
    expect(KNOWLEDGE_EMBEDDING_DIMENSION).toBe(768);
  });

  it("rejects embeddings with a different dimension", () => {
    expect(() => assertKnowledgeEmbeddingDimension([0, 1])).toThrow(
      "Expected 768-dimensional embedding, got 2",
    );
  });
});
