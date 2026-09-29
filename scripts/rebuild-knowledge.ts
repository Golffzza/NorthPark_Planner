import fs from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

import {
  loadParkKnowledge,
} from "@/lib/chat/rag/knowledge-loader";

import {
  chunkParkKnowledge,
} from "@/lib/chat/rag/knowledge-chunker";

import {
  OllamaEmbeddingProvider,
} from "@/lib/chat/rag/ollama-embedding-provider";
import {
  assertKnowledgeEmbeddingDimension,
  KNOWLEDGE_EMBEDDING_DIMENSION,
} from "@/lib/chat/rag/embedding-config";

const EMBEDDING_BATCH_SIZE = 20;

type ParkRow = {
  id: string;
  slug: string;
};

type EmbeddedChunk = {
  documentSlug: string;
  title: string;
  section: string;
  content: string;
  ordinal: number;
  contentHash: string;
  embedding: number[];
};

function sha256(value: string): string {
  return createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

function toVectorLiteral(
  embedding: number[],
): string {
  assertKnowledgeEmbeddingDimension(embedding);

  return `[${embedding.join(",")}]`;
}

function parseVerifiedAt(
  value: string,
): Date | null {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

async function main() {
  console.log(
    "=== NorthPark Knowledge Rebuild ===\n",
  );

  /*
   * 1. Load 44 Markdown documents
   */
  console.log(
    "[1/6] Loading knowledge documents...",
  );

  const documents =
    await loadParkKnowledge();

  if (documents.length !== 44) {
    throw new Error(
      `Expected 44 knowledge documents, got ${documents.length}`,
    );
  }

  console.log(
    `Loaded ${documents.length} documents.`,
  );

  /*
   * 2. Chunk
   */
  console.log(
    "\n[2/6] Building chunks...",
  );

  const chunks = documents.flatMap(
    (document) =>
      chunkParkKnowledge(document),
  );

  if (chunks.length === 0) {
    throw new Error(
      "Knowledge chunker returned zero chunks",
    );
  }

  console.log(
    `Created ${chunks.length} chunks.`,
  );

  /*
   * 3. Match Markdown slug -> Park.id
   */
  console.log(
    "\n[3/6] Resolving Park IDs...",
  );

  const parks =
    await prisma.$queryRaw<ParkRow[]>(
      Prisma.sql`
        SELECT
          "id",
          "slug"
        FROM "Park"
      `,
    );

  const parkIdBySlug = new Map(
    parks.map((park) => [
      park.slug,
      park.id,
    ]),
  );

  const missingParks =
    documents
      .map(
        (document) =>
          document.metadata.slug,
      )
      .filter(
        (slug) =>
          !parkIdBySlug.has(slug),
      );

  if (missingParks.length > 0) {
    throw new Error(
      [
        "Knowledge files could not be matched with Park rows:",
        ...missingParks.map(
          (slug) => `- ${slug}`,
        ),
      ].join("\n"),
    );
  }

  console.log(
    `Matched ${documents.length}/${documents.length} parks.`,
  );

  /*
   * 4. Generate embeddings BEFORE clearing DB.
   *
   * ถ้า Ollama มีปัญหา DB เดิมจะยังไม่โดนลบ
   */
  console.log(
    "\n[4/6] Generating embeddings...",
  );

  const embeddingProvider =
    new OllamaEmbeddingProvider();

  const embeddedChunks:
    EmbeddedChunk[] = [];

  for (
    let offset = 0;
    offset < chunks.length;
    offset += EMBEDDING_BATCH_SIZE
  ) {
    const batch = chunks.slice(
      offset,
      offset + EMBEDDING_BATCH_SIZE,
    );

    const embeddings =
      await embeddingProvider.embedMany(
        batch.map(
          (chunk) => chunk.content,
        ),
      );

    for (
      let index = 0;
      index < batch.length;
      index += 1
    ) {
      const chunk = batch[index];
      const embedding =
        embeddings[index];

      assertKnowledgeEmbeddingDimension(embedding);

      embeddedChunks.push({
        documentSlug: chunk.slug,
        title: chunk.title,
        section: chunk.section,
        content: chunk.content,
        ordinal: chunk.ordinal,
        contentHash:
          sha256(chunk.content),
        embedding,
      });
    }

    const completed = Math.min(
      offset + batch.length,
      chunks.length,
    );

    console.log(
      `  Embedded ${completed}/${chunks.length}`,
    );
  }

  if (
    embeddedChunks.length !==
    chunks.length
  ) {
    throw new Error(
      `Embedding count mismatch: ${embeddedChunks.length}/${chunks.length}`,
    );
  }

  console.log(
    `Generated ${embeddedChunks.length} embeddings.`,
  );

  /*
   * Prepare document records
   */
  const preparedDocuments =
    await Promise.all(
      documents.map(
        async (document) => {
          const rawFile =
            await fs.readFile(
              document.absolutePath,
              "utf8",
            );

          return {
            id: randomUUID(),
            slug:
              document.metadata.slug,
            parkId:
              parkIdBySlug.get(
                document.metadata.slug,
              )!,
            title:
              document.metadata.name_th,
            contentHash:
              sha256(rawFile),
            sourceUpdatedAt:
              parseVerifiedAt(
                document.metadata
                  .verified_at,
              ),
          };
        },
      ),
    );

  const documentIdBySlug =
    new Map(
      preparedDocuments.map(
        (document) => [
          document.slug,
          document.id,
        ],
      ),
    );

  /*
   * 5. Clear + insert
   */
  console.log(
    "\n[5/6] Rebuilding database...",
  );

  await prisma.$transaction(
    async (tx) => {
      /*
       * Child table first because FK.
       */
      await tx.$executeRaw(
        Prisma.sql`
          DELETE FROM "KnowledgeChunk"
        `,
      );

      await tx.$executeRaw(
        Prisma.sql`
          DELETE FROM "KnowledgeDocument"
        `,
      );

      /*
       * Documents
       */
      for (
        const document
        of preparedDocuments
      ) {
        const now = new Date();

        await tx.$executeRaw(
          Prisma.sql`
            INSERT INTO "KnowledgeDocument" (
              "id",
              "sourceType",
              "sourceEntityId",
              "parkId",
              "title",
              "contentHash",
              "sourceUpdatedAt",
              "createdAt",
              "updatedAt"
            )
            VALUES (
              ${document.id},
              ${"MARKDOWN"},
              ${document.slug},
              ${document.parkId},
              ${document.title},
              ${document.contentHash},
              ${document.sourceUpdatedAt},
              ${now},
              ${now}
            )
          `,
        );
      }

      /*
       * Chunks + pgvector embedding
       */
      for (
        let index = 0;
        index <
        embeddedChunks.length;
        index += 1
      ) {
        const chunk =
          embeddedChunks[index];

        const documentId =
          documentIdBySlug.get(
            chunk.documentSlug,
          );

        if (!documentId) {
          throw new Error(
            `Document ID not found for ${chunk.documentSlug}`,
          );
        }

        const vectorLiteral =
          toVectorLiteral(
            chunk.embedding,
          );

        await tx.$executeRaw(
          Prisma.sql`
            INSERT INTO "KnowledgeChunk" (
              "id",
              "documentId",
              "title",
              "section",
              "content",
              "contentHash",
              "ordinal",
              "embedding",
              "createdAt"
            )
            VALUES (
              ${randomUUID()},
              ${documentId},
              ${chunk.title},
              ${chunk.section},
              ${chunk.content},
              ${chunk.contentHash},
              ${chunk.ordinal},
              ${vectorLiteral}::vector,
              ${new Date()}
            )
          `,
        );

        const completed =
          index + 1;

        if (
          completed % 50 === 0 ||
          completed ===
            embeddedChunks.length
        ) {
          console.log(
            `  Inserted ${completed}/${embeddedChunks.length} chunks`,
          );
        }
      }
    },
    {
      maxWait: 10_000,
      timeout: 180_000,
    },
  );

  /*
   * 6. Verify
   */
  console.log(
    "\n[6/6] Verifying database...",
  );

  const documentCount =
    await prisma.$queryRaw<
      Array<{ count: bigint }>
    >(
      Prisma.sql`
        SELECT COUNT(*) AS "count"
        FROM "KnowledgeDocument"
      `,
    );

  const chunkCount =
    await prisma.$queryRaw<
      Array<{ count: bigint }>
    >(
      Prisma.sql`
        SELECT COUNT(*) AS "count"
        FROM "KnowledgeChunk"
      `,
    );

  const vectorCount =
    await prisma.$queryRaw<
      Array<{ count: bigint }>
    >(
      Prisma.sql`
        SELECT COUNT(*) AS "count"
        FROM "KnowledgeChunk"
        WHERE "embedding" IS NOT NULL
      `,
    );

  const documentsStored =
    Number(
      documentCount[0]?.count ?? 0,
    );

  const chunksStored =
    Number(
      chunkCount[0]?.count ?? 0,
    );

  const vectorsStored =
    Number(
      vectorCount[0]?.count ?? 0,
    );

  console.log("");
  console.log(
    "Knowledge rebuild complete ✅",
  );

  console.log(
    `Documents : ${documentsStored}`,
  );

  console.log(
    `Chunks    : ${chunksStored}`,
  );

  console.log(
    `Vectors   : ${vectorsStored}`,
  );

  console.log(
    `Model     : ${
      process.env
        .OLLAMA_EMBEDDING_MODEL ??
      "embeddinggemma"
    }`,
  );

  console.log(
    `Dimension : ${KNOWLEDGE_EMBEDDING_DIMENSION}`,
  );

  if (
    documentsStored !==
      documents.length ||
    chunksStored !==
      chunks.length ||
    vectorsStored !==
      chunks.length
  ) {
    throw new Error(
      "Database verification failed",
    );
  }
}

main()
  .catch((error) => {
    console.error(
      "\nKnowledge rebuild failed:",
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
