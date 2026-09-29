// ./lib/chat/rag/knowledge-chunker.ts

import type {
  KnowledgeChunkDraft,
  LoadedKnowledgeDocument,
} from "@/lib/chat/rag/knowledge-types";

type MarkdownSection = {
  heading: string;
  content: string;
};

type AttractionSection = {
  id: string;
  name: string;
  content: string;
};

const SECTION_KEYS: Record<string, string> = {
  "1": "overview",
  "2": "basic_info",
  "3": "recommendation_metadata",
  "5": "access",
  "6": "facilities",
  "7": "suitability",
  "8": "seasonality",
  "9": "safety",
  "10": "itinerary",
  "11": "dynamic",
};

function normalizeText(
  value: string,
): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function shouldSkipSection(
  heading: string,
): boolean {
  return heading
    .toUpperCase()
    .includes("DO_NOT_EMBED");
}

function splitH2Sections(
  markdown: string,
): MarkdownSection[] {
  const lines = markdown.split("\n");

  const sections: MarkdownSection[] = [];

  let heading: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (!heading) {
      buffer = [];
      return;
    }

    sections.push({
      heading,
      content: normalizeText(
        buffer.join("\n"),
      ),
    });

    buffer = [];
  };

  for (const line of lines) {
    const match = line.match(
      /^##\s+(.+?)\s*$/,
    );

    if (match) {
      flush();

      heading = match[1].trim();
      continue;
    }

    if (heading) {
      buffer.push(line);
    }
  }

  flush();

  return sections;
}

function splitAttractions(
  content: string,
): AttractionSection[] {
  const lines = content.split("\n");

  const attractions: AttractionSection[] =
    [];

  let current:
    | {
        id: string;
        name: string;
        lines: string[];
      }
    | undefined;

  const flush = () => {
    if (!current) {
      return;
    }

    attractions.push({
      id: current.id,
      name: current.name,
      content: normalizeText(
        current.lines.join("\n"),
      ),
    });

    current = undefined;
  };

  for (const line of lines) {
    const match = line.match(
      /^###\s+(A\d+)\s+[—–-]\s+(.+?)\s*$/,
    );

    if (match) {
      flush();

      current = {
        id: match[1],
        name: match[2].trim(),
        lines: [],
      };

      continue;
    }

    if (current) {
      current.lines.push(line);
    }
  }

  flush();

  return attractions;
}

function getSectionNumber(
  heading: string,
): string | undefined {
  return heading.match(
    /^(\d+)\./,
  )?.[1];
}

function extractAttractionType(
  content: string,
): string {
  const match = content.match(
    /\*\*type:\*\*\s*`?([A-Z0-9_-]+)`?/i,
  );

  return (
    match?.[1]?.toUpperCase() ??
    "OTHER"
  );
}

function extractSourceIds(
  content: string,
): string[] {
  return [
    ...new Set(
      Array.from(
        content.matchAll(/\bS\d{2,3}\b/g),
      ).map((match) => match[0]),
    ),
  ];
}

function removeRetrievalHints(
  content: string,
): string {
  return content
    .split("\n")
    .filter(
      (line) =>
        !line.includes(
          "**retrieval_hint:**",
        ),
    )
    .join("\n");
}

function buildMetadataPrefix(
  document: LoadedKnowledgeDocument,
  section: string,
): string {
  const {
    metadata,
  } = document;

  return [
    `อุทยาน: ${metadata.name_th}`,
    `ชื่ออังกฤษ: ${metadata.name_en}`,
    `slug: ${metadata.slug}`,
    `จังหวัด: ${metadata.provinces.join(", ")}`,
    `legal_status: ${metadata.legal_status}`,
    `verified_at: ${metadata.verified_at}`,
    `recommendation_tags: ${metadata.recommendation_tags.join(", ") || "none"}`,
    `section: ${section}`,
  ].join("\n");
}

function buildGeneralChunk(
  document: LoadedKnowledgeDocument,
  section: MarkdownSection,
  ordinal: number,
): KnowledgeChunkDraft | null {
  const sectionNumber =
    getSectionNumber(section.heading);

  if (!sectionNumber) {
    return null;
  }

  const sectionKey =
    SECTION_KEYS[sectionNumber];

  if (!sectionKey) {
    return null;
  }

  if (!section.content.trim()) {
    return null;
  }

  const cleaned =
    removeRetrievalHints(
      section.content,
    );

  const content = [
    buildMetadataPrefix(
      document,
      sectionKey,
    ),
    "",
    section.heading,
    "",
    cleaned,
  ].join("\n");

  return {
    sourcePath:
      document.relativePath,

    slug:
      document.metadata.slug,

    parkNameTh:
      document.metadata.name_th,

    parkNameEn:
      document.metadata.name_en,

    provinces:
      document.metadata.provinces,

    legalStatus:
      document.metadata.legal_status,

    verifiedAt:
      document.metadata.verified_at,

    recommendationTags:
      document.metadata
        .recommendation_tags,

    title: `${document.metadata.name_th}: ${section.heading}`,

    section: sectionKey,

    ordinal,

    sourceIds:
      extractSourceIds(cleaned),

    content:
      normalizeText(content),
  };
}

function buildAttractionChunks(
  document: LoadedKnowledgeDocument,
  section: MarkdownSection,
  startOrdinal: number,
): KnowledgeChunkDraft[] {
  const attractions =
    splitAttractions(section.content);

  return attractions.map(
    (attraction, index) => {
      const cleaned =
        removeRetrievalHints(
          attraction.content,
        );

      const type =
        extractAttractionType(cleaned);

      const sectionKey =
        `attraction:${type}:${attraction.id}`;

      const content = [
        buildMetadataPrefix(
          document,
          sectionKey,
        ),
        "",
        `สถานที่: ${attraction.name}`,
        `attraction_id: ${attraction.id}`,
        `attraction_type: ${type}`,
        "",
        cleaned,
      ].join("\n");

      return {
        sourcePath:
          document.relativePath,

        slug:
          document.metadata.slug,

        parkNameTh:
          document.metadata.name_th,

        parkNameEn:
          document.metadata.name_en,

        provinces:
          document.metadata.provinces,

        legalStatus:
          document.metadata.legal_status,

        verifiedAt:
          document.metadata.verified_at,

        recommendationTags:
          document.metadata
            .recommendation_tags,

        title: `${document.metadata.name_th}: ${attraction.name}`,

        section: sectionKey,

        ordinal:
          startOrdinal + index,

        sourceIds:
          extractSourceIds(cleaned),

        content:
          normalizeText(content),
      };
    },
  );
}

export function chunkParkKnowledge(
  document: LoadedKnowledgeDocument,
): KnowledgeChunkDraft[] {
  const sections =
    splitH2Sections(document.body);

  const chunks: KnowledgeChunkDraft[] =
    [];

  let ordinal = 0;

  for (const section of sections) {
    if (
      shouldSkipSection(section.heading)
    ) {
      continue;
    }

    const sectionNumber =
      getSectionNumber(section.heading);

    if (sectionNumber === "4") {
      const attractionChunks =
        buildAttractionChunks(
          document,
          section,
          ordinal,
        );

      chunks.push(
        ...attractionChunks,
      );

      ordinal +=
        attractionChunks.length;

      continue;
    }

    const chunk =
      buildGeneralChunk(
        document,
        section,
        ordinal,
      );

    if (!chunk) {
      continue;
    }

    chunks.push(chunk);
    ordinal += 1;
  }

  return chunks;
}