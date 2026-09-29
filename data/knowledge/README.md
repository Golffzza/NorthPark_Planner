# NorthPark RAG Knowledge Pack — 44 Northern Parks

**Knowledge version:** 2.0
**Reviewed/assembled:** 2026-09-14
**Canonical scope:** 44 entries from the NorthPark `parks-raw.ts` list
**Embedding target:** Ollama `embeddinggemma` — 768 dimensions
**Recommended DB:** PostgreSQL + pgvector

## What is included

- `data/knowledge/parks/` — **44** park master Markdown files
- `RAG_POLICY.md` — global rules for retrieval and answering
- `TEMPLATE.md` — authoring template for future updates
- `knowledge-index.json` — machine-readable park metadata
- `rag-evaluation-queries.json` — retrieval / chatbot evaluation questions
- `source-registry.json` — provenance URLs collected from every park file

Current pack statistics:
- Parks: **44**
- Attraction/activity entries: **150**
- Source references: **91**
- Legal status `DECLARED`: **40**
- Legal status `PREPARATORY`: **4**

## Data-quality choices

This pack does **not** copy the old seed data as truth. The seed list is used as the canonical set of park names only. Repeated seed values such as generic fees, generic opening hours, placeholder attractions, and generic English descriptions are intentionally excluded unless independently supported.

Important corrected cases include:
- `doi-soi-malai` — `PREPARATORY`
- `namtok-pha-charoen` — `PREPARATORY`
- `tham-pha-thai` — `PREPARATORY`
- `nanthaburi` — `PREPARATORY`
- `doi-phu-nang` — latest authoritative tourism status stored in this pack is an **indefinite closure**, so current access must be live-verified.
- `si-lanna` — Mae Ngat Somboon Chon reservoir is kept as a principal attraction; the old Mae Kuang framing is not used.
- `phu-soi-dao` — no fabricated “Lan Hin Pum” attraction.
- `nanthaburi` — no fabricated Sirikit Dam highlight.
- `tat-mok` — the seed district value is not treated as verified truth.

## Ingestion rules

Recommended chunking:

1. Parse YAML front matter into metadata.
2. Do **not** embed sections whose heading contains `DO_NOT_EMBED`.
3. Create one chunk per attraction (`### Axx — ...`).
4. Keep overview / recommendation metadata / access / facilities / safety / seasonality as separate chunks.
5. Preserve `slug`, `provinces`, `legal_status`, `recommendation_tags`, section name, and source IDs as chunk metadata.
6. Use metadata filters before vector ranking for hard constraints such as province/legal status.
7. Deduplicate overlapping chunks before sending context to the LLM.

## Freshness rule

Static RAG must not be the final authority for:
- today's opening/closure
- current admission fees
- road/trail conditions
- weather / air quality
- current flower bloom / sea of mist
- accommodation availability
- current booking rules or transport restrictions

Those questions should use live tools / official current sources.

## Suggested retrieval flow

```text
conversation context
       ↓
rewrite retrieval query
       ↓
extract hard filters
(province / legal status / attraction type if explicit)
       ↓
metadata filter
       ↓
embeddinggemma query embedding
       ↓
pgvector cosine retrieval
       ↓
dedupe + evidence diversity
       ↓
LLM answer with uncertainty/freshness handling
```

## Important

The RAG knowledge pack improves factual grounding, but it is not a substitute for the existing NorthPark Trip Evaluation Engine. The chatbot must never invent or recalculate the project evaluation score.
