# Plan: Grounded Hybrid LLM Responses for NorthPark Assistant

## Objective

Make the existing chatbot sound conversational by letting Ollama write the final user-facing response from verified NorthPark facts, while preserving deterministic routing, RAG grounding, recommendation ranking, safety fallbacks, API compatibility, and bounded latency.

This plan does not redesign the Assistant UI, replace Ollama, change `llama3.2:3b`, add tools, streaming, maps, weather, persistent conversations, or a new agent framework.

## Current evidence

- `assistant-intent.ts` classifies clear requests locally. For example, `อยากเที่ยวเชียงใหม่` becomes `RECOMMEND` without an LLM call.
- `recommendation-engine.ts` selects parks and evidence deterministically.
- `assistant-core-service.ts` currently converts those results into a complete template response.
- `RagChatResponder.composeGrounded()` only asks the LLM for a short summary and then appends the complete deterministic draft.
- If Ollama is warming, times out, or returns unsafe text, the raw template is displayed unchanged.
- A live request containing only `อยากเที่ยวเชียงใหม่` produced a long three-park template; one observed request took about 6.94 seconds.
- The assistant/API regression suite currently passes. The full repository has four unrelated pre-existing Trip Evaluation test failures.

## Design invariants

1. RAG, catalog data, and deterministic services own all facts.
2. The LLM may select wording, tone, concision, and clause order within one park, but may not select parks, reorder ranked parks, remove required comparison participants, or invent facts.
3. The recommendation engine remains the source of recommendation ranking.
4. Exact deterministic facts may continue bypassing the LLM when that is safer and faster.
5. A normal turn must make at most one foreground Ollama generation call across intent analysis, grounded composition, and the legacy `respondDetailed` path.
6. LLM failure must return a concise, useful deterministic fallback.
7. The successful API response contract remains backward compatible.
8. Sources, recommendations, comparisons, context, ownership, expiry, and history limits remain unchanged.

## Target request flow

```text
User message
  -> deterministic route/context resolution
  -> sufficiency decision
       -> insufficient input: one concise clarification
       -> sufficient input: retrieve/rank verified facts
  -> build structured AnswerPlan with ordered subjects and typed atomic facts
  -> consume the turn's single LLM-call budget for grounded composition when warm
       -> validate output
       -> accepted natural response
       -> rejected/timeout: concise deterministic fallback
```

## Behavior policy

| Request type | Decision owner | Fact owner | Wording owner |
| --- | --- | --- | --- |
| Greeting | deterministic rule | none | deterministic short response |
| Exact catalog fact | deterministic resolver | park catalog | deterministic response |
| Broad recommendation with only province | sufficiency gate | stored context | deterministic concise clarification |
| Recommendation with useful preferences | recommendation engine | RAG/catalog | LLM when safe; compact fallback otherwise |
| Park information | deterministic/context router | RAG | LLM when safe; compact fallback otherwise |
| Comparison | comparison service | RAG/catalog | LLM when safe; compact fallback otherwise |
| Ambiguous unknown message | bounded LLM classifier or safe local fallback | none until intent is known | clarification only |
| Live/current-status request without live data | deterministic safety policy | static RAG caveat | constrained response; never claim current status |

## Dependency graph

```text
Step 1: response policy + regression fixtures
  -> Step 2: sufficiency gate and clarification behavior
  -> Step 3: structured AnswerPlan contract
       -> Step 4: single-call budget and latency enforcement
       -> Step 5: full grounded LLM composer and validator
            -> Step 6: full verification and live acceptance
```

Steps 2 and the initial type design for Step 3 may be developed independently after Step 1. Both must be complete before the call-budget wiring in Step 4, and Step 4 must be complete before the full composer is enabled in Step 5.

---

## Step 1 — Lock desired behavior with regression tests

### Context brief

The current output is technically grounded but overly verbose because `formatRecommendations()` creates the entire final response before the LLM runs. Tests must describe the desired conversational behavior before production code changes.

### Tasks

- Add fixtures for representative Thai conversations:
  - `อยากเที่ยวเชียงใหม่`
  - `อยากเที่ยวเชียงใหม่ ชอบน้ำตก`
  - `อยากเที่ยวน้ำตกเชียงใหม่แต่ไม่อยากเดินเยอะ`
  - an explicit park-information question
  - a comparison question
  - a live-status question
  - an Ollama timeout/unavailable case
- Assert that province-only recommendation input asks one useful follow-up question rather than returning three parks.
- Assert that sufficient recommendation input still returns structured recommendations and sources.
- Assert that user-facing text does not expose internal labels such as `LOW-MODERATE`, RAG markers, JSON, or raw field names.
- Add a call-count assertion: no normal turn may make both an intent LLM call and a composition LLM call.
- Cover every current LLM entry point in that assertion: intent analyzer, `composeGrounded`, and legacy `respondDetailed` generation.
- Lock the exact structured recommendation/comparison values and their order, not only the presence of those response fields.
- Add prompt-injection fixtures in both the user question and evidence text.
- Record the current chatbot/API baseline before implementation.

### Verification

```powershell
.\node_modules\.bin\vitest.cmd run tests/unit/chat tests/unit/api/assistant-chat-route.test.ts
```

### Exit criteria

- New tests fail only for the intended missing behavior.
- Existing chatbot/API tests continue to pass or have explicitly documented expected changes.

### Rollback

- Remove only the newly added tests/fixtures; no runtime code is changed in this step.

---

## Step 2 — Add a recommendation sufficiency gate

### Context brief

`อยากเที่ยวเชียงใหม่` currently provides only a province, but the recommendation engine is invoked immediately and chooses one activity per park by default. The system should ask for the most useful missing preference before ranking parks.

### Tasks

- Add a small pure function that decides whether recommendation constraints are sufficient.
- Treat province-only input as insufficient unless the conversation already contains at least one discriminator that the current recommendation algorithm materially uses:
  - desired or excluded activity; or
  - walking/fatigue preference.
- Do not treat duration or generic companion context as sufficient in this work because the current ranking algorithm does not materially rank on those fields. Adding that behavior would be a separate recommendation-algorithm change.
- Generate one concise clarification question based on the most important missing discriminator.
- Preserve the province and all existing constraints in conversation context.
- When a new unresolved recommendation begins, clear stale `selectedPark`, `lastParkResults`, `lastRecommendedParks`, and `lastComparedParks` so later phrases such as `ที่แรก` cannot resolve to results the user no longer sees.
- Do not call retrieval, recommendation ranking, or Ollama composition for an insufficient request.
- Do not repeatedly ask for information already present in context.

### Likely files

- `lib/chat/core/assistant-core-service.ts`
- `lib/chat/core/assistant-context.ts`
- optionally a focused new module such as `lib/chat/core/recommendation-sufficiency.ts`
- relevant unit tests

### Verification

- Province-only requests ask a follow-up.
- A second message such as `ขอน้ำตก เดินไม่เยอะ` produces recommendations using the retained province.
- Existing context replacement and negation tests still pass.
- Old recommendations followed by a new province-only request cannot resolve later reference phrases to stale parks.
- Every constraint counted as sufficient has a test proving that it changes filtering or ranking.

### Exit criteria

- The screenshot scenario no longer returns a long three-park list immediately.
- No new LLM latency is introduced for clarification turns.

### Rollback

- Remove the sufficiency gate and restore the existing direct recommendation branch.

---

## Step 3 — Introduce a structured AnswerPlan between logic and wording

### Context brief

The core currently mixes decision-making, fact selection, fallback formatting, and final presentation. A small typed contract is needed so the LLM receives verified facts without taking control of ranking or retrieval.

### Proposed contract

```ts
type AtomicFact = {
  id: string;
  sourceIds: string[];
} & (
  | { kind: "ATTRACTION"; parkSlug: string; name: string; summary?: string }
  | { kind: "WALKING"; parkSlug: string; attraction: string; value: string }
  | { kind: "DIFFICULTY"; parkSlug: string; attraction: string; value: string }
  | { kind: "CAUTION"; parkSlug: string; attraction?: string; value: string }
  | { kind: "PARK_FACT"; parkSlug: string; field: string; value: string }
  | { kind: "LIVE_CAVEAT"; parkSlug?: string; value: string }
);

type AssistantAnswerPlan = {
  kind: "RECOMMENDATION" | "PARK_INFO" | "COMPARISON";
  question: string;
  orderedSubjects: Array<{ rank: number; parkSlug: string; parkName: string }>;
  facts: AtomicFact[];
  requiredFactIds: string[];
  requiresLiveVerification: boolean;
  requiredCaveat?: string;
  deterministicFallback: string;
};

type GroundedComposition = {
  segments: Array<{
    subjectRank: number;
    factIds: string[];
    text: string;
  }>;
};
```

The exact shape may be adjusted to existing contracts, but it must not contain speculative future fields.

### Tasks

- Build `AssistantAnswerPlan` only after routing, retrieval, and ranking are complete.
- Treat clarification as a deterministic early return rather than an AnswerPlan kind.
- Preserve recommendation `rank` and comparison participants explicitly in `orderedSubjects`.
- Give every allowed claim a stable fact ID; free-text evidence alone is not sufficient grounding.
- Preserve originating source/evidence IDs on every atomic fact for traceability.
- Represent any mandatory live-data caveat as an atomic fact and include its ID in `requiredFactIds`; do not keep safety-critical wording as an untracked free-text side channel.
- Keep structured API fields (`recommendations`, `comparison`, `sources`, `contextSummary`) unchanged.
- Make deterministic fallbacks concise and conversational rather than full raw evidence dumps.
- Limit facts sent to the composer to the most relevant evidence:
  - recommendation: top reason and key caution per park;
  - park info: only sections relevant to the question;
  - comparison: matched dimensions for every compared park.
- Define zero-recommendation behavior as a concise deterministic response with no LLM call.
- Extract response formatting/building from the 25 KB `assistant-core-service.ts` only where it directly supports this contract; avoid a broad refactor.

### Likely files

- `lib/chat/shared/contracts.ts` or a core-local answer-plan type
- `lib/chat/core/assistant-core-service.ts`
- focused answer-plan builder/formatter modules
- unit tests for plan construction

### Verification

- Snapshot or structural tests prove the plan contains only selected verified facts.
- No raw retrieval score, embedding data, internal field name, or unsupported source enters the plan.
- `requiresLiveVerification` and `requiredCaveat` are first-class and cannot be dropped during rendering.
- The plan's subject order exactly matches the structured API response and conversation reference order.
- Existing API response shapes remain identical.

### Exit criteria

- Recommendation, park-info, and comparison branches all produce a typed plan and compact fallback.
- Ranking and retrieval tests remain unchanged and passing.

### Rollback

- Retain the plan builder behind the existing formatter, or revert the core branch wiring without changing engines.

---

## Step 4 — Enforce one foreground LLM call and latency budgets

### Context brief

The current hybrid path can perform intent analysis and response composition sequentially. This explains observed requests near 6–7 seconds even though each individual call is bounded.

### Tasks

- Introduce explicit per-turn state such as `llmCallUsed`/`compositionAllowed`; do not rely only on coding convention.
- Enforce the budget across every current generation entry point: intent analyzer, `composeGrounded`, and legacy `respondDetailed`.
- Clear rule-routed requests:
  - skip LLM intent analysis;
  - use the one available call for final grounded composition.
- Unknown/ambiguous requests:
  - use the bounded analyzer call;
  - respond with a safe clarification or deterministic result without a second foreground LLM call.
- Preserve background Ollama warmup and keep-alive.
- Keep abort propagation from API to intent, retrieval, and composition.
- Implement an outer `Promise.race` hard deadline. Abort the provider on timeout and attach late-resolution/rejection handling so a provider that ignores abort cannot delay the response, mutate returned state, or cause an unhandled rejection.
- Never retry within the same turn.
- Set and document separate budgets, with a target such as:
  - intent fallback: at most 2.0–2.5 seconds;
  - grounded composition: at most 3.0–3.5 seconds;
  - no sequential addition of both budgets in one turn.
- Add tests for exact LLM call counts and deadline behavior.

### Verification

- Clear recommendation and park-info requests invoke composition at most once.
- Ambiguous requests invoke intent analysis at most once and do not subsequently compose.
- A provider promise that ignores abort still cannot hold the API request past the hard deadline.
- Ignored abort, late resolve, late reject, and client-request abort are tested independently.
- Every intent and fallback branch proves total `llm.chat` call count is either zero or one.

### Exit criteria

- No supported route can produce the previous analyzer-plus-composer 6–7 second chain.
- All failure paths remain user-readable and return no stack trace.

### Rollback

- Disable LLM composition while retaining deterministic fallbacks; do not remove timeout or abort safety.

---

## Step 5 — Let Ollama write and validate the full grounded response

### Context brief

The current composer writes only a one-sentence introduction and appends the deterministic template. After Step 4 guarantees the single-call budget, the composer can become the complete wording layer for rule-resolved, fact-grounded turns.

### Tasks

- Replace the “summary before draft” prompt with a full-response grounded composer prompt.
- Send the compact typed `AssistantAnswerPlan`, not a long rendered draft or complete knowledge document.
- Require the model to return `GroundedComposition` JSON rather than unstructured final text. Each segment must declare the exact `factIds` it verbalizes and the `subjectRank` it belongs to.
- Delimit the user question and evidence as untrusted data. Explicitly instruct the model never to follow instructions embedded inside either field.
- Instruct the model to:
  - answer the actual question first;
  - use natural Thai;
  - avoid repeated labels and boilerplate;
  - preserve the exact ordered park list and every required comparison participant;
  - use short bullets only when multiple options genuinely benefit from them;
  - render only supplied atomic facts;
  - preserve the exact required live-data caveat.
- Keep `llama3.2:3b` and low temperature.
- Measure `numPredict` separately for recommendation, comparison, and park-info output. Allocate enough tokens to finish every required item, then enforce a character ceiling after generation.
- Validate the structured composition before joining segment text into the user-facing answer:
  - reject malformed JSON, unknown fact IDs, empty `factIds`, duplicate segments, and segments that mix facts from different subjects;
  - require every `requiredFactId` exactly where the plan expects it;
  - ensure every referenced fact ID belongs to the declared `subjectRank` (with a reserved non-park rank only for plan-level caveats if needed);
  - enforce segment and subject order against `orderedSubjects`; the model cannot use its output order to change recommendation ranking;
  - check each segment's wording against only its linked atomic facts before applying whole-response checks;
  - join the validated segment text only after every structural and semantic check succeeds;
  - every emitted park/attraction name must be allowed by the plan;
  - every required subject must appear exactly once and in engine order;
  - every emitted number must be supported by an atomic fact;
  - required fact IDs/claims and live caveats must be represented;
  - reject unsupported adjectives and claims about accessibility, family suitability, road access, safety, popularity, convenience, current status, or superlatives;
  - reject empty, truncated, repeated, prompt-injected, internal-marker, or near-copy output.
- Treat entity/number checks as only one validation layer, not proof of semantic grounding.
- Return the compact deterministic fallback when validation fails.
- Do not append the fallback after a successful LLM response.
- Keep the structured API recommendation/comparison arrays and conversation reference order aligned with the rendered order. If fewer parks are intentionally shown, store and return only that same visible subset.

### Likely files

- `lib/chat/rag/rag-chat-responder.ts`
- `lib/chat/llm/prompts.ts`
- the AnswerPlan types/builders from Step 3
- focused validator tests

### Verification

- A valid LLM response becomes the complete answer without the raw template appended.
- Unknown, omitted, duplicated, cross-subject, or reordered fact IDs cause the whole composition to fall back safely.
- A segment with no fact IDs, or text not supported by its linked facts, is rejected even if every named entity is valid.
- Every accepted segment can be traced from its fact IDs to the original source/evidence IDs.
- Hallucinated qualitative claims are rejected even when they contain no new entity or number.
- Hallucinated park names, numbers, opening status, “เหมาะสำหรับทุกคน”, and fabricated trip duration are rejected.
- Prompt-injection attempts in the question and evidence cannot expose JSON, prompts, or internal markers.
- A live-status answer missing its required caveat, or contradicting it, is rejected.
- Timeout, malformed output, or unavailable Ollama returns the compact fallback.
- Source metadata and structured recommendation/comparison blocks remain unchanged.

### Exit criteria

- The common grounded response path visibly uses accepted LLM wording for a measured majority of the representative warm-prompt matrix.
- Recommendation order and follow-up references remain consistent with the engine output.
- No test weakens an existing hallucination guard.

### Rollback

- Disable full composition and use the compact deterministic fallback; retain AnswerPlan, call-budget, timeout, and abort safety.

---

## Step 6 — Acceptance, regression, and live UI verification

### Tasks

- Run chatbot/API tests, TypeScript, targeted lint, full tests, and `git diff --check`.
- Re-run known conversations through `/assistant` with Ollama both cold and warm.
- Measure server response times for at least:
  - province-only clarification;
  - sufficient recommendation;
  - park-information follow-up;
  - comparison;
  - ambiguous fallback;
  - Ollama unavailable/timeout.
- Use a fixed Thai acceptance matrix and record internally whether each response used accepted LLM composition or deterministic fallback without changing the public API.
- For every matrix item, verify:
  - the first sentence answers the question;
  - no repeated `เหตุผล`/`จุดเด่น`/`ข้อควรระวัง` boilerplate;
  - no raw field labels;
  - all required parks appear exactly once and in order;
  - per-kind character limits are respected;
  - the deterministic fallback is not duplicated;
  - every required live-data caveat remains visible.
- Set numeric acceptance targets before declaring completion:
  - no turn uses more than one foreground `llm.chat` call;
  - a warm rule-resolved composed turn completes within 4 seconds locally at the 95th percentile of the small acceptance run;
  - ambiguous intent fallback completes within 2.5 seconds;
  - at least 80% of representative warm grounded prompts accept the LLM response instead of silently falling back.
- Review rendered mobile UI for message length, wrapping, sources, and structured blocks.
- Compare output against the existing RAG evaluation fixtures where applicable.
- Distinguish new regressions from the four known unrelated Trip Evaluation failures.

### Commands

```powershell
.\node_modules\.bin\vitest.cmd run tests/unit/chat tests/unit/api/assistant-chat-route.test.ts
.\node_modules\.bin\tsc.cmd --noEmit
.\node_modules\.bin\eslint.cmd <changed-files>
npm.cmd test
git diff --check
```

### Acceptance examples

Input:

```text
อยากเที่ยวเชียงใหม่
```

Expected:

```text
ได้ครับ เชียงใหม่มีหลายแบบเลย สนใจแนวไหนเป็นพิเศษครับ—น้ำตก ชมวิว เดินป่า หรือเที่ยวแบบเดินน้อย?
```

Follow-up:

```text
อยากดูน้ำตกแต่ไม่อยากเดินเยอะ
```

Expected properties:

- uses retained Chiang Mai context;
- recommendation engine selects parks;
- LLM writes the complete concise answer from verified facts;
- no raw labels or repeated template;
- sources and structured recommendations remain present;
- one foreground LLM call maximum.

### Exit criteria

- Chatbot/API tests pass.
- TypeScript and targeted lint pass.
- Live responses are grounded, concise, and visibly more conversational.
- Warm normal requests meet the numeric end-to-end latency and accepted-composition targets.
- No unrelated application behavior is changed.

---

## Adversarial checks

- Does any new prompt let the model choose or reorder recommended parks?
- Can the model introduce an attraction, number, qualitative attribute, status, accessibility/family/road/safety claim, or superlative absent from atomic facts?
- Can a rule miss cause two sequential LLM calls?
- Does a timeout still return a useful response?
- Can province context be lost after a clarification?
- Can another user's conversation context be accessed?
- Does the frontend still accept the same API response shape?
- Does a successful natural response accidentally remove required live-data caveats?
- Can instructions embedded in the user question or evidence override the composer prompt?
- Can clarification leave stale recommendation references in conversation context?

## Anti-patterns to avoid

- Sending the complete knowledge document to the chat model.
- Asking the model to rank parks independently.
- Appending a long deterministic dump after a successful LLM response.
- Using LLM confidence as authorization to invent missing context.
- Adding retries that multiply worst-case latency.
- Weakening validation merely to make generated responses appear more often.
- Rewriting all of `assistant-core-service.ts` in one change.
- Changing the model, provider, UI contract, or recommendation algorithm in this work.

## Execution mode and repository safety

- Use direct, small working-tree changes because GitHub CLI is unavailable and the worktree contains mixed modified/untracked files.
- Do not create a checkpoint commit unless Assistant-only changes can be isolated safely.
- Never clean, reset, or discard existing user changes.
- Inspect the diff after every step and stop if a change overlaps ambiguous user work.

## Plan mutation protocol

- A step may be split when its diff becomes too broad or its tests cannot isolate one behavior.
- A new step may be inserted only with an explicit dependency and updated acceptance criteria.
- A step may be skipped only when current code already satisfies every exit criterion and tests prove it.
- If safety validation prevents natural output too often, improve the AnswerPlan and validator; do not bypass the guard.
- Any change to API shape, model choice, ranking behavior, or Phase scope requires user approval before continuing.
