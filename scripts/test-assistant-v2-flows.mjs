const BASE_URL = process.env.ASSISTANT_TEST_BASE_URL ?? "http://localhost:3000";

const COOKIE = process.env.ASSISTANT_TEST_COOKIE;

if (!COOKIE) {
  console.error(`
Missing ASSISTANT_TEST_COOKIE.

Example PowerShell:

$env:ASSISTANT_TEST_COOKIE='next-auth.session-token=...'
npx node scripts/test-assistant-v2-flows.mjs
`);
  process.exit(1);
}

async function send(message, conversationId) {
  const started = Date.now();

  const response = await fetch(`${BASE_URL}/api/v2/assistant/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: COOKIE,
    },
    body: JSON.stringify({
      message,
      ...(conversationId ? { conversationId } : {}),
    }),
  });

  const body = await response.json();

  return {
    status: response.status,
    elapsedMs: Date.now() - started,
    body,
  };
}

function simplifyToolCalls(body) {
  return (body?.data?.diagnostics?.toolCalls ?? []).map((call) => ({
    tool: call.toolName,
    input: call.input,
  }));
}

function containsWaterfall(text) {
  return /น้ำตก/i.test(text ?? "");
}

async function runFlow(name, messages, checks = []) {
  console.log(`\n\n========================================`);
  console.log(`FLOW: ${name}`);
  console.log(`========================================`);

  let conversationId;
  const turns = [];

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];

    console.log(`\n--- TURN ${i + 1} ---`);
    console.log("USER:", message);

    const result = await send(message, conversationId);

    const data = result.body?.data;
    const previousConversationId = conversationId;

    if (data?.conversationId) {
      conversationId = data.conversationId;
    }

    const turn = {
      index: i,
      user: message,
      status: result.status,
      elapsedMs: result.elapsedMs,
      conversationId,
      previousConversationId,
      tools: simplifyToolCalls(result.body),
      answer: data?.message ?? "",
      raw: result.body,
    };

    turns.push(turn);

    console.log("STATUS:", turn.status);
    console.log("TIME:", `${turn.elapsedMs} ms`);
    console.log("CID:", turn.conversationId);
    console.log("TOOLS:", JSON.stringify(turn.tools, null, 2));
    console.log(
      "ANSWER:",
      turn.answer.length > 500
        ? `${turn.answer.slice(0, 500)}...`
        : turn.answer,
    );
  }

  console.log(`\n--- CHECKS ---`);

  let passed = 0;

  for (const check of checks) {
    let ok = false;

    try {
      ok = Boolean(check.test(turns));
    } catch {
      ok = false;
    }

    console.log(`${ok ? "PASS ✅" : "FAIL ❌"} ${check.name}`);

    if (ok) passed++;
  }

  console.log(`\nRESULT: ${passed}/${checks.length} checks passed`);

  return {
    turns,
    passed,
    total: checks.length,
  };
}

const results = [];

/* =========================================================
   FLOW A — EXCLUSION
========================================================= */

results.push(
  await runFlow(
    "A — recommendation exclusion",
    [
      "อยากเที่ยวเชียงใหม่กับพ่อแม่ เดินไม่เยอะ",
      "ไม่เอาน้ำตก",
    ],
    [
      {
        name: "same conversationId",
        test: (turns) =>
          turns[0].conversationId &&
          turns[0].conversationId === turns[1].conversationId,
      },
      {
        name: "turn 1 uses recommendParks",
        test: (turns) =>
          turns[0].tools.some((x) => x.tool === "recommendParks"),
      },
      {
        name: "turn 2 uses recommendParks",
        test: (turns) =>
          turns[1].tools.some((x) => x.tool === "recommendParks"),
      },
      {
        name: "turn 2 sends WATERFALL exclusion",
        test: (turns) =>
          turns[1].tools.some(
            (x) =>
              x.tool === "recommendParks" &&
              Array.isArray(x.input?.excludedActivities) &&
              x.input.excludedActivities.includes("WATERFALL"),
          ),
      },
      {
        name: "turn 2 answer does not use waterfall as recommendation highlight",
        test: (turns) => !containsWaterfall(turns[1].answer),
      },
    ],
  ),
);

/* =========================================================
   FLOW B — REFERENCES + SELECTION
========================================================= */

results.push(
  await runFlow(
    "B — ordered references and selected park",
    [
      "แนะนำอุทยานในจังหวัดตาก",
      "สองที่แรกต่างกันยังไง",
      "งั้นเอาที่สอง",
      "แล้วอยู่จังหวัดอะไร",
    ],
    [
      {
        name: "all turns use same conversationId",
        test: (turns) =>
          turns.every(
            (turn) =>
              turn.conversationId === turns[0].conversationId,
          ),
      },
      {
        name: "turn 1 uses recommendParks",
        test: (turns) =>
          turns[0].tools.some((x) => x.tool === "recommendParks"),
      },
      {
        name: "turn 2 uses compareParks",
        test: (turns) =>
          turns[1].tools.some((x) => x.tool === "compareParks"),
      },
      {
        name: "turn 3 uses selectPark",
        test: (turns) =>
          turns[2].tools.some((x) => x.tool === "selectPark"),
      },
      {
        name: "turn 3 selects position 2",
        test: (turns) =>
          turns[2].tools.some(
            (x) =>
              x.tool === "selectPark" &&
              Number(x.input?.position) === 2,
          ),
      },
      {
        name: "turn 4 uses getParkInfo",
        test: (turns) =>
          turns[3].tools.some((x) => x.tool === "getParkInfo"),
      },
    ],
  ),
);

/* =========================================================
   FLOW C — AMBIGUITY
========================================================= */

results.push(
  await runFlow(
    "C — ambiguous reference safety",
    [
      "ตากมีอุทยานอะไรบ้าง",
      "เอาอันนั้น",
    ],
    [
      {
        name: "same conversationId",
        test: (turns) =>
          turns[0].conversationId === turns[1].conversationId,
      },
      {
        name: "ambiguous turn does not call selectPark",
        test: (turns) =>
          !turns[1].tools.some((x) => x.tool === "selectPark"),
      },
      {
        name: "ambiguous turn asks for clarification",
        test: (turns) =>
          /(อันไหน|ที่ไหน|หมายถึง|เลือก|ระบุ|ข้อไหน|อันดับ)/i.test(
            turns[1].answer,
          ),
      },
    ],
  ),
);

/* =========================================================
   SUMMARY
========================================================= */

const totalPassed = results.reduce((sum, x) => sum + x.passed, 0);
const totalChecks = results.reduce((sum, x) => sum + x.total, 0);

console.log(`\n\n========================================`);
console.log("FINAL SUMMARY");
console.log("========================================");
console.log(`PASS: ${totalPassed}/${totalChecks}`);

if (totalPassed === totalChecks) {
  console.log("ROUND 2A MANUAL FLOWS PASS ✅");
  process.exit(0);
}

console.log("ROUND 2A HAS FAILURES ❌");
process.exit(1);