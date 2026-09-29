# NorthPark RAG Policy

## 1. Truth hierarchy

For park knowledge, prefer:
1. Current DNP / official park announcement
2. Other Thai government sources
3. DASTA / Tourism Authority of Thailand for relatively stable tourism information
4. Secondary sources only as supporting evidence

When sources conflict, report the conflict with dates instead of guessing.

## 2. Stable vs seasonal vs dynamic

### Stable
Examples: park identity, general geography, long-established attractions, trail character.
Can be retrieved from RAG.

### Seasonal
Examples: typical flower season, typical waterfall season, seasonal trail operation.
RAG may explain the usual pattern, but must say that the actual current condition requires verification.

### Dynamic
Examples: open/closed today, admission fee today, weather, AQI, road status, trail closure, accommodation availability, flower bloom right now.
Static RAG is not sufficient. Use a live tool or current official source.

## 3. Recommendation is inference, not a new fact

The assistant may infer that one attraction is more suitable than another from:
- walking distance
- difficulty
- access
- duration
- risks
- user constraints

Phrase the reasoning explicitly. Do not turn the inference into unsupported claims such as “wheelchair accessible” or “safe for all elderly visitors”.

## 4. Metadata before vector ranking

If the user gives a hard constraint:
- province
- named park
- legal status / “only officially declared parks”
- explicit attraction type when strict

Filter on metadata first, then rank semantically.

## 5. Conversation-aware retrieval

The retrieval query should include relevant constraints carried from recent conversation, e.g.:

```text
User turn 1: อยากเที่ยวเชียงใหม่
User turn 2: ชอบน้ำตก แต่ไม่อยากเดินเยอะ

Retrieval query:
เชียงใหม่ น้ำตก เดินน้อย เข้าถึงง่าย
Filter:
province = เชียงใหม่
```

Do not use regex keyword routing as the chatbot's “brain”; use structured extraction / LLM planning only when needed.

## 6. Evidence diversity

Avoid returning five near-duplicate chunks about the same attraction. Prefer a useful mix such as:
- attraction match
- access
- safety
- seasonality
- another relevant attraction

## 7. Unknown is better than invented

If a fact is absent or uncertain, say that it cannot be confirmed from current knowledge and use the appropriate tool/source.

## 8. Closed areas

Never recommend entering an area that is closed or whose last authoritative status is closed without a newer reopening source.

## 9. Preparatory national parks

Files marked `legal_status: PREPARATORY` must remain preparatory until an authoritative newer source explicitly confirms formal designation.

## 10. Political-history neutrality

For Phu Hin Rong Kla and other historically sensitive places, use descriptive, neutral language and distinguish historical interpretation from current tourism guidance.

## 11. Evaluation engine boundary

The score:

`S = 0.35 W + 0.25 D + 0.20 T + 0.20 U`

belongs to the existing Evaluation Engine. RAG and the LLM may explain an engine result but must not replace, alter, or independently fabricate it.

## 12. Sections to exclude from embedding

Do not embed:
- `## 12. Q&A ... (DO_NOT_EMBED)`
- `## 13. ... (DO_NOT_EMBED_URLS)`
- `## 14. ... (DO_NOT_EMBED_POLICY)`

Q&A is an evaluation set. URLs/policies are metadata/provenance.
