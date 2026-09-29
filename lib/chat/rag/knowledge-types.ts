// ./lib/chat/rag/knowledge-types.ts

export type KnowledgeFrontMatter = {
  slug: string;
  name_th: string;
  name_en: string;
  provinces: string[];
  canonical_seed_province?: string;
  legal_status: string;
  verified_at: string;
  knowledge_version: string;
  freshness_policy?: string;
  dynamic_data_policy?: string;
  embedding_profile?: string;
  recommendation_tags: string[];
};

export type LoadedKnowledgeDocument = {
  absolutePath: string;
  relativePath: string;
  metadata: KnowledgeFrontMatter;
  body: string;
};

export type KnowledgeChunkDraft = {
  sourcePath: string;

  slug: string;
  parkNameTh: string;
  parkNameEn: string;

  provinces: string[];
  legalStatus: string;
  verifiedAt: string;
  recommendationTags: string[];

  title: string;
  section: string;
  ordinal: number;

  sourceIds: string[];

  content: string;
};