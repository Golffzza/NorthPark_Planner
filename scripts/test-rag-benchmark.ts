import { knowledgeRetriever } from "@/lib/chat/rag/knowledge-retriever";

const TEST_CASES = [
  {
    name: "เชียงใหม่ + น้ำตก + เดินน้อย",
    query: "อยากเที่ยวน้ำตกที่เชียงใหม่ แต่ไม่อยากเดินเยอะ",
  },
  {
    name: "เชียงใหม่ + ผู้สูงอายุ",
    query: "พาแม่ไปเที่ยวอุทยานที่เชียงใหม่ อยากได้ที่เดินไม่เยอะและเที่ยวสบาย",
  },
  {
    name: "เดินป่าหนัก + วิวภูเขา",
    query: "อยากเดินป่าแบบจริงจัง ขึ้นเขาและชมวิวสวย ๆ ไม่ติดว่าเดินไกล",
  },
  {
    name: "แคมป์ + ทะเลหมอก",
    query: "อยากกางเต็นท์ดูทะเลหมอก อากาศเย็น และไม่อยากเดินป่าหนัก",
  },
  {
    name: "สถานะพื้นที่เตรียมการ",
    query: "อุทยานแห่งชาติดอยสอยมาลัย-ไม้กลายเป็นหิน เที่ยวได้หรือยัง",
  },
  {
    name: "ข้อมูล Dynamic",
    query: "ภูลมโลเปิดให้เที่ยวตอนนี้ไหม",
  },
];

async function main() {
  for (const test of TEST_CASES) {
    console.log("\n");
    console.log("==================================================");
    console.log(`TEST: ${test.name}`);
    console.log(`QUERY: ${test.query}`);
    console.log("==================================================");

    const startedAt = Date.now();

    const retrieval = await knowledgeRetriever.retrieve(test.query, 5);

    const elapsedMs = Date.now() - startedAt;

    console.log("Mode:", retrieval.mode);

    console.log("Focused slug:", retrieval.focusedSlug ?? "-");

    console.log(
      "Requires live verification:",
      retrieval.requiresLiveVerification,
    );

    console.log("Explicit provinces:", retrieval.explicitProvinces);

    console.log("Analysis:", JSON.stringify(retrieval.analysis, null, 2));

    console.log("Retrieval time:", `${elapsedMs} ms`);

    console.log("Results:", retrieval.chunks.length);

    if (retrieval.chunks.length === 0) {
      console.log("\nNo knowledge chunks found.");

      continue;
    }

    for (const [index, result] of retrieval.chunks.entries()) {
      console.log(`\n--- RESULT ${index + 1} ---`);

      console.log("Park:", result.parkTitle);

      console.log("Slug:", result.slug);

      console.log("Title:", result.title);

      console.log("Section:", result.section);

      console.log("Vector similarity:", Number(result.similarity).toFixed(4));

      console.log("Rerank score:", Number(result.rankScore).toFixed(4));

      console.log(
        "Content:",
        result.content.length > 550
          ? `${result.content.slice(0, 550)}...`
          : result.content,
      );
    }
  }
}

main().catch((error) => {
  console.error("\nRAG benchmark failed:", error);

  process.exit(1);
});
