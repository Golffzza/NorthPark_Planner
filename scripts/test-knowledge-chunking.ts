import {
  loadParkKnowledge,
} from "@/lib/chat/rag/knowledge-loader";

import {
  chunkParkKnowledge,
} from "@/lib/chat/rag/knowledge-chunker";

async function main() {
  const documents =
    await loadParkKnowledge();

  if (documents.length !== 44) {
    throw new Error(
      `Expected 44 documents, got ${documents.length}`,
    );
  }

  const chunks = documents.flatMap(
    chunkParkKnowledge,
  );

  const attractionChunks =
    chunks.filter((chunk) =>
      chunk.section.startsWith(
        "attraction:",
      ),
    );

  const skippedLeak =
    chunks.filter(
      (chunk) =>
        chunk.title.includes(
          "DO_NOT_EMBED",
        ) ||
        chunk.section.includes(
          "DO_NOT_EMBED",
        ),
    );

  console.log(
    "Documents:",
    documents.length,
  );

  console.log(
    "Total chunks:",
    chunks.length,
  );

  console.log(
    "Attraction chunks:",
    attractionChunks.length,
  );

  console.log(
    "DO_NOT_EMBED leaks:",
    skippedLeak.length,
  );

  const perPark =
    new Map<string, number>();

  for (const chunk of chunks) {
    perPark.set(
      chunk.slug,
      (perPark.get(chunk.slug) ?? 0) +
        1,
    );
  }

  const counts = [
    ...perPark.entries(),
  ].sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  console.log(
    "\nChunks per park:",
  );

  for (const [slug, count] of counts) {
    console.log(
      `${slug}: ${count}`,
    );
  }

  const sample =
    chunks.find(
      (chunk) =>
        chunk.slug ===
          "doi-inthanon" &&
        chunk.title.includes(
          "น้ำตกวชิรธาร",
        ),
    );

  console.log(
    "\n===== SAMPLE CHUNK =====\n",
  );

  console.log(sample);

  if (
    skippedLeak.length > 0
  ) {
    throw new Error(
      "DO_NOT_EMBED section leaked into chunks",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});