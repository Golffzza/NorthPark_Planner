// ./lib/chat/rag/knowledge-loader.ts

import fs from "node:fs/promises";
import path from "node:path";

import YAML from "yaml";

import type {
  KnowledgeFrontMatter,
  LoadedKnowledgeDocument,
} from "@/lib/chat/rag/knowledge-types";

const KNOWLEDGE_DIRECTORY = path.resolve(
  process.cwd(),
  "data",
  "knowledge",
  "parks",
);

const FRONT_MATTER_PATTERN =
  /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function requireString(
  value: unknown,
  field: string,
  filePath: string,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      `Invalid "${field}" in ${filePath}`,
    );
  }

  return value.trim();
}

function toStringArray(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is string =>
        typeof item === "string",
    )
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMetadata(
  yamlText: string,
  filePath: string,
): KnowledgeFrontMatter {
  const raw = YAML.parse(yamlText) as Record<
    string,
    unknown
  >;

  const provinces =
    toStringArray(raw.provinces);

  if (provinces.length === 0) {
    throw new Error(
      `No provinces defined in ${filePath}`,
    );
  }

  return {
    slug: requireString(
      raw.slug,
      "slug",
      filePath,
    ),

    name_th: requireString(
      raw.name_th,
      "name_th",
      filePath,
    ),

    name_en: requireString(
      raw.name_en,
      "name_en",
      filePath,
    ),

    provinces,

    canonical_seed_province:
      typeof raw.canonical_seed_province ===
      "string"
        ? raw.canonical_seed_province.trim()
        : undefined,

    legal_status: requireString(
      raw.legal_status,
      "legal_status",
      filePath,
    ),

    verified_at: requireString(
      raw.verified_at,
      "verified_at",
      filePath,
    ),

    knowledge_version: requireString(
      raw.knowledge_version,
      "knowledge_version",
      filePath,
    ),

    freshness_policy:
      typeof raw.freshness_policy === "string"
        ? raw.freshness_policy.trim()
        : undefined,

    dynamic_data_policy:
      typeof raw.dynamic_data_policy ===
      "string"
        ? raw.dynamic_data_policy.trim()
        : undefined,

    embedding_profile:
      typeof raw.embedding_profile === "string"
        ? raw.embedding_profile.trim()
        : undefined,

    recommendation_tags:
      toStringArray(
        raw.recommendation_tags,
      ),
  };
}

async function loadKnowledgeFile(
  absolutePath: string,
): Promise<LoadedKnowledgeDocument> {
  const raw = await fs.readFile(
    absolutePath,
    "utf8",
  );

  const match =
    raw.match(FRONT_MATTER_PATTERN);

  if (!match) {
    throw new Error(
      `Missing YAML front matter: ${absolutePath}`,
    );
  }

  const metadata = parseMetadata(
    match[1],
    absolutePath,
  );

  const body = raw
    .slice(match[0].length)
    .trim();

  return {
    absolutePath,

    relativePath: path
      .relative(process.cwd(), absolutePath)
      .replaceAll("\\", "/"),

    metadata,

    body,
  };
}

export async function loadParkKnowledge(): Promise<
  LoadedKnowledgeDocument[]
> {
  const entries = await fs.readdir(
    KNOWLEDGE_DIRECTORY,
    {
      withFileTypes: true,
    },
  );

  const files = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".md"),
    )
    .map((entry) =>
      path.join(
        KNOWLEDGE_DIRECTORY,
        entry.name,
      ),
    )
    .sort();

  const documents =
    await Promise.all(
      files.map(loadKnowledgeFile),
    );

  const slugs = new Set<string>();

  for (const document of documents) {
    if (
      slugs.has(document.metadata.slug)
    ) {
      throw new Error(
        `Duplicate knowledge slug: ${document.metadata.slug}`,
      );
    }

    slugs.add(document.metadata.slug);
  }

  return documents;
}