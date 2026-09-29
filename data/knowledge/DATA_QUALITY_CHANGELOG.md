# Data quality corrections applied in v2.0

This file records deliberate corrections relative to the project's old seed/fallback knowledge.

## Legal status
- `doi-soi-malai` — kept as `PREPARATORY`; DNP 14 Aug 2026 still described it as an area being prepared for national-park designation.
- `namtok-pha-charoen` — kept as `PREPARATORY`; DNP 16 Apr 2026 was still conducting designation consultation.
- `tham-pha-thai` — kept as `PREPARATORY`; DNP 3 Apr 2026 still used “อุทยานแห่งชาติถ้ำผาไท (เตรียมการ)”.
- `nanthaburi` — kept as `PREPARATORY`; DNP sources describe the area as in the designation process.

## Current-status guardrail
- `doi-phu-nang` — latest authoritative tourism status stored in the pack is an indefinite closure from 25 Mar 2025. The chatbot must live-check for a later reopening before recommending entry.

## Seed corrections
- `si-lanna` — uses Mae Ngat Somboon Chon reservoir as a principal attraction; does not use the seed's Mae Kuang framing.
- `mae-wong` — metadata includes Kamphaeng Phet and Nakhon Sawan.
- `nanthaburi` — removes the unsupported Sirikit Dam framing from the old seed.
- `phu-soi-dao` — removes the unsupported “Lan Hin Pum” framing from the old seed.
- `tat-mok` — does not trust the seed district `Khao Kho`; park planning is framed around the Phetchabun/Mueang side until a more precise authoritative operational source is used.
- Generic fallback attractions such as “Recommended activity highlight ...” are not used.

## Dynamic values intentionally removed
Repeated seed values for entrance fees and opening hours are not copied into the RAG pack. They are dynamic and must be retrieved from a live source when the user asks for current information.
