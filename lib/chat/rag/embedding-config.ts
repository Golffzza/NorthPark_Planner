export const KNOWLEDGE_EMBEDDING_DIMENSION = 768;

export function assertKnowledgeEmbeddingDimension(
  embedding: readonly number[],
): void {
  if (embedding.length !== KNOWLEDGE_EMBEDDING_DIMENSION) {
    throw new Error(
      `Expected ${KNOWLEDGE_EMBEDDING_DIMENSION}-dimensional embedding, got ${embedding.length}`,
    );
  }
}
